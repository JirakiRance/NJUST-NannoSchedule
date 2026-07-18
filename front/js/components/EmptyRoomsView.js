import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';
import LoginCard from './LoginCard.js';

export default {
    components: { LoginCard },
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">


            <div v-if="isRestoringSession" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-sub);">
                <i class="ri-loader-4-line ri-spin" style="font-size:28px; margin-bottom:10px;"></i>
                <div style="font-size:13px;">正在自动恢复连接...</div>
            </div>
            <login-card v-else-if="!roomSessionValid" mode="pure" @login-success="onLoginSuccess">
                <template #header>
                    <div class="empty-room-header">
                        <div class="empty-room-icon"><i class="ri-cup-line" style="color: #8d6e63;"></i></div>
                        <div class="empty-room-title">寻找安静的角落</div>
                        <div class="empty-room-desc">查询空教室需要保持教务处连接</div>
                    </div>
                </template>
            </login-card>

            <div v-else style="display: flex; flex-direction: column; height: 100%;">
                <div class="empty-room-filter-dashboard">
                    <div class="empty-room-filter-row">
                        <select v-model.number="roomQuery.dateOffset" class="custom-select" style="flex:1;">
                            <option :value="0">今天</option><option :value="1">明天</option>
                            <option :value="2">后天</option><option :value="3">大后天</option>
                        </select>
                        <select v-model="roomQuery.building" class="custom-select" style="flex:1.5;">
                            <option value="all">全校所有楼</option>
                            <option value="I">I 区教学楼</option><option value="II">II 区教学楼</option>
                            <option value="IV">IV 区教学楼</option><option value="YF">逸夫楼</option>
                            <option value="other">其他教室</option>
                        </select>
                    </div>

                    <div class="empty-room-filter-label">选择时段 (可多选，求交集)：</div>
                    <div class="empty-room-period-grid">
                        <label v-for="p in periodOptions" :key="p.value"
                               class="period-checkbox"
                               :class="{active: roomQuery.periods.includes(p.value)}"
                               @click="togglePeriod(p.value)">
                            {{ p.name }}
                        </label>
                    </div>

                    <button class="btn empty-room-btn-search" @click="searchEmptyRooms" :disabled="isSearchingRooms">
                        <i v-if="isSearchingRooms" class="ri-radar-line ri-spin" style="margin-right: 5px;"></i>
                        {{ isSearchingRooms ? '查询中...' : '开始查询' }}
                    </button>
                </div>



                <div class="empty-room-result-area">
                    <div v-if="allEmptyRooms.length > 0">
                        <div class="empty-room-result-title">
                            <i class="ri-check-line" style="vertical-align: text-bottom;"></i> 扫描完毕！找到 {{ allEmptyRooms.length }} 个教室：
                        </div>
                        <div class="empty-room-grid">
                            <div v-for="(roomName, idx) in allEmptyRooms" :key="idx" class="empty-room-item" :title="roomName">
                                {{ roomName }}
                            </div>
                        </div>
                    </div>
                    <div class="empty-state" v-else-if="!isSearchingRooms">
                        <div class="empty-emoji"><i class="ri-door-open-line"></i></div>
                        <p>选择时间，寻找安静的角落</p>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store,
            roomSessionValid: false,
            isRestoringSession: false,
            sessionId: "",
            isSearchingRooms: false,
            allEmptyRooms: [],
            periodOptions: [
                { name: "一(1-3)", value: "01-03" }, { name: "二(4-5)", value: "04-05" },
                { name: "三(6-7)", value: "06-07" }, { name: "四(8-10)", value: "08-10" },
                { name: "五(11-13)", value: "11-13" }
            ],
            roomQuery: { dateOffset: 0, periods: ["01-03"], building: "all" }
        }
    },
    mounted() {
        // 启动时自动从 localStorage 捞取 Session ID
        const savedSession = localStorage.getItem("my_njust_session_id");
        if (!savedSession) return;
        this.sessionId = savedSession;
        this.tryRestoreSession(savedSession);
    },
    methods: {

        async tryRestoreSession(sessionId) {
            this.isRestoringSession = true;
            try {
                // 1. 快速探测当前连接状态
                const checkRes = await fetch(`${API_BASE}/keep_alive`, {
                    method: "POST", headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({session_id: sessionId})
                });

                if (checkRes.ok) {
                    this.roomSessionValid = true;
                    this.isRestoringSession = false;
                    return;
                }

                // 2. 状态失效，开始自动尝试二次登录 (触发后端的 5 次 OCR 扫描)
                const reloginRes = await fetch(`${API_BASE}/auto_relogin`, {
                    method: "POST", headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({session_id: sessionId})
                });

                if (reloginRes.ok) {
                    this.roomSessionValid = true;
                } else {
                    // 3. 5 次扫描都不行，彻底回退到手动登录 (这会弹出 LoginCard)
                    this.roomSessionValid = false;
                }
            } catch(e) {
                this.roomSessionValid = false;
            }
            this.isRestoringSession = false;
        },

        onLoginSuccess(id) {
            this.sessionId = id;
            this.roomSessionValid = true;
        },
        togglePeriod(val) {
            const idx = this.roomQuery.periods.indexOf(val);
            if (idx !== -1) {
                this.roomQuery.periods.splice(idx, 1);
            } else {
//                if (this.roomQuery.periods.length >= 4) {
//                    showToast("最多只允许同时选择 4 个时段", "error");
//                    return;
//                }
                this.roomQuery.periods.push(val);
            }
        },
        async searchEmptyRooms() {
            if (this.roomQuery.periods.length === 0) return showToast("请至少勾选一个大节", "error");
            if (!store.termStartDate) return showToast("请先在设置页配置【学期开始日期】", "error"); // 拦截因为没配置开学日期导致的查不到数据 Bug

            this.isSearchingRooms = true;
            this.allEmptyRooms = [];

            let targetDate = new Date(); targetDate.setDate(targetDate.getDate() + this.roomQuery.dateOffset);
            let start = new Date(store.termStartDate); start.setHours(0, 0, 0, 0); targetDate.setHours(0, 0, 0, 0);
            let diffDays = Math.floor((targetDate - start) / (1000 * 60 * 60 * 24));
            let targetWeek = Math.floor(diffDays / 7) + 1;
            let targetDay = targetDate.getDay() || 7;

            try {
                // 定义单次查询 Promise
                const fetchPeriod = async (periodCode) => {
                    const res = await fetch(`${API_BASE}/empty_rooms`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            session_id: this.sessionId,
                            term: store.currentTerm,
                            week: targetWeek.toString(),
                            day: targetDay.toString(),
                            period_list: [periodCode],
                            building: this.roomQuery.building
                        })
                    });
                    if (res.status === 401) {
                        this.roomSessionValid = false;
                        throw new Error("401");
                    }
                    if (!res.ok) throw new Error(res.status);
                    const result = await res.json();
                    return result.data || [];
                };

                // 1. 只拉取用户勾选的时段
                const selectedPeriods = this.roomQuery.periods;
                const results = await Promise.all(selectedPeriods.map(code => fetchPeriod(code).catch(() => [])));

                // 2. 求用户选中时段的交集
                let userEmptyRooms = results[0];
                for (let i = 1; i < results.length; i++) {
                    userEmptyRooms = userEmptyRooms.filter(r => results[i].includes(r));
                }

                // 3. 直接进行排序并赋值
                this.allEmptyRooms = userEmptyRooms.sort((a, b) => a.localeCompare(b, 'zh-CN', {numeric: true}));

                // 反馈提示优化
                if (this.allEmptyRooms.length === 0) {
                    showToast("该组合时段内无空闲教室", "error");
                }

            } catch (e) {
                if (e.message === "400" || e.message === "401") {
                    this.roomSessionValid = false;
                    showToast("连接断开，请重新验证", "error");
                } else {
                    showToast("网络异常或教务处响应超时", "error");
                }
            } finally {
                this.isSearchingRooms = false;
            }
        }
    }
}