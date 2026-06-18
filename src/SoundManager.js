export class SoundManager {
    constructor() {
        // FIXED: Pre-allocate 4 separate channels for every track to support overlapping micro-bounces cleanly.
        const poolSize = 4;

        this.sounds = {
            swing: Array.from({ length: poolSize }, () => new Audio('./sounds/swing.wav')),
            iron: Array.from({ length: poolSize }, () => new Audio('./sounds/iron.wav')),
            bounce: Array.from({ length: poolSize }, () => new Audio('./sounds/bounce.wav')),
            water: Array.from({ length: poolSize }, () => new Audio('./sounds/water.wav')),
            putt: Array.from({ length: poolSize }, () => new Audio('./sounds/putt.wav')),
            sand: Array.from({ length: poolSize }, () => new Audio('./sounds/sand.wav')),
            sink: Array.from({ length: poolSize }, () => new Audio('./sounds/putt.wav')) // Fallback for the cup drop
        };

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

        // Pre-adjust volumes across all channels to balance track levels nicely
        this.sounds.swing.forEach(s => s.volume = 0.5);
        this.sounds.iron.forEach(s => s.volume = 0.5);
        this.sounds.bounce.forEach(s => s.volume = 0.5);
        this.sounds.water.forEach(s => s.volume = 0.6);
        this.sounds.putt.forEach(s => s.volume = 0.65);
        this.sounds.sand.forEach(s => s.volume = 0.6);
        this.sounds.sink.forEach(s => s.volume = 0.7);

        // Force browser cache structures to load files immediately to eliminate launch stuttering
        Object.values(this.sounds).forEach(audioArray => {
            audioArray.forEach(sound => {
                sound.preload = 'auto';
                sound.load();
            });
        });
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
}