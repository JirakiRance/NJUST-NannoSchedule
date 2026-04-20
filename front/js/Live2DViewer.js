// front/js/Live2DViewer.js

export class GlobalLive2DEngine {
    constructor() {
        this.canvas = document.getElementById('global-live2d-canvas');
        this.app = null;
        this.model = null;
        this.config = null;

        // 业务状态机管理
        this.currentState = 'alive';
        this.isPlayingAction = false;
        this.tickerCallback = null;
    }

    async load(config, onHit) {
        this.destroy(); // 卸载旧模型，包含清理旧的 Ticker！

        this.config = config;
        this.currentState = 'alive';
        this.isPlayingAction = false;

        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.pointerEvents = 'auto';
        }

        const isCubism2 = config.version === 2;
        if (typeof PIXI !== 'undefined') PIXI.settings.PREFER_ENV = isCubism2 ? PIXI.ENV.WEBGL_LEGACY : PIXI.ENV.WEBGL2;

        this.app = new PIXI.Application({
            view: this.canvas,
            transparent: true,
            width: 180,
            height: 240,
            resolution: isCubism2 ? 1 : (window.devicePixelRatio || 1),
            autoDensity: !isCubism2,
            preserveDrawingBuffer: false,
            clearBeforeRender: true
        });

        try {
            console.log(`[全局引擎] 🚀 加载通用模型: ${config.name}`);
            this.model = await PIXI.live2d.Live2DModel.from(config.url);
            this.app.stage.addChild(this.model);

            this.model.scale.set(config.layout.scale || 1);
            this.model.x = config.layout.x || 0;
            this.model.y = config.layout.y || 0;

            this.model.interactive = true;
            this.model.buttonMode = true;
            this.model.on("pointertap", (e) => {
                const hits = this.model.hitTest(e.data.global.x, e.data.global.y);
                if (onHit) onHit(hits);
            });

            // ==========================================
            // 🚨 核心挂载 1：拦截器 (Hijack Auto-Idle)
            // ==========================================
            const mm = this.model.internalModel.motionManager;
            const originalStartRandom = mm.startRandomMotion.bind(mm);

            // 清除默认的渐变时间，防止互相干扰
            for (const group in mm.motionGroups) {
                mm.motionGroups[group]?.forEach(m => {
                    if (m) { m._fadeInSeconds = 0; m._fadeOutSeconds = 0; }
                });
            }

            mm.startRandomMotion = (group, priority) => {
                // 如果引擎想擅自播 Idle，我们直接劫持，替换为当前业务状态的动画
                if (group === mm.idleGroup || group === 'Idle') {
                    const targetMotion = this.config.motions?.[this.currentState] || 'idle';
                    // 确保动作组存在再拦截
                    if (mm.motionGroups[targetMotion] || mm.motionGroups['Idle']) {
                        return mm.startMotion(targetMotion, 0, priority);
                    }
                }
                return originalStartRandom(group, priority);
            };

            // ==========================================
            // 🧹 核心挂载 2：残值清道夫 (Ticker Force Reset)
            // ==========================================
            const resetParams = config.resetParams || [];
            const stateParams = config.stateParams || {};

            // 只有当配置了参数重置规则时，才挂载高昂代价的 Ticker
            if (resetParams.length > 0 || Object.keys(stateParams).length > 0) {
                console.log(`[全局引擎] 🛡️ 启动 Ticker 幽灵防护层`);
                this.tickerCallback = () => {
                    if (!this.model) return;
                    const coreModel = this.model.internalModel.coreModel;
                    if (!coreModel || !coreModel._parameterIds) return;

                    const ids = coreModel._parameterIds;
                    const vals = coreModel._parameterValues;

                    // 获取当前状态需要锁死的参数 (如 Sleep 状态下的 ParamDisplayMode = 1)
                    const currentLocks = stateParams[this.currentState] || {};

                    ids.forEach((id, i) => {
                        // 1. 绝对强制写入状态参数
                        if (currentLocks[id] !== undefined) {
                            vals[i] = currentLocks[id];
                        }
                        // 2. 动画残值归零兜底 (非动作播放期间执行)
                        if (!this.isPlayingAction && resetParams.includes(id)) {
                            vals[i] = 0;
                        }
                    });
                };
                PIXI.Ticker.shared.add(this.tickerCallback);
            }

            // 加载完成后，强制应用初始状态
            this.setState('alive');
            console.log(`[全局引擎] ✅ ${config.name} 渲染完美！`);

        } catch (e) {
            console.error(`[全局引擎] ❌ 加载异常:`, e);
        }
    }

    // ==========================================
    // 🔁 状态控制接口：给外部 Vue 组件调用
    // ==========================================
    setState(newState) {
        if (!this.config || !this.model) return;
        if (this.currentState === newState) return; // 状态未变，忽略

        console.log(`[状态机] 切换到: ${newState}`);
        this.currentState = newState;
        this.isPlayingAction = false;

        // 强制引擎停止所有动画，触发 startRandomMotion 拦截器重新评估
        const mm = this.model.internalModel.motionManager;
        mm.stopAllMotions();
        mm.startRandomMotion(mm.idleGroup, 1);
    }

    // 播放一次性过渡动作（如 Tap, Wakeup 等 Action）
    async playAction(motionName) {
        if (!this.model || !motionName) return;
        this.isPlayingAction = true;

        try {
            // 设置一个 5 秒的超时兜底，防止美术误将动画设为 Loop:true 导致永远不 Resolve
            const motionPromise = this.model.motion(motionName);
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));

            await Promise.race([motionPromise, timeoutPromise]);
        } catch (e) {
            console.error("动作执行异常", e);
        } finally {
            this.isPlayingAction = false;
            // 强制推回当前的挂机状态动画
            const mm = this.model.internalModel.motionManager;
            mm.startRandomMotion(mm.idleGroup, 1);
        }
    }

    // 原有的基础 API (为了兼容旧的直接调用)
    play(motionName) {
        this.playAction(motionName);
    }

    show() {
        if (this.canvas) {
            this.canvas.style.visibility = 'visible';
            this.canvas.style.opacity = '1';
            this.canvas.style.pointerEvents = 'auto';
        }
    }

    hide() {
        if (this.canvas) {
            this.canvas.style.visibility = 'hidden';
            this.canvas.style.opacity = '0';
            this.canvas.style.pointerEvents = 'none';
        }
    }

    destroy() {
        // 【关键防御】：摧毁模型前，必须先解绑 Ticker，防止严重内存泄漏和幽灵报错！
        if (this.tickerCallback) {
            PIXI.Ticker.shared.remove(this.tickerCallback);
            this.tickerCallback = null;
        }

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

export const l2dEngine = new GlobalLive2DEngine();