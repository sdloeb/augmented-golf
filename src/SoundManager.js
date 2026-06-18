export class SoundManager {
    constructor() {
        // FIXED: Replaced absolute website URLs with local repository paths so testing works perfectly on GitHub Pages
        this.sounds = {
            swing: new Audio('./sounds/swing.mp3'),
            bounce: new Audio('./sounds/bounce.mp3'),
            water: new Audio('./sounds/water.mp3'),
            sink: new Audio('./sounds/bounce.mp3'),
            putt: new Audio('./sounds/bounce.mp3')
        };

        // Pre-adjust volumes so they blend together nicely
        this.sounds.swing.volume = 0.5;
        this.sounds.bounce.volume = 0.5;
        this.sounds.water.volume = 0.6;
        this.sounds.sink.volume = 0.7;
        this.sounds.putt.volume = 0.65;

        Object.values(this.sounds).forEach(sound => {
            sound.preload = 'auto';
            sound.load();
        });
    }

    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            // Change this line: Reset the track timeline instantly on every play invoke
            sound.currentTime = 0;

            // Browsers require a user click before playing audio, catch prevents console errors
            sound.play().catch(err => console.log("Audio playback waiting for user click:", err));
        }
    }
}