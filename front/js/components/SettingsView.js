import { store } from '../store.js';
import { API_BASE,showToast } from '../utils.js';
import ModelLabModal from './ModelLabModal.js';

export default {
    components: { ModelLabModal },
    template: `
        <div style="padding: 15px; padding-bottom: 80px; animation: fade-in 0.2s ease-out;">

            <div class="card">
                <div class="card-title"><i class="ri-calendar-todo-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>学业与时间基准</div>
                <p class="setting-desc" style="margin-top:0;">当前学期 (影响课表与成绩查询)：</p>
                <div class="setting-row" style="margin-bottom: 15px;">
                    <select v-model="store.currentTerm" @change="saveTerm" class="term-select">
                        <option v-for="t in store.termOptions" :key="t" :value="t">{{ t }} {{ t === store.currentTerm ? '(当前选中)' : '' }}</option>
                    </select>
                </div>
                <p class="setting-desc" style="margin-top:0;">时间校准 (如果当前周次不对，请修正)：</p>
                <div class="setting-row">
                    <span style="font-size: 14px; white-space: nowrap; color: var(--text-main);">当前为第</span>
                    <input type="number" v-model.number="settingWeek" min="1" max="25" class="week-input">
                    <span style="font-size: 14px; white-space: nowrap; color: var(--text-main);">周</span>
                    <div style="flex: 1;"></div>
                    <button class="btn btn-calibrate" @click="calibrateWeek">一键校准</button>
                </div>
            </div>

            <div class="card">
                <div class="card-title"><i class="ri-notification-4-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>考试提醒设置</div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">开启考试提醒</span>
                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: store.examReminder.enabled}" @click="toggleReminder(true)">开启</div>
                        <div class="switch-item" :class="{active: !store.examReminder.enabled}" @click="toggleReminder(false)">关闭</div>
                    </div>
                </div>

                <div v-show="store.examReminder.enabled" style="animation: fade-in 0.3s ease-out;">
                    <p class="setting-desc" style="margin-top: 0;">当考试即将来临时，系统将通过浏览器通知提醒您：</p>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                        <div v-for="opt in reminderOptions" :key="opt.val"
                             class="period-checkbox"
                             :class="{ active: store.examReminder.selectedTimings.includes(opt.val) }"
                             @click="toggleTiming(opt.val)">
                            {{ opt.label }}
                        </div>
                    </div>
                    <p style="font-size: 11px; color: var(--text-sub); margin-top: 12px; line-height: 1.5;">
                        <i class="ri-information-line" style="vertical-align: middle;"></i>
                        由于网页端限制，请在考前几天偶尔打开本应用，或将其保留在手机后台，方可准时触发系统级弹窗提醒。
                    </p>
                </div>
            </div>

            <div class="card">
                <div class="card-title">
                    <i class="ri-radar-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>嗅探监控
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">启用后台嗅探</span>
                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: store.sniffer.enabled}" @click="toggleSniffer(true)">开启</div>
                        <div class="switch-item" :class="{active: !store.sniffer.enabled}" @click="toggleSniffer(false)">关闭</div>
                    </div>
                </div>

                <div v-show="store.sniffer.enabled" style="margin-top: 15px; animation: fade-in 0.3s ease-out; background: var(--input-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--grid-border);">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px dashed var(--grid-border); padding-bottom: 15px;">
                        <span style="font-size: 13px; color: var(--text-main); font-weight: bold;">嗅探兽外观</span>
                        <div class="switch-capsule" style="margin: 0;">
                            <div class="switch-item" style="font-size: 12px; padding: 4px 10px;" :class="{active: store.sniffer.visualMode === 'emoji'}" @click="changeVisualMode('emoji')">emoji</div>
                            <div class="switch-item" style="font-size: 12px; padding: 4px 10px;" :class="{active: store.sniffer.visualMode === 'live2d'}" @click="changeVisualMode('live2d')">Live2D</div>
                        </div>
                    </div>
                    <div v-show="store.sniffer.visualMode === 'live2d'" style="margin-bottom: 20px; border-bottom: 1px dashed var(--grid-border); padding-bottom: 15px; animation: fade-in 0.3s ease-out;">
                         <div style="font-size: 13px; color: var(--text-main); font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                             <span>看板娘模型管理器</span>
                             <button class="btn" style="width: auto; padding: 4px 10px; margin: 0; background: var(--primary-color); color: #fff; font-size: 11px;" @click="openModelLab(null)">
                                 <i class="ri-add-line"></i> 导入 ZIP
                             </button>
                         </div>

                         <div style="background: var(--input-bg); border-radius: 8px; border: 1px solid var(--grid-border); overflow: hidden;">
                             <div v-for="m in availableModels" :key="m.id"
                                  style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--grid-border); cursor: pointer; transition: background 0.2s;"
                                  :style="store.sniffer.modelId === m.id ? 'background: rgba(52, 199, 89, 0.1);' : ''"
                                  @click="selectModel(m.id)">

                                 <div style="display: flex; align-items: center; gap: 8px;">
                                     <i :class="store.sniffer.modelId === m.id ? 'ri-radio-button-fill' : 'ri-checkbox-blank-circle-line'"
                                        :style="{ color: store.sniffer.modelId === m.id ? 'var(--primary-color)' : 'var(--text-sub)', fontSize: '16px' }"></i>
                                     <span style="font-size: 13px; color: var(--text-main); font-weight: 500;">{{ m.name }}</span>
                                     <span v-if="m.isCustom" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #ff9500; color: #fff;">自定义</span>
                                     <span v-else style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #34c759; color: #fff;">内置</span>
                                 </div>

                                 <div v-if="m.isCustom" style="display: flex; gap: 10px;">
                                     <i class="ri-equalizer-line" style="color: var(--text-sub); font-size: 16px;" title="修改参数" @click.stop="openModelLab(m.id)"></i>
                                     <i class="ri-delete-bin-line" style="color: #ff3b30; font-size: 16px;" title="删除" @click.stop="deleteModel(m.id)"></i>
                                 </div>
                             </div>
                             <div v-if="availableModels.length === 0" style="padding: 15px; text-align: center; font-size: 12px; color: var(--text-sub);">
                                 暂无可用模型，请导入或检查配置文件
                             </div>
                         </div>
                    </div>

                    <div>
                        <span style="font-size: 13px; color: var(--text-main); font-weight: bold;">检查新数据频率</span>
                        <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                            <div v-for="opt in dataIntervalOptions" :key="opt.val"
                                 class="period-checkbox"
                                 style="padding: 6px 10px; font-size: 12px;"
                                 :class="{ active: store.sniffer.dataInterval === opt.val }"
                                 @click="setDataInterval(opt.val)">
                                {{ opt.label }}
                            </div>
                        </div>
                        <p style="font-size: 11px; color: var(--text-sub); margin-top: 8px; line-height: 1.4;">
                            <i class="ri-search-eye-line" style="vertical-align: middle;"></i> 嗅探兽会在后台定期帮您静默查看是否有新的考试安排或学期变动。
                        </p>
                    </div>

                    <div style="margin-top: 15px; border-top: 1px dashed var(--grid-border); padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-main); margin-bottom: 5px; font-weight: bold;">
                            <span>保活心跳频率</span>
                            <span style="color: var(--primary-color);">{{ store.sniffer.interval }} 小时/次</span>
                        </div>
                        <input type="range" class="custom-range" min="1" max="24" step="1" v-model.number="store.sniffer.interval" @change="saveSnifferInterval">
                        <p style="font-size: 11px; color: var(--text-sub); margin-top: 8px; line-height: 1.5;">
                            <i class="ri-shield-check-line" style="color:#34c759; vertical-align: middle;"></i> <b>防踢机制：</b><br>
                            实测教务处系统容忍度较高，连续存活 10+ 小时不掉线。建议保持默认的 10 小时/次。
                        </p>
                    </div>

                </div>
            </div>

            <div class="card">
                <div class="card-title"><i class="ri-palette-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>个性化</div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">课表显示模式</span>
                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: store.scheduleViewType === 'fixed'}" @click="store.scheduleViewType = 'fixed'">一屏固定</div>
                        <div class="switch-item" :class="{active: store.scheduleViewType === 'scroll'}" @click="store.scheduleViewType = 'scroll'">自由滑动</div>
                    </div>
                </div>
                <p style="font-size: 12px; color: var(--text-sub); margin: 0; border-bottom: 1px dashed var(--grid-border); padding-bottom: 15px; margin-bottom: 15px;">一屏固定适合快速扫视，自由滑动字号更宽松。</p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">深浅色模式</span>
                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: store.themeMode === 'light'}" @click="changeThemeMode('light')"><i class="ri-sun-line" style="margin-right:2px;"></i>浅色</div>
                        <div class="switch-item" :class="{active: store.themeMode === 'dark'}" @click="changeThemeMode('dark')"><i class="ri-moon-line" style="margin-right:2px;"></i>深色</div>
                    </div>
                </div>


                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">全局主题颜色</span>
                    <div class="theme-color-row">
                        <div v-for="c in availableColors" :key="c.value"
                             class="color-swatch"
                             :style="{ backgroundColor: c.value }"
                             :class="{ active: store.themeColor.toLowerCase() === c.value.toLowerCase() }"
                             @click="changeTheme(c.value)">
                            <i v-if="store.themeColor.toLowerCase() === c.value.toLowerCase()" class="ri-check-line"></i>
                        </div>

                        <label class="color-swatch"
                               :class="{ active: isCustomColor }"
                               style="background: conic-gradient(from 90deg, #ff3b30, #ff9500, #34c759, #5ac8fa, #007aff, #5856d6, #ff2d55, #ff3b30); position: relative; overflow: hidden;"
                               title="自定义颜色">
                            <i v-if="isCustomColor" class="ri-check-line" style="position: absolute; color: white; text-shadow: 0 1px 4px rgba(0,0,0,0.8); z-index: 2;"></i>
                            <input type="color" v-model="customColorValue" @input="changeCustomTheme" style="opacity: 0; position: absolute; width: 200%; height: 200%; top: -50%; left: -50%; cursor: pointer;">
                        </label>
                    </div>
                </div>

                <div class="opacity-settings-section">
                    <span class="opacity-settings-title" style="color: var(--text-main);">不透明度精调</span>

                    <div class="opacity-slider-group">
                        <div class="opacity-slider-label">
                            <span>当日列高亮 ({{ Math.round(store.highlightOpacity * 100) }}%)</span>
                        </div>
                        <input type="range" class="custom-range" min="0" max="1" step="0.05" v-model.number="store.highlightOpacity" @change="saveOpacities">
                    </div>

                    <div class="opacity-slider-group">
                        <div class="opacity-slider-label">
                            <span>课表卡片 ({{ Math.round(store.cardOpacity * 100) }}%)</span>
                        </div>
                        <input type="range" class="custom-range" min="0.1" max="1" step="0.05" v-model.number="store.cardOpacity" @change="saveOpacities">
                    </div>

                    <div class="opacity-slider-group" style="margin-bottom: 0;">
                        <div class="opacity-slider-label">
                            <span>背景图片 ({{ Math.round(store.bgOpacity * 100) }}%)</span>
                        </div>
                        <input type="range" class="custom-range" min="0.1" max="1" step="0.05" v-model.number="store.bgOpacity" @change="saveOpacities">
                    </div>
                </div>

            </div>

            <div class="card">
                <div class="card-title"><i class="ri-tools-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>系统维护</div>
                <p class="setting-desc" style="line-height: 1.5; margin-bottom: 15px;">
                    清除缓存将丢失当前所有数据，更新网页版本仅对网页端访问有效，手机端更新请点击检查软件更新。
                </p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn btn-danger" style="margin: 0;" @click="clearLocalData">
                        <i class="ri-delete-bin-line" style="margin-right: 4px;"></i> 清除教务缓存
                    </button>
                    <button class="btn" style="background-color: #ff9500; margin: 0;" @click="forceUpdateApp">
                        <i class="ri-cloud-windy-line" style="margin-right: 4px;"></i> 更新网页版本
                    </button>
                    <button class="btn" style="background-color: #007aff; margin: 0; font-weight: bold;" @click="checkApkUpdate">
                        <i class="ri-smartphone-line" style="margin-right: 4px;"></i> 检查软件更新 <span style="font-size:11px; opacity:0.8;">({{ currentAppVersion }})</span>
                    </button>
                </div>
            </div>

            <div class="modal-overlay" v-if="showUpdateModal" @click.self="showUpdateModal = false">
                <div class="modal-content" style="max-width: 300px; padding: 25px 20px; text-align: center;">
                    <div v-if="isCheckingUpdate" style="padding: 20px 0;">
                        <i class="ri-loader-4-line ri-spin" style="font-size: 36px; color: var(--primary-color);"></i>
                        <div style="margin-top: 15px; font-size: 14px; color: var(--text-sub); font-weight: bold;">正在连接服务器...</div>
                    </div>

                    <div v-else>
                        <div style="font-size: 48px; margin-bottom: 10px;" :style="{ color: updateData && updateData.hasNew ? '#34c759' : 'var(--text-sub)' }">
                            <i :class="updateData && updateData.hasNew ? 'ri-rocket-2-fill' : 'ri-checkbox-circle-fill'"></i>
                        </div>
                        <div style="font-size: 18px; font-weight: bold; color: var(--text-main); margin-bottom: 10px;">
                            {{ updateData && updateData.hasNew ? '发现新版本！' : '已是最新版本' }}
                        </div>

                        <div style="font-size: 13px; color: var(--text-sub); margin-bottom: 5px;">
                            当前版本：{{ currentAppVersion }}
                        </div>
                        <div v-if="updateData && updateData.hasNew" style="font-size: 13px; color: #ff9500; font-weight: bold; margin-bottom: 15px;">
                            最新版本：{{ updateData.version }}
                        </div>

                        <div v-if="updateData && updateData.hasNew" style="font-size: 12px; color: var(--text-main); background: var(--input-bg); padding: 12px; border-radius: 8px; text-align: left; margin-bottom: 20px; line-height: 1.6; border: 1px solid var(--grid-border);">
                            <b>更新内容：</b><br>
                            {{ updateData.content }}
                        </div>
                        <div v-else style="margin-bottom: 20px;"></div>

                        <div style="display: flex; gap: 12px;">
                            <button class="btn" style="background: var(--input-bg); color: var(--text-main); margin: 0; flex: 1;" @click="showUpdateModal = false">关闭</button>
                            <button v-if="updateData && updateData.hasNew" class="btn btn-submit" style="margin: 0; flex: 1; background-color: #34c759;" @click="goToDownload">前往下载</button>
                        </div>
                    </div>
                </div>
            </div>
            <model-lab-modal v-if="showModelLab" :edit-id="editingModelId" @close="showModelLab = false" @saved="onLabSaved" @deleted="refreshModelList"></model-lab-modal>
        </div>
    `,
    data() {
        return {
            store,
            settingWeek: store.realWeek,
            customColorValue: store.themeColor,
            availableModels: [],
            showModelLab: false,
            availableColors: [
                { name: '天空蓝', value: '#5b9bd5' },
                { name: '哔哩粉', value: '#fb7299' },
                { name: '青苹绿', value: '#34c759' },
                { name: '活力橙', value: '#ff9500' }
            ],

            // 版本控制与弹窗状态
            currentAppVersion: "获取中...",
            showUpdateModal: false,
            isCheckingUpdate: false,
            updateData: null,

            reminderOptions: [
                { label: '前 7 天', val: '7d' },
                { label: '前 3 天', val: '3d' },
                { label: '前 1 天', val: '1d' },
                { label: '前 12h', val: '12h' },
                { label: '前 3h', val: '3h' },
                { label: '前 1h', val: '1h' }
            ],
            dataIntervalOptions: [
                //{ label: '30秒 (测试)', val: '30s' },
                { label: '1天', val: '1d' },
                { label: '3天', val: '3d' },
                { label: '7天', val: '7d' },
                { label: '14天', val: '14d' }
            ],
        };
    },
    computed: {
        isCustomColor() {
            return !this.availableColors.some(c => c.value.toLowerCase() === this.store.themeColor.toLowerCase());
        }
    },
    watch: {
        'store.scheduleViewType'(newVal) { localStorage.setItem("my_njust_view_type", newVal); }
    },
    methods: {

        async deleteModel(id) {
            // 严防死守：禁止删除内置模型
            if (id === 'haru' || id === 'shizuku') {
                showToast("内置模型不可删除", "error");
                return;
            }

            if (!confirm(`确定要彻底删除模型 [${id}] 吗？\n此操作将物理删除本地文件夹且不可恢复！`)) return;

            try {
                const res = await fetch(`${API_BASE}/delete_live2d`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modelId: id })
                });

                const result = await res.json();
                if (result.success) {
                    showToast("模型已物理移除", "success");
                    // 如果删掉的是当前选中的，切回 shizuku
                    if (this.store.sniffer.modelId === id) {
                        this.store.sniffer.modelId = 'shizuku';
                        this.saveModelId();
                    }
                    await this.refreshModelList();
                } else {
                    showToast("删除失败：" + result.message, "error");
                }
            } catch (e) {
                showToast("网络异常，删除失败", "error");
            }
        },


        selectModel(id) {
            this.store.sniffer.modelId = id;
            this.saveModelId();
        },
        openModelLab(editId = null) {
            // null 表示新建导入，传 id 表示编辑现有模型
            this.editingModelId = editId;
            this.showModelLab = true;
        },
        async deleteModel(id) {
            if (!confirm("确定要彻底删除此自定义模型吗？文件将从本地移除。")) return;
            try {
                await fetch(`${API_BASE}/delete_live2d`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modelId: id })
                });
                showToast("模型已删除", "success");
                // 如果删除了当前正在使用的模型，自动切回内置的 haru
                if (this.store.sniffer.modelId === id) {
                    this.selectModel('haru');
                }
                this.refreshModelList();
            } catch (e) {
                showToast("删除失败", "error");
            }
        },

        // 重新拉取模型列表 (当保存或删除自定义模型后)
        async refreshModelList() {
            try {
                const res = await fetch('./js/components/sniffer_views/models/index.json?t=' + new Date().getTime());
                this.availableModels = await res.json();
            } catch (e) {
                console.error("刷新花名册失败", e);
            }
        },
        // 实验室点保存后的回调：刷新列表并选中新模型
        async onLabSaved(newModelId) {
            await this.refreshModelList();
            this.store.sniffer.modelId = newModelId;
            this.saveModelId();
        },

        saveModelId() {
            localStorage.setItem("my_njust_sniffer_model", this.store.sniffer.modelId);
            showToast("模型已切换，请等待加载", "success");
        },

        changeVisualMode(mode) {
            this.store.sniffer.visualMode = mode;
            localStorage.setItem("my_njust_sniffer_mode", mode);
        },

        setDataInterval(val) {
            this.store.sniffer.dataInterval = val;
            localStorage.setItem("my_njust_sniffer_data_interval", val);
        },

        saveSnifferInterval() {
            localStorage.setItem("my_njust_sniffer_interval", this.store.sniffer.interval);
        },

        async toggleSniffer(status) {
            this.store.sniffer.enabled = status;
            localStorage.setItem("my_njust_sniffer_enabled", status ? "true" : "false");

            if (status) {
                showToast("嗅探模式已开启，请重新登录一次激活", "success");
            } else {
                // 如果关闭前存在 session，则通知后端彻底粉碎硬盘存档
                if (this.store.sniffer.sessionId) {
                    try {
                        // 异步发送销毁指令（Fire and forget）
                        fetch(`${API_BASE}/destroy_session`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ session_id: this.store.sniffer.sessionId })
                        });
                    } catch(e) {
                        console.error("销毁请求发送失败");
                    }

                    // 前端清空凭据，退回初始待机状态
                    this.store.sniffer.sessionId = "";
                    this.store.sniffer.status = "sleeping";
                    localStorage.removeItem("my_njust_sniffer_session");
                }

                showToast("嗅探模式已关闭，通行凭证已彻底销毁", "success");
            }
        },

        async toggleReminder(status) {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.');

            if (status && !isMobile && !isLocal) {
                showToast("该功能仅在手机端 App 或 PWA 模式下可用", "error");
                return;
            }

            if (status) {
                // 1. 嗅探安卓原生桥接环境
                if (window.AndroidNative) {
                    this.store.examReminder.enabled = true;
                    localStorage.setItem("exam_reminder_enabled", "true");
                    showToast("原生系统提醒已开启", "success");
                    return;
                }

                // 2. 嗅探纯浏览器环境，如果没有通知 API，则优雅降级
                if (!("Notification" in window)) {
                    showToast("当前环境不支持系统通知，已降级为应用内悬浮提醒", "success");
                    this.store.examReminder.enabled = true;
                    localStorage.setItem("exam_reminder_enabled", "true");
                    return;
                }

                // 3. 纯血 PWA 或 桌面浏览器环境，请求授权
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    this.store.examReminder.enabled = true;
                    localStorage.setItem("exam_reminder_enabled", "true");
                    showToast("系统提醒已开启", "success");
                } else {
                    showToast("请在浏览器设置中允许通知权限", "error");
                }
            } else {
                this.store.examReminder.enabled = false;
                localStorage.setItem("exam_reminder_enabled", "false");
            }
        },
        toggleTiming(val) {
            const list = this.store.examReminder.selectedTimings;
            const idx = list.indexOf(val);
            if (idx > -1) {
                list.splice(idx, 1);
            } else {
                list.push(val);
            }
            localStorage.setItem("exam_reminder_timings", JSON.stringify(list));
        },

        saveTerm() { localStorage.setItem("my_njust_term", store.currentTerm); showToast("学期已切换为 " + store.currentTerm, "success"); },
        calibrateWeek() {
            let now = new Date(); now.setHours(0,0,0,0); let day = now.getDay() || 7;
            let monday = new Date(now); monday.setDate(monday.getDate() - day + 1); monday.setDate(monday.getDate() - (this.settingWeek - 1) * 7);
            let yyyy = monday.getFullYear(); let mm = String(monday.getMonth() + 1).padStart(2, '0'); let dd = String(monday.getDate()).padStart(2, '0');
            store.termStartDate = `${yyyy}-${mm}-${dd}`; localStorage.setItem("my_njust_start_date", store.termStartDate);
            showToast("校准成功", "success"); window.location.reload();
        },
        changeTheme(colorHex) {
            this.store.themeColor = colorHex;
            localStorage.setItem("my_njust_theme_color", colorHex);
            document.documentElement.style.setProperty('--primary-color', colorHex);
        },
        changeCustomTheme(event) {
            const hex = event.target.value;
            this.changeTheme(hex);
        },
        changeThemeMode(mode) {
            this.store.themeMode = mode;
            localStorage.setItem("my_njust_theme_mode", mode);
            document.documentElement.setAttribute('data-theme', mode);
        },
        saveOpacities() {
            localStorage.setItem("my_njust_highlight_opacity", this.store.highlightOpacity);
            localStorage.setItem("my_njust_card_opacity", this.store.cardOpacity);
            localStorage.setItem("my_njust_bg_opacity", this.store.bgOpacity);
        },
        clearLocalData() {
            if(confirm("确定要清空吗？（课表、成绩和自定义课程都会被清空）")) {
                localStorage.removeItem("my_njust_data"); localStorage.removeItem("my_njust_custom_courses");
                store.courseList = []; store.gradeList = []; store.levelExamsList = []; store.examsList = []; store.customCoursesList = [];
                showToast("教务缓存已清空", "success");
            }
        },
        async forceUpdateApp() {
            if(!confirm("这将会清除网页底层缓存并重新加载。是否继续？")) return;
            try {
                if ('serviceWorker' in navigator) { const registrations = await navigator.serviceWorker.getRegistrations(); for (let r of registrations) await r.unregister(); }
                if ('caches' in window) { const cacheNames = await caches.keys(); await Promise.all(cacheNames.map(name => caches.delete(name))); }
                showToast("缓存已清除，正在重新加载...", "success"); setTimeout(() => { window.location.reload(true); }, 1000);
            } catch (e) { showToast("清理失败", "error"); }
        },

        // 重构：热更新检查引擎
        async checkApkUpdate() {
            this.showUpdateModal = true;
            this.isCheckingUpdate = true;
            this.updateData = null;

            try {
                const timestamp = new Date().getTime();
                // 强制跨域不缓存请求
                const res = await fetch(`https://ns-release.jiraki.top/notice.json?t=${timestamp}`);
                if (res.ok) {
                    const data = await res.json();

                    // 极客版版本对比 (将 v1.2.3 提取为纯数字点阵，再进行比较)
                    const currentClean = this.currentAppVersion.replace(/[^\d.]/g, '');
                    const remoteClean = data.version.replace(/[^\d.]/g, '');
                    const hasNew = this.compareVersion(remoteClean, currentClean) > 0;

                    // 模拟一下网络延迟，让转圈加载更有质感 (0.6秒)
                    setTimeout(() => {
                        this.updateData = { ...data, hasNew };
                        this.isCheckingUpdate = false;
                    }, 600);

                } else {
                    throw new Error("接口返回非 200");
                }
            } catch (e) {
                setTimeout(() => {
                    this.updateData = { hasNew: false, version: '未知', content: '连接服务器失败，请检查网络。' };
                    this.isCheckingUpdate = false;
                }, 600);
            }
        },

        // 标准版本对比算法 (支持 1.2.10 对比 1.2.3)
        compareVersion(v1, v2) {
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                const num1 = parts1[i] || 0;
                const num2 = parts2[i] || 0;
                if (num1 > num2) return 1;
                if (num1 < num2) return -1;
            }
            return 0;
        },

        goToDownload() {
            window.location.href = "https://ns-release.jiraki.top/";
        }
    },
    mounted() {
        this.settingWeek = this.store.realWeek;
        if (this.isCustomColor) {
            this.customColorValue = this.store.themeColor;
        }

        // 动态获取本地静态的版本配置文件（加时间戳防止浏览器缓存）
        fetch('./version.json?t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                this.currentAppVersion = "v" + data.versionName;
            })
            .catch(e => {
                console.log("未找到版本配置文件，使用默认版本号");
                this.currentAppVersion = "v1.3.0.2"; // 兜底
            });
        // 动态获取模型花名册
        fetch('./js/components/sniffer_views/models/index.json?t=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                this.availableModels = data;
                // 如果当前选中的模型不在列表里，重置为列表第一个
                if (!data.some(m => m.id === this.store.sniffer.modelId) && data.length > 0) {
                    this.store.sniffer.modelId = data[0].id;
                    this.saveModelId();
                }
            })
            .catch(e => {
                console.error("无法读取模型花名册 index.json", e);
                this.availableModels = [{ id: this.store.sniffer.modelId, name: "本地配置读取失败" }];
            });
    }
}