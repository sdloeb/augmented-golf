export class SoundManager {
    constructor() {
        // Pre-allocate 4 separate channels for short, rapid action sound effects
        const poolSize = 4;

        this.sounds = {
            swing: Array.from({ length: poolSize }, () => new Audio('./sounds/swing.wav')),
            iron: Array.from({ length: poolSize }, () => new Audio('./sounds/iron.wav')),
            bounce: Array.from({ length: poolSize }, () => new Audio('./sounds/bounce.mp3')),
            water: Array.from({ length: poolSize }, () => new Audio('./sounds/water.wav')),
            putt: Array.from({ length: poolSize }, () => new Audio('./sounds/putt.wav')),
            sand: Array.from({ length: poolSize }, () => new Audio('./sounds/sand.wav')),
            sink: Array.from({ length: poolSize }, () => new Audio('./sounds/ballincup.wav'))

        };

        // FIXED: Independent standalone container for background ambient loops
        this.ambientSounds = {
            birds: new Audio('./sounds/birds.wav'),
            rain: new Audio('./sounds/rain.mp3')
        };

        // Configure background loop rules and lower the volume so it doesn't drown out hits
        this.ambientSounds.birds.loop = true;
        this.ambientSounds.birds.volume = 0.40;
        this.ambientSounds.rain.loop = true;
        this.ambientSounds.rain.volume = 0.60;


        // Ring buffer position index trackers
        this.poolIndices = {
            swing: 0,
            iron: 0,
            bounce: 0,
            water: 0,
            putt: 0,
            sand: 0,
            sink: 0
        };

        // Pre-adjust short effect volumes
        this.sounds.swing.forEach(s => s.volume = 0.5);
        this.sounds.iron.forEach(s => s.volume = 0.5);
        this.sounds.bounce.forEach(s => s.volume = 0.5);
        this.sounds.water.forEach(s => s.volume = 0.6);
        this.sounds.putt.forEach(s => s.volume = 0.65);
        this.sounds.sand.forEach(s => s.volume = 0.4);
        this.sounds.sink.forEach(s => s.volume = 0.7);
        this.sounds.rain.forEach(s => s.volume = 0.7);

        // Force browser cache structures to load files immediately
        Object.values(this.sounds).forEach(audioArray => {
            audioArray.forEach(sound => {
                sound.preload = 'auto';
                sound.load();
            });
        });

        this.ambientSounds.birds.preload = 'auto';
        this.ambientSounds.birds.load();
        this.ambientSounds.rain.preload = 'auto';
        this.ambientSounds.rain.load();
    }

    play(soundName) {
        const audioArray = this.sounds[soundName];
        if (audioArray && audioArray.length > 0) {
            const idx = this.poolIndices[soundName];
            const sound = audioArray[idx];

            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(err => console.log("Audio playback waiting for user interaction:", err));
            }

            this.poolIndices[soundName] = (idx + 1) % audioArray.length;
        }
    }

    // FIXED: Dedicated function to handle ambient loop tracks with built-in browser autoplay permissions fallback
    playAmbient(soundName) {
        const ambient = this.ambientSounds[soundName];
        if (ambient) {
            ambient.play().catch(err => {
                // If browser blocks initial page-load autoplay, register an invisible one-time trigger 
                // that plays the birds the very split second the user clicks or taps anywhere on screen.
                const startOnInteraction = () => {
                    ambient.play().catch(e => console.log(e));
                    window.removeEventListener('click', startOnInteraction);
                    window.removeEventListener('touchstart', startOnInteraction);
                };
                window.addEventListener('click', startOnInteraction);
                window.addEventListener('touchstart', startOnInteraction);
            });
        }
    }
    stopAmbient(soundName) { // Add this method block
        const ambient = this.ambientSounds[soundName];
        if (ambient) {
            ambient.pause();
        }
    }

}