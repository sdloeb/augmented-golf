export class SoundManager {
    constructor() {
        // Pre-allocate 4 separate channels for short, rapid action sound effects
        const poolSize = 4;

        this.sounds = {
            swing: Array.from({ length: poolSize }, () => new Audio('./sounds/swing.wav')),
            iron: Array.from({ length: poolSize }, () => new Audio('./sounds/iron.wav')),
            water: Array.from({ length: poolSize }, () => new Audio('./sounds/water.wav')),
            putt: Array.from({ length: poolSize }, () => new Audio('./sounds/putt.wav')),
            sand: Array.from({ length: poolSize }, () => new Audio('./sounds/sand.wav')),
            sink: Array.from({ length: poolSize }, () => new Audio('./sounds/ballincup.wav')),
            // SURFACE EXPLICIT AUDIO CHANNELS: Allocated for independent landing responses
            fairway: Array.from({ length: poolSize }, () => new Audio('./sounds/fairway.wav')), // Add this line
            rough: Array.from({ length: poolSize }, () => new Audio('./sounds/rough.wav')),     // Add this line
            green: Array.from({ length: poolSize }, () => new Audio('./sounds/green.wav')),
            wood: Array.from({ length: poolSize }, () => new Audio('./sounds/wood.wav')),
            trees: Array.from({ length: poolSize }, () => new Audio('./sounds/trees.wav'))
            // Add this line
        };

        // FIXED: Independent standalone container for background ambient loops
        this.ambientSounds = {
            birds: new Audio('./sounds/birds.wav'),
            rain: new Audio('./sounds/rain.mp3')
        };

        // Configure background loop rules and lower the volume so it doesn't drown out hits
        this.ambientSounds.birds.loop = true;
        this.ambientSounds.birds.volume = 0.90;
        this.ambientSounds.rain.loop = true;
        this.ambientSounds.rain.volume = 0.60;


        // Ring buffer position index trackers
        this.poolIndices = {
            swing: 0,
            iron: 0,
            water: 0,
            putt: 0,
            sand: 0,
            sink: 0,
            fairway: 0, // Add this line
            rough: 0,   // Add this line
            green: 0,
            wood: 0,
            trees: 0   // Add this line
        };

        // Pre-adjust short effect volumes
        this.sounds.swing.forEach(s => s.volume = 0.5);
        this.sounds.iron.forEach(s => s.volume = 0.5);
        this.sounds.water.forEach(s => s.volume = 0.6);
        this.sounds.putt.forEach(s => s.volume = 0.65);
        this.sounds.sand.forEach(s => s.volume = 0.4);
        this.sounds.sink.forEach(s => s.volume = 0.7);
        this.sounds.fairway.forEach(s => s.volume = 0.5);
        this.sounds.rough.forEach(s => s.volume = 0.5);
        this.sounds.green.forEach(s => s.volume = 0.3);
        this.sounds.wood.forEach(s => s.volume = 0.55);
        this.sounds.trees.forEach(s => s.volume = 0.50);


        // Force browser cache structures to load files immediately with a try/catch protection wrapper for mobile webviews
        Object.values(this.sounds).forEach(audioArray => {
            audioArray.forEach(sound => {
                try {
                    sound.preload = 'auto';
                    sound.load();
                } catch (audioMobileErr) {
                    console.log("Audio preloading deferred by target mobile browser security policy.", audioMobileErr);
                }
            });
        });

        try {
            this.ambientSounds.birds.preload = 'auto';
            this.ambientSounds.birds.load();
            this.ambientSounds.rain.preload = 'auto';
            this.ambientSounds.rain.load();
        } catch (ambientMobileErr) {
            console.log("Ambient preloading safely deferred until first user click/touch interaction.", ambientMobileErr);
        }


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
                // Clear any existing listeners to avoid multi-trigger stacking on new holes
                if (ambient._soundUnlocker) {
                    document.removeEventListener('click', ambient._soundUnlocker, true);
                    document.removeEventListener('touchstart', ambient._soundUnlocker, true);
                }

                // Create a robust capturing trigger that fires no matter what element is touched
                ambient._soundUnlocker = () => {
                    ambient.play().catch(e => console.log("Ambient catch unlock failed:", e));
                    document.removeEventListener('click', ambient._soundUnlocker, true);
                    document.removeEventListener('touchstart', ambient._soundUnlocker, true);
                    ambient._soundUnlocker = null;
                };

                // The 'true' parameter activates CAPTURING mode, intercepting the tap before anything else can prevent it
                document.addEventListener('click', ambient._soundUnlocker, true);
                document.addEventListener('touchstart', ambient._soundUnlocker, true);
            });
        }
    }
    stopAmbient(soundName) {
        const ambient = this.ambientSounds[soundName];
        if (ambient) {
            ambient.pause();
            // Safeguard: Tear down the listener if the track changes before a click happens
            if (ambient._soundUnlocker) {
                document.removeEventListener('click', ambient._soundUnlocker, true);
                document.removeEventListener('touchstart', ambient._soundUnlocker, true);
                ambient._soundUnlocker = null;
            }
        }
    }

}