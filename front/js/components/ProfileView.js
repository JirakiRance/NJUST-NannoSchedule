import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div class="profile-container">
            <div class="card">
                <div class="card-title">📅 课表时间校准</div>
                <p style="font-size: 12px; color: #666; margin-bottom: 12px;">如果发现当前周次不对，请在此手动修正：</p>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 14px; white-space: nowrap;">当前为第</span>
                    <input type="number" v-model.number="settingWeek" min="1" max="25" style="width: 55px; padding: 8px 4px; border: 1px solid #ddd; border-radius: 6px; text-align: center;">
                    <span style="font-size: 14px; white-space: nowrap;">周</span>
                    <div style="flex: 1;"></div> <button class="btn" style="padding: 8px 15px; width: auto; white-space: nowrap; flex-shrink: 0; margin: 0;" @click="calibrateWeek">一键校准</button>
                </div>
            </div>

            <div class="card">
                <div class="card-title">🔄 教务处同步</div>
                <p style="font-size: 12px; color: #666; margin-bottom: 12px;">一般账号密码就是学号</p>
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
                <div class="card-title">🛠️ 系统维护</div>
                <p style="font-size: 12px; color: #888; margin-bottom: 15px;">网页异常可尝试拉取或清缓存；如需安装全新功能请检查 App 更新。</p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn" style="background-color: #ff9500; margin: 0;" @click="forceUpdateApp">
                        拉取网页最新版本
                    </button>
                    <button class="btn btn-danger" style="margin: 0;" @click="clearLocalData">
                        清空本地教务缓存
                    </button>
                    <button class="btn" style="background-color: #007aff; margin: 0; font-weight: bold;" @click="checkApkUpdate">
                        检查软件最新版本
                    </button>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store, loading: false, isFetchingCaptcha: false,showPassword: false,
            captchaImg: "", loginForm: { username: "", password: "", captcha: "", session_id: "" },
            settingWeek: store.realWeek
        };
    },
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
            if(confirm("确定要清空课表和成绩缓存吗？（需重新登录获取）")) {
                localStorage.removeItem("my_njust_data"); store.courseList = []; store.gradeList = []; store.levelExamsList = [];
                showToast("教务缓存已清空", "success");
            }
        },
        // 核心机制：强制清除浏览器 SW 缓存并刷新
        async forceUpdateApp() {
            if(!confirm("这将会清除网页底层缓存并从服务器下载最新代码，不会清除本地数据。是否继续？")) return;

            try {
                // 1. 注销 Service Worker
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        await registration.unregister();
                    }
                }

                // 2. 清空 Cache Storage (存放 js/css/html 的地方)
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }

                showToast("缓存已清除，正在重新加载...", "success");

                // 3. 延迟 1 秒后强制刷新，跳过浏览器本地缓存读取最新文件
                setTimeout(() => {
                    window.location.reload(true);
                }, 1000);
            } catch (e) {
                showToast("更新指令执行失败，请手动清理浏览器缓存", "error");
            }
        },
        calibrateWeek() {
            let now = new Date(); now.setHours(0,0,0,0); let day = now.getDay() || 7;
            let monday = new Date(now); monday.setDate(monday.getDate() - day + 1); monday.setDate(monday.getDate() - (this.settingWeek - 1) * 7);
            let yyyy = monday.getFullYear(); let mm = String(monday.getMonth() + 1).padStart(2, '0'); let dd = String(monday.getDate()).padStart(2, '0');
            store.termStartDate = `${yyyy}-${mm}-${dd}`; localStorage.setItem("my_njust_start_date", store.termStartDate);
            showToast("校准成功", "success"); window.location.reload();
        },
        // 检查 APK 外链更新
        async checkApkUpdate() {

            const UPDATE_WEBSITE_URL = "https://ns-release.jiraki.top/";

            // 给个温馨弹窗，防止用户误触直接跳出 App
            if (confirm("即将前往下载页面查看并获取最新版 App，是否继续？")) {
                window.location.href = UPDATE_WEBSITE_URL;
            }
        }
    },
    mounted() {
        if(store.currentTab === 'profile')
            this.fetchCaptcha();
        this.settingWeek = this.store.realWeek;
    }
}