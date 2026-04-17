/**
 * Config Mapping - Exact keycode to sprite index mapping from original Bongo Cat Urume-chan
 * Standard mode configuration (mode: 1)
 *
 * Windows Virtual Keycodes mapped to JS event.keyCode:
 * 48-57 = 0-9 digits
 * 65-90 = A-Z letters
 * 192 = backtick (`)
 * 191 = forward slash (/)
 * 37-40 = Arrow keys (Left, Up, Right, Down)
 * 8 = Backspace, 9 = Tab, 13 = Enter, 16 = Shift, 17 = Ctrl
 * 18 = Alt, 20 = CapsLock, 27 = Escape, 32 = Space, 46 = Delete
 * 91 = Windows/Meta key, 113 = F2
 */

const ConfigMapping = {
    // Hand array from standard mode config - maps keycode to sprite index
    // Index in this array = sprite number (0.png, 1.png, etc.)
    handKeycodes: [
        [48],    // index 0: '0' key
        [57],    // index 1: '9' key
        [56],    // index 2: '8' key
        [55],    // index 3: '7' key
        [54],    // index 4: '6' key
        [53],    // index 5: '5' key
        [52],    // index 6: '4' key
        [51],    // index 7: '3' key
        [50],    // index 8: '2' key
        [49],    // index 9: '1' key
        [192],   // index 10: backtick '`'
        [80],    // index 11: 'P'
        [79],    // index 12: 'O'
        [73],    // index 13: 'I'
        [85],    // index 14: 'U'
        [89],    // index 15: 'Y'
        [84],    // index 16: 'T'
        [82],    // index 17: 'R'
        [69],    // index 18: 'E'
        [87],    // index 19: 'W'
        [81],    // index 20: 'Q'
        [191],   // index 21: '/'
        [77],    // index 22: 'M'
        [78],    // index 23: 'N'
        [66],    // index 24: 'B'
        [86],    // index 25: 'V'
        [67],    // index 26: 'C'
        [76],    // index 27: 'L'
        [75],    // index 28: 'K'
        [74],    // index 29: 'J'
        [72],    // index 30: 'H'
        [71],    // index 31: 'G'
        [70],    // index 32: 'F'
        [65],    // index 33: 'A'
        [83],    // index 34: 'S'
        [68],    // index 35: 'D'
        [88],    // index 36: 'X'
        [90],    // index 37: 'Z'
        [113],   // index 38: F2
        [27],    // index 39: Escape
        [46],    // index 40: Delete
        [8],     // index 41: Backspace
        [13],    // index 42: Enter
        [32],    // index 43: Space
        [18],    // index 44: Alt
        [16],    // index 45: Shift
        [17],    // index 46: Ctrl
        [20],    // index 47: CapsLock
        [9],     // index 48: Tab
        [91]     // index 49: Windows/Meta
    ],

    // Keyboard array - same mapping for keyboard highlight sprites
    keyboardKeycodes: [
        [48], [57], [56], [55], [54], [53], [52], [51], [50], [49],
        [192], [80], [79], [73], [85], [89], [84], [82], [69], [87],
        [81], [191], [77], [78], [66], [86], [67], [76], [75], [74],
        [72], [71], [70], [65], [83], [68], [88], [90], [113], [27],
        [46], [8], [13], [32], [18], [16], [17], [20], [9], [91]
    ],

    // Mouse button mappings
    mouseLeft: [1],    // Left mouse button
    mouseRight: [2],   // Right mouse button
    mouseSide: [5, 6], // Side mouse buttons

    // Build lookup table: keyCode -> sprite index
    _keycodeToSpriteIndex: null,

    /**
     * Initialize the lookup table
     */
    init() {
        this._keycodeToSpriteIndex = new Map();

        this.handKeycodes.forEach((keycodes, spriteIndex) => {
            keycodes.forEach(keycode => {
                this._keycodeToSpriteIndex.set(keycode, spriteIndex);
            });
        });

        console.log('ConfigMapping: Initialized with', this._keycodeToSpriteIndex.size, 'keycode mappings');
    },

    /**
     * Get sprite index for a given keyCode
     * @param {number} keyCode - JavaScript event.keyCode
     * @returns {number|null} - Sprite index (0-49) or null if not mapped
     */
    getSpriteIndex(keyCode) {
        if (!this._keycodeToSpriteIndex) {
            this.init();
        }
        return this._keycodeToSpriteIndex.has(keyCode)
            ? this._keycodeToSpriteIndex.get(keyCode)
            : null;
    },

    /**
     * Check if a keyCode is mapped
     * @param {number} keyCode - JavaScript event.keyCode
     * @returns {boolean}
     */
    isMappedKey(keyCode) {
        if (!this._keycodeToSpriteIndex) {
            this.init();
        }
        return this._keycodeToSpriteIndex.has(keyCode);
    },

    /**
     * Get all mapped keyCodes
     * @returns {number[]}
     */
    getAllKeyCodes() {
        if (!this._keycodeToSpriteIndex) {
            this.init();
        }
        return Array.from(this._keycodeToSpriteIndex.keys());
    },

    /**
     * Map JavaScript event.code to keyCode (for browsers that deprecate keyCode)
     * @param {string} code - event.code value
     * @returns {number|null} - keyCode equivalent
     */
    codeToKeyCode(code) {
        const codeMap = {
            // Digits
            'Digit0': 48, 'Digit1': 49, 'Digit2': 50, 'Digit3': 51, 'Digit4': 52,
            'Digit5': 53, 'Digit6': 54, 'Digit7': 55, 'Digit8': 56, 'Digit9': 57,
            // Letters
            'KeyA': 65, 'KeyB': 66, 'KeyC': 67, 'KeyD': 68, 'KeyE': 69,
            'KeyF': 70, 'KeyG': 71, 'KeyH': 72, 'KeyI': 73, 'KeyJ': 74,
            'KeyK': 75, 'KeyL': 76, 'KeyM': 77, 'KeyN': 78, 'KeyO': 79,
            'KeyP': 80, 'KeyQ': 81, 'KeyR': 82, 'KeyS': 83, 'KeyT': 84,
            'KeyU': 85, 'KeyV': 86, 'KeyW': 87, 'KeyX': 88, 'KeyY': 89, 'KeyZ': 90,
            // Special keys
            'Backquote': 192, 'Slash': 191, 'Backspace': 8, 'Tab': 9,
            'Enter': 13, 'ShiftLeft': 16, 'ShiftRight': 16,
            'ControlLeft': 17, 'ControlRight': 17,
            'AltLeft': 18, 'AltRight': 18,
            'CapsLock': 20, 'Escape': 27, 'Space': 32, 'Delete': 46,
            'MetaLeft': 91, 'MetaRight': 91, 'F2': 113,
            // Arrow keys (not in standard hand mapping but included for completeness)
            'ArrowLeft': 37, 'ArrowUp': 38, 'ArrowRight': 39, 'ArrowDown': 40
        };
        return codeMap[code] || null;
    }
};

// Auto-initialize
ConfigMapping.init();
