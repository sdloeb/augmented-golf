export class InputHandler {
    // UPDATED: Now accepts an optional callback to verify if the ball is on the green
    constructor(onLaunchCallback, checkIsOnGreenCallback) {
        this.onLaunch = onLaunchCallback;
        this.checkIsOnGreen = checkIsOnGreenCallback;

        this.gauge = document.getElementById('distanceGauge');
        this.gaugeFill = document.getElementById('gaugeFill');
        this.gaugeLabel = document.getElementById('gaugeLabel');

        this.isSwinging = false;
        this.state = 'IDLE';

        this.startX = 0;
        this.startY = 0;
        this.maxPullY = 0;

        this.initEvents();
    }

    initEvents() {
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
    }

    onMouseDown(e) {
        if (e.button !== 0) return;

        this.isSwinging = true;
        this.state = 'PULLBACK';
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.maxPullY = e.clientY;

        this.gauge.classList.remove('hidden');
        this.gaugeFill.style.height = '0%';

        // Dynamic baseline unit selector on press
        const isOnGreen = this.checkIsOnGreen ? this.checkIsOnGreen() : false;
        this.gaugeLabel.innerText = isOnGreen ? '0 ft' : '0 yds';
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

            const targetPullDistance = this.maxPullY - this.startY;
            const maxPullPixels = 180;
            const pullRatio = Math.min(targetPullDistance / maxPullPixels, 1);

            this.gaugeFill.style.height = `${pullRatio * 100}%`;
            this.gaugeLabel.style.top = `${pullRatio * 160}px`;

            // DYNAMIC SWING GAUGE SCALING
            const isOnGreen = this.checkIsOnGreen ? this.checkIsOnGreen() : false;
            if (isOnGreen) {
                // Putting mode: scale pull distance up to 25 feet maximum
                const feet = Math.round(pullRatio * 25);
                this.gaugeLabel.innerText = `${feet} ft`;
            } else {
                // Driving mode: calibrated to your preferred 200 yards maximum
                const yards = Math.round(pullRatio * 200);
                this.gaugeLabel.innerText = `${yards} yds`;
            }

            if (currentY < this.maxPullY - 5) {
                this.state = 'FORWARD';
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
        const targetPullDistance = this.maxPullY - this.startY;
        const actualForwardDistance = this.maxPullY - endY;

        const powerMultiplier = actualForwardDistance / targetPullDistance;
        const basePower = targetPullDistance * 0.05;
        const finalPower = basePower * powerMultiplier;

        const horizontalDeviation = endX - this.startX;
        const horizontalAngle = horizontalDeviation * 0.005;

        this.onLaunch(finalPower, horizontalAngle);
        this.resetSwing();
    }

    resetSwing() {
        this.isSwinging = false;
        this.state = 'IDLE';

        setTimeout(() => {
            if (!this.isSwinging) {
                this.gauge.classList.add('hidden');
            }
        }, 800);
    }
}