// front/js/Live2DViewer.js

export class GlobalLive2DEngine {
    constructor() {
        this.canvas = document.getElementById('global-live2d-canvas');
        this.app = null;
        this.model = null;
    }

    async load(config, onHit) {
        this.destroy(); // 卸载旧模型

        this.canvas.style.display = 'block'; // 显示画布
        this.canvas.style.pointerEvents = 'auto'; // 允许点击

        // 针对老模型 (Shizuku) 锁死分辨率，保证 Stencil Buffer 遮罩不失效
        const isCubism2 = config.version === 2;

        this.app = new PIXI.Application({
            view: this.canvas,
            transparent: true, // 开启背景透明
            width: 180,
            height: 240,
            resolution: isCubism2 ? 1 : (window.devicePixelRatio || 1),
            autoDensity: !isCubism2,
            preserveDrawingBuffer: false, // 【关键】防止旧帧残留导致 Alpha 混合错误
            clearBeforeRender: true
        });

        try {
            console.log(`[全局引擎] 🚀 加载模型: ${config.name}`);
            this.model = await PIXI.live2d.Live2DModel.from(config.url);
            this.app.stage.addChild(this.model);

            // ==========================================
            // 纯手工排版！摒弃所有自动计算缩放的 Bug 代码！
            // ==========================================
            this.model.scale.set(config.layout.scale || 1);
            this.model.x = config.layout.x || 0;
            this.model.y = config.layout.y || 0;

            this.model.interactive = true;
            this.model.buttonMode = true;
            this.model.on("pointertap", (e) => {
                const hits = this.model.hitTest(e.data.global.x, e.data.global.y);
                if (onHit) onHit(hits);
            });

            console.log(`[全局引擎] ✅ ${config.name} 渲染就绪`);
        } catch (e) {
            console.error(`[全局引擎] ❌ 加载异常:`, e);
        }
    }

    play(motionName) {
        if (this.model && motionName) {
            this.model.motion(motionName);
        }
    }

    hide() {
        if (this.canvas) this.canvas.style.display = 'none';
        this.destroy();
    }

    destroy() {
        if (this.model) {
            this.app.stage.removeChild(this.model);
            this.model.destroy();
            this.model = null;
        }
        if (this.app) {
            this.app.destroy(false, { children: true, texture: true, baseTexture: true });
            this.app = null;
        }
    }
}

// 导出一个全局单例，保证全局唯一
export const l2dEngine = new GlobalLive2DEngine();