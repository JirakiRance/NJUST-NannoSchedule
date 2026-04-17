// components/ModelLabModal.js
import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';
import { l2dEngine } from '../Live2DViewer.js'; // 【关键】：直接引入全局引擎！

export default {
    props: ['editId'],
    template: `
        <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--bg-color); z-index: 15000; overflow-y: auto; padding-bottom: 100px; animation: fade-in 0.2s ease-out;">

            <div style="position: sticky; top: 0; z-index: 10; background: var(--bg-color); display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid var(--grid-border);">
                <span style="font-weight: bold; font-size: 16px; color: var(--text-main);"><i class="ri-magic-line" style="color: var(--primary-color);"></i> 看板娘实验室</span>
                <i class="ri-close-line" style="font-size: 24px; color: var(--text-sub); cursor: pointer;" @click="closeLab"></i>
            </div>

            <div style="padding: 15px;">

                <div v-show="!config && !isLoading" class="card" style="margin-bottom: 20px; text-align: center; padding: 40px 15px; border: 2px dashed var(--primary-color); cursor: pointer;" @click="$refs.zipInput.click()">
                    <i class="ri-folder-zip-line" style="font-size: 42px; color: var(--primary-color);"></i>
                    <div style="margin-top: 12px; font-size: 15px; font-weight: bold; color: var(--text-main);">点击导入 ZIP 模型包</div>
                    <div style="font-size: 12px; color: var(--text-sub); margin-top: 6px;">压缩包根目录或子级须包含 .model.json 核心文件</div>
                    <input type="file" ref="zipInput" accept=".zip" style="display: none;" @change="handleUpload">
                </div>

                <div v-if="isLoading" style="text-align: center; padding: 30px; color: var(--text-sub);">
                    <i class="ri-loader-4-line ri-spin" style="font-size: 32px; color: var(--primary-color);"></i>
                    <div style="font-size: 13px; margin-top: 15px; font-weight: bold;">正在组装渲染管线...</div>
                </div>

                <div v-if="config && !isLoading" class="card" style="animation: fade-in 0.3s ease-out;">
                    <div style="font-size: 14px; font-weight: bold; border-bottom: 1px solid var(--grid-border); padding-bottom: 10px; margin-bottom: 15px;">
                        <i class="ri-equalizer-fill" style="color: var(--primary-color);"></i> 空间排版 (左下角实时预览)
                    </div>

                    <div style="background: var(--input-bg); padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--grid-border);">
                        <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <span style="width: 40px; font-size: 12px; color: var(--text-sub); font-weight: bold;">缩放</span>
                            <input type="range" class="custom-range" min="0.01" max="2" step="0.01" v-model.number="config.layout.scale" @input="syncLayout">
                            <span style="width: 35px; text-align: right; font-size: 12px; font-family: monospace;">{{ config.layout.scale }}</span>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <span style="width: 40px; font-size: 12px; color: var(--text-sub); font-weight: bold;">X 轴</span>
                            <input type="range" class="custom-range" min="-150" max="150" step="1" v-model.number="config.layout.x" @input="syncLayout">
                            <span style="width: 35px; text-align: right; font-size: 12px; font-family: monospace;">{{ config.layout.x }}</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="width: 40px; font-size: 12px; color: var(--text-sub); font-weight: bold;">Y 轴</span>
                            <input type="range" class="custom-range" min="-150" max="150" step="1" v-model.number="config.layout.y" @input="syncLayout">
                            <span style="width: 35px; text-align: right; font-size: 12px; font-family: monospace;">{{ config.layout.y }}</span>
                        </div>
                    </div>

                    <div style="font-size: 14px; font-weight: bold; border-bottom: 1px solid var(--grid-border); padding-bottom: 10px; margin-bottom: 15px;">
                        <i class="ri-body-scan-fill" style="color: var(--primary-color);"></i> 状态动作映射
                    </div>

                    <div v-for="(val, state) in config.motions" :key="state" style="display: flex; align-items: center; margin-bottom: 12px;">
                        <span style="width: 105px; flex-shrink: 0; font-size: 12px; color: var(--text-main); font-weight: 500;">{{ stateLabels[state] || state }}</span>
                        <select v-model="config.motions[state]" class="term-select" style="flex: 1; padding: 6px; font-size: 12px; background: var(--input-bg);" @change="playPreviewMotion(config.motions[state])">
                            <option v-for="m in config.availableMotions" :key="m" :value="m">{{ m }}</option>
                        </select>
                    </div>

                    <button class="btn btn-submit" style="margin-top: 20px; font-size: 14px; padding: 10px;" @click="saveConfig">保存参数并应用</button>
                </div>
            </div>

            <div v-show="config && !isLoading" style="position: fixed; bottom: 80px; left: 10px; width: 180px; height: 240px; z-index: 15001; pointer-events: none; border: 2px dashed rgba(52, 199, 89, 0.6); border-radius: 8px; background: rgba(0,0,0,0.1);">
                <div style="position: absolute; top: -20px; left: 0; font-size: 10px; color: #34c759; font-weight: bold;">180x240 物理边界 (全局引擎已提权)</div>
            </div>
        </div>
    `,
    data() {
        return {
            store,
            isLoading: false,
            modelId: '',
            config: null,
            stateLabels: {
                'alive': '常规待机 (在线)',
                'alert': '发现情报 (高亮)',
                'dead': '掉线状态 (宕机)',
                'interact': '触摸反馈 (点击)',
                'sleeping': '休眠待机 (后台)'
            }
        };
    },
    async mounted() {
        if (this.editId) {
            this.modelId = this.editId;
            this.isLoading = true;
            try {
                const res = await fetch(`./js/components/sniffer_views/models/${this.editId}/config.json`);
                if (!res.ok) throw new Error();
                this.config = await res.json();
                this.bootLabEngine();
            } catch (e) {
                showToast("无法读取该模型的配置", "error");
                this.closeLab();
            } finally {
                this.isLoading = false;
            }
        }
    },
    methods: {
        async handleUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            this.isLoading = true;
            const formData = new FormData();
            formData.append('model_zip', file);

            try {
                const res = await fetch(`${API_BASE}/upload_live2d`, { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    this.modelId = data.modelId;
                    this.config = data.config;
                    showToast("解析成功，已进入实验室", "success");
                    this.bootLabEngine();
                } else {
                    throw new Error(data.message || "解析失败");
                }
            } catch (err) {
                showToast("模型导入失败：" + err.message, "error");
            } finally {
                this.isLoading = false;
                this.$refs.zipInput.value = '';
            }
        },

        async bootLabEngine() {
            // 【黑科技】：提权全局 Canvas，让它浮现在 15000 层级的弹窗之上！
            const canvas = document.getElementById('global-live2d-canvas');
            if (canvas) {
                canvas.style.zIndex = '15005';
            }

            try {
                // 直接指使全局引擎干活，完全复用！
                await l2dEngine.load(this.config, () => {
                    this.playPreviewMotion(this.config.motions['interact']);
                });
                l2dEngine.show(); // 确保从隐藏状态中苏醒
                this.syncLayout();
            } catch (e) {
                showToast("引擎渲染失败，模型可能损坏", "error");
            }
        },

        syncLayout() {
            if (l2dEngine.model && this.config) {
                l2dEngine.model.scale.set(this.config.layout.scale);
                l2dEngine.model.x = this.config.layout.x;
                l2dEngine.model.y = this.config.layout.y;
            }
        },

        playPreviewMotion(motionName) {
            if (motionName) l2dEngine.play(motionName);
        },

        async saveConfig() {
            try {
                const res = await fetch(`${API_BASE}/save_live2d_config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modelId: this.modelId, config: this.config })
                });

                if (res.ok) {
                    showToast("配置保存成功！", "success");
                    this.$emit('saved', this.modelId);
                    this.closeLab();
                }
            } catch (e) {
                showToast("网络异常，保存失败", "error");
            }
        },

        async closeLab() {
            // 【善后处理】：把提权后的画布还给系统，塞回 9999 层
            const canvas = document.getElementById('global-live2d-canvas');
            if (canvas) canvas.style.zIndex = '9999';

            // 弹窗关闭，回到设置页，所以模型应该隐身
            l2dEngine.hide();

            // 【关键】：把引擎偷偷换回用户之前选定的主模型，否则切回主页时看到的还是预览的模型
            try {
                const res = await fetch(`./js/components/sniffer_views/models/${this.store.sniffer.modelId}/config.json`);
                if (res.ok) {
                    const originalConfig = await res.json();
                    await l2dEngine.load(originalConfig);
                    l2dEngine.hide(); // 偷偷加载，保持隐身
                }
            } catch (e) {}

            this.$emit('close');
        }
    }
}