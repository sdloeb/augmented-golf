/**
 * Standalone Tutorial Onboarding Module for Augmented Golf
 * Handles sequenced element spotlights and notifications on Hole 1
 */
/**
 * Standalone Tutorial Onboarding Module for Augmented Golf
 * Handles sequenced element spotlights and notifications on Hole 1
 */
export class TutorialManager {
    constructor() {
        this.steps = [
            { selector: '#windContainer', text: 'WIND SPEED', duration: 3000 },
            { selector: '#overheadBtn', text: "DRONE VIEW", duration: 3000 },
            { selector: '#clubOptionsContainer', text: 'CHOOSE YOUR CLUB', duration: 3000 },
            { selector: '#clubSwipe', text: 'DOUBLE CLICK THE CLUB TO AIM OR ADD BACKSPIN', duration: 8000, action: 'aimAndBackspin' },
            { selector: '#clubSwipe', text: 'PULL STRAIGHT BACK AND SWIPE FORWARD IN ONE MOTION', duration: 5000, swingType: 'straight' },
            { selector: '#clubSwipe', text: 'OR PULL AND SWIPE ON A DIAGONAL FOR DRAW OR FADE', duration: 5000, swingType: 'diagonal' }
        ];
        this.currentStepIndex = 0;
        this.overlayEl = null;
        this.textEl = null;
    }

    /**
         * Checks prerequisites and kicks off the sequence if on Hole 1
         */
    start() {
        window.isTutorialActive = true;
        this.createElements();
        this.executeStep();
    }

    /**
     * Dynamically handles HTML injection to keep index.html untouched
     */
    createElements() {
        // Create full screen dimmed backdrop layer
        this.overlayEl = document.createElement('div');
        this.overlayEl.id = 'tutorialOverlay';
        this.overlayEl.style.position = 'fixed';
        this.overlayEl.style.top = '0';
        this.overlayEl.style.left = '0';
        this.overlayEl.style.width = '100vw';
        this.overlayEl.style.height = '100vh';
        this.overlayEl.style.pointerEvents = 'none'; // Clicks pass through safely
        this.overlayEl.style.zIndex = '999999';
        this.overlayEl.style.transition = 'all 0.3s ease';

        // Create bold text notice wrapper
        this.textEl = document.createElement('div');
        this.textEl.id = 'tutorialText';
        this.textEl.style.position = 'fixed';
        this.textEl.style.top = '50%';
        this.textEl.style.left = '50%';
        this.textEl.style.transform = 'translate(-50%, -50%)Scale(0.9)';
        this.textEl.style.color = '#eb0303'; // Accent Gold text color
        this.textEl.style.fontFamily = "'Georgia', serif";
        this.textEl.style.fontSize = '32px';
        this.textEl.style.fontWeight = 'bold';
        this.textEl.style.textAlign = 'center';
        this.textEl.style.textShadow = '0 4px 12px rgba(0,0,0,0.9), 0 0 20px rgba(255,204,102,0.3)';
        this.textEl.style.letterSpacing = '2px';
        this.textEl.style.opacity = '0';
        this.textEl.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.textEl.style.zIndex = '1000000';
        this.textEl.style.pointerEvents = 'none';

        document.body.appendChild(this.overlayEl);
        document.body.appendChild(this.textEl);
    }

    /**
     * Executes the active step sequence and calculates highlight placement box coordinates
     */
    executeStep() {
        if (this.currentStepIndex >= this.steps.length) {
            this.end();
            return;
        }

        const step = this.steps[this.currentStepIndex];
        const targetElement = document.querySelector(step.selector);

        if (!targetElement) {
            // Safe fallback loop if element isn't visible/rendered on screen yet
            this.currentStepIndex++;
            this.executeStep();
            return;
        }

        // Calculate location geometry bounds for dynamic spotlight rendering
        const rect = targetElement.getBoundingClientRect();

        // Remove old highlights from elements
        document.querySelectorAll('.tutorial-highlighted').forEach(el => {
            el.classList.remove('tutorial-highlighted');
        });

        // Add visual pulsing flash onto target element container
        targetElement.classList.add('tutorial-highlighted');

        // Reset club container z-index if it was elevated from a previous run
        const clubContainer = document.getElementById('clubContainer');
        if (clubContainer) clubContainer.style.zIndex = '';

        // Elevate the parent stacking context if we are highlighting the club head zone
        if (step.selector === '#clubSwipe' && clubContainer) {
            clubContainer.style.zIndex = '1000002';
        }

        // Allocate dynamic positioning and transition properties per step
        let targetTransform = 'translate(-50%, -50%) scale(1)';
        let fadeOutTransform = 'translate(-50%, -50%) scale(0.9)';

        // Detect if the game is running in mobile portrait layout matching your profile metrics
        const isMobilePortrait = window.innerWidth <= 768 || window.innerWidth / window.innerHeight < 1;

        // Dynamically change text and shadow glow to red on mobile portrait, keep gold on desktop
        if (isMobilePortrait) {
            this.textEl.style.color = '#ff3333';
            this.textEl.style.textShadow = '0 4px 12px rgba(0,0,0,0.9), 0 0 20px rgba(255,51,51,0.45)';
        } else {
            this.textEl.style.color = '#ff3333';
            this.textEl.style.textShadow = '0 4px 12px rgba(0,0,0,0.9), 0 0 20px rgba(255,204,102,0.3)';
        }

        if (this.currentStepIndex === 0 || (this.currentStepIndex === 1 && !isMobilePortrait)) {
            // Steps 0 & 1 (Desktop default): Align text precisely to the RIGHT side of the bounding card
            this.textEl.style.left = (rect.right + 20) + 'px';
            this.textEl.style.top = (rect.top + rect.height / 2) + 'px';
            this.textEl.style.fontSize = '32px';
            this.textEl.style.textAlign = 'left';
            targetTransform = 'translate(0, -50%) scale(1)';
            fadeOutTransform = 'translate(0, -50%) scale(0.9)';
        } else if (this.currentStepIndex === 1 && isMobilePortrait) {
            // Step 1 (Mobile Portrait): Center BIRD'S-EYE VIEW directly underneath the overhead view button
            this.textEl.style.left = '125px';
            this.textEl.style.top = (rect.bottom + 20) + 'px';
            this.textEl.style.fontSize = '26px';
            this.textEl.style.textAlign = 'center';
            targetTransform = 'translate(-50%, 0) scale(1)';
            fadeOutTransform = 'translate(-50%, 0) scale(0.9)';
        } else if (this.currentStepIndex === 2) {
            if (isMobilePortrait) {
                // Step 2 (Mobile Portrait): Center CHOOSE YOUR CLUB directly underneath the selection container box
                this.textEl.style.left = (rect.left + rect.width / 2) + 'px';
                this.textEl.style.top = (rect.bottom + 20) + 'px';
                this.textEl.style.fontSize = '26px';
                this.textEl.style.textAlign = 'center';
                targetTransform = 'translate(-50%, 0) scale(1)';
                fadeOutTransform = 'translate(-50%, 0) scale(0.9)';
            } else {
                // Step 2 (Desktop default): Align text precisely to the LEFT side of the club scroll card
                this.textEl.style.left = (rect.left - 20) + 'px';
                this.textEl.style.top = (rect.top + rect.height / 2) + 'px';
                this.textEl.style.fontSize = '32px';
                this.textEl.style.textAlign = 'right';
                targetTransform = 'translate(-100%, -50%) scale(1)';
                fadeOutTransform = 'translate(-100%, -50%) scale(0.9)';
            }
        } else {
            // Step 3 and later: Position text in the upper center area to leave the center clear for swing animations
            this.textEl.style.left = '50%';
            this.textEl.style.top = '50%';
            this.textEl.style.fontSize = isMobilePortrait ? '28px' : '34px';
            this.textEl.style.textAlign = 'center';
            this.textEl.style.width = '80%';
            this.textEl.style.maxWidth = '600px';
            targetTransform = 'translate(-50%, -50%) scale(1)';
            fadeOutTransform = 'translate(-50%, -50%) scale(0.9)';
        }

        // Remove any old gesture indicators
        const oldHand = document.getElementById('tutorialHandIndicator');
        if (oldHand) oldHand.remove();

        // Create a new gesture overlay if specified by the step
        if (step.swingType) {
            const hand = document.createElement('div');
            hand.id = 'tutorialHandIndicator';
            hand.className = `tutorial-hand-overlay animate-${step.swingType}`;
            document.body.appendChild(hand);
        }

        // --- AUTOMATED AIM & BACKSPIN DEMONSTRATION ---
        if (step.action === 'aimAndBackspin') {
            // 1. Change club selection to 5 Iron
            setTimeout(() => {
                if (window.inputHandler) {
                    window.inputHandler.chosenClubIndex = 4; // 5 Iron
                    if (window.updateDistanceDisplay) window.updateDistanceDisplay();
                }
            }, 500);

            // 2. Automatically enter Aim Mode
            setTimeout(() => {
                if (window.inputHandler) {
                    window.inputHandler.isAimMode = true;
                    window.inputHandler.isSwinging = false;
                    window.inputHandler.state = 'IDLE';
                }
            }, 1400);

            // 3. Automatically click the Backspin Button
            setTimeout(() => {
                const backspinBtn = document.getElementById('backspinBtn');
                if (backspinBtn && !backspinBtn.classList.contains('hidden')) {
                    backspinBtn.click();
                }
            }, 2200);

            // 4. Move aim left, right, then back to center
            setTimeout(() => {
                const startTime = performance.now();
                const animDuration = 3500;

                const aimInterval = setInterval(() => {
                    if (!window.inputHandler || !window.isTutorialActive) {
                        clearInterval(aimInterval);
                        return;
                    }
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(1.0, elapsed / animDuration);

                    if (progress < 0.33) {
                        const p = progress / 0.33;
                        window.inputHandler.aimAngleOffset = -0.22 * Math.sin(p * Math.PI / 2);
                    } else if (progress < 0.75) {
                        const p = (progress - 0.33) / 0.42;
                        window.inputHandler.aimAngleOffset = -0.22 + 0.44 * (0.5 - 0.5 * Math.cos(p * Math.PI));
                    } else {
                        const p = (progress - 0.75) / 0.25;
                        window.inputHandler.aimAngleOffset = 0.22 * (1 - Math.sin(p * Math.PI / 2));
                    }

                    if (progress >= 1.0) {
                        window.inputHandler.aimAngleOffset = 0;
                        clearInterval(aimInterval);
                    }
                }, 16);
            }, 3000);
        }

        // Exit Aim Mode when moving past the demonstration step to prepare for swipe steps
        if (!step.action && window.inputHandler) {
            window.inputHandler.isAimMode = false;
            window.inputHandler.aimAngleOffset = 0;
        }

        // Render the text notification string matching the tailored geometry styles
        this.textEl.innerText = step.text;
        this.textEl.style.opacity = '1';
        this.textEl.style.transform = targetTransform;

        // Schedule next step transition
        setTimeout(() => {
            // Animate text fade-out transition using the custom transform anchors
            this.textEl.style.opacity = '0';
            this.textEl.style.transform = fadeOutTransform;

            setTimeout(() => {
                this.currentStepIndex++;
                this.executeStep();
            }, 300);
        }, step.duration);
    }

    end() {
        document.querySelectorAll('.tutorial-highlighted').forEach(el => {
            el.classList.remove('tutorial-highlighted');
        });

        // Restore default club container layout layer order
        const clubContainer = document.getElementById('clubContainer');
        if (clubContainer) clubContainer.style.zIndex = '';

        const oldHand = document.getElementById('tutorialHandIndicator');
        if (oldHand) oldHand.remove();

        if (this.overlayEl) this.overlayEl.remove();
        if (this.textEl) this.textEl.remove();

        if (window.inputHandler) {
            window.inputHandler.isAimMode = false;
            window.inputHandler.aimAngleOffset = 0;
            window.inputHandler.chosenClubIndex = 0; // Reset club selection back to Driver
            if (window.updateDistanceDisplay) window.updateDistanceDisplay();
        }

        // Turn off the tutorial input locks so the player can click and play freely
        window.isTutorialActive = false;
    }
}