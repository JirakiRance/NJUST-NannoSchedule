// components/sniffer_views/Live2DView.js
import { l2dEngine } from '../../Live2DViewer.js';
import { store } from '../../store.js';

export default {
    props: ['mascotState', 'mascotStatusText'],
    template: `
        <div style="position: fixed; bottom: 60px; left: 10px; width: 180px; text-align: center; z-index: 10000; pointer-events: none;">
            <div class="l2d-speech-bubble" :class="{ active: isCanvasVisible && !!mascotStatusText }">
                <div class="l2d-bubble-text">{{ mascotStatusText }}</div>
            </div>

            <span v-show="false" style="...">{{ mascotStatusText }}</span>
        </div>
    `,
    data() {
        return {
            store,
            motionMap: {}
        };
    },
    computed: {
        isCanvasVisible() {
            return this.store.currentTab === 'profile' && this.store.currentSubPage === '';
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

        mascotState() {
            if (this.motionMap) {
                const motion = this.motionMap[this.mascotState] || this.motionMap['alive'];
                l2dEngine.play(motion);
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

                this.motionMap = config.motions || {};

                // 调用全局引擎加载模型
                l2dEngine.load(config, (hits) => {
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
        triggerTapMotion() {
            if (this.motionMap) {
                l2dEngine.play(this.motionMap['interact']);
            }
        }
    }
}