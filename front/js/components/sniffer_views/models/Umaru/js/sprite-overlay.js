/**
 * Sprite Overlay Manager - Manages hand, keyboard, and mouse PNG sprite overlays
 * Replicates the original Bongo Cat Urume-chan sprite layer system
 */

class SpriteOverlay {
    constructor() {
        this.container = null;
        this.handSprite = null;
        this.keyboardSprite = null;
        this.mouseBgSprite = null;

        this.currentHandIndex = -1;
        this.currentKeyboardIndex = -1;

        // Sprite paths
        this.paths = {
            hand: 'assets/hand/',
            keyboard: 'assets/keyboard/',
            mouseBg: 'assets/mousebg.png'
        };

        // Preloaded images
        this.handImages = [];
        this.keyboardImages = [];

        this.enabled = true;
    }

    /**
     * Initialize the sprite overlay system
     * @param {string} containerId - ID of the container element
     */
    init(containerId = 'overlay-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('SpriteOverlay: Container not found');
            return;
        }

        // Create sprite layer container - Fixed 612x352 size
        const spriteLayer = document.createElement('div');
        spriteLayer.id = 'sprite-layer';
        spriteLayer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 612px;
            height: 352px;
            pointer-events: none;
            z-index: 20;
        `;
        this.container.appendChild(spriteLayer);

        // Create hand sprite element - Native positioning
        this.handSprite = document.createElement('img');
        this.handSprite.id = 'hand-sprite';
        this.handSprite.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            display: none;
        `;
        spriteLayer.appendChild(this.handSprite);

        // Create keyboard sprite element (for keyboard highlight overlay) - Native positioning
        this.keyboardSprite = document.createElement('img');
        this.keyboardSprite.id = 'keyboard-sprite';
        this.keyboardSprite.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            display: none;
        `;
        spriteLayer.appendChild(this.keyboardSprite);

        // Create mouse background sprite (static) - Native positioning
        // Appended to container (not sprite-layer) so it renders BEHIND Live2D canvas
        this.mouseBgSprite = document.createElement('img');
        this.mouseBgSprite.id = 'mouse-bg-sprite';
        this.mouseBgSprite.src = this.paths.mouseBg;
        this.mouseBgSprite.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            z-index: 5;
        `;
        this.container.appendChild(this.mouseBgSprite);

        // Preload sprites
        this.preloadSprites();

        console.log('SpriteOverlay: Initialized');
    }

    /**
     * Preload all sprites for smooth transitions
     */
    preloadSprites() {
        // Preload hand sprites (0-49)
        for (let i = 0; i < 50; i++) {
            const img = new Image();
            img.src = `${this.paths.hand}${i}.png`;
            this.handImages[i] = img;
        }

        // Preload keyboard sprites (0-49)
        for (let i = 0; i < 50; i++) {
            const img = new Image();
            img.src = `${this.paths.keyboard}${i}.png`;
            this.keyboardImages[i] = img;
        }

        // Preload mouse background
        const mouseBgImg = new Image();
        mouseBgImg.src = this.paths.mouseBg;

        console.log('SpriteOverlay: Sprites preloaded');
    }

    /**
     * Show hand sprite for a given index
     * @param {number} index - Sprite index (0-49)
     */
    showHand(index) {
        if (!this.enabled || index < 0 || index >= 50) return;

        if (index !== this.currentHandIndex) {
            this.currentHandIndex = index;
            // Use preloaded image src for faster response
            if (this.handImages[index] && this.handImages[index].complete) {
                this.handSprite.src = this.handImages[index].src;
            } else {
                this.handSprite.src = `${this.paths.hand}${index}.png`;
            }
        }
        this.handSprite.style.display = 'block';
    }

    /**
     * Hide hand sprite
     */
    hideHand() {
        this.handSprite.style.display = 'none';
        this.currentHandIndex = -1;
    }

    /**
     * Show keyboard highlight sprite for a given index
     * @param {number} index - Sprite index (0-49)
     */
    showKeyboard(index) {
        if (!this.enabled || index < 0 || index >= 50) return;

        if (index !== this.currentKeyboardIndex) {
            this.currentKeyboardIndex = index;
            // Use preloaded image src for faster response
            if (this.keyboardImages[index] && this.keyboardImages[index].complete) {
                this.keyboardSprite.src = this.keyboardImages[index].src;
            } else {
                this.keyboardSprite.src = `${this.paths.keyboard}${index}.png`;
            }
        }
        this.keyboardSprite.style.display = 'block';
    }

    /**
     * Hide keyboard highlight sprite
     */
    hideKeyboard() {
        this.keyboardSprite.style.display = 'none';
        this.currentKeyboardIndex = -1;
    }

    /**
     * Enable/disable sprite overlays
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.hideHand();
            this.hideKeyboard();
        }
    }

    /**
     * Set visibility of mouse background sprite
     * @param {boolean} visible
     */
    setMouseVisible(visible) {
        const display = visible ? 'block' : 'none';
        if (this.mouseBgSprite) this.mouseBgSprite.style.display = display;
    }

    /**
     * Set visibility of hand sprites
     * @param {boolean} visible
     */
    setHandVisible(visible) {
        if (!visible && this.handSprite) {
            this.handSprite.style.display = 'none';
        }
    }
}

// Export as singleton
const spriteOverlay = new SpriteOverlay();
