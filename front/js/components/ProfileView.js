import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div class="profile-container">
            <div class="card">
                <div class="card-title">📅 课表时间校准</div>
                <p style="font-size: 13px; color: #666; margin-bottom: 12px;">在这里输入当前是第几周自动校准</p>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="font-size: 14px;">今天是：第</span>
                    <input type="number" v-model.number="settingWeek" min="1" max="25" style="width: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; text-align: center;">
                    <span style="font-size: 14px;">周</span>
                    <button class="btn" style="padding: 8px 15px; width: auto;" @click="calibrateWeek">一键校准</button>
                </div>
            </div>

            <div class="card">
                <div class="card-title">🔄 教务处同步</div>
                <div class="input-group"><input type="text" v-model="loginForm.username" placeholder="请输入学号"></div>
                <div class="input-group"><input type="password" v-model="loginForm.password" placeholder="请输入密码"></div>

                <div class="captcha-box" style="margin-bottom: 8px;">
                    <input type="text" v-model="loginForm.captcha" placeholder="验证码" @keyup.enter="syncAllData">
                    <img v-if="captchaImg && !isFetchingCaptcha" :src="captchaImg" @click="fetchCaptcha" title="点击刷新">
                    <div v-else class="captcha-placeholder" @click="fetchCaptcha">
                        <span v-if="isFetchingCaptcha" style="animation: breathing 1.5s infinite;">加载中...</span>
                        <span v-else>点击获取</span>
                    </div>
                </div>
                <div style="font-size: 11px; color: #ff9500; margin-bottom: 15px; text-align: right;">
                    * 教务处响应较慢，验证码可能需等待 5-10 秒
                </div>

                <button class="btn" @click="syncAllData" :disabled="loading || isFetchingCaptcha">
                    {{ loading ? '数据抓取中...' : '同步数据' }}
                </button>
            </div>

            <div class="card">
                <div class="card-title">🎨 界面设置</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 14px; color: #333; font-weight: bold;">课表显示模式</span>
                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: store.scheduleViewType === 'fixed'}" @click="store.scheduleViewType = 'fixed'">一屏固定</div>
                        <div class="switch-item" :class="{active: store.scheduleViewType === 'scroll'}" @click="store.scheduleViewType = 'scroll'">自由滑动</div>
                    </div>
                </div>
                <p style="font-size: 12px; color: #888; margin: 0;">一屏固定适合快速扫视，自由滑动字号更宽松。</p>
            </div>

            <div class="card">
                <button class="btn btn-danger" @click="clearLocalData">清空本地缓存</button>
            </div>
        </div>
    `,
    data() {
        return {
            store, loading: false, isFetchingCaptcha: false,
            captchaImg: "", loginForm: { username: "", password: "", captcha: "", session_id: "" },
            settingWeek: store.realWeek
        };
    },
    // ✨ 增加监听器：当你点击切换时，自动保存到浏览器的 localStorage
    watch: {
        'store.scheduleViewType'(newVal) {
            localStorage.setItem("my_njust_view_type", newVal);
        }
    },
    methods: {
        async fetchCaptcha() {
            if (this.isFetchingCaptcha) return;
            this.isFetchingCaptcha = true;
            this.captchaImg = "";
            try {
                const res = await fetch(`${API_BASE}/captcha`);
                const data = await res.json();
                this.captchaImg = data.captcha_image;
                this.loginForm.session_id = data.session_id;
            } catch (e) {
                showToast("无法获取验证码，请重试");
            } finally {
                this.isFetchingCaptcha = false;
            }
        },
        async syncAllData() {
            if(!this.loginForm.username || !this.loginForm.captcha) { showToast("请填写完整账号和验证码", "error"); return; }
            this.loading = true;
            try {
                const res = await fetch(`${API_BASE}/sync_all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.loginForm) });
                const result = await res.json();
                if (res.ok) {
                    store.courseList = result.data.courses; store.gradeList = result.data.grades; store.levelExamsList = result.data.level_exams || [];
                    localStorage.setItem("my_njust_data", JSON.stringify(result.data));
                    showToast("同步成功！", "success"); store.currentTab = 'schedule';
                } else {
                    showToast(result.detail, "error"); this.fetchCaptcha();
                }
            } catch (e) { showToast("网络异常"); } finally { this.loading = false; }
        },
        clearLocalData() {
            if(confirm("确定清空吗？")) {
                localStorage.removeItem("my_njust_data"); store.courseList = []; store.gradeList = []; store.levelExamsList = [];
            }
        },
        calibrateWeek() {
            let now = new Date(); now.setHours(0,0,0,0); let day = now.getDay() || 7;
            let monday = new Date(now); monday.setDate(monday.getDate() - day + 1); monday.setDate(monday.getDate() - (this.settingWeek - 1) * 7);
            let yyyy = monday.getFullYear(); let mm = String(monday.getMonth() + 1).padStart(2, '0'); let dd = String(monday.getDate()).padStart(2, '0');
            store.termStartDate = `${yyyy}-${mm}-${dd}`; localStorage.setItem("my_njust_start_date", store.termStartDate);
            showToast("校准成功", "success"); window.location.reload();
        }
    },
    mounted() { if(store.currentTab === 'profile') this.fetchCaptcha(); }
}