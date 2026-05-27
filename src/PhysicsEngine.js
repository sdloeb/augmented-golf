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
        this.backZone = { rx: 0, rz: 0 };
        this.midZone = { rx: 0, rz: 0 };
        this.frontZone = { rx: 0, rz: 0 };
    }

    // NEW: Receives the shuffled configurations from the map setup
    setGreenContours(back, mid, front, centerZ) {
        this.backZone = back;
        this.midZone = mid;
        this.frontZone = front;
        this.greenCenterZ = centerZ;
    }

    // Analytical height function that calculates 3D elevations anywhere on the green
    getGreenHeight(x, z) {
        const dz = z - this.greenCenterZ;
        const dx = x;
        const distanceSq = dx * dx + dz * dz;

        // Out of bounds safety fallback
        if (distanceSq >= 144) return 0;

        const r = Math.sqrt(distanceSq);

        // 1. Calculate smooth transition blending weights along the Z axis (Front to Back)
        let wBack = Math.max(0, Math.min(1, (-dz - 1.5) / 5));
        let wFront = Math.max(0, Math.min(1, (dz - 1.5) / 5));
        wBack = wBack * wBack * (3 - 2 * wBack);
        wFront = wFront * wFront * (3 - 2 * wFront);
        let wMid = 1 - wBack - wFront;

        // 2. Accumulate the active randomized slope breaks across the tiers
        const hBack = this.backZone.rx * dx + this.backZone.rz * dz;
        const hMid = this.midZone.rx * dx + this.midZone.rz * dz;
        const hFront = this.frontZone.rx * dx + this.frontZone.rz * dz;
        const rawSlopeHeight = hBack * wBack + hMid * wMid + hFront * wFront;

        // 3. NEW: Add a protective circular plateau mound foundation (+0.5 units at center)
        // This keeps downhill valleys elevated safely above the flat infinite floor sheet
        const basePlateau = 0.20 * (1.0 - (distanceSq / 144));
        const combinedHeight = basePlateau + rawSlopeHeight;

        // 4. Smoothly taper the outer edge of the mound to lock flush with the fairway turf
        const edgeFade = Math.min(1, Math.max(0, (12.0 - r) / 2.0));
        const smoothFade = edgeFade * edgeFade * (3 - 2 * edgeFade);

        // Mathematical floor guard ensures the mesh can never drop below baseline ground level
        return Math.max(0.001, combinedHeight * smoothFade);
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
        let currentBounceHeight = this.bounce;
        let currentBounceForwardLoss = 0.80;

        // FIXED: Dynamically calculate the 3D ground height beneath the ball's current coordinates
        const greenHeightOffset = this.getGreenHeight(this.ball.position.x, this.ball.position.z);
        const groundY = 0.25 + greenHeightOffset;

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
            currentFriction = 0.80;
            currentBounceHeight = 0.12;
            currentBounceForwardLoss = 0.30;
        }
        else if (!onGreen && Math.abs(this.ball.position.x) >= 9.0) {
            currentFriction = 0.92;
            currentBounceHeight = 0.12;
            currentBounceForwardLoss = 0.45;
        }

        // Determine if the ball is currently airborne relative to the dynamic 3D slope height
        const isAirborne = this.ball.position.y > groundY || this.velocity.y > 0;
        const timeScale = isAirborne ? 0.6 : 1.0;

        // 1. AIRBORNE PHYSICS 
        if (isAirborne) {
            this.velocity.y -= this.gravity * timeScale;

            if (!this.isPutting) {
                this.velocity.x += this.wind.x * timeScale;
                this.velocity.z += this.wind.z * timeScale;

                let bounceWindMultiplier = 1.0;
                if (this.ball.position.y < groundY + 1.25) {
                    bounceWindMultiplier = 0.20;
                }

                this.velocity.x += this.wind.x * bounceWindMultiplier * timeScale;
                this.velocity.z += this.wind.z * bounceWindMultiplier * timeScale;
            }
        } else {
            // Apply ground surface friction
            this.velocity.x *= currentFriction;
            this.velocity.z *= currentFriction;

            // NEW: Continuous 3D gradient vector checks when rolling across the contoured green tiers
            if (onGreen) {
                const delta = 0.1;
                const hL = this.getGreenHeight(this.ball.position.x - delta, this.ball.position.z);
                const hR = this.getGreenHeight(this.ball.position.x + delta, this.ball.position.z);
                const hB = this.getGreenHeight(this.ball.position.x, this.ball.position.z - delta);
                const hF = this.getGreenHeight(this.ball.position.x, this.ball.position.z + delta);

                // Calculates precise slope forces pulling the ball downhill based on local mesh angles
                this.slopeX = ((hL - hR) / (2 * delta)) * 0.015;
                this.slopeZ = ((hB - hF) / (2 * delta)) * 0.015;

                // Change this section below:
                this.velocity.x += this.slopeX;
                this.velocity.z += this.slopeZ;

            }
        }

        // 2. MOVE THE BALL 
        this.ball.position.x += this.velocity.x * timeScale;
        this.ball.position.y += this.velocity.y * timeScale;
        this.ball.position.z += this.velocity.z * timeScale;

        // 3. GROUND COLLISION & HAZARD DETECTION
        if (this.ball.position.y <= groundY) {
            this.ball.position.y = groundY; // Snap perfectly onto the contoured elevation curves

            for (let water of this.waterHazards) {
                const dx = this.ball.position.x - water.position.x;
                const dz = this.ball.position.z - water.position.z;
                if (Math.sqrt(dx * dx + dz * dz) < water.geometry.parameters.radius) {
                    this.velocity.set(0, 0, 0);
                    this.isMoving = false;
                    if (this.sounds) this.sounds.play('water');
                    this.hitWater = true;
                    return;
                }
            }

            if (Math.abs(this.velocity.y) > 0.05) {
                if (this.sounds) this.sounds.play('bounce');
                this.velocity.y = -this.velocity.y * currentBounceHeight;
                this.velocity.x *= currentBounceForwardLoss;
                this.velocity.z *= currentBounceForwardLoss;
            } else {
                this.velocity.y = 0;
                this.velocity.x *= currentFriction;
                this.velocity.z *= currentFriction;
            }
        }

        // 4. STOP CONSTANT LOOPS 
        if (this.velocity.length() < 0.01) {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
            this.isPutting = false;
        }
    }
}