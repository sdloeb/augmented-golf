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
        this.currentSurface = 'Tee Box';
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
        this.slopeProfile = null;
        this.obstacles = [];
        this.isStuckInBush = false;
        this.hasHitObstacleOnShot = false;
        this.fairwayPoints = [];
        this.hasLanded = false;
        this.fairwayWidth = 9.0;

        // FIXED: Track the number of landing impacts to silence rolling hill ripples
        this.bounceCount = 0;
    }

    isBallInSand() {
        if (!this.sandTraps || this.sandTraps.length === 0) return false;

        for (let sand of this.sandTraps) {
            if (sand.userData && sand.userData.isCollar) continue;
            if (sand.userData && sand.userData.isPolygon) {
                const points = sand.userData.points;
                let inside = false;
                let minEdgeDistSq = Infinity;
                for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                    const xi = points[i].x, zi = points[i].z;
                    const xj = points[j].x, zj = points[j].z;
                    const intersect = ((zi > this.ball.position.z) !== (zj > this.ball.position.z))
                        && (this.ball.position.x < (xj - xi) * (this.ball.position.z - zi) / (zj - zi) + xi);
                    if (intersect) inside = !inside;

                    const l2 = (xi - xj) * (xi - xj) + (zi - zj) * (zi - zj) || 0.0001;
                    let t = ((this.ball.position.x - xi) * (xj - xi) + (this.ball.position.z - zi) * (zj - zi)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    const projX = xi + t * (xj - xi);
                    const projZ = zi + t * (zj - zi);
                    const distSq = (this.ball.position.x - projX) ** 2 + (this.ball.position.z - projZ) ** 2;
                    if (distSq < minEdgeDistSq) minEdgeDistSq = distSq;
                }
                // 1.2 units edge margin ensures sloped bunker walls are fully recognized
                if (inside) return true;
            } else {
                const dx = this.ball.position.x - sand.position.x;
                const dz = this.ball.position.z - sand.position.z;
                const sandRadius = sand.userData && sand.userData.radius ? sand.userData.radius : 5;
                if (dx * dx + dz * dz < sandRadius * sandRadius) return true;
            }
        }
        return false;
    }

    isBallInSandCollar(collarWidth = 0.7) {
        if (!this.sandTraps || this.sandTraps.length === 0) return false;
        if (this.isBallInSand()) return false;

        const bx = this.ball.position.x;
        const bz = this.ball.position.z;

        for (let sand of this.sandTraps) {
            if (sand.userData && sand.userData.isCollar) continue;

            if (sand.userData && sand.userData.isPolygon) {
                const points = sand.userData.points;
                let minDistSq = Infinity;
                for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                    const xi = points[i].x, zi = points[i].z;
                    const xj = points[j].x, zj = points[j].z;
                    const l2 = (xi - xj) ** 2 + (zi - zj) ** 2 || 0.0001;
                    let t = ((bx - xi) * (xj - xi) + (bz - zi) * (zj - zi)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    const projX = xi + t * (xj - xi);
                    const projZ = zi + t * (zj - zi);
                    const distSq = (bx - projX) ** 2 + (bz - projZ) ** 2;
                    if (distSq < minDistSq) minDistSq = distSq;
                }
                if (Math.sqrt(minDistSq) <= collarWidth) return true;
            } else {
                const dx = bx - sand.position.x;
                const dz = bz - sand.position.z;
                const sandRadius = sand.userData && sand.userData.radius ? sand.userData.radius : 5;
                const dist = Math.hypot(dx, dz);
                if (dist <= sandRadius + collarWidth) return true;
            }
        }
        return false;
    }

    // NEW: Receives the shuffled configurations from the map setup
    setGreenContours(profileOrBack, midOrCenterX, frontOrCenterZ, centerXOrWidth, centerZ, randomWidth) {
        if (profileOrBack && typeof profileOrBack === 'object' && ('backLeft' in profileOrBack || 'features' in profileOrBack || 'back' in profileOrBack || 'rx' in profileOrBack)) {
            if ('rx' in profileOrBack) {
                // Legacy 3-zone call fallback
                this.backZone = profileOrBack;
                this.midZone = midOrCenterX || { rx: 0, rz: 0 };
                this.frontZone = frontOrCenterZ || { rx: 0, rz: 0 };
                this.slopeProfile = {
                    backLeft: this.backZone, backRight: this.backZone,
                    midLeft: this.midZone, midRight: this.midZone,
                    frontLeft: this.frontZone, frontRight: this.frontZone
                };
                this.greenCenterX = centerXOrWidth;
                this.greenCenterZ = centerZ;
                this.fairwayWidth = randomWidth || 8.5;
            } else {
                // New 6-zone / Feature Profile call
                this.slopeProfile = profileOrBack;
                this.backZone = profileOrBack.back || profileOrBack.backLeft || { rx: 0, rz: 0 };
                this.midZone = profileOrBack.mid || profileOrBack.midLeft || { rx: 0, rz: 0 };
                this.frontZone = profileOrBack.front || profileOrBack.frontLeft || { rx: 0, rz: 0 };
                this.greenCenterX = midOrCenterX;
                this.greenCenterZ = frontOrCenterZ;
                this.fairwayWidth = centerXOrWidth || 8.5;
            }
        } else {
            this.backZone = profileOrBack || { rx: 0, rz: 0 };
            this.midZone = midOrCenterX || { rx: 0, rz: 0 };
            this.frontZone = frontOrCenterZ || { rx: 0, rz: 0 };
            this.greenCenterX = centerXOrWidth;
            this.greenCenterZ = centerZ;
            this.fairwayWidth = randomWidth || 8.5;
        }

        // Randomize fairway/rough course contours for the new hole
        this.courseSeedX1 = Math.random() * 50;
        this.courseSeedZ1 = Math.random() * 50;
        this.courseSeedX2 = Math.random() * 50;
        this.courseSeedZ2 = Math.random() * 50;

        this.obstacles = [];

        // Occasional big feature toggle (60% chance of a major hill or drop-off)
        this.hasBigFeature = Math.random() > 0.4;
        this.bigFeatureX = (Math.random() - 0.5) * 25;
        this.bigFeatureZ = this.greenCenterZ + 40 + Math.random() * 120;
        this.bigFeatureScale = (Math.random() > 0.5 ? 1.6 : -1.6) * (1.0 + Math.random() * 1.2);
    }

    getGreenHeight(x, z) {
        const dz = z - this.greenCenterZ;
        const dx = x - this.greenCenterX;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(-dz, dx);

        // Dynamically compute the shape extent boundary for this specific location angle
        const activeRadius = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(angle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : (window.activeGreenRadius || 12.0);

        // Out of bounds safety fallback
        if (dist >= activeRadius) return 0;

        const distanceSq = dist * dist;
        const r = dist;

        // 1. Calculate smooth transition blending weights along Z axis (Front to Back)
        let wBack = Math.max(0, Math.min(1, (-dz - 1.5) / 5));
        let wFront = Math.max(0, Math.min(1, (dz - 1.5) / 5));
        wBack = wBack * wBack * (3 - 2 * wBack);
        wFront = wFront * wFront * (3 - 2 * wFront);
        let wMid = 1 - wBack - wFront;

        // 2. Calculate smooth transition blending weights along X axis (Left to Right)
        let wRight = Math.max(0, Math.min(1, (dx + 2.5) / 5));
        let smoothWRight = wRight * wRight * (3 - 2 * wRight);
        let smoothWLeft = 1.0 - smoothWRight;

        // Fetch 6-zone profiles (or fallback to 3-zone / default)
        const prof = this.slopeProfile || {};
        const bl = prof.backLeft || prof.back || this.backZone || { rx: 0, rz: 0 };
        const br = prof.backRight || prof.back || this.backZone || { rx: 0, rz: 0 };
        const ml = prof.midLeft || prof.mid || this.midZone || { rx: 0, rz: 0 };
        const mr = prof.midRight || prof.mid || this.midZone || { rx: 0, rz: 0 };
        const fl = prof.frontLeft || prof.front || this.frontZone || { rx: 0, rz: 0 };
        const fr = prof.frontRight || prof.front || this.frontZone || { rx: 0, rz: 0 };

        const hBL = (bl.rx || 0) * dx + (bl.rz || 0) * dz;
        const hBR = (br.rx || 0) * dx + (br.rz || 0) * dz;
        const hML = (ml.rx || 0) * dx + (ml.rz || 0) * dz;
        const hMR = (mr.rx || 0) * dx + (mr.rz || 0) * dz;
        const hFL = (fl.rx || 0) * dx + (fl.rz || 0) * dz;
        const hFR = (fr.rx || 0) * dx + (fr.rz || 0) * dz;

        const rawSlopeHeight = (hBL * wBack * smoothWLeft) +
            (hBR * wBack * smoothWRight) +
            (hML * wMid * smoothWLeft) +
            (hMR * wMid * smoothWRight) +
            (hFL * wFront * smoothWLeft) +
            (hFR * wFront * smoothWRight);

        // 3. Accumulate custom local features (mounds, bowls, ridges, tiers)
        let featureHeight = 0;
        const features = prof.features || [];
        for (let i = 0; i < features.length; i++) {
            const feat = features[i];
            const fType = feat.type || 'mound';
            if (fType === 'mound' || fType === 'bowl') {
                const fx = feat.x || 0;
                const fz = feat.z || 0;
                const fRad = feat.radius || 5.0;
                const fAmp = (fType === 'mound') ? (feat.height || 0.1) : -(feat.depth || feat.height || 0.1);
                const fDist = Math.sqrt((dx - fx) * (dx - fx) + (dz - fz) * (dz - fz));
                if (fDist < fRad) {
                    const factor = (1.0 + Math.cos((fDist / fRad) * Math.PI)) * 0.5;
                    featureHeight += fAmp * factor;
                }
            } else if (fType === 'tier' || fType === 'step') {
                const pos = feat.position || 0;
                const width = feat.width || 3.0;
                const height = feat.height || 0.15;
                const axis = feat.axis || 'z';
                const val = (axis === 'z') ? dz : dx;
                const t = Math.max(0, Math.min(1, (val - (pos - width / 2)) / width));
                const smoothStep = t * t * (3 - 2 * t);
                featureHeight += height * smoothStep;
            } else if (fType === 'ridge') {
                const p1 = feat.p1 || { x: -5, z: 0 };
                const p2 = feat.p2 || { x: 5, z: 0 };
                const rWidth = feat.width || 4.0;
                const rHeight = feat.height || 0.12;
                const l2 = (p2.x - p1.x) * (p2.x - p1.x) + (p2.z - p1.z) * (p2.z - p1.z) || 0.001;
                const tProj = Math.max(0, Math.min(1, ((dx - p1.x) * (p2.x - p1.x) + (dz - p1.z) * (p2.z - p1.z)) / l2));
                const projX = p1.x + tProj * (p2.x - p1.x);
                const projZ = p1.z + tProj * (p2.z - p1.z);
                const rDist = Math.sqrt((dx - projX) * (dx - projX) + (dz - projZ) * (dz - projZ));
                if (rDist < rWidth) {
                    const factor = (1.0 + Math.cos((rDist / rWidth) * Math.PI)) * 0.5;
                    featureHeight += rHeight * factor;
                }
            }
        }

        // 4. Circular plateau mound foundation (+0.20 units at center)
        const basePlateau = 0.20 * (1.0 - (distanceSq / (activeRadius * activeRadius)));

        let ripples = 0;
        if (this.currentHoleNumber === 1) {
            ripples = Math.sin(dx * 0.55) * Math.cos(dz * 0.55) * 0.04 +
                Math.cos(dx * 1.10) * Math.sin(dz * 1.10) * 0.015;
        }

        const combinedHeight = basePlateau + rawSlopeHeight + featureHeight + ripples;

        // 5. Smoothly taper the outer edge of the mound to lock flush with the fairway turf
        const edgeFade = Math.min(1, Math.max(0, (activeRadius - r) / 2.0));
        const smoothFade = edgeFade * edgeFade * (3 - 2 * edgeFade);

        return Math.max(0.001, combinedHeight * smoothFade);
    }
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


    updateGreenPosition(x, z) {
        this.greenCenterX = x;
        this.greenCenterZ = z;
    }



    getCourseHeight(x, z) {
        if (this.currentHoleNumber === 3) {
            let baseHeight = 0.3; // Default lower fairway height

            // Hill starts at -115 and completes its full climb over 21.5 units to finish at -136.5 (~120 yards out)
            if (z <= -115 && z >= -136.5) {
                let t = (-115 - z) / 21.5;
                let smoothSlope = t * t * (3 - 2 * t);
                baseHeight = 0.3 + (smoothSlope * 8.2);
            } else if (z < -136.5) {
                baseHeight = 8.5; // Flat plateau from 120 yards out all the way to the putting green
            } else {
                baseHeight = 0.3;  // Lift initial fairway above water level
            }


            // 2. Track the dynamic center line path to build the right-side cliff face line
            let pathCenter = 0;
            if (z >= -125) {
                let t = (10 - z) / 135;
                pathCenter = THREE.MathUtils.lerp(0, -14.0, t); // CHANGED: Recalculates course altitude lines relative to left fairway extension
            } else {
                let t = (-125 - z) / 55;
                t = Math.min(1.0, t);
                pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t); // CHANGED: Recalculates course altitude lines relative to left fairway extension
            }

            // 3. Carve the sudden vertical cliff drop-off on the right side (Positive X)
            let cliffEdgeLimit;

            if (z < -115) {
                // LOCK: Provide a wide shelf for bunkers by locking the edge to 20.0
                cliffEdgeLimit = 20.0;
            } else {
                // STANDARD: Follow the path center with standard padding
                let pathCenter = 0;
                if (z >= -125) {
                    let t = (10 - z) / 135;
                    pathCenter = THREE.MathUtils.lerp(0, -14.0, t); // CHANGED: Recalculates drop-off coordinates symmetrically
                } else {
                    let t = (-125 - z) / 55;
                    t = Math.min(1.0, t);
                    pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t); // CHANGED: Recalculates drop-off coordinates symmetrically
                }
                cliffEdgeLimit = pathCenter + 15.5;
            }

            // Apply the drop-off to sea level
            if (x > cliffEdgeLimit && z <= -51.75) {
                return 0.001;
            }


            // Smooth out the left rough boundary map lines to prevent clipping gaps
            let leftSideFade = Math.min(1, Math.max(0, (80 - Math.abs(x)) / 15));
            return Math.max(0.001, baseHeight * leftSideFade);
        }
        /* End of added block */

        const dxTee = x - 0; // This line should naturally sit directly below the block
        const dzTee = z - 10;
        const distFromTee = Math.sqrt(dxTee * dxTee + dzTee * dzTee);
        let teeFade = Math.min(1, Math.max(0, (distFromTee - 8) / 10)); // Keeps Tee Box flat

        // --- CUSTOM HOLE 2 RUNOUT AND HIGHER BUMPY ROUGH ---
        if (this.currentHoleNumber === 2) {
            let baseHeight = 0.0;


            // 1. Tee starts at the peak elevation. Fairway goes down a hill for 100+ yards with organic transitions and a sightline window
            if (z > 5) {
                baseHeight = 37.5;
            } else if (z >= -60) {
                let t = (5 - z) / 65;
                let smoothT = t * t * (3 - 2 * t); // Smoothstep rounding formula to eliminate the sharp geometric ridge lines
                baseHeight = THREE.MathUtils.lerp(37.5, 0.0, smoothT);
            } else {
                baseHeight = 0.0;
            }

            // CREATE A SADDLE: Smoothly dips the center line (x = 0) right at the hill crest to frame the fairway view
            if (z > -15 && z < 6) {
                let xDist = Math.abs(x);
                if (xDist < 16) {
                    let saddleFactor = 1.0 - (xDist / 16);
                    saddleFactor = saddleFactor * saddleFactor * (3 - 2 * saddleFactor); // Smooth bell distribution for the valley dip

                    let zDist = Math.abs(z - 4);
                    let zFade = Math.max(0, 1.0 - (zDist / 12)); // Limits the scoop to the edge of the ridge line

                    // Lowers the ridge center by ~6.5 units, giving you a beautiful "U-shaped" window to aim through
                    baseHeight -= 6.5 * saddleFactor * zFade;
                }
            }


            // 2. Right side is a smooth rising hill that goes up to the right side of the screen
            if (x > this.fairwayWidth && z < 15 && z > -118) { // Update this line
                let hillIncline = (x - this.fairwayWidth) * 0.25; // Add this line: Continuous upward slope going right
                if (z < -100) {
                    let fade = (z - (-118)) / (-100 - (-118)); // Smoothly interpolates from 1.0 down to 0.0
                    hillIncline *= Math.max(0, Math.min(1, fade));
                }
                baseHeight += hillIncline; // Add this line
            } // Update this line

            let xFade = Math.min(1, Math.max(0, (60 - Math.abs(x)) / 10)); // Modify this line: Expand left rough boundary to eliminate the steep cliff edge
            if (x > 0) xFade = Math.min(1, Math.max(0, (60 - x) / 10)); // Keep this line
            // Removed teeFade so your custom 4.5 baseline peak elevation stays locked at the tee box
            return Math.max(0.001, baseHeight * xFade);

        }

        // --- BALLYNEAL HOLE 7 ROLLING SAND DUNING & HILLS ---
        if (this.currentHoleNumber === 7) {
            let baseHeight = 0.0;

            // 1. Perched Tee Box (+4.5 units = +15 ft)
            if (z > 5) {
                baseHeight = 4.5;
            } else if (z >= -25) {
                let t = (5 - z) / 30;
                let smoothT = t * t * (3 - 2 * t);
                baseHeight = THREE.MathUtils.lerp(4.5, 0.0, smoothT);
            }

            // 2. Smooth rolling sand dunes framing Left and Right rough boundaries
            let distFromCenter = Math.abs(x);
            let fairwayEdge = (this.fairwayWidth || 15.0) * 0.85; // Starts rising gently outside fairway
            if (distFromCenter > fairwayEdge) {
                let tDune = Math.min(1.0, (distFromCenter - fairwayEdge) / 55.0);
                let smoothDune = tDune * tDune * (3 - 2 * tDune);
                let duneWave = Math.sin(z * 0.06 + x * 0.05) * 1.2 + Math.cos(z * 0.09) * 0.8;
                baseHeight += (smoothDune * 13.0) + (Math.max(0, duneWave) * smoothDune);
            }

            // 3. Smooth, gentle natural rise at the 325-yd right split hazard (z = -85 to -135)
            if (z <= -85 && z >= -135 && x > 0) {
                let zDist = Math.abs(z - (-110.0));
                let zFactor = Math.max(0.0, 1.0 - (zDist / 25.0));
                let smoothZ = zFactor * zFactor * (3 - 2 * zFactor);

                let xDist = Math.abs(x - 9.0);
                let xFactor = Math.max(0.0, 1.0 - (xDist / 12.0));
                let smoothX = xFactor * xFactor * (3 - 2 * xFactor);

                baseHeight += 1.0 * smoothZ * smoothX; // Gentle 3 ft roll instead of steep mound
            }

            // 4. Natural undulating fairway moguls (subtle links ripples)
            let fairwayMoguls = Math.sin(x * 0.15) * Math.cos(z * 0.10) * 0.25 + Math.cos(x * 0.22 + z * 0.16) * 0.15;
            baseHeight += fairwayMoguls;

            let xFade = Math.min(1, Math.max(0, (90 - Math.abs(x)) / 10));
            return Math.max(0.001, baseHeight * xFade);
        }



        if (this.currentHoleNumber === 8) {
            let baseHeight = 0.0;

            // 1. Perched Tee Box (0 to 72 yds / z = 10 to -16)
            if (z > 5) {
                baseHeight = 3.5;
            } else if (z >= -16) {
                let t = (5 - z) / 21.0;
                let smoothT = t * t * (3 - 2 * t);
                baseHeight = 3.5 * (1.0 - smoothT);
            }
            // 2. Valley & Fairway 1 Landing Zone (72 to 275 yds / z = -16 to -89.5) -> flat at 0.0
            else if (z > -89.5) {
                baseHeight = 0.0;
            }
            // Step 1: Rise over Bunker 1 (z = -89.5 to -94.5) -> 0.0 to 2.125
            else if (z >= -94.5) {
                let t = (-89.5 - z) / 5.0;
                let smoothT = t * t * (3 - 2 * t);
                baseHeight = 2.125 * smoothT;
            }
            // Step 1 Flat Fairway 1 (z = -94.5 to -108.9, 40 yds) -> 100% FLAT at 2.125
            else if (z > -108.9) {
                baseHeight = 2.125;
            }
            // Step 2: Rise over Bunker 2 (z = -108.9 to -113.9) -> 2.125 to 4.25
            else if (z >= -113.9) {
                let t = (-108.9 - z) / 5.0;
                let smoothT = t * t * (3 - 2 * t);
                baseHeight = 2.125 + 2.125 * smoothT;
            }
            // Step 2 Flat Fairway 2 (z = -113.9 to -128.3, 40 yds) -> 100% FLAT at 4.25
            else if (z > -128.3) {
                baseHeight = 4.25;
            }
            // Step 3: Rise over Bunker 3 (z = -128.3 to -133.3) -> 4.25 to 6.375
            else if (z >= -133.3) {
                let t = (-128.3 - z) / 5.0;
                let smoothT = t * t * (3 - 2 * t);
                baseHeight = 4.25 + 2.125 * smoothT;
            }
            // Step 3 Flat Fairway 3 (z = -133.3 to -147.7, 40 yds) -> 100% FLAT at 6.375
            else if (z > -147.7) {
                baseHeight = 6.375;
            }
            // Step 4: Rise over Bunker 4 (z = -147.7 to -152.7) -> 6.375 to 8.5
            else if (z >= -152.7) {
                let t = (-147.7 - z) / 5.0;
                let smoothT = t * t * (3 - 2 * t);
                baseHeight = 6.375 + 2.125 * smoothT;
            }
            // Green Plateau (z = -152.7 to -170.7, Green center at z = -161.2) -> flat at 8.5
            else if (z >= -161.7) {
                baseHeight = 8.5;
            }
            // Smooth Downslope behind green (z = -170.7 to -198.7) -> rolls gradually down to 0.0
            else {
                let t = Math.min(1.0, (-161.7 - z) / 35.0);
                let smoothT = t * t * (3 - 2 * t);
                baseHeight = 8.5 * (1.0 - smoothT);
            }

            // Side hills framing the rough corridor
            let distFromCenter = Math.abs(x);
            let fairwayEdge = 13.0;
            if (distFromCenter > fairwayEdge) {
                let tSide = Math.min(1.0, (distFromCenter - fairwayEdge) / 35.0);
                let smoothSide = tSide * tSide * (3 - 2 * tSide);
                baseHeight += smoothSide * 4.5;
            }

            let xFade = Math.min(1, Math.max(0, (75 - Math.abs(x)) / 10));
            return Math.max(0.001, baseHeight * xFade);
        }

        // Base undulating small mounds and dips (mostly flat, natural ripples)
        const wave1 = Math.sin(x * 0.05 + (this.courseSeedX1 || 0)) * Math.cos(z * 0.03 + (this.courseSeedZ1 || 0));
        const wave2 = Math.cos(x * 0.10 + (this.courseSeedX2 || 0)) * Math.sin(z * 0.06 + (this.courseSeedZ2 || 0));
        let height = (wave1 * 1.8 + wave2 * 0.9);
        // Intercept Hole 1 and Hole 4 to clear out random mountains and set subtle, fixed fairway ripples
if (this.currentHoleNumber === 6) {
            // Pronounced, fixed rolling hills across the Oakmont fairway
            const roll1 = Math.sin(z * 0.035) * 1.8;                    // Long swells down the fairway
            const roll2 = Math.cos(x * 0.07 + z * 0.025) * 1.2;         // Diagonal rolling crests across width
            const roll3 = Math.sin(x * 0.12 + z * 0.06) * 0.5;          // Secondary terrain undulations
            height = roll1 + roll2 + roll3;

            this.hasBigFeature = false; // Prevents random extreme cliffs/canyons
        }
        else if (this.currentHoleNumber === 1 || this.currentHoleNumber === 4 || this.currentHoleNumber === 5 || this.currentHoleNumber === 7 || this.currentHoleNumber === 8) {
            const flatWave1 = Math.sin(x * 0.06) * Math.cos(z * 0.04);
            const flatWave2 = Math.cos(x * 0.12) * Math.sin(z * 0.08);

            // Reduced multipliers for an ultra-flat fairway with clear line-of-sight
            height = (flatWave1 * 0.05 + flatWave2 * 0.02);

            this.hasBigFeature = false; // Disables big random mountain features
        }

        // Occasional larger feature (big hill or drop-off)
        if (this.hasBigFeature) {
            const dxBig = x - this.bigFeatureX;
            const dzBig = z - this.bigFeatureZ;
            const distBigSq = dxBig * dxBig + dzBig * dzBig;
            const bigInfluence = Math.exp(-distBigSq / 2500); // Spread across the course width
            height += (this.bigFeatureScale || 0) * 1.8 * bigInfluence; // Change this line
        }

        // FIXED: Dynamically expand course width masking limits so wide 90-degree dogleg layouts (Holes 4 and 5) don't fall off into a flat zero-height void
        let maxLayoutWidth = 30;
        if (this.fairwayPoints && this.fairwayPoints.length > 0) {
            this.fairwayPoints.forEach(p => {
                const absX = Math.abs(p.x);
                if (absX > maxLayoutWidth) maxLayoutWidth = absX;
            });
        }
        const dynamicBoundary = maxLayoutWidth + (this.fairwayWidth || 9.0) + 12.0;

        let xFade = Math.min(1, Math.max(0, (dynamicBoundary - Math.abs(x)) / 10));
        return Math.max(0.001, height * teeFade * xFade); // Change this line
    }

    // FIXED UNIFIED HEIGHTMAP: Carves out smooth, deep 3D valleys for hazards cleanly in a single pass
    getGroundHeight(x, z) {
        const gX = x - this.greenCenterX;
        const gZ = z - this.greenCenterZ;
        const distFromGreen = Math.sqrt(gX * gX + gZ * gZ);
        const angle = Math.atan2(-gZ, gX);
        const activeRadius = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(angle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : (window.activeGreenRadius || 12.0);

        // MODIFIED: Base height is always the course elevation. If inside the green radius, we seamlessly stack the green contours on top.
        // This completely eliminates the pedestal drop-off and seals the giant canyon hole behind the green.
        let baseHeight = this.getCourseHeight(x, z);

        // NEW: Sculpt a raised step-up plateau specifically around Hole 1's green complex
        if (this.currentHoleNumber === 1) {
            // Sculpt an elevated earth berm / backstop mound behind the green
            const relX = x - this.greenCenterX;
            const relZ = z - this.greenCenterZ;
            if (relZ < -13.0 && relZ > -40.0 && Math.abs(relX) < 32.0) {
                const zCenter = -24.0;
                const zRadius = 11.0;
                const xRadius = 30.0;
                const dzBerm = Math.abs(relZ - zCenter);
                const dxBerm = Math.abs(relX);
                if (dzBerm < zRadius && dxBerm < xRadius) {
                    const factorZ = (1.0 + Math.cos((dzBerm / zRadius) * Math.PI)) * 0.5;
                    const factorX = (1.0 + Math.cos((dxBerm / xRadius) * Math.PI)) * 0.5;
                    baseHeight += 3.2 * factorZ * factorX;
                }
            }
            const platformRadius = activeRadius + 4.5; // Starts rising 4.5 units before the green rim
            if (distFromGreen < platformRadius) {
                const tPlateau = Math.min(1.0, (platformRadius - distFromGreen) / 4.5);
                const smoothPlateau = tPlateau * tPlateau * (3 - 2 * tPlateau);
                baseHeight += smoothPlateau * 0.70; // Seamlessly raises the entire green 0.70 units high
            }
        }

        // Smoothly blend green elevation and contours outward past the fringe onto the apron mound (3.0 units wide)
        const outerApronRadius = activeRadius + 3.0;
        if (distFromGreen < outerApronRadius) {
            const greenContour = this.getGreenHeight(x, z);
            if (distFromGreen < activeRadius) {
                baseHeight += greenContour;
            } else {
                // Taper green contours smoothly down to fairway/rough floor level
                const tApron = (distFromGreen - activeRadius) / 3.0;
                const smoothApron = 1.0 - (tApron * tApron * (3 - 2 * tApron));
                baseHeight += greenContour * smoothApron;
            }
        }

        // 1. Apply water hazard physical terrain shifts so the physics engine drops the ball into the basin
        if (this.waterHazards && this.waterHazards.length > 0) {
            this.waterHazards.forEach(water => {
                // MODIFIED: Constrained the rectangular ocean check to only apply to coordinates past our curved cliff face line
                if (water.userData && water.userData.isRectangular) {
                    let pathCenter = 0;
                    if (z >= -125) {
                        let t = (10 - z) / 135;
                        pathCenter = THREE.MathUtils.lerp(0, -14.0, t); // CHANGED: Matches heightmap terrain calculations to new path bounds
                    } else {
                        let t = (-125 - z) / 55;
                        t = Math.min(1.0, t);
                        pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t); // CHANGED: Matches heightmap terrain calculations to new path bounds
                    }

                    // Modify these lines to blend the edge limit smoothly:
                    let cliffPadding = 15.5;
                    if (z < -115) { cliffPadding = THREE.MathUtils.lerp(15.5, 10.5, Math.max(0, Math.min(1, (-115 - z) / 20.0))); }
                    const cliffEdgeLimit = pathCenter + cliffPadding;

                    if (x > cliffEdgeLimit && x <= water.position.x + water.userData.w / 2 &&
                        z >= water.position.z - water.userData.l / 2 && z <= water.position.z + water.userData.l / 2) {
                        baseHeight = water.position.y - 0.01;
                    }
                } else {
                    const dxW = x - water.position.x;
                    const dzW = z - water.position.z;
                    const distToWater = Math.sqrt(dxW * dxW + dzW * dzW);

                    const rx = water.userData.radiusX || water.userData.radius || 5;
                    const rz = water.userData.radiusZ || water.userData.radius || 5;
                    const wAngle = Math.atan2(dzW, dxW);
                    const lakeRadius = (rx * rz) / Math.sqrt((rz * Math.cos(wAngle)) ** 2 + (rx * Math.sin(wAngle)) ** 2);

                    const centerLakeHeight = water.position.y - 0.01;

                    if (distToWater < lakeRadius) {
                        // Keep island green and fringe elevated above the lake water
                        if (distFromGreen >= activeRadius + 2.0) {
                            baseHeight = centerLakeHeight;
                            if (distToWater < lakeRadius - 0.4) {
                                baseHeight -= 1.2;
                            }
                        }
                    } else if (distToWater < lakeRadius + 4.0) {
                        // Smoothly slope your natural rolling hills down to meet the water rim over 4 units
                        const t = Math.max(0, Math.min(1, (distToWater - lakeRadius) / 4.0));
                        const smoothT = t * t * (3 - 2 * t);
                        baseHeight = THREE.MathUtils.lerp(centerLakeHeight, baseHeight, smoothT);
                    }
                }
            });
        }

        // 2. Apply sand trap 3D parabolic depressions to carve smooth, seamless craters into the heightmap
        if (this.sandTraps && this.sandTraps.length > 0) {
            let maxSandDrop = 0;
            this.sandTraps.forEach(sand => {
                if (sand.userData && sand.userData.isCollar) return;
                let drop = 0;
                // Restores full natural bunker depth
                const sandDepth = sand.userData && sand.userData.depth ? sand.userData.depth : 0.8;

                if (sand.userData && sand.userData.isPolygon) {
                    const points = sand.userData.points;
                    let inside = false;
                    let minEdgeDistSq = Infinity;
                    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                        const xi = points[i].x, zi = points[i].z;
                        const xj = points[j].x, zj = points[j].z;
                        const intersect = ((zi > z) !== (zj > z))
                            && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
                        if (intersect) inside = !inside;

                        const l2 = (xi - xj) * (xi - xj) + (zi - zj) * (zi - zj) || 0.0001;
                        let t = ((x - xi) * (xj - xi) + (z - zi) * (zj - zi)) / l2;
                        t = Math.max(0, Math.min(1, t));
                        const projX = xi + t * (xj - xi);
                        const projZ = zi + t * (zj - zi);
                        const distSq = (x - projX) ** 2 + (z - projZ) ** 2;
                        if (distSq < minEdgeDistSq) minEdgeDistSq = distSq;
                    }
                    const edgeDist = Math.sqrt(minEdgeDistSq);
                    if (inside) {
                        if (edgeDist < 1.5) {
                            drop = sandDepth * (edgeDist / 1.5);
                        } else {
                            drop = sandDepth;
                        }
                    }
                } else {
                    const dxS = x - sand.position.x;
                    const dzS = z - sand.position.z;
                    const distToSand = Math.sqrt(dxS * dxS + dzS * dzS);

                    const baseRadius = sand.userData && sand.userData.radius ? sand.userData.radius : 5;
                    const transitionMargin = (this.currentHoleNumber === 8 ? 0.0 : 2.2);
                    const sandRadius = baseRadius + transitionMargin;

                    if (distToSand < sandRadius) {
                        const flatRadius = Math.max(0.5, baseRadius * 0.30);

                        if (distToSand <= flatRadius) {
                            drop = sandDepth;
                        } else {
                            const t = (distToSand - flatRadius) / (sandRadius - flatRadius);
                            const smoothSlope = t * t * (3 - 2 * t);
                            drop = THREE.MathUtils.lerp(sandDepth, 0.0, smoothSlope);
                        }
                    }
                }
                if (drop > maxSandDrop) maxSandDrop = drop;
            });
            baseHeight -= maxSandDrop;
        }
        return baseHeight;
    }

    applyImpulse(power, mouseAngle, cameraForward, cameraRight, isPutting = false, spin = 0, loft = 0.042) {
        const speedScale = 0.069;
        const totalPower = power * speedScale;

        // 1. SAVE THE RAW SPIN VALUE FOR REAL-TIME AERODYNAMICS

        this.spin = isPutting ? 0 : spin;
        this.hasLanded = false;
        this.hasHitObstacleOnShot = false; // NEW: Reset tracking flag for a clean new shot path
        this.currentLoft = isPutting ? 0 : loft;

        // 2. ROTATE THE INITIAL TRAJECTORY OUTWARDS
        let adjustedAngle = mouseAngle;


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

        // FIXED: Reset the bounce counter on every new stroke launch
        this.bounceCount = 0;
    }

    // ==========================================
    // GLOBAL LENGTHWISE FAIRWAY BOUNDARY CHECKER
    // ==========================================
    isWithinFairwayLongitudinalBounds(z) {
        const holeNum = this.currentHoleNumber || 1;

        if (holeNum === 1) {
            // Hole 1: Visually spans all the way back to the tee box area
            return z <= 15.0;
        }
        if (holeNum === 2) {
            // Hole 2: Downhill drop requires the fairway to start at -60.0
            return z <= -60.0;
        }
        if (holeNum === 3) {
            // Hole 3: Pebble Beach chasm gap exclusions
            return (z <= -20.0 && z > -115.0) || (z <= -132.0 && z >= -180.0);
        }
        if (holeNum === 8) {
            return (z <= -51.4 && z >= -89.5) ||
                (z <= -94.5 && z >= -108.9) ||
                (z <= -113.9 && z >= -128.3) ||
                (z <= -133.3 && z >= -147.7);
        }

        // Global Dynamic Fallback for Hole 4+ (Starts safely at the tee area)
        return z <= 15.0;
    }


    // === REPLACE WITH THIS EXACT BLOCK ===
    update() {
        if (!this.isMoving) return;

        // 0. SURFACE PHYSICS PARAMETERS CHECK
        let currentFriction = this.friction;
        let currentBounceHeight = this.bounce;
        let currentBounceForwardLoss = 0.38;

        // FIXED: Dynamically calculate the 3D ground height beneath the ball's current coordinates
        const greenHeightOffset = this.getGroundHeight(this.ball.position.x, this.ball.position.z);
        let groundY = (0.5 * (this.ball ? this.ball.scale.x : 0.51)) + greenHeightOffset; // Dynamic ground anchor matching ball scale
        const gX = this.ball.position.x - this.greenCenterX;
        const gZ = this.ball.position.z - this.greenCenterZ;
        const ballDist = Math.sqrt(gX * gX + gZ * gZ);
        const ballAngle = Math.atan2(-gZ, gX);
        const currentGreenR = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(ballAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : 12.0;
        const onGreen = ballDist < currentGreenR;

        let inSand = this.isBallInSand();

        // FIXED: Balanced ball physics boundaries to perfectly mirror the new clean front apron green visual limits
        const relX = this.ball.position.x - this.greenCenterX;
        const relZ = this.ball.position.z - this.greenCenterZ;
        const distToGreenCenter = Math.sqrt(relX * relX + relZ * relZ);
        const approachDot = (this.approachDirX !== undefined) ? (relX * this.approachDirX + relZ * this.approachDirZ) : -999;

        const relAngle = Math.atan2(-relZ, relX);
        const activeRadius = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(relAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : (window.activeGreenRadius || 12.0);

        // FIXED: Synchronize physical boundaries with the new visual wide circular throat
        const isPastFairway = (distToGreenCenter < activeRadius) || (approachDot + (distToGreenCenter - activeRadius) * 0.5 > 0);
        let activeFW = this.fairwayWidth;
        const isOnGreenSidesOrBack = false;
        // Mirror the visual apron taper logic to align physical turf borders with mesh alterations
        if (!(this.greenCenterZ < -165 && this.greenCenterZ > -185)) {
            const apronStart = -activeRadius - 12.0;
            const apronEnd = -activeRadius;
            if (approachDot > apronStart && approachDot <= apronEnd) {
                let tApron = (approachDot - apronStart) / 12.0;
                const smoothApron = THREE.MathUtils.smoothstep(tApron, 0, 1);
                const targetApronWidth = Math.max(this.fairwayWidth, activeRadius + 1.0);
                activeFW = THREE.MathUtils.lerp(this.fairwayWidth, targetApronWidth, smoothApron);
            } else if (approachDot > apronEnd) {
                activeFW = Math.max(this.fairwayWidth, activeRadius + 1.0);
            }
        }
        if (this.greenCenterZ < -128 && this.greenCenterZ > -152 && this.ball.position.z < -125) {
            let t = Math.min(1.0, Math.max(0.0, (-125 - this.ball.position.z) / 14.0));
            const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
            activeFW = THREE.MathUtils.lerp(this.fairwayWidth, 16.0, smoothT);
        }

        // Keeps physics fairway wide up the hill climb, tapering smoothly before the bunkers
        if (this.greenCenterZ < -165 && this.greenCenterZ > -185) {
            if (this.ball.position.z <= -20.0 && this.ball.position.z >= -140.0) {
                activeFW = 18.0;
            } else if (this.ball.position.z < -140.0 && this.ball.position.z >= -152.0) {
                let tTaper = (-140.0 - this.ball.position.z) / 12.0;
                const smoothTaper = THREE.MathUtils.smoothstep(tTaper, 0, 1);
                activeFW = THREE.MathUtils.lerp(18.0, 8.0, smoothTaper);
            }
        }

        // Calibrate physical edge to match the exact visual texture intersection point (unified across all screens)
        activeFW += 0.50;

        if (inSand) {
            this.currentSurface = 'Sand Trap';
            currentFriction = 0.70;
            currentBounceHeight = 0.05;          // Minimal bounce height on sand impact
            currentBounceForwardLoss = 0.12;     // Absorbs 88% of forward speed on impact (ball plugs in sand)
        }
        else if (onGreen) {
            this.currentSurface = 'Green';
            currentBounceHeight = 0.12;
            currentBounceForwardLoss = 0.45;
            currentFriction = this.isPutting ? 0.932 : 0.962;

            if (!this.isPutting && this.currentLoft) {
                const loftRatio = Math.max(0.4, Math.min(1.5, this.currentLoft / 0.063));
                currentFriction = THREE.MathUtils.lerp(0.998, 0.952, (loftRatio - 0.4) / 1.1);
                currentBounceHeight = 0.14 * (2.0 - loftRatio);
                if (this.bounceCount === 0) {
                    currentBounceForwardLoss = THREE.MathUtils.lerp(0.95, 0.76, (loftRatio - 0.4) / 1.1);
                } else {
                    currentBounceForwardLoss = 0.97;
                }
            }
        }
        else if (distToGreenCenter >= activeRadius && distToGreenCenter <= (activeRadius + 1.0)) {
            this.currentSurface = 'Fringe';
            currentFriction = 0.94;
            currentBounceHeight = 0.28;
            currentBounceForwardLoss = (this.bounceCount === 0) ? 0.42 : 0.96;
        }
        else if (this.isBallInSandCollar(0.7)) {
            this.currentSurface = 'Rough';
            currentFriction = 0.74;
            currentBounceHeight = 0.18;
            currentBounceForwardLoss = 0.30;
        }
        else if (this.getDistanceToSpline(this.ball.position.x, this.ball.position.z) <= activeFW && !isPastFairway && !isOnGreenSidesOrBack &&
            this.isWithinFairwayLongitudinalBounds(this.ball.position.z)) {
            this.currentSurface = 'Fairway';
            currentFriction = 0.91;
            currentBounceHeight = 0.36;
            currentBounceForwardLoss = (this.bounceCount === 0) ? 0.52 : 0.95;
        }
        else {
            this.currentSurface = 'Rough';
            currentFriction = 0.74;
            currentBounceHeight = 0.18;
            currentBounceForwardLoss = 0.30;

            const bX = this.ball.position.x;
            const bZ = this.ball.position.z;
            const distanceToPath = this.getDistanceToSpline(bX, bZ);

            // Sync with the exact visual boundary parameters from main.js
            const fWEdge = activeFW + 2.26;
            const fringeOuterR = activeRadius + 1.0;

            let floorHeight = greenHeightOffset;

            // A. REPLICATE COLLAR TRANSITION DIP: Matches the micro-slope contours near fairway cuts
            if (distanceToPath <= activeFW) {
                floorHeight -= 0.12;
            } else if (distanceToPath <= fWEdge) {
                const t = (distanceToPath - activeFW) / 3.5;
                const smoothT = THREE.MathUtils.smoothstep(t, 0, 1);
                floorHeight -= THREE.MathUtils.lerp(0.12, 0.0, smoothT);
            }

            // B. REPLICATE ROUGH LIFT: Coordinates the solid +0.3 height block seamlessly across open fields
            let roughLift = 0;
            if (isPastFairway) {
                if (distToGreenCenter > fringeOuterR) {
                    roughLift = 1.0;
                }
            } else {
                if (distanceToPath > activeFW) {
                    roughLift = 1.0;
                }
            }
            floorHeight += roughLift * 0.3;

            // D. ANTICIPATE RESTING SCALE: Use floorHeight so the rolling ball rides perfectly on top of the lifted rough
            const currentBallRadius = 0.25 * this.ball.scale.x;
            groundY = floorHeight + currentBallRadius;
        }

        // Cleaned up putting override loop so it doesn't break approach shot rollouts
        if (this.isPutting) {
            // Allow putting state to remain active across both the putting surface and fringe collar complex
            if (distToGreenCenter > activeRadius + 1.0) {
                // Terminate putting status instantly if it completely leaves the green complex
                this.isPutting = false;
            } else {
                currentFriction = 0.979;
            }
        }

        if (inSand) {
            const bX = this.ball.position.x;
            const bZ = this.ball.position.z;
            const delta = 0.05;
            const hL = this.getGroundHeight(bX - delta, bZ);
            const hR = this.getGroundHeight(bX + delta, bZ);
            const hB = this.getGroundHeight(bX, bZ - delta);
            const hF = this.getGroundHeight(bX, bZ + delta);
            const sX = (hL - hR) / (2 * delta);
            const sZ = (hB - hF) / (2 * delta);
            const localSlope = Math.min(1.0, Math.sqrt(sX * sX + sZ * sZ));

            const ballRadius = 0.25 * this.ball.scale.x;
            const trueFloorH = this.getGroundHeight(bX, bZ);
            groundY = trueFloorH + ballRadius - (ballRadius * 0.15);
      } else if (this.isBallInSandCollar && this.isBallInSandCollar(0.7)) {
            const ballRadius = 0.25 * this.ball.scale.x;
            groundY = this.getGroundHeight(this.ball.position.x, this.ball.position.z) + 0.035 + ballRadius - (ballRadius * 0.15);
        } else if (this.currentSurface === 'Rough') {
            // FIXED: Standardized the height modifier against a stable radius fraction to keep the ball height perfectly even across all rough variations
            groundY -= 0.065 * (this.ball.scale.x / 0.51);
            // Nestles the ball down into your new organic fine grass blade strokes
        }

        // Add this block here: Ground-snapping stickiness now runs safely with the finalized groundY plane
        if (this.ball.position.y > groundY && this.ball.position.y <= groundY + 0.4 && this.velocity.y <= 0.01) {
            this.ball.position.y = groundY;
        }

        // Determine if the ball is currently airborne relative to the dynamic 3D slope height
        // FIXED: Putting strokes are strictly locked to the ground turf to prevent micro-airborne calculations and chattering artifacts
        const isAirborne = !this.isPutting && (this.ball.position.y > groundY || this.velocity.y > 0);
        let timeScale = isAirborne ? 0.6 : 1.0;

        // FIXED: Set speed factor to 0.38 to visually slow down the rolling speed of the ball,
        // giving it a realistic, smooth grass glide while preserving your distance calibration perfectly.
        const puttSpeedFactor = 0.38;
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

            if (this.spin && this.spin !== 0) {
                const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                if (horizSpeed > 0.01) {
                    // Generates a vector pointing exactly 90-degrees perpendicular to the current flight path
                    const perpX = -this.velocity.z / horizSpeed; // Preserved
                    const perpZ = this.velocity.x / horizSpeed; // Preserved

                    // CLOCK SYSTEM AERODYNAMICS: Uniform curve coefficients for smooth intentional shot shaping
                    const curveCoeff = 0.00085; // Modify this line: Creates perfectly symmetric, smooth hooks and slices
                    const sideForceMagnitude = this.spin * curveCoeff * horizSpeed; // Preserved

                    this.velocity.x += perpX * sideForceMagnitude * timeScale; // Preserved
                    this.velocity.z += perpZ * sideForceMagnitude * timeScale; // Preserved
                }

                // Spin decay rate keeps spin active through the descent
                this.spin *= 0.982; // Modify this line: Sustains the spin slightly longer so curves show clearly on descent

            }

            if (!this.isPutting) {
                // REALISM FIX: Wind should only affect the ball when it is genuinely airborne.
                // If the ball is rolling, skimming, or settling near the turf grass line, wind influence drops to zero.
                let bounceWindMultiplier = this.hasLanded ? 0.0 : 1.0;

                const heightAboveGround = this.ball.position.y - groundY;
                if (heightAboveGround <= 0.15) {
                    bounceWindMultiplier = 0.0; // Completely suppresses wind veering for rolling balls/putts
                } else if (heightAboveGround < 1.5) {
                    // Smoothly scale wind drag forces up as the ball achieves true atmospheric flight altitude
                    bounceWindMultiplier *= (heightAboveGround - 0.15) / 1.35;
                }

                this.velocity.x += this.wind.x * bounceWindMultiplier * timeScale;
                this.velocity.z += this.wind.z * bounceWindMultiplier * timeScale;
            }
        } else {
            // 1. Calculate high-precision local 3D terrain slopes
            const delta = 0.05;
            const hL = this.getGroundHeight(this.ball.position.x - delta, this.ball.position.z);
            const hR = this.getGroundHeight(this.ball.position.x + delta, this.ball.position.z);
            const hB = this.getGroundHeight(this.ball.position.x, this.ball.position.z - delta);
            const hF = this.getGroundHeight(this.ball.position.x, this.ball.position.z + delta);

            const rawSlopeX = (hL - hR) / (2 * delta);
            const rawSlopeZ = (hB - hF) / (2 * delta);
            const slopeMagnitude = Math.sqrt(rawSlopeX * rawSlopeX + rawSlopeZ * rawSlopeZ);

            // Preserves legacy slope properties for compatibility with outside rendering tools
            this.slopeX = rawSlopeX * 0.0075;
            this.slopeZ = rawSlopeZ * 0.0075;

            // 2. Scan active sand trap borders using unified visible boundary
            let currentlyInSand = this.isBallInSand() || this.currentSurface === 'Sand Trap';

            // 3. Apply Dynamic Surface Friction Matrix
            if (currentlyInSand) {
                // Heavy realistic sand drag stops the ball quickly everywhere in the bunker (flat or sloped)
                this.velocity.x *= 0.72;
                this.velocity.z *= 0.72;
            } else {
                // Apply standard grass/green/rough friction
                let rollingFriction = currentFriction;

                // If a chip shot is purely rolling on the ground, let it trickle out naturally at low speeds instead of sticking like velcro
                if (!isAirborne && !this.isPutting && rollingFriction < 0.96 && this.velocity.length() < 0.15) {
                    let tTrickle = Math.min(1.0, Math.max(0.0, (0.15 - this.velocity.length()) / 0.12));
                    rollingFriction = THREE.MathUtils.lerp(currentFriction, 0.965, tTrickle);
                }

                this.velocity.x *= rollingFriction;
                this.velocity.z *= rollingFriction;
            }

            // 4. Accumulate Downhill Gravitational Forces
            // Dampen slope gravity pull inside sand so balls hold their position on bunker walls instead of sliding down
            const gravityRollPower = currentlyInSand ? 0.02 : 1.0;

            // Cuts down slope gravity in the rough and fades it out at low speeds so grass catches the ball on hills
            let slopeGravityModifier = 1.0;
            if (!onGreen && !currentlyInSand && this.getDistanceToSpline(this.ball.position.x, this.ball.position.z) > activeFW) {
                const speed = this.velocity.length();
                if (speed < 0.08) {
                    slopeGravityModifier = Math.max(0.0, speed / 0.08) * 0.35;
                } else {
                    slopeGravityModifier = 0.35;
                }
            }

            // NEW: Anti-infinite rolling capture mechanism on green slopes
            // If the ball is crawling slowly on a gentle or moderate tier hill, grass friction overcomes gravity
            // NEW: Anti-infinite rolling capture mechanism on green slopes
            // If the ball is crawling slowly on a gentle or moderate tier hill, grass friction overcomes gravity
            if (onGreen && slopeMagnitude < 0.14) {
                const speed = this.velocity.length();
                if (speed < 0.09) {
                    // Smoothly scale gravity modifier down instead of a hard cut, letting the ball coast naturally
                    let fade = (speed - 0.024) / (0.09 - 0.024);
                    if (fade < 0) fade = 0;
                    if (fade > 1) fade = 1;
                    slopeGravityModifier = fade;

                    // MODIFIED: Balanced hill-lock and short putt launch stabilizer.
                    // We aggressively scale down the hill's gravity pull under 0.050 speed so the ball 
                    // cannot break loose and roll down like ice, but we REMOVE the velocity friction choke 
                    // so short 5-foot putts can launch completely free and smooth.
                    if (speed < 0.050) {
                        let slopeFade = speed / 0.050;
                        slopeGravityModifier *= Math.max(0.0, Math.min(1.0, slopeFade));
                    }


                }
            }

            this.velocity.x += (currentlyInSand ? rawSlopeX : this.slopeX) * gravityRollPower * slopeGravityModifier * timeScale;
            this.velocity.z += (currentlyInSand ? rawSlopeZ : this.slopeZ) * gravityRollPower * slopeGravityModifier * timeScale;
        }

        // 2. MOVE THE BALL 
        this.ball.position.x += this.velocity.x * timeScale;
        this.ball.position.y += this.velocity.y * timeScale;
        this.ball.position.z += this.velocity.z * timeScale;

        // --- NEW: INTERACTIVE OBSTACLES PHYSICS ENGINE ---
        let hitTreeThisFrame = false;
        let hitObstacleThisFrame = false; // NEW: Track generic foliage and branch interactions
        for (let i = 0; i < this.obstacles.length; i++) {
            let obs = this.obstacles[i];
            let dx = this.ball.position.x - obs.x;
            let dz = this.ball.position.z - obs.z;
            let distance = Math.sqrt(dx * dx + dz * dz);

            // --- BUSH MECHANICS ---

            let bushGroundY = this.getGroundHeight(obs.x, obs.z); // Add this line
            if (obs.type === 'bush' && distance < (obs.radius + 0.25) && this.ball.position.y <= (bushGroundY + obs.radius + 0.25)) { // Change this line
                hitObstacleThisFrame = true; // NEW: Turn on obstacle flag on bush interaction
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
                    // REALISM FIX: Heavy inelastic entry. Thick foliage clusters rapidly swallow kinetic energy.
                    // Dramatically dampens multi-frame velocity across all 3 spatial axes instead of gliding elastically.
                    this.velocity.x *= 0.45;
                    this.velocity.z *= 0.45;
                    this.velocity.y *= 0.45;
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
                    let pushAngle = Math.atan2(dz, dx); // Preserved
                    this.ball.position.x = obs.x + (obs.trunkRadius + 0.26) * Math.cos(pushAngle); // Preserved
                    this.ball.position.z = obs.z + (obs.trunkRadius + 0.26) * Math.sin(pushAngle); // Preserved

                    hitTreeThisFrame = true;
                    hitObstacleThisFrame = true; // NEW: Turn on obstacle flag on trunk ricochet
                    if (this.sounds && !this.wasInTree) this.sounds.play('wood');
                    break;
                }

                // 2. Upper Leaves & Canopy Height Zone Collision Check
                let isHit = false; // Add this line
                if (obs.version === 3) { // Add this line: Perfect Cone Collision for Pine Trees
                    if (this.ball.position.y > obs.trunkHeight && this.ball.position.y <= obs.totalHeight) {
                        let t = (this.ball.position.y - obs.trunkHeight) / (obs.totalHeight - obs.trunkHeight);
                        let allowedRadius = obs.foliageRadius * (1.0 - t);
                        if (distance < (allowedRadius * 0.82)) {
                            isHit = true;
                        }
                    }
                } else { // Add this line: Sphere Canopy Collision for Oak/Fork/Bent Trees
                    let canopyCenterY = obs.trunkHeight + (obs.foliageRadius * 0.45);
                    let dyFoliage = this.ball.position.y - canopyCenterY;
                    let distance3D = Math.sqrt(dx * dx + dyFoliage * dyFoliage + dz * dz);
                    // Restrict hit to only trigger if the ball is below the visible crown apex
                    if (distance3D < (obs.foliageRadius * 0.76) && this.ball.position.y <= (obs.trunkHeight + obs.foliageRadius * 1.25)) {
                        isHit = true;
                    }
                }
                if (isHit) {
                    let foliageTotalSpan = obs.totalHeight - obs.trunkHeight;
                    let ballRelativeFoliageY = this.ball.position.y - obs.trunkHeight;

                    // Fire tactical foliage thud/rustle effect upon leaf impact context
                    hitTreeThisFrame = true;
                    hitObstacleThisFrame = true;
                    if (this.sounds && !this.wasInTree) this.sounds.play('trees');

                    if (ballRelativeFoliageY >= foliageTotalSpan * 0.95) {
                        // Top 5% Clip Zone: Grazing outer leaves
                        // Top 5% Clip Zone: Grazing outer leaves
                        this.velocity.x *= 0.65;
                        this.velocity.z *= 0.65;
                        this.velocity.y *= 0.80;
                    } else {
                        // Heavy Canopy Core Zone: Chaotic branch rattling and limb deflections
                        if (this.velocity.y > 0.05) {
                            this.velocity.y *= 0.1; // Halt major upward sky-rocket climbs on entry
                        }

                        // Retain more horizontal velocity so it tumbles forward instead of dropping straight down
                        this.velocity.x *= 0.90;
                        this.velocity.z *= 0.90;

                        // Jitter/Deflect erratically off internal twigs on the horizontal plane
                        this.velocity.x += (Math.random() - 0.5) * 0.002; // Tamed from 0.06 to eliminate heavy zig-zags
                        this.velocity.z += (Math.random() - 0.5) * 0.002; // Tamed from 0.06 to eliminate heavy zig-zags

                        // Control the vertical sift speed through the dense leaf volume

                        if (this.velocity.y < 0) {
                            // Ensure a steady downward fall rate through leaves
                            this.velocity.y = Math.min(this.velocity.y, -0.06);

                            // Occasional horizontal branch deflection without stopping downward fall
                            if (Math.random() < 0.05) {
                                this.velocity.x += (Math.random() - 0.5) * 0.03;
                                this.velocity.z += (Math.random() - 0.5) * 0.03;
                            }
                        }
                    }
                    break;
                }
            }
        }

        this.wasInTree = hitTreeThisFrame;
        if (hitObstacleThisFrame) {
            this.hasHitObstacleOnShot = true; // NEW: Lock persistent flag for the remainder of the shot
        }

        // 3. GROUND COLLISION & HAZARD DETECTION
        if (this.ball.position.y <= groundY) {
            this.ball.position.y = groundY; // Snap perfectly onto the contoured elevation curves
            this.hasLanded = true;

            for (let water of this.waterHazards) {
                // MODIFIED: Check if this is the rectangular ocean box to register a cliffside splash penalty
                if (water.userData && water.userData.isRectangular) {
                    let pathCenter = 0;
                    if (this.ball.position.z >= -125) {
                        let t = (10 - this.ball.position.z) / 135;
                        pathCenter = THREE.MathUtils.lerp(0, -14.0, t); // CHANGED: Syncs the active physical splash/rebound zone limits
                    } else {
                        let t = (-125 - this.ball.position.z) / 55;
                        t = Math.min(1.0, t);
                        pathCenter = THREE.MathUtils.lerp(-14.0, 14.0, t); // CHANGED: Syncs the active physical splash/rebound zone limits
                    }
                    const cliffEdgeLimit = pathCenter + (this.ball.position.z <= -125 ? 10.5 : 15.5);
                    // End of added lines

                    if (this.ball.position.x >= cliffEdgeLimit && this.ball.position.x <= water.position.x + water.userData.w / 2 &&
                        this.ball.position.z >= water.position.z - water.userData.l / 2 && this.ball.position.z <= water.position.z + water.userData.l / 2) {
                        this.hitWater = true;
                        this.velocity.set(0, 0, 0);
                        this.isMoving = false;
                        if (this.sounds) this.sounds.play('water');
                        return;
                    }
                } else {
                    const dxW = this.ball.position.x - water.position.x;
                    const dzW = this.ball.position.z - water.position.z;
                    const distToWater = Math.sqrt(dxW * dxW + dzW * dzW);

                    const rx = water.userData.radiusX || water.userData.radius || 5;
                    const rz = water.userData.radiusZ || water.userData.radius || 5;
                    const wAngle = Math.atan2(dzW, dxW);
                    const lakeRadius = (rx * rz) / Math.sqrt((rz * Math.cos(wAngle)) ** 2 + (rx * Math.sin(wAngle)) ** 2);

                    if (distToWater < lakeRadius) {
                        // Check if the ball landed safely on the island green or fringe collar
                        const gX = this.ball.position.x - this.greenCenterX;
                        const gZ = this.ball.position.z - this.greenCenterZ;
                        const distFromGreen = Math.sqrt(gX * gX + gZ * gZ);
                        const ballAngle = Math.atan2(-gZ, gX);
                        const activeRadius = window.getGreenRadiusAtAngle ? window.getGreenRadiusAtAngle(ballAngle, window.activeGreenRadius || 12.0, window.activeGreenShape || 'circle') : (window.activeGreenRadius || 12.0);

                        // Only trigger water hit if the ball is outside the green and fringe collar
                        if (distFromGreen >= activeRadius + 1.0) {
                            this.hitWater = true;
                            this.velocity.set(0, 0, 0);
                            this.isMoving = false;
                            if (this.sounds) this.sounds.play('water');
                            return;
                        }
                    }
                }
            }

            if (Math.abs(this.velocity.y) > 0.05) {
                // FIXED: Lowered threshold to 0.08 to capture the first landing immediately (no 2-second delay).
                // Added a bounceCount cap of 3 to allow authentic landing bounces but eliminate 10 seconds of rolling hill chatter.
                if (this.sounds && Math.abs(this.velocity.y) > 0.08 && !this.isPutting && this.bounceCount < 3) { // Preserved
                    if (inSand) {
                        this.sounds.play('sand'); // Preserved: Sand path remains clean
                    } else if (onGreen) {
                        this.sounds.play('green'); // Triggers on green grass bounce
                    } else if (distToGreenCenter >= activeRadius && distToGreenCenter <= (activeRadius + 1.0)) {
                        this.sounds.play('fairway'); // Modified: Fringe plays crisp fairway turf sound
                    } else if (this.getDistanceToSpline(this.ball.position.x, this.ball.position.z) <= activeFW && !isPastFairway && !isOnGreenSidesOrBack &&
                        this.isWithinFairwayLongitudinalBounds(this.ball.position.z)) {
                        this.sounds.play('fairway'); // Triggers on fairway track bounce
                    } else {
                        this.sounds.play('rough'); // Triggers on deep course rough bounce
                    }
                }
                this.bounceCount++; // Preserved: Increment count on each airborne landing hit


                this.velocity.y = -this.velocity.y * currentBounceHeight; // Preserved

                // Soften forward momentum loss for short chips / low-velocity landings so they don't die on impact
                const landingSpeed = Math.hypot(this.velocity.x, this.velocity.z);
                let adaptiveForwardLoss = currentBounceForwardLoss;
                if (landingSpeed < 0.35 && !inSand && !onGreen) {
                    let tShort = Math.min(1.0, Math.max(0.0, (0.35 - landingSpeed) / 0.25));
                    adaptiveForwardLoss = THREE.MathUtils.lerp(currentBounceForwardLoss, 0.85, tShort);
                }

                this.velocity.x *= adaptiveForwardLoss;
                this.velocity.z *= adaptiveForwardLoss;

                // Apply dynamic backspin physics depending on which club was chosen
                if (this.hasBackspin && this.bounceCount === 1 && !inSand) {
                    let spinMultiplier = 1.0;
                    if (this.currentLoft === 0.051) spinMultiplier = 0.65;      // 5 Iron: minor forward check
                    else if (this.currentLoft === 0.053) spinMultiplier = 0.45; // 6 Iron: light forward check
                    else if (this.currentLoft === 0.055) spinMultiplier = 0.25; // 7 Iron: moderate forward check
                    else if (this.currentLoft === 0.057) spinMultiplier = 0.05; // 8 Iron: heavy forward check-up
                    else if (this.currentLoft === 0.059) spinMultiplier = -0.25; // 9 Iron (Original): sharp check-up bite
                    else if (this.currentLoft === 0.061) spinMultiplier = -0.95; // PW Iron (Original): moderate backward bite
                    else if (this.currentLoft === 0.063) spinMultiplier = -1.45; // SW Iron (Original): aggressive backward traction

                    if (spinMultiplier !== 1.0) {
                        // 1. SURFACE GRAB EVALUATION (Green = 100% friction grab, Fairway = 40% partial check, Rough = 0% muffle)
                        let surfaceFactor = 0.0;
                        if (onGreen) {
                            surfaceFactor = 1.0;
                        } else if (distToGreenCenter >= activeRadius && distToGreenCenter <= (activeRadius + 1.0)) {
                            surfaceFactor = 0.75; // Modified: Fringe gets a crisp 75% backspin check-up grab!
                        } else if (this.getDistanceToSpline(this.ball.position.x, this.ball.position.z) <= activeFW && !isPastFairway && !isOnGreenSidesOrBack &&
                            this.isWithinFairwayLongitudinalBounds(this.ball.position.z)) {
                            surfaceFactor = 0.4;
                        }

                        // 2. SPEED/POWER DEPENDENCY (Recovers pre-bounce velocity to prevent short chips from snapping backwards)
                        const incomingHorizontalSpeed = Math.hypot(this.velocity.x / currentBounceForwardLoss, this.velocity.z / currentBounceForwardLoss);
                        const speedFactor = Math.min(1.0, Math.max(0.0, incomingHorizontalSpeed / 0.01));

                        // 3. SEAMLESS COALESCENCE (Blends between normal forward physics (1.0) and backspin multipliers)
                        const combinedFactor = speedFactor * surfaceFactor;
                        const activeMultiplier = 1.0 + (spinMultiplier - 1.0) * combinedFactor;

                        this.velocity.x *= activeMultiplier;
                        this.velocity.z *= activeMultiplier;
                    }
                }
            } else {




                this.velocity.y = 0;

                // NEW: Kick up micro sand particle trails while rolling through the bunker
                if (inSand && this.velocity.length() > 0.05 && Math.random() > 0.70 && typeof window.triggerSandSpray === 'function') {
                    window.triggerSandSpray(this.ball.position.x, this.ball.position.y, this.ball.position.z, 2, 0.3);
                }
            }
        }

        // FIXED: Adjusted the putting stop threshold to 0.014 to complement the slower visual roll speed,
        // allowing the ball to realistically trickle down to a crawl before coming to a dead stop.
        // MODIFIED: Isolated this.isPutting into its own 0.014 threshold so putts don't bleed out too far at low speeds, 
        // while leaving regular green shots and rough/fairway stops completely un-impacted.
        const stopThreshold = this.isPutting ? 0.015 : (onGreen ? 0.018 : 0.01);
        if (this.velocity.length() < stopThreshold && this.ball.position.y <= groundY) {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
            this.isPutting = false;
        }
    }
}