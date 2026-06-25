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
            green: Array.from({ length: poolSize }, () => new Audio('./sounds/green.wav'))      // Add this line
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
            green: 0    // Add this line
        };

        // Pre-adjust short effect volumes
        this.sounds.swing.forEach(s => s.volume = 0.5);
        this.sounds.iron.forEach(s => s.volume = 0.5);
        this.sounds.water.forEach(s => s.volume = 0.6);
        this.sounds.putt.forEach(s => s.volume = 0.65);
        this.sounds.sand.forEach(s => s.volume = 0.4);
        this.sounds.sink.forEach(s => s.volume = 0.7);
        this.sounds.fairway.forEach(s => s.volume = 0.5); // Add this line
        this.sounds.rough.forEach(s => s.volume = 0.5);   // Add this line
        this.sounds.green.forEach(s => s.volume = 0.5);


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