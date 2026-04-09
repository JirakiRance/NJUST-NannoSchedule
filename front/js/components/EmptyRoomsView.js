import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">

            <div v-if="!roomSessionValid" class="card" style="margin-top: 15px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 45px; margin-bottom: 10px;">☕</div>
                    <div style="font-size: 16px; font-weight: bold; color: #333;">寻找安静的角落</div>
                    <div style="font-size: 12px; color: #888; margin-top: 5px;">查询空教室需要保持教务处连接</div>
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
                    * 教务处响应较慢，验证码可能需等待 5-10 秒
                </div>

                <button class="btn" @click="roomLogin" :disabled="isRoomLoggingIn || isFetchingCaptcha">
                    {{ isRoomLoggingIn ? '建立连接中...' : '连接并查询' }}
                </button>
            </div>

            <div v-else style="display: flex; flex-direction: column; height: 100%;">
                <div class="filter-dashboard" style="background: #fff; padding: 15px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 15px; flex-shrink: 0;">
                    <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                        <select v-model.number="roomQuery.dateOffset" class="custom-select" style="padding:10px; border:1px solid #ddd; border-radius:8px; flex:1;">
                            <option :value="0">今天</option><option :value="1">明天</option>
                            <option :value="2">后天</option><option :value="3">大后天</option>
                        </select>
                        <select v-model="roomQuery.building" class="custom-select" style="padding:10px; border:1px solid #ddd; border-radius:8px; flex:1.5;">
                            <option value="all">全校所有楼</option>
                            <option value="I">I 区教学楼</option><option value="II">II 区教学楼</option>
                            <option value="IV">IV 区教学楼</option><option value="YF">逸夫楼</option>
                            <option value="other">其他教室</option>
                        </select>
                    </div>

                    <div style="font-size: 12px; color: #888; margin-bottom: 6px;">选择时段 (可多选，求交集)：</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px;">
                        <label v-for="p in periodOptions" :key="p.value" class="period-checkbox" :class="{active: roomQuery.periods.includes(p.value)}">
                            <input type="checkbox" :value="p.value" v-model="roomQuery.periods" style="display: none;">
                            {{ p.name }}
                        </label>
                    </div>

                    <button class="btn" style="padding: 10px; font-size: 15px;" @click="searchEmptyRooms" :disabled="isSearchingRooms">
                        {{ isSearchingRooms ? '深度扫描中...' : '开始查询' }}
                    </button>
                </div>

                <div v-if="allEmptyRooms.length > 0" style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 10px; border-radius: 4px; font-size: 11px; color: #b45309; margin-bottom: 15px; line-height: 1.5;">
                    <b>🎓 温馨提示：</b> 查出的部分全天空闲教室可能是考研学子的“固定根据地”。推门如发现堆满厚厚的书本或已有大佬在苦读，请把安静留给他们，咱们换下一间哦！
                </div>

                <div style="flex: 1; overflow-y: auto;">
                    <div v-if="allEmptyRooms.length > 0">
                        <div style="font-size: 12px; color: #34c759; margin-bottom: 10px; font-weight: bold;">
                            ✅ 扫描完毕！找到 {{ allEmptyRooms.length }} 个完美自习室：
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding-bottom: 20px;">
                            <div v-for="(roomName, idx) in allEmptyRooms" :key="idx"
                                 style="background: #fff; border-radius: 8px; padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #374151; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                                {{ roomName }}
                            </div>
                        </div>
                    </div>
                    <div class="empty-state" v-else-if="!isSearchingRooms">
                        <div style="font-size: 40px; margin-bottom: 10px;">☕</div><p>选择时间，寻找安静的角落</p>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store, roomSessionValid: false, isRoomLoggingIn: false, isFetchingCaptcha: false,showPassword: false,
            captchaImg: "", loginForm: { username: "", password: "", captcha: "", session_id: "" },
            isSearchingRooms: false, allEmptyRooms: [],
            periodOptions: [
                { name: "一(1-3)", value: "01-03" }, { name: "二(4-5)", value: "04-05" },
                { name: "三(6-7)", value: "06-07" }, { name: "四(8-10)", value: "08-10" },
                { name: "五(11-13)", value: "11-13" }
            ],
            roomQuery: { dateOffset: 0, periods: ["01-03"], building: "all" }
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
                this.captchaImg = data.captcha_image; this.loginForm.session_id = data.session_id;
            } catch (e) { showToast("无法获取验证码"); } finally { this.isFetchingCaptcha = false; }
        },
        async roomLogin() {
            if(!this.loginForm.username || !this.loginForm.password || !this.loginForm.captcha) return showToast("请填写完整");
            this.isRoomLoggingIn = true;
            try {
                const res = await fetch(`${API_BASE}/pure_login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.loginForm) });
                const result = await res.json();
                if (res.ok) {
                    this.roomSessionValid = true; showToast("连接教务处成功", "success");
                } else {
                    showToast(result.detail || "验证失败", "error"); this.fetchCaptcha();
                }
            } catch (e) { showToast("网络异常"); } finally { this.isRoomLoggingIn = false; }
        },
        async searchEmptyRooms() {
            if (this.roomQuery.periods.length === 0) return showToast("请至少勾选一个大节", "error");
            this.isSearchingRooms = true; this.allEmptyRooms = [];
            let targetDate = new Date(); targetDate.setDate(targetDate.getDate() + this.roomQuery.dateOffset);
            let start = new Date(store.termStartDate); start.setHours(0, 0, 0, 0); targetDate.setHours(0, 0, 0, 0);
            let diffDays = Math.floor((targetDate - start) / (1000 * 60 * 60 * 24));
            let targetWeek = Math.floor(diffDays / 7) + 1;
            let targetDay = targetDate.getDay() || 7;

            try {
                const res = await fetch(`${API_BASE}/empty_rooms`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: this.loginForm.session_id,
                        term: store.currentTerm,
                        week: targetWeek.toString(),
                        day: targetDay.toString(),
                        period_list: this.roomQuery.periods,
                        building: this.roomQuery.building
                    })
                });
                const result = await res.json();
                if (res.ok) {
                    this.allEmptyRooms = result.data.sort((a, b) => a.localeCompare(b, 'zh-CN', {numeric: true}));
                    if (this.allEmptyRooms.length === 0) showToast("该时段暂无空闲教室", "error");
                } else {
                    if (res.status === 400 || res.status === 401) { this.roomSessionValid = false; this.fetchCaptcha(); showToast("连接断开，请重新验证", "error"); } else showToast(result.detail || "查询失败");
                }
            } catch (e) { showToast("网络异常"); } finally { this.isSearchingRooms = false; }
        }
    },
    mounted() { this.fetchCaptcha(); }
}