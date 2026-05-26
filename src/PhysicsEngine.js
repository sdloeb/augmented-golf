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
        this.greenCenterZ = -55;
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
            // Lowered from 0.045 to 0.024 to make the vertical launch arc significantly flatter
            this.velocity.y = power * 0.042;

            // Compensate horizontal velocity to make up for the reduced airborne time,
            // preserving the total travel distance of the clubs.
            this.velocity.x *= 1.61;
            this.velocity.z *= 1.61;
        }
        this.isPutting = isPutting;

        this.isMoving = true;
    }


    update() {
        if (!this.isMoving) return;

        // 0. SURFACE PHYSICS PARAMETERS CHECK
        let currentFriction = this.friction;
        let currentBounceHeight = this.bounce;      // Defaults to base engine elastic properties (0.40)
        let currentBounceForwardLoss = 0.80;        // Defaults to retaining 80% forward speed per bounce impact

        // FIXED: Pulled out of the height wrapper completely. 
        // The ball now monitors the surface directly underneath it while flying through the air.
        const gX = this.ball.position.x - 0;
        const gZ = this.ball.position.z - this.greenCenterZ;
        const onGreen = Math.sqrt(gX * gX + gZ * gZ) < 12.0;

        // Check Sand Traps contact
        let inSand = false;
        for (let sand of this.sandTraps) {
            const dx = this.ball.position.x - sand.position.x;
            const dz = this.ball.position.z - sand.position.z;
            if (Math.sqrt(dx * dx + dz * dz) < sand.geometry.parameters.radius) {
                inSand = true;
                break;
            }
        }

        if (inSand) {
            currentFriction = 0.80;          // Heavy friction for sand
            currentBounceHeight = 0.12;      // Sand completely absorbs bounce altitude
            currentBounceForwardLoss = 0.30; // Sand completely kills forward rolling velocities
        }
        // FIXED & UPDATED: Your custom dampening properties will now apply perfectly to the very first bounce impact frame
        else if (!onGreen && Math.abs(this.ball.position.x) >= 9.0) {
            currentFriction = 0.92;          // Your custom heavier roll resistance
            currentBounceHeight = 0.12;      // Your custom deadened rough bounce loft 
            currentBounceForwardLoss = 0.45; // Your custom killed forward skipping velocity momentum
        }


        // Determine if the ball is currently airborne to apply a slow-motion effect
        const isAirborne = this.ball.position.y > 0.25 || this.velocity.y > 0;
        // 0.5 cuts time speed in half while in the air (change to 0.4 for slower, 0.7 for faster)
        const timeScale = isAirborne ? 0.5 : 1.0;

        // 1. AIRBORNE PHYSICS (Apply gravity and wind only when above ground)
        if (isAirborne) {
            // Apply gravity over scaled time increments
            this.velocity.y -= this.gravity * timeScale;

            // Wind only affects the ball while it's in the air!
            if (!this.isPutting) {
                this.velocity.x += this.wind.x * timeScale;
                this.velocity.z += this.wind.z * timeScale;

                let bounceWindMultiplier = 1.0;
                if (this.ball.position.y < 1.5) {
                    bounceWindMultiplier = 0.20; // Cuts wind force to 20% strength on low bounces
                }

                this.velocity.x += this.wind.x * bounceWindMultiplier * timeScale;
                this.velocity.z += this.wind.z * bounceWindMultiplier * timeScale;
            }
        } else {
            // Apply calculated surface ground friction frame-by-frame
            this.velocity.x *= currentFriction;
            this.velocity.z *= currentFriction;
            // FIXED: Applies the slope rolling drift continuously anywhere within the actual green circle dimensions
            const gX = this.ball.position.x - 0;
            const gZ = this.ball.position.z - this.greenCenterZ;
            if (Math.sqrt(gX * gX + gZ * gZ) < 12.0 && this.velocity.length() > 0.025) {
                this.velocity.x += this.slopeX;
                this.velocity.z += this.slopeZ;
            }
        }

        // 2. MOVE THE BALL (Scaled by our timeScale factor for flawless slow motion)
        this.ball.position.x += this.velocity.x * timeScale;
        this.ball.position.y += this.velocity.y * timeScale;
        this.ball.position.z += this.velocity.z * timeScale;

        // 3. GROUND COLLISION & HAZARD DETECTION
        if (this.ball.position.y <= 0.25) {
            this.ball.position.y = 0.25; // Snap perfectly to grass level

            // Check for Water Hazard collision contact
            for (let water of this.waterHazards) {
                const dx = this.ball.position.x - water.position.x;
                const dz = this.ball.position.z - water.position.z;
                if (Math.sqrt(dx * dx + dz * dz) < water.geometry.parameters.radius) {
                    this.velocity.set(0, 0, 0);
                    this.isMoving = false;

                    // Play the water splash audio cleanly
                    if (this.sounds) this.sounds.play('water');

                    this.hitWater = true; // Alerts main loop to trigger game reset
                    return;
                }
            }

            // If falling fast enough, bounce! (Using the dynamic surface modifiers calculated above)
            if (Math.abs(this.velocity.y) > 0.05) {
                if (this.sounds) this.sounds.play('bounce');
                this.velocity.y = -this.velocity.y * currentBounceHeight;
                this.velocity.x *= currentBounceForwardLoss;
                this.velocity.z *= currentBounceForwardLoss;
            } else {
                // Otherwise, stop vertical movement entirely and apply calculated roll friction
                this.velocity.y = 0;
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