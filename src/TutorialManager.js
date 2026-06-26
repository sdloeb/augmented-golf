/**
 * Standalone Tutorial Onboarding Module for Augmented Golf
 * Handles sequenced element spotlights and notifications on Hole 1
 */
export class TutorialManager {
    constructor() {
        this.steps = [
            { selector: '#windContainer', text: 'WIND SPEED', duration: 3000 },
            { selector: '#overheadBtn', text: "BIRD'S-EYE VIEW", duration: 3000 },
            { selector: '#clubOptionsContainer', text: 'CHOOSE YOUR CLUB', duration: 3000 },
            { selector: '#clubContainer', text: 'DOUBLE CLICK TO AIM', duration: 3000 }
        ];
        this.currentStepIndex = 0;
        this.overlayEl = null;
        this.textEl = null;
    }

    /**
     * Checks prerequisites and kicks off the sequence if on Hole 1
     */
    start() {
        // Only run if on Hole 1 and hasn't been completed yet in this browser session
        // if (localStorage.getItem('golfTutorialCompleted') === 'true') {
        //     return;
        // }

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
        this.textEl.style.color = '#ffcc66'; // Accent Gold text color
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

        // Render big text notification
        this.textEl.innerText = step.text;
        this.textEl.style.opacity = '1';
        this.textEl.style.transform = 'translate(-50%, -50%)Scale(1)';


        // Schedule next step transition
        setTimeout(() => {
            // Animate text fade-out transition window
            this.textEl.style.opacity = '0';
            this.textEl.style.transform = 'translate(-50%, -50%)Scale(0.9)';

            setTimeout(() => {
                this.currentStepIndex++;
                this.executeStep();
            }, 300);
        }, step.duration);
    }

    /**
     * Disposes elements cleanly and restores inputs to gameplay state
     */
    end() {
        document.querySelectorAll('.tutorial-highlighted').forEach(el => {
            el.classList.remove('tutorial-highlighted');
        });

        if (this.overlayEl) this.overlayEl.remove();
        if (this.textEl) this.textEl.remove();

        window.isTutorialActive = false;
        localStorage.setItem('golfTutorialCompleted', 'true');
    }
}