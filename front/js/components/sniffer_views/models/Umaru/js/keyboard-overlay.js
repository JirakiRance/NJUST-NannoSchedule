/**
 * Keyboard Overlay - Visual keyboard display
 */

class KeyboardOverlay {
    constructor() {
        this.container = null;
        this.keys = {};
        this.visible = true;

        // Key layout (QWERTY)
        this.layout = [
            // Row 1 - Number row
            ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Back'],
            // Row 2 - Top row
            ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
            // Row 3 - Home row
            ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
            // Row 4 - Bottom row
            ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
            // Row 5 - Space row
            ['Ctrl', 'Alt', 'Cmd', 'Space', 'Cmd', 'Alt', 'Ctrl']
        ];

        // Map display keys to event codes
        this.keyCodeMap = {
            '`': 'Backquote', '1': 'Digit1', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4',
            '5': 'Digit5', '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9',
            '0': 'Digit0', '-': 'Minus', '=': 'Equal', 'Back': 'Backspace',
            'Tab': 'Tab', 'Q': 'KeyQ', 'W': 'KeyW', 'E': 'KeyE', 'R': 'KeyR', 'T': 'KeyT',
            'Y': 'KeyY', 'U': 'KeyU', 'I': 'KeyI', 'O': 'KeyO', 'P': 'KeyP',
            '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash',
            'Caps': 'CapsLock', 'A': 'KeyA', 'S': 'KeyS', 'D': 'KeyD', 'F': 'KeyF', 'G': 'KeyG',
            'H': 'KeyH', 'J': 'KeyJ', 'K': 'KeyK', 'L': 'KeyL', ';': 'Semicolon',
            "'": 'Quote', 'Enter': 'Enter',
            'Z': 'KeyZ', 'X': 'KeyX', 'C': 'KeyC', 'V': 'KeyV', 'B': 'KeyB',
            'N': 'KeyN', 'M': 'KeyM', ',': 'Comma', '.': 'Period', '/': 'Slash',
            'Space': 'Space', 'Ctrl': 'ControlLeft', 'Alt': 'AltLeft', 'Cmd': 'MetaLeft'
        };

        // Keys that appear twice (left/right variants)
        this.duplicateKeys = {
            'Shift': ['ShiftLeft', 'ShiftRight'],
            'Ctrl': ['ControlLeft', 'ControlRight'],
            'Alt': ['AltLeft', 'AltRight'],
            'Cmd': ['MetaLeft', 'MetaRight']
        };

        // Wide keys
        this.wideKeys = {
            'Back': 1.5, 'Tab': 1.2, 'Caps': 1.5, 'Enter': 1.8,
            'Shift': 2, 'Space': 5, 'Ctrl': 1.2, 'Alt': 1.2, 'Cmd': 1.2
        };
    }

    /**
     * Initialize the keyboard overlay
     */
    init(containerId = 'keyboard-overlay') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('KeyboardOverlay: Container not found');
            return;
        }

        this.render();
        console.log('KeyboardOverlay: Initialized');
    }

    /**
     * Render the keyboard
     */
    render() {
        this.container.innerHTML = '';

        this.layout.forEach((row, rowIndex) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';

            // Track position for left/right shift etc
            let keyPositionInRow = 0;

            row.forEach((keyLabel) => {
                const keyEl = document.createElement('div');
                keyEl.className = 'keyboard-key';
                keyEl.textContent = keyLabel;

                // Apply width for special keys
                if (this.wideKeys[keyLabel]) {
                    keyEl.style.flex = `${this.wideKeys[keyLabel]}`;
                }

                // Get the code for this key
                let code = this.keyCodeMap[keyLabel];

                // Handle duplicate keys (left/right variants)
                if (this.duplicateKeys[keyLabel]) {
                    // First occurrence is left, second is right
                    const occurrences = row.filter(k => k === keyLabel);
                    const isFirst = keyPositionInRow === row.indexOf(keyLabel);
                    code = isFirst ? this.duplicateKeys[keyLabel][0] : this.duplicateKeys[keyLabel][1];
                }

                if (code) {
                    if (!this.keys[code]) {
                        this.keys[code] = [];
                    }
                    this.keys[code].push(keyEl);
                }

                rowEl.appendChild(keyEl);
                keyPositionInRow++;
            });

            this.container.appendChild(rowEl);
        });
    }

    /**
     * Highlight a key as pressed
     */
    pressKey(code) {
        const keyEls = this.keys[code];
        if (keyEls) {
            keyEls.forEach(el => el.classList.add('active'));
        }
    }

    /**
     * Remove highlight from a key
     */
    releaseKey(code) {
        const keyEls = this.keys[code];
        if (keyEls) {
            keyEls.forEach(el => el.classList.remove('active'));
        }
    }

    /**
     * Update keyboard display based on state
     */
    updateFromState(state) {
        // Clear all active states
        Object.values(this.keys).forEach(keyEls => {
            keyEls.forEach(el => el.classList.remove('active'));
        });

        // Highlight pressed keys
        state.allKeys.forEach(code => {
            this.pressKey(code);
        });
    }

    /**
     * Show/hide the overlay
     */
    setVisible(visible) {
        this.visible = visible;
        if (this.container) {
            this.container.style.display = visible ? 'flex' : 'none';
        }
    }

    /**
     * Toggle visibility
     */
    toggle() {
        this.setVisible(!this.visible);
    }
}

// Export as singleton
const keyboardOverlay = new KeyboardOverlay();
