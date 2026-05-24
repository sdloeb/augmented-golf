export class PhysicsEngine {
    constructor(ballMesh) {
        this.ball = ballMesh;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.friction = 0.98; // Lower numbers slow the ball down faster
        this.gravity = 0.015;  // Pulls the ball back to earth
        this.bounce = 0.55;    // How elastic the bounces are (0.55 = 55% height kept)
        this.wind = new THREE.Vector3(0, 0, 0); // Holds the active 3D wind forces
        this.isMoving = false;
    }

    applyImpulse(power, angle) {
        // NEW: A multiplier to dramatically slow down the forward and side-to-side speed
        const speedScale = 0.04;

        // Apply the speed scale to forward (Z) and side (X) physics
        this.velocity.z = -Math.cos(angle) * power * speedScale;
        this.velocity.x = Math.sin(angle) * power * speedScale;

        // NEW: Balanced upward loft so it creates a perfect visible parabola 
        // without flying off the top edge of your monitor
        this.velocity.y = power * 0.055;

        this.isMoving = true;
    }

    update() {
        if (!this.isMoving) return;

        // NEW: Apply gravity to vertical velocity if the ball is airborne
        if (this.ball.position.y > 0.25 || this.velocity.y > 0) {
            this.velocity.y -= this.gravity;
            // NEW: Push the ball sideways (X) and forward/backward (Z) based on airborne wind
            this.velocity.x += this.wind.x;
            this.velocity.z += this.wind.z;
        }

        // Apply 3D velocity to ball position
        this.ball.position.add(this.velocity);

        // NEW: Ground Collision Detection (0.25 is the radius of the ball)
        if (this.ball.position.y <= 0.25) {
            this.ball.position.y = 0.25; // Snap perfectly to grass level

            // If falling fast enough, bounce!
            if (Math.abs(this.velocity.y) > 0.05) {
                this.velocity.y = -this.velocity.y * this.bounce; // Reverse vertical speed
                this.velocity.x *= 0.8; // Lose a bit of forward speed on impact
                this.velocity.z *= 0.8;
            } else {
                // Otherwise, stop vertical movement entirely and just roll out with friction
                this.velocity.y = 0;
                this.velocity.multiplyScalar(this.friction);
            }
        }

        // Stop the ball completely if moving incredibly slow
        if (this.velocity.length() < 0.01) {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
        }

        // Boundaries reset (Modified to leave Y alone)
        if (Math.abs(this.ball.position.x) > 25 || Math.abs(this.ball.position.z) > 100) {
            this.ball.position.set(0, 0.25, 10);
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
        }
    }
}