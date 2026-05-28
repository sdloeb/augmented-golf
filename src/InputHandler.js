const CLUBS = [
    { name: 'Driver', maxYards: 325, isGreen: false, loft: 0.035 },
    { name: '3 Wood', maxYards: 250, isGreen: false, loft: 0.038 },
    { name: '5 Wood', maxYards: 225, isGreen: false, loft: 0.041 },
    { name: 'Hybrid', maxYards: 200, isGreen: false, loft: 0.042 },
    { name: '5 Iron', maxYards: 190, isGreen: false, loft: 0.044 },
    { name: '6 Iron', maxYards: 180, isGreen: false, loft: 0.046 },
    { name: '7 Iron', maxYards: 170, isGreen: false, loft: 0.048 },
    { name: '8 Iron', maxYards: 160, isGreen: false, loft: 0.050 },
    { name: '9 Iron', maxYards: 150, isGreen: false, loft: 0.052 },
    { name: 'PW Iron', maxYards: 140, isGreen: false, loft: 0.054 },
    { name: 'SW Iron', maxYards: 120, isGreen: false, loft: 0.056 }
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

        this.initEvents();
    }

    getClubList() {
        return CLUBS;
    }

    getDefaultClubIndex() {
        const currentYards = this.getDistance ? this.getDistance() : 0;
        if (currentYards >= 250) return 0;  // Driver
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
            return { name: 'Putter', maxYards: 40, isGreen: true };
        }

        // If player explicitly manually selected a club option, return that one
        if (this.chosenClubIndex !== null && this.chosenClubIndex !== undefined) {
            return CLUBS[this.chosenClubIndex];
        }

        // Default back to standard auto distance selection index
        const defaultIndex = this.getDefaultClubIndex();
        return CLUBS[defaultIndex];
    }


    initEvents() {
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        //mobile
        window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        window.addEventListener('touchend', () => this.onTouchEnd());
    }

    onTouchStart(e) {
        if (e.target.closest('.club-option') || e.target.closest('#overheadBtn')) return;
        const touch = e.touches[0];
        this.isSwinging = true;
        this.state = 'PULLBACK';
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.maxPullY = touch.clientY;
        this.pullbackDriftX = 0;

        this.gauge.classList.remove('hidden');
        this.gaugeFill.style.height = '0%';

        const club = this.getClubInfo();
        if (club.isGreen) {
            this.gaugeLabel.innerText = `${club.name}: 0 ft`;
        } else {
            this.gaugeLabel.innerText = `${club.name}: 0 yds`;
        }
        this.gaugeLabel.style.top = '0px';
    }

    onTouchMove(e) {
        if (!this.isSwinging) return;
        const touch = e.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;

        if (this.state === 'PULLBACK') {
            if (currentY > this.maxPullY) {
                this.maxPullY = currentY;
            }

            const targetPullDistance = this.maxPullY - this.startY;
            const maxPullPixels = 180;
            const pullRatio = Math.min(targetPullDistance / maxPullPixels, 1);

            this.gaugeFill.style.height = `${pullRatio * 100}%`;
            this.gaugeLabel.style.top = `${pullRatio * 160}px`;

            // Calculate screen positions to check side-of-screen pullbacks
            const screenCenter = window.innerWidth / 2;
            const ballPathWidth = 120; // 120px vertical center band for the ball path
            let shotModifier = "";

            if (this.startX < screenCenter - ballPathWidth / 2) {
                shotModifier = " (Fade)";
            } else if (this.startX > screenCenter + ballPathWidth / 2) {
                shotModifier = " (Slice)";
            }

            const club = this.getClubInfo();
            if (club.isGreen) {
                const feet = Math.round(pullRatio * 40);
                this.gaugeLabel.innerText = `${club.name}: ${feet} ft${shotModifier}`;
            } else {
                const yards = Math.round(pullRatio * club.maxYards);
                this.gaugeLabel.innerText = `${club.name}: ${yards} yds${shotModifier}`;
            }

            if (currentY < this.maxPullY - 5) {
                this.state = 'FORWARD';
                this.forwardStartTime = performance.now();
            }
        }
        else if (this.state === 'FORWARD') {
            if (currentY <= this.startY) {
                this.executeLaunch(currentX, currentY);
            }
        }
    }

    onTouchEnd() {
        if (this.isSwinging && this.state !== 'IDLE') {
            this.resetSwing();
        }
    }

    onMouseDown(e) {
        if (e.button !== 0) return;
        if (e.target.closest('.club-option') || e.target.closest('#overheadBtn')) return

        this.isSwinging = true;
        this.state = 'PULLBACK';
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.maxPullY = e.clientY;
        this.pullbackDriftX = 0;

        this.gauge.classList.remove('hidden');
        this.gaugeFill.style.height = '0%';

        const club = this.getClubInfo();
        if (club.isGreen) {
            this.gaugeLabel.innerText = `${club.name}: 0 ft`;
        } else {
            this.gaugeLabel.innerText = `${club.name}: 0 yds`;
        }
        this.gaugeLabel.style.top = '0px';
    }

    onMouseMove(e) {
        if (!this.isSwinging) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        if (this.state === 'PULLBACK') {
            if (currentY > this.maxPullY) {
                this.maxPullY = currentY;
            }

            const currentDrift = currentX - this.startX;
            if (Math.abs(currentDrift) > Math.abs(this.pullbackDriftX || 0)) {
                this.pullbackDriftX = currentDrift;
            }

            const targetPullDistance = this.maxPullY - this.startY;
            const maxPullPixels = 180;
            const pullRatio = Math.min(targetPullDistance / maxPullPixels, 1);
            this.pullRatio = pullRatio;

            this.gaugeFill.style.height = `${pullRatio * 100}%`;
            this.gaugeLabel.style.top = `${pullRatio * 160}px`;

            // Calculate screen positions to check side-of-screen pullbacks
            const screenCenter = window.innerWidth / 2;
            const ballPathWidth = 120; // 120px vertical center band for the ball path
            let shotModifier = "";

            if (this.startX < screenCenter - ballPathWidth / 2) {
                shotModifier = " (Fade)";
            } else if (this.startX > screenCenter + ballPathWidth / 2) {
                shotModifier = " (Slice)";
            }

            // DYNAMIC SWING GAUGE SCALING
            const club = this.getClubInfo();
            if (club.isGreen) {
                const feet = Math.round(pullRatio * 40);
                this.gaugeLabel.innerText = `${club.name}: ${feet} ft${shotModifier}`;
            } else {
                const yards = Math.round(pullRatio * club.maxYards);
                this.gaugeLabel.innerText = `${club.name}: ${yards} yds${shotModifier}`;
            }
            if (currentY < this.maxPullY - 5) {
                this.state = 'FORWARD';
                this.forwardStartTime = performance.now();
            }
        }

        else if (this.state === 'FORWARD') {
            if (currentY <= this.startY) {
                this.executeLaunch(currentX, currentY);
            }
        }
    }

    onMouseUp() {
        if (this.isSwinging && this.state !== 'IDLE') {
            this.resetSwing();
        }
    }

    executeLaunch(endX, endY) {
        const targetPullDistance = Math.min(180, this.maxPullY - this.startY);
        const actualForwardDistance = this.maxPullY - endY;

        const powerMultiplier = Math.min(1.0, actualForwardDistance / targetPullDistance);
        const basePower = targetPullDistance * 0.05;
        let finalPower = basePower * powerMultiplier;


        const club = this.getClubInfo();

        if (!club.isGreen) {
            const forwardDuration = performance.now() - (this.forwardStartTime || performance.now());
            let speedMultiplier = 1.0;
            if (forwardDuration > 130) {
                speedMultiplier = Math.max(0.4, 1.0 - (forwardDuration - 130) * 0.0025);
            }
            finalPower *= speedMultiplier;
        }

        if (!club.isGreen) {
            // Scales the velocity vector cleanly against original baseline engine limits
            finalPower *= (club.maxYards / 200);

            if (club.name === 'Driver') {
                finalPower *= .99;
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
                finalPower *= 1.29; // Adjust to tune 5 Iron distance separately
            }
            else if (club.name === '6 Iron') {
                finalPower *= 1.34; // Adjust to tune 6 Iron distance separately
            }
            else if (club.name === '7 Iron') {
                finalPower *= 1.39; // Adjust to tune 7 Iron distance separately
            }
            else if (club.name === '8 Iron') {
                finalPower *= 1.44; // Adjust to tune 8 Iron distance separately
            }
            else if (club.name === '9 Iron') {
                finalPower *= 1.49; // Adjust to tune 9 Iron distance separately
            }
            else if (club.name === 'PW Iron') {
                finalPower *= 1.53; // Adjust to tune Pitching Wedge distance separately
            }
            else if (club.name === 'SW Iron') {
                finalPower *= 1.63; // Adjust to tune Sand Wedge distance separately
            }
            else {
                finalPower *= 1.0; // Safe catch-all fallback
            }



            if (this.ballRef) {
                let inSand = false;

                // 1. Check Sand Traps contact
                if (this.sandTrapsRef) {
                    for (let sand of this.sandTrapsRef) {
                        const dx = this.ballRef.position.x - sand.position.x;
                        const dz = this.ballRef.position.z - sand.position.z;
                        if (Math.sqrt(dx * dx + dz * dz) < sand.geometry.parameters.radius) {
                            inSand = true;
                            break;
                        }
                    }
                }

                // 2. Check if on the Green
                const gX = this.ballRef.position.x - this.holePositionRef.x;
                const gZ = this.ballRef.position.z - this.holePositionRef.z;
                const onGreen = Math.sqrt(gX * gX + gZ * gZ) < 12.0;

                // 3. Apply Penalties
                if (inSand) {
                    finalPower *= 0.50; // Lose 50% power in sand bunker
                } else if (!onGreen && Math.abs(this.ballRef.position.x) >= 9.0) {
                    finalPower *= 0.90; // Lose 10% power in the rough (outside fairway width 18)
                }
            }
        }



        const horizontalDeviation = endX - this.startX;
        let horizontalAngle = horizontalDeviation * 0.005;
        // Clamp the angle to prevent extreme sideways or backward shots (max ~35 degrees)
        const maxAngle = 35 * Math.PI / 180;
        horizontalAngle = Math.max(-maxAngle, Math.min(maxAngle, horizontalAngle));

        // FIXED LOGIC: Spin is now a flat constant depending only on the zone.
        // Follow-through horizontal angle rules handle all aim control symmetrically.
        const screenCenter = window.innerWidth / 2;
        const ballPathWidth = 120;
        let spinValue = 0;

        if (this.startX < screenCenter - ballPathWidth / 2) {
            // LEFT SIDE: Uniform Fade Spin (always reliable, no matter how far left they touch)
            spinValue = -45;
        } else if (this.startX > screenCenter + ballPathWidth / 2) {
            // RIGHT SIDE: Uniform Slice Spin (Set to 45 to perfectly mirror the fade magnitude)
            spinValue = 45;
        } else {
            // STRAIGHT PATH: Inside the vertical center path of the ball
            spinValue = 0;
        }

        // Pass our newly calculated spinValue as the 3rd parameter instead of the old erratic hand drift variable
        this.onLaunch(finalPower, horizontalAngle, spinValue, club.loft || 0.042);
        this.chosenClubIndex = null;
        this.resetSwing();
    }

    resetSwing() {
        this.isSwinging = false;
        this.state = 'IDLE';
        this.pullRatio = 0;

        setTimeout(() => {
            if (!this.isSwinging) {
                this.gauge.classList.add('hidden');
            }
        }, 800);
    }
}