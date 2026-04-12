import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div class="profile-container" style="padding-bottom: 80px;">
            <div v-if="noticeInfo && noticeInfo.show" class="card notice-card">
                <div class="notice-header">
                    <span class="notice-title"><i class="ri-notification-3-line" style="vertical-align: text-bottom; margin-right: 4px;"></i>最新公告 ({{ noticeInfo.version }})</span>
                    <span class="notice-date">{{ noticeInfo.date }}</span>
                </div>
                <div class="notice-content">
                    {{ noticeInfo.content }}
                </div>
                <div class="notice-actions">
                    <button class="btn btn-update" @click="checkApkUpdate">前往更新</button>
                </div>
            </div>

            <div class="card">
                <div class="card-title"><i class="ri-refresh-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>教务处同步</div>
                <p class="setting-desc">一般账号密码就是学号</p>
                <div class="input-group"><input type="text" v-model="loginForm.username" placeholder="请输入学号"></div>
                <div class="input-group" style="position: relative;">
                    <input :type="showPassword ? 'text' : 'password'" v-model="loginForm.password" placeholder="请输入密码" style="padding-right: 60px;">
                    <span @click="showPassword = !showPassword" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--primary-color); cursor: pointer; font-weight: bold; user-select: none;">
                        {{ showPassword ? '隐藏' : '显示' }}
                    </span>
                </div>
                <div class="captcha-box" style="margin-bottom: 8px;">
                    <input type="text" v-model="loginForm.captcha" placeholder="验证码" @keyup.enter="syncAllData">
                    <img v-if="captchaImg && !isFetchingCaptcha" :src="captchaImg" @click="fetchCaptcha" title="点击刷新">
                    <div v-else class="captcha-placeholder" @click="fetchCaptcha">
                        <span v-if="isFetchingCaptcha" style="animation: breathing 1.5s infinite;">加载中...</span>
                        <span v-else>点击获取</span>
                    </div>
                </div>
                <div style="font-size: 11px; color: #ff9500; margin-bottom: 15px; text-align: right;">
                    <i class="ri-information-line" style="vertical-align: middle;"></i> 教务处响应较慢，验证码可能需等待 5-10 秒
                </div>

                <button class="btn" @click="syncAllData" :disabled="loading || isFetchingCaptcha">
                    <i v-if="loading" class="ri-loader-4-line ri-spin" style="margin-right: 5px;"></i>
                    {{ loading ? '数据抓取中...' : '同步数据' }}
                </button>
            </div>

            <div class="card" @click="openSettings" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 18px 15px; margin-top: 20px;">
                <div style="display: flex; align-items: center;">
                    <i class="ri-settings-4-line" style="margin-right: 8px; color: var(--text-sub); font-size: 20px;"></i>
                    <span style="font-size: 15px; font-weight: bold; color: var(--text-main);">设置</span>
                </div>
                <i class="ri-arrow-right-s-line" style="color: var(--text-sub); font-size: 20px;"></i>
            </div>
        </div>
    `,
    data() {
        return {
            store, loading: false, isFetchingCaptcha: false, showPassword: false,
            captchaImg: "", loginForm: { username: "", password: "", captcha: "", session_id: "" },
            noticeInfo: null
        };
    },
    methods: {
        async fetchNotice() {
            try {
                const timestamp = new Date().getTime();
                const res = await fetch(`https://ns-release.jiraki.top/notice.json?t=${timestamp}`);
                if (res.ok) { this.noticeInfo = await res.json(); }
            } catch (e) { console.log("获取公告失败，静默处理"); }
        },
        async fetchCaptcha() {
            if (this.isFetchingCaptcha) return;
            this.isFetchingCaptcha = true; this.captchaImg = "";
            try {
                const res = await fetch(`${API_BASE}/captcha`); const data = await res.json();
                this.captchaImg = data.captcha_image; this.loginForm.session_id = data.session_id;
            } catch (e) { showToast("无法获取验证码，请重试"); } finally { this.isFetchingCaptcha = false; }
        },
        async syncAllData() {
            if(!this.loginForm.username || !this.loginForm.captcha) { showToast("请填写完整账号和验证码", "error"); return; }
            this.loading = true;
            const requestPayload = { ...this.loginForm, term: store.currentTerm };
            try {
                const res = await fetch(`${API_BASE}/sync_all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestPayload) });
                const result = await res.json();
                if (res.ok) {
                    store.courseList = result.data.courses; store.gradeList = result.data.grades; store.levelExamsList = result.data.level_exams || [];
                    if (result.data.exams) {
                        const currentTerm = store.currentTerm;
                        const newExamsFromAPI = result.data.exams.map(e => ({ ...e, term: currentTerm }));
                        let mergedExams = [...(store.examsList || [])];
                        newExamsFromAPI.forEach(newItem => {
                            const index = mergedExams.findIndex(oldItem => oldItem.course_id === newItem.course_id && oldItem.term === newItem.term);
                            if (index !== -1) { mergedExams[index] = { ...mergedExams[index], ...newItem }; } else { mergedExams.push(newItem); }
                        });
                        store.examsList = mergedExams.sort((a, b) => {
                            if (a.term !== b.term) return b.term.localeCompare(a.term);
                            const parseTime = (t) => { const m = t.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/); return m ? new Date(m[1].replace(/-/g, '/') + ' ' + m[2] + ':00').getTime() : 0; };
                            return parseTime(a.time) - parseTime(b.time);
                        });
                        result.data.exams = store.examsList;
                    }
                    if (result.data.term_options && result.data.term_options.length > 0) {
                        store.termOptions = result.data.term_options; localStorage.setItem("my_njust_term_options", JSON.stringify(store.termOptions));
                    }
                    localStorage.setItem("my_njust_data", JSON.stringify(result.data));
                    showToast("同步成功！", "success"); store.currentTab = 'schedule';
                } else { showToast(result.detail, "error"); this.fetchCaptcha(); }
            } catch (e) { showToast("网络异常"); } finally { this.loading = false; }
        },
        async checkApkUpdate() {
            if (confirm("即将前往下载页面查看并获取最新版 App，是否继续？")) window.location.href = "https://ns-release.jiraki.top/";
        },
        // 打开设置子页面的方法
        openSettings() {
            store.currentSubPage = 'settings';
            window.history.pushState({ target: 'subPage' }, '', '#subPage');
        }
    },
    mounted() {
        this.fetchNotice();
        if(store.currentTab === 'profile') this.fetchCaptcha();
    }
}