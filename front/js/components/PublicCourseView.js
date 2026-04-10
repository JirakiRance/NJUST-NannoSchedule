import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">

            <div v-if="!roomSessionValid" class="card" style="margin-top: 15px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div class="empty-emoji"><i class="ri-radar-line" style="color: #ff2d55;"></i></div>
                    <div class="list-card-title">全校课程雷达</div>
                    <div class="setting-desc" style="margin-top: 5px;">查询蹭课需要保持教务处连接</div>
                </div>

                <div class="input-group"><input type="text" v-model="loginForm.username" placeholder="请输入学号"></div>
                <div class="input-group" style="position: relative;">
                    <input :type="showPassword ? 'text' : 'password'" v-model="loginForm.password" placeholder="请输入密码" style="padding-right: 60px;">
                    <span @click="showPassword = !showPassword" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--primary-color); cursor: pointer; font-weight: bold; user-select: none;">
                        {{ showPassword ? '隐藏' : '显示' }}
                    </span>
                </div>

                <div class="captcha-box" style="margin-bottom: 8px;">
                    <input type="text" v-model="loginForm.captcha" placeholder="验证码" @keyup.enter="roomLogin">
                    <img v-if="captchaImg && !isFetchingCaptcha" :src="captchaImg" @click="fetchCaptcha">
                    <div v-else class="captcha-placeholder" @click="fetchCaptcha">
                        <span v-if="isFetchingCaptcha" style="animation: breathing 1.5s infinite;">加载中...</span>
                        <span v-else>点击获取</span>
                    </div>
                </div>
                <div style="font-size: 11px; color: #ff9500; margin-bottom: 15px; text-align: right;">
                    <i class="ri-information-line" style="vertical-align: middle;"></i> 教务处响应较慢，验证码可能需等待 5-10 秒
                </div>

                <button class="btn" @click="roomLogin" :disabled="isRoomLoggingIn || isFetchingCaptcha">
                    <i v-if="isRoomLoggingIn" class="ri-loader-4-line ri-spin" style="margin-right: 5px;"></i>
                    {{ isRoomLoggingIn ? '正在建立加密通道...' : '连接并查询' }}
                </button>
            </div>

            <div v-else style="display: flex; flex-direction: column; height: 100%;">
                <div class="search-bar-wrapper">
                    <input type="text" v-model="searchKeyword" placeholder="输入课程名(如: 数据结构)" @keyup.enter="searchCourses">
                    <button class="search-btn" @click="searchCourses" :disabled="isSearching">
                        <i v-if="isSearching" class="ri-loader-4-line ri-spin" style="margin-right: 4px;"></i>
                        {{ isSearching ? '扫描中' : '雷达扫描' }}
                    </button>
                </div>

                <div class="search-results-area" style="flex: 1; overflow-y: auto; padding-top: 15px;">
                    <div v-if="courseList.length > 0">
                        <div class="setting-desc" style="margin-bottom: 10px;">发现 {{ courseList.length }} 个可以旁听的教学班</div>

                        <div class="list-card" v-for="(c, idx) in courseList" :key="idx">
                            <div class="list-card-header" style="margin-bottom: 8px; padding-bottom: 8px;">
                                <span class="list-card-title"><i class="ri-book-read-line" style="color: var(--primary-color); vertical-align: text-bottom; margin-right: 4px;"></i>{{ c.course_name }}</span>
                                <span class="list-card-date" style="color: var(--primary-color); background: #e1f0ff; font-weight:bold;">
                                    <i class="ri-calendar-todo-line"></i> {{ c.day_str }} | {{ c.slot_str }}
                                </span>
                            </div>
                            <div style="font-size: 13px; color: #555; line-height: 1.6;">
                                <div><i class="ri-user-voice-line" style="color: #999; margin-right: 4px;"></i><strong>教师：</strong>{{ c.teacher }}</div>
                                <div><i class="ri-map-pin-line" style="color: #999; margin-right: 4px;"></i><strong>教室：</strong>{{ c.room || '待定' }}</div>
                                <div><i class="ri-calendar-event-line" style="color: #999; margin-right: 4px;"></i><strong>周次：</strong>{{ c.weeks }}</div>
                                <div style="font-size: 11px; color: #999; margin-top: 4px;">班级代码: {{ c.class_id }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="empty-state" v-else-if="!isSearching">
                        <div class="empty-emoji"><i class="ri-search-eye-line" style="color: #999;"></i></div><p>输入课程名，发掘感兴趣的旁听课</p>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store, roomSessionValid: false, isRoomLoggingIn: false, isFetchingCaptcha: false,showPassword: false,
            captchaImg: "", loginForm: { username: "", password: "", captcha: "", session_id: "" },
            searchKeyword: "", isSearching: false, courseList: []
        }
    },
    methods: {
        async fetchCaptcha() {
            if (this.isFetchingCaptcha) return;
            this.isFetchingCaptcha = true; this.captchaImg = "";
            try {
                const res = await fetch(`${API_BASE}/captcha`);
                const data = await res.json();
                this.captchaImg = data.captcha_image; this.loginForm.session_id = data.session_id;
            } catch (e) { showToast("无法获取验证码"); } finally { this.isFetchingCaptcha = false; }
        },
        async roomLogin() {
            if(!this.loginForm.username || !this.loginForm.password || !this.loginForm.captcha) return showToast("请填写完整");
            this.isRoomLoggingIn = true;
            const requestPayload = {
                ...this.loginForm,
                term: store.currentTerm
            };
            try {
                const res = await fetch(`${API_BASE}/pure_login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestPayload) });
                const result = await res.json();
                if (res.ok) {
                    this.roomSessionValid = true; showToast("连接教务处成功", "success");
                } else {
                    const errorMsg = typeof result.detail === 'string' ? result.detail : "参数缺失或验证失败";
                    showToast(errorMsg, "error");
                    this.fetchCaptcha();
                }
            } catch (e) { showToast("网络异常"); } finally { this.isRoomLoggingIn = false; }
        },
        async searchCourses() {
            if (!this.searchKeyword.trim()) return showToast("请输入课程名称");
            this.isSearching = true; this.courseList = [];
            try {
                const res = await fetch(`${API_BASE}/search_public_courses`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: this.loginForm.session_id, term: store.currentTerm, keyword: this.searchKeyword })
                });
                const result = await res.json();
                if (res.ok) {
                    this.courseList = result.data; if (this.courseList.length === 0) showToast("未找到相关课程");
                } else {
                    if (res.status === 400 || res.status === 401) { this.roomSessionValid = false; this.fetchCaptcha(); showToast("连接断开，请重新验证", "error"); } else showToast(result.detail || "查询失败");
                }
            } catch (e) { showToast("网络异常"); } finally { this.isSearching = false; }
        }
    },
    mounted() { this.fetchCaptcha(); }
}