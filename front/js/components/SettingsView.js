import { store } from '../store.js';
import { showToast } from '../utils.js';

export default {
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
                <div class="card-title"><i class="ri-palette-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>个性化</div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">深浅色模式</span>
                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: store.themeMode === 'light'}" @click="changeThemeMode('light')"><i class="ri-sun-line" style="margin-right:2px;"></i>浅色</div>
                        <div class="switch-item" :class="{active: store.themeMode === 'dark'}" @click="changeThemeMode('dark')"><i class="ri-moon-line" style="margin-right:2px;"></i>深色</div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">课表显示模式</span>
                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: store.scheduleViewType === 'fixed'}" @click="store.scheduleViewType = 'fixed'">一屏固定</div>
                        <div class="switch-item" :class="{active: store.scheduleViewType === 'scroll'}" @click="store.scheduleViewType = 'scroll'">自由滑动</div>
                    </div>
                </div>
                <p style="font-size: 12px; color: var(--text-sub); margin: 0; border-bottom: 1px dashed var(--grid-border); padding-bottom: 15px; margin-bottom: 15px;">一屏固定适合快速扫视，自由滑动字号更宽松。</p>

                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 14px; color: var(--text-main); font-weight: bold;">全局主题颜色</span>
                    <div class="theme-color-row">
                        <div v-for="c in availableColors" :key="c.value" class="color-swatch" :style="{ backgroundColor: c.value }" :class="{ active: store.themeColor === c.value }" @click="changeTheme(c.value)">
                            <i v-if="store.themeColor === c.value" class="ri-check-line"></i>
                        </div>
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
                <p class="setting-desc">遇到异常可拉取更新或清缓存，清除缓存会丢失当前课表数据。</p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn" style="background-color: #ff9500; margin: 0;" @click="forceUpdateApp"><i class="ri-cloud-windy-line" style="margin-right: 4px;"></i> 强制更新网页前端</button>
                    <button class="btn btn-danger" style="margin: 0;" @click="clearLocalData"><i class="ri-delete-bin-line" style="margin-right: 4px;"></i> 清除本地缓存</button>
                    <button class="btn" style="background-color: #007aff; margin: 0; font-weight: bold;" @click="checkApkUpdate"><i class="ri-smartphone-line" style="margin-right: 4px;"></i> 检查原生 App 更新</button>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store, settingWeek: store.realWeek,
            availableColors: [
                { name: '天空蓝', value: '#5b9bd5' }, { name: '樱花粉', value: '#ff6b81' },
                { name: '青苹绿', value: '#34c759' }, { name: '活力橙', value: '#ff9500' }, { name: '梦幻紫', value: '#5856d6' }
            ]
        };
    },
    watch: { 'store.scheduleViewType'(newVal) { localStorage.setItem("my_njust_view_type", newVal); } },
    methods: {
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
        // ✨ 新增：切换深浅色模式的逻辑
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
                showToast("缓存已清空", "success");
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
        async checkApkUpdate() { if (confirm("前往下载页面？")) window.location.href = "https://ns-release.jiraki.top/"; }
    },
    mounted() { this.settingWeek = this.store.realWeek; }
}