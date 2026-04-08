import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div class="profile-container">
            <div class="card">
                <div class="card-title">📅 课表时间校准</div>
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
                <div class="captcha-box">
                    <input type="text" v-model="loginForm.captcha" placeholder="验证码">
                    <img v-if="captchaImg" :src="captchaImg" @click="fetchCaptcha">
                </div>
                <button class="btn" @click="syncAllData" :disabled="loading">{{ loading ? '抓取中...' : '同步数据' }}</button>
            </div>

            <div class="card">
                <button class="btn btn-danger" @click="clearLocalData">清空本地缓存</button>
            </div>
        </div>
    `,
    data() {
        return { store, loading: false, captchaImg: "", loginForm: { username: "", password: "", captcha: "", session_id: "" }, settingWeek: store.realWeek };
    },
    methods: {
        async fetchCaptcha() {
            try {
                const res = await fetch(`${API_BASE}/captcha`); const data = await res.json();
                this.captchaImg = data.captcha_image; this.loginForm.session_id = data.session_id;
            } catch (e) { showToast("无法连接服务器"); }
        },
        async syncAllData() {
            this.loading = true;
            try {
                const res = await fetch(`${API_BASE}/sync_all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.loginForm) });
                const result = await res.json();
                if (res.ok) {
                    store.courseList = result.data.courses; store.gradeList = result.data.grades; store.levelExamsList = result.data.level_exams || [];
                    localStorage.setItem("my_njust_data", JSON.stringify(result.data));
                    showToast("同步成功！", "success"); store.currentTab = 'schedule';
                } else { showToast(result.detail, "error"); this.fetchCaptcha(); }
            } catch (e) { showToast("网络异常"); } finally { this.loading = false; }
        },
        clearLocalData() {
            if(confirm("确定清空吗？")) { localStorage.removeItem("my_njust_data"); store.courseList = []; store.gradeList = []; }
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