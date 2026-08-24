const CLUBS = [
    { name: 'Driver', maxYards: 325, isGreen: false, loft: 0.040 },
    { name: '3 Wood', maxYards: 250, isGreen: false, loft: 0.043 },
    { name: '5 Wood', maxYards: 225, isGreen: false, loft: 0.046 },
    { name: 'Hybrid', maxYards: 200, isGreen: false, loft: 0.049 },
    { name: '5 Iron', maxYards: 190, isGreen: false, loft: 0.051 },
    { name: '6 Iron', maxYards: 180, isGreen: false, loft: 0.053 },
    { name: '7 Iron', maxYards: 170, isGreen: false, loft: 0.055 },
    { name: '8 Iron', maxYards: 160, isGreen: false, loft: 0.057 },
    { name: '9 Iron', maxYards: 150, isGreen: false, loft: 0.059 },
    { name: 'PW Iron', maxYards: 140, isGreen: false, loft: 0.061 },
    { name: 'SW Iron', maxYards: 120, isGreen: false, loft: 0.063 },
    { name: 'Putter', maxYards: 50, isGreen: true, loft: 0.000 }
];


export class InputHandler {
    // UPDATED: Now accepts an optional callback to verify if the ball is on the green
    constructor(onLaunchCallback, checkIsOnGreenCallback, getDistanceCallback) {
        this.onLaunch = onLaunchCallback;
        this.checkIsOnGreen = checkIsOnGreenCallback;
        this.getDistance = getDistanceCallback;

        this.gauge = document.getElementById('distanceGauge');
        this.gaugeFill = document.getElementById('gaugeFill');
        this.gaugeLabel = document.getElementById('gaugeLabel');

        this.isSwinging = false;
        this.state = 'IDLE';

        this.startX = 0;
        this.startY = 0;
        this.maxPullY = 0;
        this.chosenClubIndex = null;
        this.pullRatio = 0;

        this.isAimMode = false;
        this.aimAngleOffset = 0;
        this.lastClubTapTime = 0;
        this.isAimDragging = false;
        this.startAimX = 0;

        this.initSwingTrailCanvas();
        this.initEvents();
    }

    getClubList() {
        return CLUBS;
    }

    getDefaultClubIndex() {
        const currentYards = this.getDistance ? this.getDistance() : 0;
        const isOnTee = this.teeBoxRef ? this.teeBoxRef.visible : false; // Add this line
        if (currentYards >= 250) return isOnTee ? 0 : 1;
        if (currentYards >= 225) return 1;  // 3 Wood
        if (currentYards >= 200) return 2;  // 5 Wood
        if (currentYards >= 190) return 3;  // Hybrid
        if (currentYards >= 180) return 4;  // 5 Iron
        if (currentYards >= 170) return 5;  // 6 Iron
        if (currentYards >= 160) return 6;  // 7 Iron
        if (currentYards >= 150) return 7;  // 8 Iron
        if (currentYards >= 140) return 8;  // 9 Iron
        if (currentYards >= 130) return 9;  // PW Iron
        return 10;                          // SW Iron
    }

    getClubInfo() {
        const isOnGreen = this.checkIsOnGreen ? this.checkIsOnGreen() : false;
        if (isOnGreen) {
            return { name: 'Putter', maxYards: 50, isGreen: true };
        }

        const isOnTee = this.teeBoxRef ? this.teeBoxRef.visible : false;

        // If player explicitly manually selected a club option, return that one
        if (this.chosenClubIndex !== null && this.chosenClubIndex !== undefined) {
            return CLUBS[this.chosenClubIndex]; // Modify this line: Allow Driver off the deck for authentic high-risk play
        }

        // Default back to standard auto distance selection index
        const defaultIndex = this.getDefaultClubIndex();
        return CLUBS[defaultIndex];
    }

    getPutterMaxFeet() {
        if (!this.getDistance) return 60;
        const rawUnits = this.getDistance() / 2.76923;
        // MODIFIED: Swapped 3.0 for 1.75 to perfectly match the HUD green display engine
        const distanceInFeet = rawUnits * 1.75;
        if (distanceInFeet <= 10) return 20;
        if (distanceInFeet <= 20) return 30;
        if (distanceInFeet <= 30) return 40;
        if (distanceInFeet <= 45) return 60;
        if (distanceInFeet <= 65) return 90;
        if (distanceInFeet <= 95) return 120;
        return 150;
    }

    updateGaugeClub() {
        if (!this.gaugeLabel) return;
        const club = this.getClubInfo();
        const currentPull = this.pullRatio || 0;
        if (this.gaugeFill) {
            this.gaugeFill.style.height = `${currentPull * 100}%`;
        }
        if (club.isGreen) {
            const maxFeet = this.getPutterMaxFeet();
            const feet = Math.round(currentPull * maxFeet);
            this.gaugeLabel.innerText = `${club.name}: ${feet} ft`;
        } else {
            const yards = Math.round(currentPull * club.maxYards);
            this.gaugeLabel.innerText = `${club.name}: ${yards} yds`;
        }
    }

    getTreeBackswingCap() {
        if (!this.ballRef || !window.physicsEngine || !window.physicsEngine.obstacles) {
            return 1.0;
        }

        const ballX = this.ballRef.position.x;
        const ballZ = this.ballRef.position.z;

        // Determine current aim direction
        let targetX = this.holePositionRef ? this.holePositionRef.x : 0;
        let targetZ = this.holePositionRef ? this.holePositionRef.z : -55;

        // If on tee box with a waypoint target
        if (this.teeBoxRef && this.teeBoxRef.visible && window.currentHoleConfig && window.currentHoleConfig.waypoints) {
            const firstLeg = window.currentHoleConfig.waypoints[1];
            if (firstLeg) {
                targetX = firstLeg.x;
                targetZ = firstLeg.z;
            }
        }

        const dX = targetX - ballX;
        const dZ = targetZ - ballZ;
        let angle = Math.atan2(dX, dZ);
        if (this.aimAngleOffset) {
            angle += this.aimAngleOffset;
        }

        const aimDirX = Math.sin(angle);
        const aimDirZ = Math.cos(angle);

        // Vector pointing directly behind the ball for backswing
        const backDirX = -aimDirX;
        const backDirZ = -aimDirZ;

        // Vector perpendicular to swing path
        const perpX = -aimDirZ;
        const perpZ = aimDirX;

        const FULL_BACKSWING_DIST = 4.0; // World units required for 100% backswing
        let minAllowedCap = 1.0;

        const obstacles = window.physicsEngine.obstacles;
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (obs.type !== 'tree') continue;

            const vecX = obs.x - ballX;
            const vecZ = obs.z - ballZ;

            // Distance behind the ball along the backswing vector
            const distBehind = vecX * backDirX + vecZ * backDirZ;

            // Perpendicular side distance from the backswing line
            const distSide = Math.abs(vecX * perpX + vecZ * perpZ);

            const treeRadius = obs.trunkRadius || obs.radius || 0.8;
            const clearanceRadius = treeRadius + 1.2; // Trunk radius + swing clearance

            // Only restrict if tree is directly behind in the backswing path
            if (distBehind > 0 && distSide <= clearanceRadius) {
                const availableDist = distBehind - treeRadius;
                let cap = 1.0;
                if (availableDist <= 0) {
                    cap = 0.15; // Minimum backswing (15%) when tree is right against back of ball
                } else if (availableDist < FULL_BACKSWING_DIST) {
                    cap = Math.max(0.15, availableDist / FULL_BACKSWING_DIST);
                }

                if (cap < minAllowedCap) {
                    minAllowedCap = cap;
                }
            }
        }

        return minAllowedCap;
    }

    initEvents() {
        // MODIFIED: Injected global tutorial input locks to keep swing logic insulated
        window.addEventListener('mousedown', (e) => {
            if (window.isTutorialActive) return;
            this.onMouseDown(e);
        });
        window.addEventListener('mousemove', (e) => {
            if (window.isTutorialActive) return;
            this.onMouseMove(e);
        });
        window.addEventListener('mouseup', () => {
            if (window.isTutorialActive) return;
            this.onMouseUp();
        });

        window.addEventListener('touchstart', (e) => {
            if (window.isTutorialActive) return;
            this.onTouchStart(e);
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (window.isTutorialActive) return;
            this.onTouchMove(e);
        }, { passive: false });
        window.addEventListener('touchend', () => {
            if (window.isTutorialActive) return;
            this.onTouchEnd();
        });

        // Add this block: Tracks 1-second club double-taps to enter/exit camera aiming view
        const clubEl = document.getElementById('clubSwipe');
        if (clubEl) {
            const handleClubTap = (e) => {
                // If this is a touchstart event, prevent the browser from firing a duplicate click event
                if (e.type === 'touchstart') {
                    e.preventDefault();
                }

                const now = performance.now();
                if (now - this.lastClubTapTime < 1000) {
                    e.stopPropagation(); // Add this line here: Only intercept when an official double tap happens
                    e.preventDefault();  // Add this line here: Only intercept when an official double tap happens
                    this.isAimMode = !this.isAimMode;
                    this.isSwinging = false;
                    this.state = 'IDLE';
                    if (this.gauge) this.gauge.classList.add('hidden'); // Forces power gauge hidden immediately
                    this.lastClubTapTime = 0;
                } else {
                    this.lastClubTapTime = now;
                }
            };
            clubEl.addEventListener('click', handleClubTap);
            clubEl.addEventListener('touchstart', handleClubTap, { passive: false });
        }
    }

    onTouchStart(e) {
        if (window.isPostShotCooldown && window.isPostShotCooldown()) return
        if (e.target.closest('.club-option') || e.target.closest('#overheadBtn')) return;
        if (e.target.closest('#scorecardOverlay')) return;
        if (this.isOverheadActive) return;

        if (this.isAimMode) {
            this.isAimDragging = true;
            this.startAimX = e.touches[0].clientX;
            return;
        }

        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;

        // Delay touch swing activation universally until dragging starts
        this.isSwingingFromClub = true;
        this.isSwinging = false;
        this.state = 'IDLE';
        return;
    }

    onTouchMove(e) {
        if (this.isAimMode && this.isAimDragging) {
            e.preventDefault();
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - this.startAimX;
            this.aimAngleOffset += deltaX * 0.007;
            this.startAimX = currentX;
            return;
        }

        const touch = e.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;

        // Upgrade to an active mobile swing if finger drags down past 8px
        if (this.isSwingingFromClub && !this.isSwinging) {
            if (currentY > this.startY + 8) {
                this.isSwinging = true;
                this.state = 'PULLBACK';
                this.maxPullY = this.startY;
                this.pullbackStartTime = performance.now(); // Captures container swipe upgrade timestamp
                this.pullbackDriftX = 0;
                this.pullbackAtMaxX = touch.clientX;
                this.backswingTrail = [{ x: this.startX, y: this.startY }];
                this.forwardTrail = [];

                this.gauge.classList.remove('hidden');
                this.gaugeFill.style.height = '0%';
                this.updateGaugeClub();
            }
        }

        if (!this.isSwinging) return;
        e.preventDefault();

        if (this.state === 'PULLBACK') {
            if (currentY > this.maxPullY) {
                this.maxPullY = currentY;
                this.pullbackAtMaxX = currentX;
            }

            this.backswingTrail.push({ x: currentX, y: currentY });
            this.drawSwingTrail();

            const club = this.getClubInfo();
         const targetPullDistance = Math.max(0, currentY - this.startY);
            const maxPullPixels = club.isGreen ? 160 : 180; // Changed 360 to 160 to increase sensitivity
            const backswingCap = this.getTreeBackswingCap();
            const pullRatio = Math.min(targetPullDistance / maxPullPixels, backswingCap);
            this.pullRatio = pullRatio;

            this.gaugeFill.style.height = `${pullRatio * 100}%`;


            if (club.isGreen) {
                const maxFeet = this.getPutterMaxFeet();
                const feet = Math.round(pullRatio * maxFeet);
                this.gaugeLabel.innerText = `${club.name}: ${feet} ft`;
            } else {
                const yards = Math.round(pullRatio * club.maxYards);
                this.gaugeLabel.innerText = `${club.name}: ${yards} yds`;
            }

            if (currentY < this.maxPullY - 5) {
                this.state = 'FORWARD';
                this.forwardStartTime = performance.now();
                this.backswingDuration = this.forwardStartTime - (this.pullbackStartTime || this.forwardStartTime); // Evaluates pure take-back duration
                this.forwardTrail = [{ x: currentX, y: currentY }];
            }
        }
        else if (this.state === 'FORWARD') {
            this.forwardTrail.push({ x: currentX, y: currentY });
            this.drawSwingTrail();

            if (currentY <= this.startY) {
                this.executeLaunch(currentX, currentY);
            }
        }
    }

onTouchEnd() {
        this.isAimDragging = false;
        this.isSwingingFromClub = false;
        if (this.isSwinging || this.state !== 'IDLE' || this.pullRatio > 0) {
            this.resetSwing();
        }
    }

    onMouseDown(e) {
        if (window.isPostShotCooldown && window.isPostShotCooldown()) return;
        if (e.button !== 0) return;
        if (e.target.closest('.club-option') || e.target.closest('#overheadBtn')) return;
        if (e.target.closest('#scorecardOverlay')) return;
        if (this.isOverheadActive) return;

        if (this.isAimMode) {
            this.isAimDragging = true;
            this.startAimX = e.clientX;
            return;
        }

        this.startX = e.clientX;
        this.startY = e.clientY;

        // Delay swing activation universally until an actual drag occurs
        this.isSwingingFromClub = true;
        this.isSwinging = false;
        this.state = 'IDLE';
        return;
    }

    onMouseMove(e) {
        if (this.isAimMode && this.isAimDragging) {
            const currentX = e.clientX;
            const deltaX = currentX - this.startAimX;
            this.aimAngleOffset += deltaX * 0.007;
            this.startAimX = currentX;
            return;
        }

        const currentX = e.clientX;
        const currentY = e.clientY;

        // Upgrade to an active swing only if dragging downward past the 8px threshold
        if (this.isSwingingFromClub && !this.isSwinging) {
            if (currentY > this.startY + 8) {
                this.isSwinging = true;
                this.state = 'PULLBACK';
                this.maxPullY = this.startY;
                this.pullbackStartTime = performance.now(); // Captures handle-drag upgrade timestamp
                this.pullbackDriftX = 0;
                this.pullbackAtMaxX = e.clientX;
                this.backswingTrail = [{ x: this.startX, y: this.startY }];
                this.forwardTrail = [];

                this.gauge.classList.remove('hidden');
                this.gaugeFill.style.height = '0%';
                this.updateGaugeClub();
            }
        }

        if (!this.isSwinging) return;

        if (this.state === 'PULLBACK') {
            if (currentY > this.maxPullY) {
                this.maxPullY = currentY;
                this.pullbackAtMaxX = currentX;
            }

            this.backswingTrail.push({ x: currentX, y: currentY });
            this.drawSwingTrail();

           const club = this.getClubInfo();
            const currentDrift = currentX - this.startX;
            if (Math.abs(currentDrift) > Math.abs(this.pullbackDriftX || 0)) {
                this.pullbackDriftX = currentDrift;
            }

            const targetPullDistance = Math.max(0, currentY - this.startY);
            const maxPullPixels = club.isGreen ? 160 : 180; // Changed 360 to 160 to increase sensitivity
            const backswingCap = this.getTreeBackswingCap();
            const pullRatio = Math.min(targetPullDistance / maxPullPixels, backswingCap);
            this.pullRatio = pullRatio;

            this.gaugeFill.style.height = `${pullRatio * 100}%`;

            if (club.isGreen) {
                const maxFeet = this.getPutterMaxFeet();
                const feet = Math.round(pullRatio * maxFeet);
                this.gaugeLabel.innerText = `${club.name}: ${feet} ft`;
            } else {
                const yards = Math.round(pullRatio * club.maxYards);
                this.gaugeLabel.innerText = `${club.name}: ${yards} yds`;
            }
            if (currentY < this.maxPullY - 5) {
                this.state = 'FORWARD';
                this.forwardStartTime = performance.now();
                this.backswingDuration = this.forwardStartTime - (this.pullbackStartTime || this.forwardStartTime); // Evaluates pure take-back duration
                this.forwardTrail = [{ x: currentX, y: currentY }];
            }
        }

        else if (this.state === 'FORWARD') {
            this.forwardTrail.push({ x: currentX, y: currentY });
            this.drawSwingTrail();

            if (currentY <= this.startY) {
                this.executeLaunch(currentX, currentY);
            }
        }
    }

  onMouseUp() {
        this.isAimDragging = false;
        this.isSwingingFromClub = false;
        if (this.isSwinging || this.state !== 'IDLE' || this.pullRatio > 0) {
            this.resetSwing();
        }
    }

    executeLaunch(endX, endY) {
        if (this.forwardTrail && this.forwardTrail.length > 0) {
            this.forwardTrail.push({ x: endX, y: endY });
            const prevPt = this.forwardTrail[this.forwardTrail.length - 2] || { x: this.startX, y: this.maxPullY };
            const dx = endX - prevPt.x;
            const dy = endY - prevPt.y;
            const len = Math.hypot(dx, dy) || 1;
            const extDist = 80;
            this.forwardTrail.push({ x: endX + (dx / len) * extDist, y: endY + (dy / len) * extDist });
        }
        this.flashAndFadeTrail();

        // --- INVISIBLE IMPACT SWEET SPOT BOX (±14px Center Tolerance) ---
        const impactOffset = endX - this.startX;
        const absOffset = Math.abs(impactOffset);
        const SWEET_SPOT = 14;
        const HEEL_TOE_LIMIT = 30;

        let contactQuality = 1.0;
        let sprayAngle = 0;
        let gearSpin = 0;

        if (absOffset > SWEET_SPOT) {
            const penaltyRatio = Math.min(1.0, (absOffset - SWEET_SPOT) / (HEEL_TOE_LIMIT - SWEET_SPOT));
            contactQuality = 1.0 - (penaltyRatio * 0.35); // Lose up to 35% distance on mishits
            sprayAngle = (impactOffset / HEEL_TOE_LIMIT) * (18 * Math.PI / 180); // Deflect up to 18 degrees off-line
            gearSpin = (impactOffset / HEEL_TOE_LIMIT) * 30.0; // Unintended slice/hook spin
        }

        const club = this.getClubInfo();

        const backswingCap = this.getTreeBackswingCap();
        const maxPullPixels = (club.isGreen ? 160 : 180) * backswingCap;
        const targetPullDistance = Math.min(maxPullPixels, this.maxPullY - this.startY); const actualForwardDistance = this.maxPullY - endY;

        const powerMultiplier = Math.min(1.0, actualForwardDistance / targetPullDistance);
        const basePower = targetPullDistance * 0.05;
        let finalPower = basePower * powerMultiplier;

        // Shared duration calculation to prevent identifier redeclaration conflicts
        const forwardDuration = performance.now() - (this.forwardStartTime || performance.now());

        // 1. SWING TEMPO RHYTHM & CONTINUOUS MOTION FLUIDITY EVALUATION
        const backswingSpeed = targetPullDistance / Math.max(1, this.backswingDuration || 1);
        const forwardSpeed = actualForwardDistance / Math.max(1, forwardDuration || 1);
        const tempoRatio = backswingSpeed / Math.max(0.001, forwardSpeed);

        // Modify this block below to reward fast downswings and only punish slow yardage-hunting
        let tempoModifier = 1.0;
        if (club.isGreen) {
            tempoModifier = 1.0;
        } else {
            // If backswing duration takes longer than 650ms, they are creeping back slowly to find yardage
            if (this.backswingDuration > 650) {
                tempoModifier = Math.max(0.80, 1.0 - (this.backswingDuration - 650) * 0.005);
            }
            // Only apply a ratio penalty if the forward downswing is abnormally slow/lazy compared to backswing (exempt short control chips)
            if (tempoRatio > 1.8 && actualForwardDistance > 45) {
                tempoModifier *= Math.max(0.45, 1.8 / tempoRatio);
            }
        }
        finalPower *= tempoModifier;

        // ADD THIS BLOCK: Automatically translates physics velocity output to your new custom scales
        if (club.isGreen) {
            // Restored to original stable physics divisor tuning
            finalPower *= (this.getPutterMaxFeet() / 120);
            finalPower *= (360 / 160); // Scale compensation so you don't lose physical power from the shorter drag range!
        }

        // 2. BASELINE RE-ACCELERATION DOWNSWING SPEED CHECK (exempt short control chips)
        if (!club.isGreen && actualForwardDistance > 45) {
            let speedMultiplier = 1.0;
            if (forwardDuration > 130) {
                speedMultiplier = Math.max(0.4, 1.0 - (forwardDuration - 130) * 0.0025);
            }
            finalPower *= speedMultiplier;
        }

        if (!club.isGreen) {
            // Scales the velocity vector cleanly against original baseline engine limits
            finalPower *= (club.maxYards / 200);
            const isOnTee = this.teeBoxRef ? this.teeBoxRef.visible : false;

            if (club.name === 'Driver') {
                finalPower *= isOnTee ? 1.02 : 0.90;
            }
            else if (club.name === '3 Wood') {
                finalPower *= 1.13;
            }
            else if (club.name === '5 Wood') {
                finalPower *= 1.17;
            }
            else if (club.name === 'Hybrid') {
                finalPower *= 1.27; // Adjust to tune Hybrid distance separately
            }
            else if (club.name === '5 Iron') {
                finalPower *= 1.31; // Adjust to tune 5 Iron distance separately
            }
            else if (club.name === '6 Iron') {
                finalPower *= 1.35; // Adjust to tune 6 Iron distance separately
            }
            else if (club.name === '7 Iron') {
                finalPower *= 1.40; // Adjust to tune 7 Iron distance separately
            }
            else if (club.name === '8 Iron') {
                finalPower *= 1.45; // Adjust to tune 8 Iron distance separately
            }
            else if (club.name === '9 Iron') {
                finalPower *= 1.50; // Adjust to tune 9 Iron distance separately
            }
            else if (club.name === 'PW Iron') {
                finalPower *= 1.55; // Adjust to tune Pitching Wedge distance separately
            }
            else if (club.name === 'SW Iron') {
                finalPower *= 1.64; // Adjust to tune Sand Wedge distance separately
            }
            else {
                finalPower *= 1.0; // Safe catch-all fallback
            }



            if (this.ballRef) {
                let inSand = false;

                if (this.sandTrapsRef) {
                    for (let sand of this.sandTrapsRef) {
                        if (sand.userData && sand.userData.isPolygon) {
                            const points = sand.userData.points;
                            let inside = false;
                            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                                const xi = points[i].x, zi = points[i].z;
                                const xj = points[j].x, zj = points[j].z;
                                const intersect = ((zi > this.ballRef.position.z) !== (zj > this.ballRef.position.z))
                                    && (this.ballRef.position.x < (xj - xi) * (this.ballRef.position.z - zi) / (zj - zi) + xi);
                                if (intersect) inside = !inside;
                            }
                            if (inside) {
                                inSand = true;
                                break;
                            }
                        } else {
                            const dx = this.ballRef.position.x - sand.position.x;
                            const dz = this.ballRef.position.z - sand.position.z;
                            const sandRadius = sand.userData && sand.userData.radius ? sand.userData.radius : 5;
                            if (Math.sqrt(dx * dx + dz * dz) < sandRadius) {
                                inSand = true;
                                break;
                            }
                        }
                    }
                }

                // 2. Check if on the Green
                const onGreen = this.checkIsOnGreen ? this.checkIsOnGreen() : false;

                // Realism addition: Calculate if the ball is sitting on the clean green fringe collar
                const gX = this.ballRef.position.x - (window.physicsEngine ? window.physicsEngine.greenCenterX : 0); // Add this line
                const gZ = this.ballRef.position.z - (window.physicsEngine ? window.physicsEngine.greenCenterZ : -55); // Add this line
                const distToGreenCenter = Math.hypot(gX, gZ); // Add this line

                // MODIFIED: Swapped hardcoded values out for true dynamic hole blueprint calculations
                const activeR = window.activeGreenRadius || 12.0;
                const isOnFringe = distToGreenCenter >= activeR && distToGreenCenter <= (activeR + 1.0);

                // 3. Apply Penalties
                if (inSand) {
                    finalPower *= 0.75; // Lose 25% power in sand bunker
                } else if (isOnFringe) {
                    if (club.name === 'Putter') {
                        finalPower *= 0.90; // Lose 10% power putting off the fringe
                    } else {
                        finalPower *= 0.95; // Lose 5% power chipping off the fringe
                    }
                } else if (!onGreen && window.physicsEngine) {
                    // Check surface explicitly from the unified physics engine state
                    if (window.physicsEngine.currentSurface === 'Rough') {
                        finalPower *= 0.85; // Lose 15% power in the rough
                    }
                }
            }
        }



        const backswingDrift = (this.pullbackAtMaxX || this.startX) - this.startX; // Add this line: Measure clock pullback direction
        const followThroughDrift = endX - this.startX;                            // Add this line: Measure clock follow-through direction

        let horizontalAngle = followThroughDrift * 0.005; // Modify this line: Standard follow-through launch angle

        // Diagonal Clock Shot Rule: If pulling back opposite to follow-through, invert launch direction so it goes "left first" or "right first"
        if (!club.isGreen && backswingDrift !== 0 && followThroughDrift !== 0 && Math.sign(backswingDrift) !== Math.sign(followThroughDrift)) { // Modify this line: Added !club.isGreen safety cushion
            horizontalAngle = -followThroughDrift * 0.005; // Preserved
        }

        // Clamp the angle to prevent extreme sideways or backward shots (max ~35 degrees)
        const maxAngle = 35 * Math.PI / 180;
        horizontalAngle = Math.max(-maxAngle, Math.min(maxAngle, horizontalAngle));

        // CLOCK SWING TRACK SPIN LOGIC: Determines aerodynamic curve based on the relationship between backswing and follow-through
        let spinValue = (followThroughDrift - backswingDrift * 0.5) * 0.4; // Modify this line: Automatically satisfies all 8 curve rules
        spinValue = Math.max(-45, Math.min(45, spinValue)); // Preserved: Keeps maximum spin capped safely

        // Apply sweet spot impact box modifiers
        finalPower *= contactQuality;
        horizontalAngle += sprayAngle;
        spinValue += gearSpin;

        // Pass our newly calculated spinValue as the 3rd parameter instead of the old erratic hand drift variable
        this.onLaunch(finalPower, horizontalAngle, spinValue, club.loft !== undefined ? club.loft : 0.042);
        this.chosenClubIndex = null;    // Preserved: Clears manually selected club
        this.isAimMode = false;         // Preserved: Exits aiming view upon hit
        this.aimAngleOffset = 0;        // Preserved: Resets custom aim offset
        this.resetSwing();              // Preserved: Hides power bar and readies next shot
    }

resetSwing() {
  resetSwing() {
        this.isSwinging = false;
        this.state = 'IDLE';
        this.pullRatio = 0;
        this.maxPullY = this.startY;
        this.clearSwingTrail();
        if (this.gaugeFill) {
            this.gaugeFill.style.height = '0%';
        }
        this.updateGaugeClub();
    }

    initSwingTrailCanvas() {
        this.trailCanvas = document.getElementById('swingTrailCanvas');
        if (!this.trailCanvas) {
            this.trailCanvas = document.createElement('canvas');
            this.trailCanvas.id = 'swingTrailCanvas';
            this.trailCanvas.style.position = 'fixed';
            this.trailCanvas.style.top = '0';
            this.trailCanvas.style.left = '0';
            this.trailCanvas.style.width = '100vw';
            this.trailCanvas.style.height = '100vh';
            this.trailCanvas.style.pointerEvents = 'none';
            this.trailCanvas.style.zIndex = '10005';
            document.body.appendChild(this.trailCanvas);
        }
        this.trailCtx = this.trailCanvas.getContext('2d');
        const resize = () => {
            if (this.trailCanvas) {
                this.trailCanvas.width = window.innerWidth;
                this.trailCanvas.height = window.innerHeight;
            }
        };
        resize();
        window.addEventListener('resize', resize);
        this.backswingTrail = [];
        this.forwardTrail = [];
        this.trailFadeTimer = null;
    }

    drawSwingTrail(alpha = 1.0, isFlash = false) {
        if (!this.trailCtx || !this.trailCanvas) return;
        const ctx = this.trailCtx;
        ctx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

        ctx.save();
        ctx.globalAlpha = alpha;



        // 1. Draw Backswing (Glowing Amber / Gold)
        if (this.backswingTrail && this.backswingTrail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.backswingTrail[0].x, this.backswingTrail[0].y);
            for (let i = 1; i < this.backswingTrail.length; i++) {
                ctx.lineTo(this.backswingTrail[i].x, this.backswingTrail[i].y);
            }
            ctx.strokeStyle = isFlash ? '#ffffff' : '#ffaa00';
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = isFlash ? 16 : 10;
            ctx.lineWidth = isFlash ? 5.5 : 4.0;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        // 2. Draw Downswing & Follow-through (Glowing Green - matches pullback line style)
        if (this.forwardTrail && this.forwardTrail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.forwardTrail[0].x, this.forwardTrail[0].y);
            for (let i = 1; i < this.forwardTrail.length; i++) {
                ctx.lineTo(this.forwardTrail[i].x, this.forwardTrail[i].y);
            }
            ctx.strokeStyle = isFlash ? '#ffffff' : '#00ff66';
            ctx.shadowColor = '#00cc44';
            ctx.shadowBlur = isFlash ? 16 : 10;
            ctx.lineWidth = isFlash ? 5.5 : 4.0;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }


        ctx.restore();
    }

    flashAndFadeTrail() {
        if (this.trailFadeTimer) cancelAnimationFrame(this.trailFadeTimer);
        const startTime = performance.now();
        const solidDuration = 1800; // Time in milliseconds lines stay 100% solid (1.8s)
        const fadeDuration = 800;   // Time in milliseconds to smoothly fade out (0.8s)
        const totalDuration = solidDuration + fadeDuration;

        const fadeLoop = (now) => {
            const elapsed = now - startTime;
            if (elapsed < 150) {
                this.drawSwingTrail(1.0, true); // White impact flash
                this.trailFadeTimer = requestAnimationFrame(fadeLoop);
            } else if (elapsed < solidDuration) {
                this.drawSwingTrail(1.0, false); // Stays fully solid and visible
                this.trailFadeTimer = requestAnimationFrame(fadeLoop);
            } else if (elapsed < totalDuration) {
                const alpha = 1.0 - (elapsed - solidDuration) / fadeDuration;
                this.drawSwingTrail(alpha, false); // Fades away smoothly
                this.trailFadeTimer = requestAnimationFrame(fadeLoop);
            } else {
                this.clearSwingTrail();
            }
        };
        this.trailFadeTimer = requestAnimationFrame(fadeLoop);
    }
    clearSwingTrail() {
        if (this.trailFadeTimer) cancelAnimationFrame(this.trailFadeTimer);
        this.backswingTrail = [];
        this.forwardTrail = [];
        if (this.trailCtx && this.trailCanvas) {
            this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        }
    }
}