// components/sniffer_views/Live2DView.js
import { l2dEngine } from '../../Live2DViewer.js';
import { store } from '../../store.js';

export default {
    props: ['mascotState', 'mascotStatusText'],
    template: `
        <div style="position: fixed; bottom: 60px; left: 10px; width: 180px; text-align: center; z-index: 10000; pointer-events: none;">
            <div class="l2d-speech-bubble"
                 :class="{ active: isCanvasVisible && !!mascotStatusText }"
                 :style="{ bottom: bubbleBottom + 'px' }">
                <div class="l2d-bubble-text">{{ mascotStatusText }}</div>
            </div>

            <span v-show="false" style="...">{{ mascotStatusText }}</span>
        </div>
    `,
    data() {
        return {
            store,
            motionMap: {},
            modelConfig: null
        };
    },
    computed: {
        isCanvasVisible() {
            return this.store.currentTab === 'profile' && this.store.currentSubPage === '';
        },
        // 计算属性：读取配置里的 bubbleY，如果没有则默认 190
        bubbleBottom() {
            if (this.modelConfig && this.modelConfig.layout && typeof this.modelConfig.layout.bubbleY !== 'undefined') {
                return this.modelConfig.layout.bubbleY;
            }
            return 190;
        }
    },
    watch: {

        isCanvasVisible(newVal) {
            if (newVal) {
                l2dEngine.show();
            } else {
                l2dEngine.hide();
            }
        },

        mascotState(newState) {
            if (this.isCanvasVisible) {
                l2dEngine.setState(newState);
            }
        },
        'store.sniffer.modelId'(newId, oldId) {
            if (newId && newId !== oldId) {
                this.bootEngine(newId);
            }
        }
    },
    mounted() {
        if (this.store.sniffer.modelId) {
            this.bootEngine(this.store.sniffer.modelId);
        }
    },
    unmounted() {
        l2dEngine.destroy();
    },
    methods: {
        async bootEngine(modelId) {
            try {
                const res = await fetch(`./js/components/sniffer_views/models/${modelId}/config.json`);
                if (!res.ok) throw new Error("Config 404");
                const config = await res.json();

                // 把配置挂载到组件实例上，方便后续调用
                this.modelConfig = config;
                this.motionMap = config.motions || {};

                // 调用全局引擎加载模型
                l2dEngine.load(config, (hits) => {
                    // 当引擎报告模型被点击时，触发 Vue 这边的统一交互处理
                    this.handleModelClick();
                    this.$emit('interact', hits);
                });

                if (this.isCanvasVisible) {
                    l2dEngine.show();
                } else {
                    l2dEngine.hide();
                }

            } catch (e) {
                console.error("[桥接层] 引导失败:", e);
            }
        },
        async handleModelClick() {
            if (!this.modelConfig) return;
            if (!this.modelConfig || !this.modelConfig.interactMotions) return;
            if (!this.isCanvasVisible) return;

            // 获取当前所处状态（mascotState 由外部 SnifferBeast 根据是否有情报等逻辑传入）
            const currentState = this.mascotState;

            // 查表：当前状态下是否有对应的交互动作？
            const actionMotion = this.modelConfig.interactMotions[currentState];

            // 如果没配动作（例如 Dead 状态），那就什么都不做
            if (!actionMotion) return;

            // 1. 命令引擎播放一次性动作，并等待播放完毕
            await l2dEngine.playAction(actionMotion);

            // 2. 特殊业务逻辑劫持：
            // 如果是猪猪（或其他模型）特有的 Wakeup 动作，播完后需要判断是否唤醒成功
            if (actionMotion === 'Wakeup') {
                this.evaluateWakeupLogic();
            }
        },
        evaluateWakeupLogic() {
            if (this.store.sniffer.status !== 'breathing') {
                l2dEngine.setState(this.mascotState);
            } else {
                l2dEngine.setState('alive');
            }
        },
        triggerTapMotion() {
            if (this.motionMap && this.isCanvasVisible) {
                l2dEngine.playAction(this.motionMap['interact']);
            }
        }
    }
}