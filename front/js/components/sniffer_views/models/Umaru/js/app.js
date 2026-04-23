/**
 * Main Application Entry Point
 * Coordinates Live2D, sprite overlays, keyboard input, sounds, and mouse tracking
 * Replicates the exact behavior of the original Bongo Cat Urume-chan (standard mode)
 */

const App = {
    initialized: false,
    settings: {
        soundEnabled: false,
        soundVolume: 0,
        keyboardOverlayVisible: false,  // Using sprite overlay instead
        spriteOverlayVisible: true,
        mouseTracking: true,
        modelScale: 1.16,               // Original l2d_correct value
        transparentBackground: true
    },

    /**
     * Initialize all modules
     */
    async init() {
        console.log('App: Initializing Bongo Cat Urume-chan (Standard Mode)...');

        // Initialize config mapping (required before keyboard handler)
        if (typeof ConfigMapping !== 'undefined') {
            ConfigMapping.init();
        }

        // Initialize sound manager
        soundManager.init();
        soundManager.setVolume(this.settings.soundVolume);
        soundManager.setEnabled(this.settings.soundEnabled);

        // Initialize sprite overlay
        spriteOverlay.init('overlay-container');

        // Initialize keyboard handler
        keyboardHandler.init();
        this.setupKeyboardCallbacks();

        // Initialize keyboard overlay (visual keyboard, disabled by default)
        if (typeof keyboardOverlay !== 'undefined') {
            keyboardOverlay.init('keyboard-overlay');
            keyboardOverlay.setVisible(this.settings.keyboardOverlayVisible);
        }

        // Initialize Live2D controller
        const live2dLoaded = await live2dController.init('live2d-canvas');

        if (!live2dLoaded) {
            console.error('App: Failed to load Live2D model, falling back to sprite-only mode');
            this.showFallbackMessage();
        }

        // Setup mouse button callbacks for sprite overlay
        this.setupMouseCallbacks();

        // Setup settings UI
        this.setupSettingsUI();

        // Apply initial settings
        this.applySettings();

        this.initialized = true;
        console.log('App: Initialization complete');
    },

    /**
     * Setup keyboard event callbacks
     */
    setupKeyboardCallbacks() {
        // Handle key press
        keyboardHandler.onKeyPress = (keyCode, spriteIndex, state) => {
            // Update Live2D parameter (CatParamLeftHandDown = 1)
            live2dController.setKeyboardPressed(true);

            // Show hand sprite based on sprite index
            spriteOverlay.showHand(spriteIndex);

            // Update visual keyboard overlay if enabled
            if (typeof keyboardOverlay !== 'undefined') {
                // Convert keyCode back to code for keyboard overlay
                const code = this.keyCodeToCode(keyCode);
                if (code) {
                    keyboardOverlay.pressKey(code);
                }
            }
        };

        // Handle key release
        keyboardHandler.onKeyRelease = (keyCode, state) => {
            // Update visual keyboard overlay
            if (typeof keyboardOverlay !== 'undefined') {
                const code = this.keyCodeToCode(keyCode);
                if (code) {
                    keyboardOverlay.releaseKey(code);
                }
            }

            // If still keys pressed, show the current sprite
            if (state.isActive) {
                spriteOverlay.showHand(state.currentSpriteIndex);
            } else {
                // No keys pressed - hide hand sprite and reset Live2D parameter
                spriteOverlay.hideHand();
                live2dController.setKeyboardPressed(false);
            }
        };
    },

    /**
     * Setup mouse button callbacks (placeholder for future mouse tracking)
     */
    setupMouseCallbacks() {
        // Mouse state tracking removed - only background sprite is shown
    },

    /**
     * Convert keyCode to event.code for keyboard overlay compatibility
     * @param {number} keyCode
     * @returns {string|null}
     */
    keyCodeToCode(keyCode) {
        const map = {
            // Digits
            48: 'Digit0', 49: 'Digit1', 50: 'Digit2', 51: 'Digit3', 52: 'Digit4',
            53: 'Digit5', 54: 'Digit6', 55: 'Digit7', 56: 'Digit8', 57: 'Digit9',
            // Letters
            65: 'KeyA', 66: 'KeyB', 67: 'KeyC', 68: 'KeyD', 69: 'KeyE',
            70: 'KeyF', 71: 'KeyG', 72: 'KeyH', 73: 'KeyI', 74: 'KeyJ',
            75: 'KeyK', 76: 'KeyL', 77: 'KeyM', 78: 'KeyN', 79: 'KeyO',
            80: 'KeyP', 81: 'KeyQ', 82: 'KeyR', 83: 'KeyS', 84: 'KeyT',
            85: 'KeyU', 86: 'KeyV', 87: 'KeyW', 88: 'KeyX', 89: 'KeyY', 90: 'KeyZ',
            // Special keys
            192: 'Backquote', 191: 'Slash', 8: 'Backspace', 9: 'Tab',
            13: 'Enter', 16: 'ShiftLeft', 17: 'ControlLeft', 18: 'AltLeft',
            20: 'CapsLock', 27: 'Escape', 32: 'Space', 46: 'Delete',
            91: 'MetaLeft', 113: 'F2'
        };
        return map[keyCode] || null;
    },

    /**
     * Setup settings panel UI
     */
    setupSettingsUI() {
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsPanel = document.getElementById('settings-panel');
        const closeSettings = document.getElementById('close-settings');

        if (settingsToggle && settingsPanel) {
            settingsToggle.addEventListener('click', () => {
                settingsPanel.classList.toggle('hidden');
            });
        }

        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                settingsPanel.classList.add('hidden');
            });
        }

        // Keyboard overlay toggle (visual keyboard)
        const overlayToggle = document.getElementById('keyboard-overlay-visible');
        if (overlayToggle) {
            overlayToggle.checked = this.settings.keyboardOverlayVisible;
            overlayToggle.addEventListener('change', () => {
                this.settings.keyboardOverlayVisible = overlayToggle.checked;
                if (typeof keyboardOverlay !== 'undefined') {
                    keyboardOverlay.setVisible(this.settings.keyboardOverlayVisible);
                }
            });
        }

        // Transparent background
        const transparentBg = document.getElementById('transparent-bg');
        if (transparentBg) {
            transparentBg.checked = this.settings.transparentBackground;
            transparentBg.addEventListener('change', () => {
                this.settings.transparentBackground = transparentBg.checked;
                this.applySettings();
            });
        }

        // Mouse tracking
        const mouseTracking = document.getElementById('mouse-tracking');
        if (mouseTracking) {
            mouseTracking.checked = this.settings.mouseTracking;
            mouseTracking.addEventListener('change', () => {
                this.settings.mouseTracking = mouseTracking.checked;
                live2dController.setMouseTracking(this.settings.mouseTracking);
                spriteOverlay.setMouseVisible(this.settings.mouseTracking);
            });
        }

        // Model scale
        const scaleSlider = document.getElementById('model-scale');
        const scaleValue = document.getElementById('scale-value');
        if (scaleSlider) {
            scaleSlider.value = this.settings.modelScale;
            if (scaleValue) scaleValue.textContent = this.settings.modelScale.toFixed(2);

            scaleSlider.addEventListener('input', () => {
                this.settings.modelScale = parseFloat(scaleSlider.value);
                live2dController.setScale(this.settings.modelScale);
                if (scaleValue) scaleValue.textContent = this.settings.modelScale.toFixed(2);
            });
        }
    },

    /**
     * Apply current settings
     */
    applySettings() {
        // Transparent background
        if (this.settings.transparentBackground) {
            document.body.classList.remove('solid-bg');
        } else {
            document.body.classList.add('solid-bg');
        }

        // Hide visual keyboard overlay by default (sprite overlay handles visuals)
        const keyboardOverlayEl = document.getElementById('keyboard-overlay');
        if (keyboardOverlayEl && !this.settings.keyboardOverlayVisible) {
            keyboardOverlayEl.style.display = 'none';
        }
    },

    /**
     * Show fallback message if Live2D fails to load
     */
    showFallbackMessage() {
        const container = document.getElementById('overlay-container');
        if (container) {
            const msg = document.createElement('div');
            msg.className = 'fallback-message';
            msg.innerHTML = `
                <p>Live2D model failed to load.</p>
                <p>Please ensure you are running this from a web server.</p>
                <code>python -m http.server 8000</code>
            `;
            container.appendChild(msg);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
