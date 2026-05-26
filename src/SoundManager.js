export class SoundManager {
    constructor() {
        // Updated with reliable, open-source audio links that allow direct browser playback
        // Updated to use fully compatible, universal MP3 formats for standard external web browsers
        this.sounds = {
            swing: new Audio('https://gfxsounds.com/wp-content/uploads/2021/10/Golf-swing-no-ball-contact.mp3'),
            bounce: new Audio('https://raw.githubusercontent.com/scottschiller/SoundManager2/master/demo/_mp3/click-low.mp3'),
            water: new Audio('https://gfxsounds.com/wp-content/uploads/2021/09/Swimming-pool-dive-in-with-a-splash.mp3'), // Changed movie to a real water splash
            sink: new Audio('https://gfxsounds.com/wp-content/uploads/2021/10/Golf-ball-spins-around-cup.mp3')
        };

        // Pre-adjust volumes so they blend together nicely
        this.sounds.swing.volume = 0.5;
        this.sounds.bounce.volume = 0.5;
        this.sounds.water.volume = 0.6;
        this.sounds.sink.volume = 0.7;
    }

    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            // Only rewind if the sound has already started playing to prevent unprimed load errors
            if (sound.currentTime > 0) {
                sound.currentTime = 0;
            }

            // Browsers require a user click before playing audio, catch prevents console errors
            sound.play().catch(err => console.log("Audio playback waiting for user click:", err));
        }
    }
}