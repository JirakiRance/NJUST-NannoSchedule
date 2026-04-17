/**
 * Sound Manager - Handles audio playback using Howler.js
 */

class SoundManager {
    constructor() {
        this.sounds = {};
        this.volume = 0.5;
        this.enabled = true;
        this.lastPlayTime = 0;
        this.minInterval = 30; // Minimum ms between sounds to prevent overlap
    }

    /**
     * Initialize and preload all sounds
     */
    init() {
        // Preload key press sounds (6 variations for variety)
        for (let i = 0; i < 6; i++) {
            this.sounds[`key_${i}`] = new Howl({
                src: [`assets/sounds/key_${i}.mp3`],
                volume: this.volume,
                preload: true
            });
        }

        console.log('SoundManager: Audio files preloaded');
    }

    /**
     * Play a random key press sound
     */
    playKeyPress() {
        if (!this.enabled) return;

        const now = Date.now();
        if (now - this.lastPlayTime < this.minInterval) return;

        this.lastPlayTime = now;
        const soundIndex = Math.floor(Math.random() * 6);
        const sound = this.sounds[`key_${soundIndex}`];

        if (sound) {
            sound.play();
        }
    }

    /**
     * Set master volume
     * @param {number} vol - Volume level (0-1)
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        Object.values(this.sounds).forEach(sound => {
            sound.volume(this.volume);
        });
    }

    /**
     * Toggle sound on/off
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Get current enabled state
     */
    isEnabled() {
        return this.enabled;
    }
}

// Export as singleton
const soundManager = new SoundManager();
