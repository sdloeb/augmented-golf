export class PhysicsEngine {
    constructor(ballMesh) {
        this.ball = ballMesh;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.friction = 0.98; // Lower numbers slow the ball down faster
        this.gravity = 0.006;  // Pulls the ball back to earth
        this.bounce = 0.40;    // How elastic the bounces are (0.55 = 55% height kept)
        this.wind = new THREE.Vector3(0, 0, 0); // Holds the active 3D wind forces
        this.isMoving = false;
        this.sandTraps = [];
        this.waterHazards = [];
        this.hitWater = false;
        this.isPutting = false;
        this.holePosition = new THREE.Vector3(0, 0.25, -55);
        this.slopeX = 0;
        this.slopeZ = 0;
    }

    applyImpulse(power, mouseAngle, cameraForward, cameraRight, isPutting = false) {
        const speedScale = 0.020;
        const totalPower = power * speedScale;

        // Calculate horizontal components based on camera view
        const forwardComponent = Math.cos(mouseAngle) * totalPower;
        const sideComponent = Math.sin(mouseAngle) * totalPower;

        // Combine vectors
        this.velocity.x = (cameraForward.x * forwardComponent) + (cameraRight.x * sideComponent);
        this.velocity.z = (cameraForward.z * forwardComponent) + (cameraRight.z * sideComponent);

        // FIX: If we are putting, completely kill vertical velocity. Otherwise, apply normal loft height.
        if (isPutting) {
            this.velocity.y = 0;
        } else {
            this.velocity.y = power * 0.045;
        }
        this.isPutting = isPutting;

        this.isMoving = true;
    }


    update() {
        if (!this.isMoving) return;

        // 0. SURFACE FRICTION CHECK
        let currentFriction = this.friction;
        if (this.ball.position.y <= 0.25) {
            for (let sand of this.sandTraps) {
                const dx = this.ball.position.x - sand.position.x;
                const dz = this.ball.position.z - sand.position.z;
                if (Math.sqrt(dx * dx + dz * dz) < sand.geometry.parameters.radius) {
                    currentFriction = 0.80; // Heavy friction for sand
                    break;
                }
            }
        }

        // 1. AIRBORNE PHYSICS (Apply gravity and wind only when above ground)
        if (this.ball.position.y > 0.25 || this.velocity.y > 0) {
            this.velocity.y -= this.gravity;

            // Wind only affects the ball while it's in the air!
            if (!this.isPutting) {
                this.velocity.x += this.wind.x;
                this.velocity.z += this.wind.z;

                let bounceWindMultiplier = 1.0;
                if (this.ball.position.y < 1.5) {
                    bounceWindMultiplier = 0.20; // Cuts wind force to 20% strength on low bounces
                }

                // Change the two lines below to include * bounceWindMultiplier:
                this.velocity.x += this.wind.x * bounceWindMultiplier;
                this.velocity.z += this.wind.z * bounceWindMultiplier;
            }
        } else {
            // UPDATED: Apply calculated ground friction frame-by-frame
            this.velocity.x *= currentFriction;
            this.velocity.z *= currentFriction;
            // Add this block below to apply slope drift frame-by-frame when on the green:
            const dx = this.ball.position.x - this.holePosition.x;
            const dz = this.ball.position.z - this.holePosition.z;
            if (Math.sqrt(dx * dx + dz * dz) < 12.0 && this.velocity.length() > 0.025) {
                this.velocity.x += this.slopeX;
                this.velocity.z += this.slopeZ;
            }
        }

        // 2. MOVE THE BALL
        this.ball.position.add(this.velocity);

        // 3. GROUND COLLISION & HAZARD DETECTION
        if (this.ball.position.y <= 0.25) {
            this.ball.position.y = 0.25; // Snap perfectly to grass level

            // ADDED: Check for Water Hazard collision contact
            for (let water of this.waterHazards) {
                const dx = this.ball.position.x - water.position.x;
                const dz = this.ball.position.z - water.position.z;
                if (Math.sqrt(dx * dx + dz * dz) < water.geometry.parameters.radius) {
                    this.velocity.set(0, 0, 0);
                    this.isMoving = false;
                    this.hitWater = true; // Alerts main loop to trigger game reset
                    return;
                }
            }

            // If falling fast enough, bounce!
            if (Math.abs(this.velocity.y) > 0.05) {
                this.velocity.y = -this.velocity.y * this.bounce; // Reverse vertical speed
                this.velocity.x *= 0.8; // Lose a bit of forward speed on bounce impact
                this.velocity.z *= 0.8;
            } else {
                // Otherwise, stop vertical movement entirely and apply calculated roll friction
                this.velocity.y = 0;
                // UPDATED: Apply calculated ground friction here too
                this.velocity.x *= currentFriction;
                this.velocity.z *= currentFriction;
            }
        }

        // 4. STOP CONSTANT LOOPS (Stop ball completely if moving incredibly slow)
        if (this.velocity.length() < 0.01) {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
            this.isPutting = false;
        }
    }
}