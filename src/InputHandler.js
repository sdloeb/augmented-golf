export class InputHandler {
    constructor(onLaunchCallback) {
        this.onLaunch = onLaunchCallback;

        // Grab our new HTML gauge elements
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

        // Make the gauge visible and reset its values
        this.gauge.classList.remove('hidden');
        this.gaugeFill.style.height = '0%';
        this.gaugeLabel.innerText = '0 yds';
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

            // Map 180 pixels of mouse movement to 180 yards maximum
            const maxPullPixels = 180;
            const pullRatio = Math.min(targetPullDistance / maxPullPixels, 1);
            const yards = Math.round(pullRatio * 180);

            // Visually expand the gauge downward and update text position
            this.gaugeFill.style.height = `${pullRatio * 100}%`;
            this.gaugeLabel.innerText = `${yards} yds`;
            this.gaugeLabel.style.top = `${pullRatio * 160}px`; // Slides label down alongside the bar

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
            // Safely reset the swing and hide the yardage gauge
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
        // TO THIS:
        const horizontalAngle = horizontalDeviation * 0.005;

        this.onLaunch(finalPower, horizontalAngle);
        this.resetSwing();
    }

    resetSwing() {
        this.isSwinging = false;
        this.state = 'IDLE';

        // Keep gauge visible for a brief moment post-shot, then fade out
        setTimeout(() => {
            if (!this.isSwinging) {
                this.gauge.classList.add('hidden');
            }
        }, 800);
    }
}