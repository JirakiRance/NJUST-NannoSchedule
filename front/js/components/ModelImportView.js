// front/js/components/sniffer_views/ModelImportView.js
import { store } from '../../store.js';
import { l2dEngine } from '../../Live2DViewer.js';
import { API_BASE, showToast } from '../../utils.js';

export default {
    template: `
        <div class="model-import-container" style="padding: 15px; animation: fade-in 0.3s ease-out;">
            <div class="card">
                <div class="card-title"><i class="ri-folder-zip-line"></i> 导入新模型 (ZIP)</div>
                <p style="font-size: 12px; color: var(--text-sub); margin-bottom: 15px;">
                    请上传包含 .model.json 或 .model3.json 的压缩包。
                </p>

                <div class="upload-zone" @click="$refs.fileInput.click()" style="border: 2px dashed var(--grid-border); border-radius: 12px; padding: 30px; text-align: center; cursor: pointer;">
                    <i class="ri-upload-cloud-2-line" style="font-size: 32px; color: var(--primary-color);"></i>
                    <div style="font-size: 14px; margin-top: 10px;">点击选择 ZIP 文件</div>
                    <input type="file" ref="fileInput" accept=".zip" @change="handleFileUpload" style="display: none;">
                </div>
            </div>

            <div v-if="tuningConfig" class="card" style="margin-top: 20px;">
                <div class="card-title"><i class="ri-equalizer-line"></i> 排版微调实验室</div>

                <div class="setting-group" style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 10px;">物理布局 (左下角实时预览)</label>
                    <div class="slider-row" style="margin-bottom: 12px;">
                        <span style="font-size: 12px; width: 40px;">缩放</span>
                        <input type="range" min="0.01" max="2" step="0.01" v-model.number="tuningConfig.layout.scale" @input="syncPreview">
                        <span style="font-size: 12px; width: 30px;">{{ tuningConfig.layout.scale }}</span>
                    </div>
                    <div class="slider-row" style="margin-bottom: 12px;">
                        <span style="font-size: 12px; width: 40px;">X轴</span>
                        <input type="range" min="-150" max="150" step="1" v-model.number="tuningConfig.layout.x" @input="syncPreview">
                        <span style="font-size: 12px; width: 30px;">{{ tuningConfig.layout.x }}</span>
                    </div>
                    <div class="slider-row">
                        <span style="font-size: 12px; width: 40px;">Y轴</span>
                        <input type="range" min="-150" max="150" step="1" v-model.number="tuningConfig.layout.y" @input="syncPreview">
                        <span style="font-size: 12px; width: 30px;">{{ tuningConfig.layout.y }}</span>
                    </div>
                </div>

                <div class="setting-group">
                    <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 10px;">动作映射映射 (Motions Mapping)</label>
                    <div v-for="(val, key) in tuningConfig.motions" :key="key" style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 12px; width: 80px; color: var(--text-sub);">{{ stateLabels[key] }}</span>
                        <select v-model="tuningConfig.motions[key]" @change="previewMotion(tuningConfig.motions[key])" class="term-select" style="flex: 1; padding: 4px;">
                            <option v-for="m in availableMotions" :key="m" :value="m">{{ m }}</option>
                        </select>
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn" style="flex: 1; background: var(--input-bg); color: var(--text-main);" @click="tuningConfig = null">取消</button>
                    <button class="btn btn-submit" style="flex: 1; margin: 0;" @click="saveTuning">保存配置</button>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store,
            tuningConfig: null,
            availableMotions: [],
            stateLabels: {
                'alive': '常规待机',
                'alert': '发现情报',
                'dead': '连接断开',
                'interact': '触摸反馈',
                'sleeping': '休眠状态'
            }
        };
    },
    methods: {
        async handleFileUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('model_zip', file);

            try {
                showToast("正在解析模型包...", "info");
                const res = await fetch(`${API_BASE}/import_model`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    showToast("导入成功，进入实验室调参", "success");
                    this.tuningConfig = data.config;
                    this.availableMotions = data.availableMotions;

                    // 自动切换到新模型并热加载预览
                    this.store.sniffer.modelId = data.modelId;
                    await l2dEngine.load(data.config);
                }
            } catch (err) {
                showToast("模型导入失败，请检查压缩包格式", "error");
            }
        },
        syncPreview() {
            // 热调排版：直接修改模型实例属性，不重载应用
            if (l2dEngine.model) {
                l2dEngine.model.scale.set(this.tuningConfig.layout.scale);
                l2dEngine.model.x = this.tuningConfig.layout.x;
                l2dEngine.model.y = this.tuningConfig.layout.y;
            }
        },
        previewMotion(name) {
            l2dEngine.play(name);
        },
        async saveTuning() {
            try {
                const res = await fetch(`${API_BASE}/save_model_config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        modelId: this.store.sniffer.modelId,
                        config: this.tuningConfig
                    })
                });
                if (res.ok) {
                    showToast("模型配置已永久保存", "success");
                    this.tuningConfig = null;
                }
            } catch (e) {
                showToast("保存失败", "error");
            }
        }
    }
}