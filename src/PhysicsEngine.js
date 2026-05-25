export class PhysicsEngine {
    constructor(ballMesh) {
        this.ball = ballMesh;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.friction = 0.98; // Lower numbers slow the ball down faster
        this.gravity = 0.006;  // Pulls the ball back to earth
        this.bounce = 0.40;    // How elastic the bounces are (0.55 = 55% height kept)
        this.wind = new THREE.Vector3(0, 0, 0); // Holds the active 3D wind forces
        this.isMoving = false;
    }

    applyImpulse(power, mouseAngle, cameraForward, cameraRight) {
        const speedScale = 0.018;
        const totalPower = power * speedScale;

        // FIX: Treat the mouse calculation relative to the screen's vertical axis.
        // This ensures that pulling down and flicking UP always moves the ball deep into the screen view.
        // We subtract Math.PI / 2 if your InputHandler treats straight-down as 180 degrees.
        const adjustedAngle = mouseAngle - Math.PI / 2;

        const forwardComponent = -Math.sin(adjustedAngle) * totalPower;
        const sideComponent = Math.cos(adjustedAngle) * totalPower;

        // Combine vectors: Forward movement + Sideways movement
        this.velocity.x = (cameraForward.x * forwardComponent) + (cameraRight.x * sideComponent);
        this.velocity.z = (cameraForward.z * forwardComponent) - (cameraRight.z * sideComponent);

        // Keep your tuned vertical loft height intact
        this.velocity.y = power * 0.045;

        this.isMoving = true;
    }

    update() {
        if (!this.isMoving) return;

        // 1. AIRBORNE PHYSICS (Apply gravity and wind only when above ground)
        if (this.ball.position.y > 0.25 || this.velocity.y > 0) {
            this.velocity.y -= this.gravity;

            // Wind only affects the ball while it's in the air!
            this.velocity.x += this.wind.x;
            this.velocity.z += this.wind.z;
        } else {
            // FIX: If the ball is flat on the grass, apply standard ground friction frame-by-frame 
            // so wind can't pull it backward while it rolls
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
        }

        // 2. MOVE THE BALL
        this.ball.position.add(this.velocity);

        // 3. GROUND COLLISION DETECTION
        if (this.ball.position.y <= 0.25) {
            this.ball.position.y = 0.25; // Snap perfectly to grass level

            // If falling fast enough, bounce!
            if (Math.abs(this.velocity.y) > 0.05) {
                this.velocity.y = -this.velocity.y * this.bounce; // Reverse vertical speed
                this.velocity.x *= 0.8; // Lose a bit of forward speed on bounce impact
                this.velocity.z *= 0.8;
            } else {
                // Otherwise, stop vertical movement entirely and apply standard roll friction
                this.velocity.y = 0;
                this.velocity.x *= this.friction;
                this.velocity.z *= this.friction;
            }
        }

        // 4. STOP CONSTANT LOOPS (Stop ball completely if moving incredibly slow)
        if (this.velocity.length() < 0.01) {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
        }

        // NOTE: Your boundaries reset block at the bottom is safe to leave alone, 
        // though remember your main game loop in main.js handles the 30-unit width 
        // out-of-bounds check now!
    }
}