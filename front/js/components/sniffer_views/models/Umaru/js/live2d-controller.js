/**
 * Live2D Controller - Manages Live2D model rendering with direct parameter control
 * Replicates the original Bongo Cat Urume-chan standard mode behavior
 *
 * Parameters used:
 * - CatParamLeftHandDown (0/1): Keyboard press animation
 * - ParamMouseX (-1 to 1): Eye tracking X
 * - ParamMouseY (-1 to 1): Eye tracking Y
 * - ParamMouseLeftDown (0/1): Left mouse button
 * - ParamMouseRightDown (0/1): Right mouse button
 */

class Live2DController {
    constructor() {
        this.app = null;
        this.model = null;
        this.modelPath = 'models/urume-chan/cat.model3.json';
        this.mouseTracking = true;
        this.initialized = false;

        // Configuration from original app
        this.config = {
            scale: 1.16,           // l2d_correct from config.json
            offsetX: 0,
            offsetY: -0.005,       // l2d_offset[1]
            horizontalFlip: false, // Don't flip - match sprite orientation
            mouseSensitivity: 1.5  // Multiplier for mouse tracking responsiveness (reduced 45% from original)
        };

        // Parameter state
        this.params = {
            CatParamLeftHandDown: 0,
            ParamMouseX: 0,
            ParamMouseY: 0,
            ParamMouseLeftDown: 0,
            ParamMouseRightDown: 0
        };

        // Animation frame for continuous parameter updates
        this.animationFrame = null;
    }

    /**
     * Initialize the Live2D canvas and load the model
     * @param {string} canvasId - ID of the canvas element
     * @returns {Promise<boolean>} - Success status
     */
    async init(canvasId = 'live2d-canvas') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Live2DController: Canvas element not found');
            return false;
        }

        // Initialize PixiJS application - Fixed 612x352 size like original app
        this.app = new PIXI.Application({
            view: canvas,
            autoStart: true,
            width: 612,
            height: 352,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
            antialias: true
        });

        // Enable Live2D ticker
        PIXI.live2d.Live2DModel.registerTicker(PIXI.Ticker);

        try {
            // Load the Live2D model
            this.model = await PIXI.live2d.Live2DModel.from(this.modelPath);

            // Configure model
            this.configureModel();

            // Add to stage
            this.app.stage.addChild(this.model);

            // Setup mouse tracking
            this.setupMouseTracking();

            // Note: No resize handler needed - fixed 612x352 size

            // Start parameter update loop
            this.startParameterUpdateLoop();

            this.initialized = true;
            console.log('Live2DController: Model loaded successfully');
            return true;
        } catch (error) {
            console.error('Live2DController: Failed to load model', error);
            return false;
        }
    }

    /**
     * Configure model position, scale, and orientation
     * Uses fixed 612x352 dimensions like the original app
     */
    configureModel() {
        if (!this.model) return;

        // Fixed dimensions matching original app window_size
        const width = 612;
        const height = 352;

        // Apply scale (based on original config l2d_correct = 1.16)
        // Original formula: baseScale = scale * (height / 400) = 1.16 * (352/400) = ~1.02
        const baseScale = this.config.scale * (height / 400);
        this.model.scale.set(baseScale);

        // Horizontal flip if configured
        if (this.config.horizontalFlip) {
            this.model.scale.x *= -1;
        }

        // Position at bottom center
        this.model.anchor.set(0.5, 1);
        this.model.x = width / 2 + (this.config.offsetX * width);
        this.model.y = height + (this.config.offsetY * height);
    }

    /**
     * Handle window resize - Not needed with fixed size but kept for compatibility
     */
    handleResize() {
        // Fixed size - no resize needed
    }

    /**
     * Setup mouse tracking for eye follow
     */
    setupMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            if (!this.mouseTracking || !this.model) return;

            // Normalize mouse position to -1 to 1 range
            const rawX = (e.clientX / window.innerWidth - 0.5) * 2;
            const rawY = (e.clientY / window.innerHeight - 0.5) * 2;

            // Apply sensitivity multiplier and scale to Live2D parameter range (-30 to 30)
            const sensitivity = this.config.mouseSensitivity;
            const x = Math.max(-30, Math.min(30, rawX * sensitivity * 30));
            const y = Math.max(-30, Math.min(30, rawY * sensitivity * 30));

            this.params.ParamMouseX = x;
            this.params.ParamMouseY = y;

            // Also update focus for built-in eye tracking (uses -1 to 1 range)
            this.model.focus(Math.max(-1, Math.min(1, rawX * sensitivity)), Math.max(-1, Math.min(1, rawY * sensitivity)));
        });

        // Mouse button handlers
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.params.ParamMouseLeftDown = 1;
            } else if (e.button === 2) {
                this.params.ParamMouseRightDown = 1;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.params.ParamMouseLeftDown = 0;
            } else if (e.button === 2) {
                this.params.ParamMouseRightDown = 0;
            }
        });

        // Prevent context menu on right click for clean experience
        document.addEventListener('contextmenu', (e) => {
            // Only prevent if mouse tracking is enabled
            if (this.mouseTracking) {
                e.preventDefault();
            }
        });
    }

    /**
     * Start the parameter update loop for smooth animation
     */
    startParameterUpdateLoop() {
        const updateLoop = () => {
            this.applyParameters();
            this.animationFrame = requestAnimationFrame(updateLoop);
        };
        updateLoop();
    }

    /**
     * Apply current parameter values to the model
     */
    applyParameters() {
        if (!this.model || !this.model.internalModel) return;

        try {
            const coreModel = this.model.internalModel.coreModel;

            // Apply each parameter
            Object.entries(this.params).forEach(([name, value]) => {
                const index = coreModel.getParameterIndex(name);
                if (index >= 0) {
                    coreModel.setParameterValueByIndex(index, value);
                }
            });
        } catch (error) {
            // Silently handle - model might not be ready
        }
    }

    /**
     * Set keyboard press state (CatParamLeftHandDown)
     * @param {boolean} pressed - Whether a key is pressed
     */
    setKeyboardPressed(pressed) {
        this.params.CatParamLeftHandDown = pressed ? 1 : 0;
    }

    /**
     * Set left mouse button state
     * @param {boolean} pressed
     */
    setMouseLeftPressed(pressed) {
        this.params.ParamMouseLeftDown = pressed ? 1 : 0;
    }

    /**
     * Set right mouse button state
     * @param {boolean} pressed
     */
    setMouseRightPressed(pressed) {
        this.params.ParamMouseRightDown = pressed ? 1 : 0;
    }

    /**
     * Set model scale
     * @param {number} scale
     */
    setScale(scale) {
        this.config.scale = scale;
        this.configureModel();
    }

    /**
     * Enable/disable mouse tracking
     * @param {boolean} enabled
     */
    setMouseTracking(enabled) {
        this.mouseTracking = enabled;
        if (!enabled) {
            this.params.ParamMouseX = 0;
            this.params.ParamMouseY = 0;
        }
    }

    /**
     * Set mouse tracking sensitivity
     * @param {number} sensitivity - Multiplier (1.0 = normal, 2.0 = double, etc.)
     */
    setMouseSensitivity(sensitivity) {
        this.config.mouseSensitivity = sensitivity;
    }

    /**
     * Play a motion animation (for special effects, not used in normal operation)
     * @param {string} group - Motion group name
     * @param {number} index - Motion index
     */
    playMotion(group, index = 0) {
        if (!this.model) return;
        try {
            this.model.motion(group, index);
        } catch (error) {
            console.warn(`Live2DController: Motion not found: ${group}[${index}]`);
        }
    }

    /**
     * Play an expression (for special effects)
     * @param {string|number} expression
     */
    playExpression(expression) {
        if (!this.model) return;
        try {
            this.model.expression(expression);
        } catch (error) {
            console.warn(`Live2DController: Expression not found: ${expression}`);
        }
    }

    /**
     * Get current parameter values
     * @returns {Object}
     */
    getParameters() {
        return { ...this.params };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.model) {
            this.app.stage.removeChild(this.model);
            this.model.destroy();
        }
        if (this.app) {
            this.app.destroy(true);
        }
    }
}

// Export as singleton
const live2dController = new Live2DController();
