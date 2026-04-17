// components/sniffer_views/Live2DView.js
import { l2dEngine } from '../../Live2DViewer.js';
import { store } from '../../store.js';

export default {
    props: ['mascotState', 'mascotStatusText'],
    template: `
        <div style="position: fixed; bottom: 60px; left: 10px; width: 180px; text-align: center; z-index: 10000; pointer-events: none;">
            <span style="font-size: 11px; font-weight: bold; color: var(--primary-color); background: rgba(20, 20, 25, 0.85); padding: 4px 12px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); pointer-events: auto;">
                {{ mascotStatusText }}
            </span>
        </div>
    `,
    data() {
        return {
            store,
            motionMap: {}
        };
    },
    watch: {
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
        // 当组件卸载（比如关闭了嗅探监控），隐藏全局画布
        l2dEngine.hide();
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