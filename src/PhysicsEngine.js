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
        this.obstacles = []; // Add this line
        this.isStuckInBush = false;
    }

    // NEW: Receives the shuffled configurations from the map setup
    setGreenContours(back, mid, front, centerZ) {
        this.backZone = back;
        this.midZone = mid;
        this.frontZone = front;
        this.greenCenterZ = centerZ;

        // Randomize fairway/rough course contours for the new hole
        this.courseSeedX1 = Math.random() * 50; // Add this line
        this.courseSeedZ1 = Math.random() * 50; // Add this line
        this.courseSeedX2 = Math.random() * 50; // Add this line
        this.courseSeedZ2 = Math.random() * 50; // Add this line

        this.obstacles = []; // Add this line to store the trees and bushes

        // Add this block to handle the random spawning rules
        this.generateObstacles = function (teeX, teeZ, holeX, holeZ, courseWidth, courseDepth) {
            const YARDS_TO_UNITS = 1; // Change 1 to match your game's coordinate scale if 1 unit != 1 yard
            const safeZoneLimit = 100 * YARDS_TO_UNITS;
            const totalObstaclesToSpawn = 50; // Adjust this number for more or fewer objects on the course

            for (let i = 0; i < totalObstaclesToSpawn; i++) {
                let sampleX = Math.random() * courseWidth;
                let sampleZ = Math.random() * courseDepth;

                // 100-Yard Safe Zone Guard
                let distToTee = Math.hypot(sampleX - teeX, sampleZ - teeZ);
                let distToHole = Math.hypot(sampleX - holeX, sampleZ - holeZ);
                if (distToTee < safeZoneLimit || distToHole < safeZoneLimit) {
                    continue; // Skip this spawn if it's too close to Tee or Hole
                }

                // Get the terrain type at these coordinates
                let terrainType = this.getTerrainType(sampleX, sampleZ);
                let fairwayRoll = Math.random();

                // Spawn conditions: 100% in rough, 5% of the time in fairway
                if (terrainType === 'rough' || (terrainType === 'fairway' && fairwayRoll <= 0.05)) {
                    let isTree = Math.random() > 0.4; // 60% chance tree, 40% chance bush

                    if (isTree) {
                        this.obstacles.push({
                            type: 'tree',
                            x: sampleX,
                            z: sampleZ,
                            trunkRadius: 1.0 + Math.random() * 1.5,
                            trunkHeight: 8 + Math.random() * 4,
                            foliageRadius: 4.0 + Math.random() * 3.0,
                            totalHeight: 25 + Math.random() * 15
                        });
                    } else {
                        this.obstacles.push({
                            type: 'bush',
                            x: sampleX,
                            z: sampleZ,
                            radius: 3.0 + Math.random() * 3.5
                        });
                    }
                }
            }
        };

        // Occasional big feature toggle (60% chance of a major hill or drop-off)
        this.hasBigFeature = Math.random() > 0.4; // Add this line
        this.bigFeatureX = (Math.random() - 0.5) * 25; // Add this line
        this.bigFeatureZ = this.greenCenterZ + 40 + Math.random() * 120; // Add this line
        this.bigFeatureScale = (Math.random() > 0.5 ? 1.6 : -1.6) * (1.0 + Math.random() * 1.2); // Add this line
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
    } // Find this closing bracket of getGreenHeight

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
        const gX = x;
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
        let currentBounceForwardLoss = 0.80;

        // FIXED: Dynamically calculate the 3D ground height beneath the ball's current coordinates
        const greenHeightOffset = this.getGroundHeight(this.ball.position.x, this.ball.position.z);
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
        if (this.isPutting) {
            currentFriction = 0.99; // Add this block (Balances distance perfectly for half-speed roll)
        }

        // Determine if the ball is currently airborne relative to the dynamic 3D slope height
        const isAirborne = this.ball.position.y > groundY || this.velocity.y > 0;
        let timeScale = isAirborne ? 0.6 : 1.0;

        // FIXED: Slows down the visual travel speed of the putt while preserving distance perfectly
        const puttSpeedFactor = 0.45; // Tweak this value! Lower (e.g. 0.35) = slower travel, Higher (e.g. 0.6) = faster travel.
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

            // NEW: Continuous 3D gradient vector checks when rolling across the contoured tiers
            // Delete 'if (onGreen) {' from here
            const delta = 0.1;
            const hL = this.getGroundHeight(this.ball.position.x - delta, this.ball.position.z); // Update this line
            const hR = this.getGroundHeight(this.ball.position.x + delta, this.ball.position.z); // Update this line
            const hB = this.getGroundHeight(this.ball.position.x, this.ball.position.z - delta); // Update this line
            const hF = this.getGroundHeight(this.ball.position.x, this.ball.position.z + delta); // Update this line

            // Calculates precise slope forces pulling the ball downhill based on local mesh angles
            this.slopeX = ((hL - hR) / (2 * delta)) * 0.015 * 0.5;
            this.slopeZ = ((hB - hF) / (2 * delta)) * 0.015 * 0.5;

            // FIXED: Scales the step acceleration down to ensure the breaking curve remains structurally identical
            if (this.isPutting) {
                this.slopeX *= puttSpeedFactor;
                this.slopeZ *= puttSpeedFactor;
            }

            // Change this section below:
            this.velocity.x += this.slopeX;
            this.velocity.z += this.slopeZ;

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
            if (obs.type === 'bush' && distance < obs.radius) {
                let speed = this.velocity.length();
                if (speed < 0.25) {
                    // Trapped inside: stop ball completely and raise penalty flag
                    this.velocity.set(0, 0, 0);
                    this.isMoving = false;
                    this.isStuckInBush = true;

                    // Move the ball safely outside the bush boundary along its exit normal vector
                    let angle = Math.atan2(dz, dx);
                    this.ball.position.x = obs.x + (obs.radius + 0.4) * Math.cos(angle);
                    this.ball.position.z = obs.z + (obs.radius + 0.4) * Math.sin(angle);
                    this.ball.position.y = this.getGroundHeight(this.ball.position.x, this.ball.position.z) + 0.25;
                    break;
                } else {
                    // High speed entry: Punches through but drops 50% horizontal velocity to heavy drag friction
                    this.velocity.x *= 0.5;
                    this.velocity.z *= 0.5;
                }
            }

            // --- TREE MECHANICS ---
            if (obs.type === 'tree') {
                // 1. Lower Trunk Height Zone Collision Check
                if (this.ball.position.y <= obs.trunkHeight && distance < obs.trunkRadius) {
                    let alpha = Math.atan2(this.velocity.z, this.velocity.x);
                    let faceAngle = Math.atan2(-this.velocity.z, -this.velocity.x);
                    let beta = Math.atan2(dz, dx);
                    let diff = beta - faceAngle;
                    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // Normalize radian offset bounds to (-PI, PI)

                    if (Math.abs(diff) < 0.35) {
                        // Dead Center hitting zone: Ricochet directly backwards 
                        this.velocity.x = -this.velocity.x * 0.7;
                        this.velocity.z = -this.velocity.z * 0.7;
                    } else if (diff >= 0.35) {
                        // Right Side hitting zone: Deflect vector outward towards the right side
                        let deflection = alpha + Math.PI - 0.7;
                        let speed = this.velocity.length() * 0.6;
                        this.velocity.x = Math.cos(deflection) * speed;
                        this.velocity.z = Math.sin(deflection) * speed;
                    } else {
                        // Left Side hitting zone: Deflect vector outward towards the left side
                        let deflection = alpha + Math.PI + 0.7;
                        let speed = this.velocity.length() * 0.6;
                        this.velocity.x = Math.cos(deflection) * speed;
                        this.velocity.z = Math.sin(deflection) * speed;
                    }
                    if (this.sounds) this.sounds.play('bounce');
                    break;
                }

                // 2. Upper Leaves & Canopy Height Zone Collision Check
                if (this.ball.position.y > obs.trunkHeight && this.ball.position.y <= obs.totalHeight && distance < obs.foliageRadius) {
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