export class PhysicsEngine {
    constructor(ballMesh) {
        this.ball = ballMesh;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.friction = 0.88; // Lower numbers slow the ball down faster
        this.gravity = 0.006;  // Pulls the ball back to earth
        this.bounce = 0.40;    // How elastic the bounces are (0.55 = 55% height kept)
        this.wind = new THREE.Vector3(0, 0, 0); // Holds the active 3D wind forces
        this.isMoving = false;
        this.sandTraps = [];
        this.waterHazards = [];
        this.hitWater = false;
        this.isPutting = false;
        this.holePosition = new THREE.Vector3(0, 0.25, -55);
        this.greenCenterX = 0;
        this.greenCenterZ = -55;
        this.slopeX = 0;
        this.slopeZ = 0;
        this.backZone = { rx: 0, rz: 0 };
        this.midZone = { rx: 0, rz: 0 };
        this.frontZone = { rx: 0, rz: 0 };
        this.obstacles = [];
        this.isStuckInBush = false;
        this.fairwayPoints = [];
        this.hasLanded = false;
        this.fairwayWidth = 9.0;
    }

    // NEW: Receives the shuffled configurations from the map setup
    setGreenContours(back, mid, front, centerX, centerZ, randomWidth) {
        this.backZone = back;
        this.midZone = mid;
        this.frontZone = front;
        this.greenCenterX = centerX;
        this.greenCenterZ = centerZ;
        this.fairwayWidth = randomWidth || 9.0;

        // Randomize fairway/rough course contours for the new hole
        this.courseSeedX1 = Math.random() * 50; // Add this line
        this.courseSeedZ1 = Math.random() * 50; // Add this line
        this.courseSeedX2 = Math.random() * 50; // Add this line
        this.courseSeedZ2 = Math.random() * 50; // Add this line

        this.obstacles = []; // Add this line to store the trees and bushes



        // Occasional big feature toggle (60% chance of a major hill or drop-off)
        this.hasBigFeature = Math.random() > 0.4; // Add this line
        this.bigFeatureX = (Math.random() - 0.5) * 25; // Add this line
        this.bigFeatureZ = this.greenCenterZ + 40 + Math.random() * 120; // Add this line
        this.bigFeatureScale = (Math.random() > 0.5 ? 1.6 : -1.6) * (1.0 + Math.random() * 1.2); // Add this line
    }

    // Analytical height function that calculates 3D elevations anywhere on the green
    getGreenHeight(x, z) {
        const dz = z - this.greenCenterZ;
        const dx = x - this.greenCenterX;
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
    } // Find this closing bracket of getGreenHeight

    // Add this method: Calculates distance from any coordinate to our curved spline path
    getDistanceToSpline(x, z) {
        if (!this.fairwayPoints || this.fairwayPoints.length === 0) {
            return Math.abs(x); // Fallback to straight line if path isn't loaded yet
        }
        let minDist = Infinity;
        for (let i = 0; i < this.fairwayPoints.length; i++) {
            const p = this.fairwayPoints[i];
            const dx = x - p.x;
            const dz = z - p.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist) {
                minDist = dist;
            }
        }
        return minDist;
    }

    // NEW: Analytical height function for fairway and rough contours
    getCourseHeight(x, z) {
        const dxTee = x - 0;
        const dzTee = z - 10;
        const distFromTee = Math.sqrt(dxTee * dxTee + dzTee * dzTee);
        let teeFade = Math.min(1, Math.max(0, (distFromTee - 8) / 10)); // Keeps Tee Box flat

        // Base undulating small mounds and dips (mostly flat, natural ripples)
        const wave1 = Math.sin(x * 0.05 + (this.courseSeedX1 || 0)) * Math.cos(z * 0.03 + (this.courseSeedZ1 || 0));
        const wave2 = Math.cos(x * 0.10 + (this.courseSeedX2 || 0)) * Math.sin(z * 0.06 + (this.courseSeedZ2 || 0));
        let height = (wave1 * 1.8 + wave2 * 0.9);

        // Occasional larger feature (big hill or drop-off)
        if (this.hasBigFeature) {
            const dxBig = x - this.bigFeatureX;
            const dzBig = z - this.bigFeatureZ;
            const distBigSq = dxBig * dxBig + dzBig * dzBig;
            const bigInfluence = Math.exp(-distBigSq / 2500); // Spread across the course width
            height += (this.bigFeatureScale || 0) * 1.8 * bigInfluence; // Change this line
        }

        let xFade = Math.min(1, Math.max(0, (30 - Math.abs(x)) / 6)); // Add this line
        return Math.max(0.001, height * teeFade * xFade); // Change this line
    }

    // NEW: Unified ground height method that blends course and green transitions seamlessly
    getGroundHeight(x, z) {
        const gX = x - this.greenCenterX;
        const gZ = z - this.greenCenterZ;
        const distFromGreen = Math.sqrt(gX * gX + gZ * gZ);

        let baseHeight = 0; // Add this line
        if (distFromGreen < 12.0) {
            baseHeight = this.getGreenHeight(x, z); // Add this line
        } else {
            const courseHeight = this.getCourseHeight(x, z);
            if (distFromGreen < 16.0) {
                // Between 12 and 16 units out, blend smoothly from 0 to course height
                const blend = (distFromGreen - 12.0) / 4.0;
                baseHeight = courseHeight * blend; // Add this line
            } else {
                baseHeight = courseHeight; // Add this line
            }
        }

        // Apply water hazard physical terrain shifts so the physics engine drops the ball into the basin
        this.waterHazards.forEach(water => { // Add this line
            const dxW = x - water.position.x; // Add this line
            const dzW = z - water.position.z; // Add this line
            const distToWater = Math.sqrt(dxW * dxW + dzW * dzW); // Add this line
            const lakeRadius = water.userData && water.userData.radius ? water.userData.radius : 5; // Add this line
            // FIXED: Lowered offset from 0.06 to 0.01 to match the clean, compressed visual floating height
            const centerLakeHeight = water.position.y - 0.01; // Add this line

            if (distToWater < lakeRadius + 0.6) { // Add this line
                baseHeight = centerLakeHeight; // Add this line
                if (distToWater < lakeRadius - 0.4) { // Add this line
                    baseHeight -= 1.2; // Add this line
                } // Add this line
            } else if (distToWater < lakeRadius + 2.5) { // Add this line
                const blendFactor = (distToWater - (lakeRadius + 0.6)) / 1.9; // Add this line
                baseHeight = THREE.MathUtils.lerp(centerLakeHeight, baseHeight, blendFactor); // Add this line
            } // Add this line
        }); // Add this line

        return baseHeight; // Add this line
    }

    applyImpulse(power, mouseAngle, cameraForward, cameraRight, isPutting = false, spin = 0, loft = 0.042) {
        const speedScale = 0.069;
        const totalPower = power * speedScale;

        // 1. SAVE THE RAW SPIN VALUE FOR REAL-TIME AERODYNAMICS
        this.spin = isPutting ? 0 : spin;
        this.hasLanded = false;
        this.currentLoft = isPutting ? 0 : loft;

        // 2. ROTATE THE INITIAL TRAJECTORY OUTWARDS
        let adjustedAngle = mouseAngle;
        if (!isPutting && spin !== 0) {
            if (spin < 0) {
                // FADE (Negative spin): Pushes initial launch direction to the RIGHT
                adjustedAngle = mouseAngle - (spin * 0.006);
            } else {
                // SLICE (Positive spin): Pushes initial launch direction significantly further LEFT at start
                adjustedAngle = mouseAngle - (spin * 0.012);
            }
        }

        // Calculate horizontal components using our newly adjusted starting angle
        const forwardComponent = Math.cos(adjustedAngle) * totalPower;
        const sideComponent = Math.sin(adjustedAngle) * totalPower;

        // Combine vectors
        this.velocity.x = (cameraForward.x * forwardComponent) + (cameraRight.x * sideComponent);
        this.velocity.z = (cameraForward.z * forwardComponent) + (cameraRight.z * sideComponent);

        // If we are putting, completely kill vertical velocity. Otherwise, apply normal loft height.
        if (isPutting) {
            this.velocity.y = 0;
            this.velocity.x *= 0.5;
            this.velocity.z *= 0.5;
        } else {
            // Calculates low-piercing woods vs high-popping wedges
            this.velocity.y = power * loft;

            const horizontalAdjustment = 1.0 / (loft * 18.0);
            this.velocity.x *= horizontalAdjustment;
            this.velocity.z *= horizontalAdjustment;
        }
        this.isPutting = isPutting;
        this.isMoving = true;
    }

    update() {
        if (!this.isMoving) return;

        // 0. SURFACE PHYSICS PARAMETERS CHECK
        let currentFriction = this.friction;
        let currentBounceHeight = this.bounce;
        let currentBounceForwardLoss = 0.38;

        // FIXED: Dynamically calculate the 3D ground height beneath the ball's current coordinates
        const greenHeightOffset = this.getGroundHeight(this.ball.position.x, this.ball.position.z);
        const groundY = 0.25 + greenHeightOffset;

        const gX = this.ball.position.x - this.greenCenterX;
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

        // Modify this block: Calculates if the ball is inside the green fringe circle or behind the green center
        const relX = this.ball.position.x - this.greenCenterX;
        const relZ = this.ball.position.z - this.greenCenterZ;
        const distToGreenCenter = Math.sqrt(relX * relX + relZ * relZ); // Add this line
        const approachDot = (this.approachDirX !== undefined) ? (relX * this.approachDirX + relZ * this.approachDirZ) : -999;
        const isPastFairway = (distToGreenCenter < 11.0) || (approachDot > 0); // Modify this line

        // CHIP & DRIVE TERRAIN PROFILE MATRIX
        if (inSand) {
            currentFriction = 0.72;
            currentBounceHeight = 0.10;
            currentBounceForwardLoss = 0.25;
        }
        else if (onGreen) {
            // Receptive Green Landing: Base calibrations optimized for wedges
            currentBounceHeight = 0.22;
            currentBounceForwardLoss = 0.35;
            currentFriction = 0.965;

            // NEW: If it's a full shot (not a putt) adjust behavior based on landing loft angle
            if (!this.isPutting && this.currentLoft) {
                // A lower loft value (Driver = 0.040) means less vertical check, more forward skid
                // A higher loft value (SW = 0.063) naturally preserves your high biting check-up settings
                const loftRatio = Math.max(0.4, Math.min(1.5, this.currentLoft / 0.063));

                // Low loft clubs get higher bounce resilience and much less forward speed loss (skidding out)
                currentBounceHeight = 0.22 * (2.0 - loftRatio);
                currentBounceForwardLoss = THREE.MathUtils.lerp(0.75, 0.35, (loftRatio - 0.6) / 0.9);
            }
        }
        else if (this.getDistanceToSpline(this.ball.position.x, this.ball.position.z) <= this.fairwayWidth && this.ball.position.z <= -8.0 && !isPastFairway) { // Modify this line: Added && !isPastFairway
            // Crisp Fairway Turf: True bouncing elasticity, predictable roll out
            // Crisp Fairway Turf: True bouncing elasticity, predictable roll out
            currentFriction = 0.91;
            currentBounceHeight = 0.36;
            currentBounceForwardLoss = 0.52;   // Preserves strong forward kinetic velocity
        }
        else {
            // Deep Course Rough: Dense grass absorbs energy completely
            currentFriction = 0.74;            // Heavy friction brakes rolling momentum fast
            currentBounceHeight = 0.18;        // Deadened bounce height
            currentBounceForwardLoss = 0.30;   // Strongly strips forward speed on ground contact
        }

        if (this.isPutting) {
            currentFriction = 0.984; // Preserves your exact putting calibration constant
        }

        // Determine if the ball is currently airborne relative to the dynamic 3D slope height
        const isAirborne = this.ball.position.y > groundY || this.velocity.y > 0;
        let timeScale = isAirborne ? 0.6 : 1.0;

        // FIXED: Increased from 0.45 to 0.70. This makes the ball roll 55% faster visually (snappy out of the gate)
        // while the math automatically preserves the exact 80ft calibrated distance limit.
        const puttSpeedFactor = 0.70;
        if (!isAirborne && this.isPutting) {
            timeScale *= puttSpeedFactor;
            currentFriction = 1.0 - puttSpeedFactor * (1.0 - currentFriction);
        }

        // 1. AIRBORNE PHYSICS 
        if (isAirborne) {
            this.velocity.y -= this.gravity * timeScale;

            // APPLY AIR DRAG: Smoothly reduces forward/side speeds to simulate wind resistance
            this.velocity.x *= 0.993;
            this.velocity.z *= 0.993;

            // CALCULATE TRUE PERPENDICULAR AERODYNAMIC SPIN (Magnus Effect)
            if (this.spin && this.spin !== 0) {
                const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                if (horizSpeed > 0.01) {
                    // Generates a vector pointing exactly 90-degrees perpendicular to the current flight path
                    const perpX = -this.velocity.z / horizSpeed;
                    const perpZ = this.velocity.x / horizSpeed;

                    // FIXED: Increased Slice from 0.00034 to 0.00048. 
                    // This gives the ball enough mid-air aerodynamic pull to overcome the initial leftward push 
                    // and carry the ball completely past the straight center line onto the right side!
                    const curveCoeff = this.spin < 0 ? 0.00062 : 0.00092;
                    const sideForceMagnitude = this.spin * curveCoeff * horizSpeed;

                    this.velocity.x += perpX * sideForceMagnitude * timeScale;
                    this.velocity.z += perpZ * sideForceMagnitude * timeScale;
                }

                // Spin decay rate keeps spin active through the descent
                this.spin *= 0.975;
            }

            if (!this.isPutting) {
                // FIXED: Direct wind to 0.0 permanently if the ball has touched the ground, bypassing high bounce loops
                let bounceWindMultiplier = this.hasLanded ? 0.0 : 1.0;

                if (!this.hasLanded && this.ball.position.y < groundY + 1.25) {
                    bounceWindMultiplier = 0.20;
                }

                this.velocity.x += this.wind.x * bounceWindMultiplier * timeScale;
                this.velocity.z += this.wind.z * bounceWindMultiplier * timeScale;
            }
        } else {
            // Apply ground surface friction
            this.velocity.x *= currentFriction;
            this.velocity.z *= currentFriction;

            // NEW: Continuous 3D gradient vector checks when rolling across the contoured tiers
            const delta = 0.1;
            const hL = this.getGroundHeight(this.ball.position.x - delta, this.ball.position.z);
            const hR = this.getGroundHeight(this.ball.position.x + delta, this.ball.position.z);
            const hB = this.getGroundHeight(this.ball.position.x, this.ball.position.z - delta);
            const hF = this.getGroundHeight(this.ball.position.x, this.ball.position.z + delta);

            // Calculates precise slope forces pulling the ball downhill based on local mesh angles
            this.slopeX = ((hL - hR) / (2 * delta)) * 0.015 * 0.5;
            this.slopeZ = ((hB - hF) / (2 * delta)) * 0.015 * 0.5;

            // FIXED: Scaled by timeScale so gravity forces accumulate in the exact same time dimension as rolling friction
            this.velocity.x += this.slopeX * timeScale;
            this.velocity.z += this.slopeZ * timeScale;

        }

        // 2. MOVE THE BALL 
        this.ball.position.x += this.velocity.x * timeScale;
        this.ball.position.y += this.velocity.y * timeScale;
        this.ball.position.z += this.velocity.z * timeScale;

        // --- NEW: INTERACTIVE OBSTACLES PHYSICS ENGINE ---
        for (let i = 0; i < this.obstacles.length; i++) {
            let obs = this.obstacles[i];
            let dx = this.ball.position.x - obs.x;
            let dz = this.ball.position.z - obs.z;
            let distance = Math.sqrt(dx * dx + dz * dz);

            // --- BUSH MECHANICS ---
            let bushGroundY = this.getGroundHeight(obs.x, obs.z); // Add this line
            if (obs.type === 'bush' && distance < (obs.radius + 0.25) && this.ball.position.y <= (bushGroundY + obs.radius + 0.25)) { // Change this line
                let speed = this.velocity.length();
                if (speed < 0.25) {
                    // Trapped inside: stop ball completely and raise penalty flag
                    this.velocity.set(0, 0, 0);
                    this.isMoving = false;
                    this.isStuckInBush = true;

                    /// Trapped inside: stop ball completely, raise penalty flag, and vanish inside the foliage
                    this.ball.visible = false; // Change this line: Hide it directly inside the bush mass

                    // Calculate the safe position outside the bush to be used after the alert is dismissed
                    let angle = Math.atan2(dz, dx);
                    this.bushResetX = obs.x + (obs.radius + 1.8) * Math.cos(angle); // Change this line
                    this.bushResetZ = obs.z + (obs.radius + 1.8) * Math.sin(angle); // Change this line
                    break;
                } else {
                    // High speed entry: Continuous drag friction so powerful shots can survive and exit the bush radius
                    this.velocity.x *= 0.92; // Change this line
                    this.velocity.z *= 0.92; // Change this line
                }
            }

            // --- TREE MECHANICS ---
            if (obs.type === 'tree') {
                // 1. Lower Trunk Height Zone Collision Check
                if (this.ball.position.y <= obs.trunkHeight && distance < (obs.trunkRadius + 0.25)) { // Change this line: Added ball radius cushion
                    let alpha = Math.atan2(this.velocity.z, this.velocity.x);
                    let faceAngle = Math.atan2(-this.velocity.z, -this.velocity.x);
                    let beta = Math.atan2(dz, dx);
                    let diff = beta - faceAngle;
                    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // Normalize radian offset bounds to (-PI, PI)

                    if (Math.abs(diff) < 0.35) {
                        // Dead Center hitting zone: Ricochet directly backwards 
                        this.velocity.x = -this.velocity.x * 0.3;
                        this.velocity.z = -this.velocity.z * 0.3;
                    } else if (diff >= 0.35) {
                        // Right Side hitting zone: Deflect vector outward towards the right side
                        let deflection = alpha + Math.PI - 0.7;
                        let speed = this.velocity.length() * 0.35;
                        this.velocity.x = Math.cos(deflection) * speed;
                        this.velocity.z = Math.sin(deflection) * speed;
                    } else {
                        // Left Side hitting zone: Deflect vector outward towards the left side
                        let deflection = alpha + Math.PI + 0.7;
                        let speed = this.velocity.length() * 0.35;
                        this.velocity.x = Math.cos(deflection) * speed;
                        this.velocity.z = Math.sin(deflection) * speed;
                    }

                    // Prevent sticky multi-frame trunk vibrations by snapping ball coordinates clear of the boundary
                    let pushAngle = Math.atan2(dz, dx); // Add this line
                    this.ball.position.x = obs.x + (obs.trunkRadius + 0.26) * Math.cos(pushAngle); // Add this line
                    this.ball.position.z = obs.z + (obs.trunkRadius + 0.26) * Math.sin(pushAngle); // Add this line

                    if (this.sounds) this.sounds.play('bounce');
                    break;
                }

                // 2. Upper Leaves & Canopy Height Zone Collision Check
                let canopyCenterY = obs.trunkHeight + (obs.foliageRadius * 0.7); // Add this line: Calculate the vertical center point of the canopy leaves sphere
                let dyFoliage = this.ball.position.y - canopyCenterY; // Add this line: Get the vertical distance from the ball to the canopy center
                let distance3D = Math.sqrt(dx * dx + dyFoliage * dyFoliage + dz * dz); // Add this line: Calculate true 3D straight-line distance to the canopy center

                if (distance3D < (obs.foliageRadius + 0.25)) { // Modify this line: Replaced the flat cylinder bounds with a realistic 3D sphere check
                    let foliageTotalSpan = obs.totalHeight - obs.trunkHeight;
                    let ballRelativeFoliageY = this.ball.position.y - obs.trunkHeight;

                    if (ballRelativeFoliageY >= foliageTotalSpan * 0.95) {
                        // Top 5% Clip Zone: Pass through clean but encounter a 25% overhead slowdown
                        this.velocity.x *= 0.75;
                        this.velocity.z *= 0.75;
                    } else {
                        // Heavy Canopy Core Zone: Strip forward momentum completely and let gravity drop it straight down
                        this.velocity.x = 0;
                        this.velocity.z = 0;
                        if (this.velocity.y > 0) this.velocity.y = 0;
                    }
                    break;
                }
            }
        }

        // 3. GROUND COLLISION & HAZARD DETECTION
        if (this.ball.position.y <= groundY) {
            this.ball.position.y = groundY; // Snap perfectly onto the contoured elevation curves
            this.hasLanded = true;

            for (let water of this.waterHazards) {
                const dx = this.ball.position.x - water.position.x;
                const dz = this.ball.position.z - water.position.z;

                // FIXED: Reads from userData.radius instead of geometry parameters because of PlaneGeometry conversion
                const lakeRadius = water.userData && water.userData.radius ? water.userData.radius : 5;

                if (Math.sqrt(dx * dx + dz * dz) < lakeRadius - 0.15) {
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
                // FIXED: Removed the duplicate currentFriction multipliers. Ground rolling friction
                // is already applied once per frame up in Section 1, preventing unnatural drag behavior.
                this.velocity.y = 0;
            }
        }

        // 4. STOP CONSTANT LOOPS 
        // UPDATED: Putts get a higher threshold (0.024) to simulate real grass blades capturing 
        // the ball at low speeds, completely eliminating the unnatural micro-creeping at the end.
        const stopThreshold = this.isPutting ? 0.024 : 0.012;
        if (this.velocity.length() < stopThreshold && this.ball.position.y <= groundY) {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
            this.isPutting = false;
        }
    }
}