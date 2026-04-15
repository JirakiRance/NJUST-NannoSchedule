import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';
import LoginCard from './LoginCard.js';

export default {
    components: { LoginCard },
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">

            <login-card v-if="!roomSessionValid" mode="pure" @login-success="onLoginSuccess">
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

                    <div class="empty-room-filter-label">选择时段 (最多可选 4 个，求交集)：</div>
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
                        {{ isSearchingRooms ? '深度扫描中...' : '开始查询' }}
                    </button>
                </div>

                <div v-if="allEmptyRooms.length > 0" class="empty-room-warning">
                    <b><i class="ri-lightbulb-flash-line"></i> 温馨提示：</b> 咱们已经特意避开了全天空闲的“考研神仙教室”，如果推门还是发现大佬在苦读，请把安静留给他们，换下一间哦！
                </div>

                <div class="empty-room-result-area">
                    <div v-if="allEmptyRooms.length > 0">
                        <div class="empty-room-result-title">
                            <i class="ri-check-line" style="vertical-align: text-bottom;"></i> 扫描完毕！找到 {{ allEmptyRooms.length }} 个完美自习室：
                        </div>
                        <div class="empty-room-grid">
                            <div v-for="(roomName, idx) in allEmptyRooms" :key="idx" class="empty-room-item">
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
            sessionId: "", // 存放登录成功后传来的 ID
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
    methods: {
        onLoginSuccess(id) {
            this.sessionId = id;
            this.roomSessionValid = true;
        },
        togglePeriod(val) {
            const idx = this.roomQuery.periods.indexOf(val);
            if (idx !== -1) {
                this.roomQuery.periods.splice(idx, 1);
            } else {
                if (this.roomQuery.periods.length >= 4) {
                    showToast("为考研学子留片天地，最多只允许同时选择 4 个时段", "error");
                    return;
                }
                this.roomQuery.periods.push(val);
            }
        },
        async searchEmptyRooms() {
            if (this.roomQuery.periods.length === 0) return showToast("请至少勾选一个大节", "error");
            this.isSearchingRooms = true;
            this.allEmptyRooms = [];

            let targetDate = new Date(); targetDate.setDate(targetDate.getDate() + this.roomQuery.dateOffset);
            let start = new Date(store.termStartDate); start.setHours(0, 0, 0, 0); targetDate.setHours(0, 0, 0, 0);
            let diffDays = Math.floor((targetDate - start) / (1000 * 60 * 60 * 24));
            let targetWeek = Math.floor(diffDays / 7) + 1;
            let targetDay = targetDate.getDay() || 7;

            try {
                let intersectedRooms = null;

                for (const period of this.roomQuery.periods) {
                    const res = await fetch(`${API_BASE}/empty_rooms`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            session_id: this.sessionId, // 使用拿到的 ID
                            term: store.currentTerm,
                            week: targetWeek.toString(),
                            day: targetDay.toString(),
                            period_list: [period],
                            building: this.roomQuery.building
                        })
                    });
                    const result = await res.json();

                    if (res.ok) {
                        if (intersectedRooms === null) {
                            intersectedRooms = result.data || [];
                        } else {
                            intersectedRooms = intersectedRooms.filter(r => (result.data || []).includes(r));
                        }
                        if (intersectedRooms.length === 0) break;
                    } else {
                        if (res.status === 400 || res.status === 401) {
                            this.roomSessionValid = false;
                            showToast("连接断开，请重新验证", "error");
                        } else {
                            showToast(result.detail || "查询失败");
                        }
                        return;
                    }
                }

                this.allEmptyRooms = (intersectedRooms || []).sort((a, b) => a.localeCompare(b, 'zh-CN', {numeric: true}));
                if (this.allEmptyRooms.length === 0) showToast("该组合时段内无完美空闲教室", "error");

            } catch (e) {
                showToast("网络异常");
            } finally {
                this.isSearchingRooms = false;
            }
        }
    }
}