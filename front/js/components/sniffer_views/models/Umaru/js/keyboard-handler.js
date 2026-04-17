/**
 * Keyboard Handler - Detects keyboard input using exact config mapping
 * Replicates the original Bongo Cat Urume-chan standard mode behavior
 */

class KeyboardHandler {
    constructor() {
        // Currently pressed keys (keyCode -> spriteIndex)
        this.pressedKeys = new Map();

        // Last active sprite index (for maintaining hand position)
        this.lastSpriteIndex = -1;

        // Callbacks
        this.onKeyPress = null;      // (keyCode, spriteIndex, state) => {}
        this.onKeyRelease = null;    // (keyCode, state) => {}
        this.onStateChange = null;   // (state) => {}

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundBlur = this.handleBlur.bind(this);
    }

    /**
     * Initialize keyboard listeners
     */
    init() {
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        window.addEventListener('blur', this.boundBlur);
        console.log('KeyboardHandler: Initialized with config mapping');
    }

    /**
     * Handle key down event
     * @param {KeyboardEvent} e
     */
    handleKeyDown(e) {
        // Get keyCode (or convert from code for modern browsers)
        let keyCode = e.keyCode || e.which;

        // Fallback to code conversion if keyCode is 0 or undefined
        if (!keyCode && e.code) {
            keyCode = ConfigMapping.codeToKeyCode(e.code);
        }

        if (!keyCode) return;

        // Check if this is a mapped key
        const spriteIndex = ConfigMapping.getSpriteIndex(keyCode);

        if (spriteIndex !== null && !this.pressedKeys.has(keyCode)) {
            // New key press
            this.pressedKeys.set(keyCode, spriteIndex);
            this.lastSpriteIndex = spriteIndex;

            if (this.onKeyPress) {
                this.onKeyPress(keyCode, spriteIndex, this.getState());
            }

            if (this.onStateChange) {
                this.onStateChange(this.getState());
            }
        }
    }

    /**
     * Handle key up event
     * @param {KeyboardEvent} e
     */
    handleKeyUp(e) {
        let keyCode = e.keyCode || e.which;

        if (!keyCode && e.code) {
            keyCode = ConfigMapping.codeToKeyCode(e.code);
        }

        if (!keyCode) return;

        if (this.pressedKeys.has(keyCode)) {
            this.pressedKeys.delete(keyCode);

            // Update last sprite index to the most recent remaining key
            if (this.pressedKeys.size > 0) {
                const values = Array.from(this.pressedKeys.values());
                this.lastSpriteIndex = values[values.length - 1];
            } else {
                this.lastSpriteIndex = -1;
            }

            if (this.onKeyRelease) {
                this.onKeyRelease(keyCode, this.getState());
            }

            if (this.onStateChange) {
                this.onStateChange(this.getState());
            }
        }
    }

    /**
     * Handle window blur - release all keys
     */
    handleBlur() {
        if (this.pressedKeys.size > 0) {
            this.pressedKeys.clear();
            this.lastSpriteIndex = -1;

            if (this.onStateChange) {
                this.onStateChange(this.getState());
            }
        }
    }

    /**
     * Get current keyboard state
     * @returns {Object}
     */
    getState() {
        return {
            isActive: this.pressedKeys.size > 0,
            pressedCount: this.pressedKeys.size,
            currentSpriteIndex: this.lastSpriteIndex,
            pressedKeys: Array.from(this.pressedKeys.keys()),
            pressedSpriteIndices: Array.from(this.pressedKeys.values())
        };
    }

    /**
     * Check if any key is currently pressed
     * @returns {boolean}
     */
    isAnyKeyPressed() {
        return this.pressedKeys.size > 0;
    }

    /**
     * Get the current sprite index (most recently pressed)
     * @returns {number} - Sprite index or -1 if no keys pressed
     */
    getCurrentSpriteIndex() {
        return this.lastSpriteIndex;
    }

    /**
     * Cleanup
     */
    destroy() {
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        window.removeEventListener('blur', this.boundBlur);
    }
}

// Export as singleton
const keyboardHandler = new KeyboardHandler();
