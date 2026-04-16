import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    props: {
        mode: {
            type: String,
            default: 'sync' // 业务模式：'sync' (抓取同步) 或 'pure' (单纯连接教务处)
        }
    },
    template: `
        <div class="card login-card" :style="mode === 'pure' ? 'margin-top: 15px;' : ''">

            <slot name="header">
                <div class="card-title"><i class="ri-refresh-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>教务处同步</div>
                <p class="setting-desc">一般账号密码就是学号</p>
            </slot>

            <div class="input-group">
                <input type="text" v-model="loginForm.username" placeholder="请输入学号">
            </div>

            <div class="input-group" style="position: relative; margin-bottom: 12px;">
                <input :type="showPassword ? 'text' : 'password'" v-model="loginForm.password" placeholder="请输入密码" style="padding-right: 60px;">
                <span @click="showPassword = !showPassword" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--primary-color); cursor: pointer; font-weight: bold; user-select: none;">
                    {{ showPassword ? '隐藏' : '显示' }}
                </span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 4px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0;">
                    <input type="checkbox" v-model="store.userAccount.remember" style="width: 15px; height: 15px; margin: 0;">
                    <span style="font-size: 13px; color: var(--text-main);">记住账号密码</span>
                </label>
                <span style="font-size: 11px; color: var(--text-sub);"><i class="ri-shield-check-line"></i> 本地安全存储</span>
            </div>

            <div class="captcha-box" style="margin-bottom: 8px;">
                <input type="text" v-model="captcha" placeholder="验证码" @keyup.enter="submitLogin">
                <img v-if="captchaImg && !isFetchingCaptcha" :src="captchaImg" @click="fetchCaptcha" title="点击刷新">
                <div v-else class="captcha-placeholder" @click="fetchCaptcha">
                    <span v-if="isFetchingCaptcha" style="animation: breathing 1.5s infinite;">加载中...</span>
                    <span v-else>点击获取</span>
                </div>
            </div>
            <div style="font-size: 11px; color: #ff9500; margin-bottom: 15px; text-align: right;">
                <i class="ri-information-line" style="vertical-align: middle;"></i> 教务处响应较慢，验证码可能需等待 5-10 秒
            </div>

            <button class="btn" @click="submitLogin" :disabled="loading || isFetchingCaptcha">
                <i v-if="loading" class="ri-loader-4-line ri-spin" style="margin-right: 5px;"></i>
                {{ loadingText }}
            </button>
        </div>
    `,
    data() {
        return {
            store,
            loading: false,
            isFetchingCaptcha: false,
            showPassword: false,
            captchaImg: "",
            captcha: "",
            sessionId: "",
            // 使用局部变量，防止幽灵同步
            loginForm: {
                username: "",
                password: ""
            }
        };
    },
    computed: {
        loadingText() {
            if (this.loading) {
                return this.mode === 'sync' ? '数据抓取中...' : '正在建立通道...';
            }
            return this.mode === 'sync' ? '同步数据' : '连接并查询';
        }
    },
    watch: {
        // 监听记住密码开关
        'store.userAccount.remember'(newVal) {
            localStorage.setItem("my_njust_remember", newVal ? "true" : "false");
            if (!newVal) {
                // 取消勾选时，立刻清空全局状态和本地缓存，但不清空当前正在输入的局部框
                this.store.userAccount.username = "";
                this.store.userAccount.password = "";
                localStorage.removeItem("my_njust_username");
                localStorage.removeItem("my_njust_password");
            }
        }
    },
    methods: {
        async fetchCaptcha(isAuto = false) {
            if (this.isFetchingCaptcha) return;
            this.isFetchingCaptcha = true; this.captchaImg = "";
            try {
                const res = await fetch(`${API_BASE}/captcha`);
                const data = await res.json();
                this.captchaImg = data.captcha_image;
                this.sessionId = data.session_id;
            } catch (e) {
                // 只有用户手动点击刷新时，失败才弹窗提示
                if (!isAuto) showToast("无法获取验证码，请检查网络");
            } finally { this.isFetchingCaptcha = false; }
        },
        async submitLogin() {
            if(!this.loginForm.username || !this.loginForm.password || !this.captcha) {
                showToast("请填写完整", "error"); return;
            }
            this.loading = true;

            const requestPayload = {
                session_id: this.sessionId,
                username: this.loginForm.username,
                password: this.loginForm.password,
                captcha: this.captcha,
                term: store.currentTerm,
                keep_alive: this.mode === 'sync' ? store.sniffer.enabled : false
            };

            const endpoint = this.mode === 'sync' ? '/sync_all' : '/pure_login';

            try {
                const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestPayload) });
                const result = await res.json();
                if (res.ok) {

                    // 【核心逻辑】只有登录成功，且勾选了记住密码，才真正覆盖全局状态
                    if (this.store.userAccount.remember) {
                        this.store.userAccount.username = this.loginForm.username;
                        this.store.userAccount.password = this.loginForm.password;
                        localStorage.setItem("my_njust_username", this.loginForm.username);
                        localStorage.setItem("my_njust_password", this.loginForm.password);
                    }

                    if (this.mode === 'sync') {
                        store.courseList = result.data.courses;
                        store.gradeList = result.data.grades;
                        store.levelExamsList = result.data.level_exams || [];
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

                        store.sniffer.sessionId = this.sessionId;
                        localStorage.setItem("my_njust_sniffer_session", this.sessionId);

                        if (store.sniffer.enabled) {
                            store.sniffer.sessionId = this.sessionId;
                            localStorage.setItem("my_njust_sniffer_session", this.sessionId);
                        } else {
                            store.sniffer.sessionId = "";
                            localStorage.removeItem("my_njust_sniffer_session");
                        }

                        showToast("同步成功！", "success");
                        store.currentTab = 'schedule';

                        // 同步完成后，拉取 notice.json 强行矫正时间轴和学期名
                        try {
                            const res = await fetch(`https://ns-release.jiraki.top/notice.json?t=${new Date().getTime()}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.term_update) {
                                    const r = data.term_update;
                                    store.currentTerm = r.term;
                                    store.termStartDate = r.start_date;
                                    localStorage.setItem("my_njust_term", r.term);
                                    localStorage.setItem("my_njust_start_date", r.start_date);

                                    let s = new Date(r.start_date); s.setHours(0,0,0,0);
                                    let wc = Math.floor((new Date() - s) / (1000 * 60 * 60 * 24 * 7)) + 1;
                                    store.realWeek = Math.max(1, Math.min(wc, 25));
                                    store.currentWeek = store.realWeek;
                                }
                            }
                        } catch(e) { console.log("拉取 notice 失败", e); }

                    } else {
                        showToast("连接教务处成功", "success");
                    }

                    this.$emit('login-success', this.sessionId);

                } else {
                    const errorMsg = typeof result.detail === 'string' ? result.detail : "参数缺失或验证失败";
                    showToast(errorMsg, "error");
                    this.fetchCaptcha();
                }
            } catch (e) { showToast("网络异常"); } finally { this.loading = false; }
        }
    },
    mounted() {
        this.fetchCaptcha(true);
        // 卡片初始化时，如果允许记住，再把全局状态拉取到局部框里
        if (this.store.userAccount.remember) {
            this.loginForm.username = this.store.userAccount.username;
            this.loginForm.password = this.store.userAccount.password;
        }
    }
}