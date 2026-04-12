import { store } from '../store.js';
import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">
            <div class="exam-view-header">
                <span @click="clearExpiredExams" class="exam-action-clear">
                    <i class="ri-delete-bin-line" style="vertical-align: text-bottom;"></i> 清理过期
                </span>
                <span class="exam-header-title">
                    <i :class="showHistory ? 'ri-history-line' : 'ri-calendar-event-line'" style="vertical-align: text-bottom; margin-right: 4px;"></i>
                    {{ showHistory ? '历史学期考试' : '本学期考试' }}
                </span>
                <div class="exam-header-actions">
                    <span @click="showHistory = !showHistory" class="exam-action-toggle">
                        <i :class="showHistory ? 'ri-arrow-go-back-line' : 'ri-folder-history-line'" style="vertical-align: text-bottom;"></i>
                        {{ showHistory ? '返回本学期' : '历史学期' }}
                    </span>
                    <span v-show="true" @click="injectMultiTermData" style="color: #007aff; font-size: 11px; cursor: pointer; padding: 2px;">
                        [测试]
                    </span>
                </div>
            </div>

            <div v-if="!displayExams || displayExams.length === 0" class="empty-state">
                <div class="empty-emoji"><i :class="showHistory ? 'ri-inbox-archive-line' : 'ri-cup-line'"></i></div>
                <p>{{ showHistory ? '暂无历史考试记录' : '本学期暂无考试安排' }}</p>
                <div style="font-size: 12px; color: var(--text-sub); margin-top: 5px;">同步教务处后数据将持久化保存在本地</div>
            </div>

            <div v-else class="exam-list-area">
                <div v-for="exam in displayExams" :key="exam.course_id + exam.term"
                     class="list-card"
                     :style="getCardStyle(exam.time)">

                    <div class="exam-card-header-flex">
                        <div class="exam-card-title-group">
                            <div class="exam-tag-group">
                                <span class="exam-tag-term">{{ exam.term }}</span>
                                <span v-if="exam.session" class="exam-tag-session">{{ exam.session }}</span>
                            </div>
                            <span class="list-card-title" :style="getTitleStyle(exam.time)">
                                {{ exam.course_name }}
                            </span>
                        </div>
                        <div class="exam-status-group">
                            <span :style="getStatusTagStyle(exam.time)">
                                {{ getExamStatus(exam.time).text }}
                            </span>
                            <span v-if="getExamStatus(exam.time).code === 2" class="exam-countdown">
                                {{ getExamStatus(exam.time).countdown }}
                            </span>
                        </div>
                    </div>

                    <div class="exam-details">
                        <div><span class="exam-detail-label"><i class="ri-time-line" style="vertical-align: middle;"></i> 时间：</span>{{ exam.time }}</div>
                        <div><span class="exam-detail-label"><i class="ri-map-pin-line" style="vertical-align: middle;"></i> 考场：</span><b>{{ exam.room || '待定' }}</b></div>
                        <div><span class="exam-detail-label"><i class="ri-user-location-line" style="vertical-align: middle;"></i> 座位：</span><b class="exam-seat-highlight">{{ exam.seat || '--' }}</b></div>

                        <button v-if="getExamStatus(exam.time).code === 0"
                                @click="removeExam(exam)"
                                class="exam-btn-remove">
                            移除
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store,
            now: new Date(),
            refreshTimer: null,
            showHistory: false
        };
    },
    computed: {
        displayExams() {
            if (!store.examsList) return [];
            let filtered = [];
            const currentTerm = store.currentTerm;
            if (this.showHistory) {
                filtered = store.examsList.filter(e => e.term !== currentTerm);
            } else {
                filtered = store.examsList.filter(e => e.term === currentTerm || !e.term);
            }
            return filtered.sort((a, b) => {
                if (this.showHistory && a.term !== b.term) {
                    return b.term.localeCompare(a.term);
                }
                const parsedA = this.parseTime(a.time);
                const parsedB = this.parseTime(b.time);
                const timeA = parsedA ? parsedA.start.getTime() : 0;
                const timeB = parsedB ? parsedB.start.getTime() : 0;
                return timeA - timeB;
            });
        }
    },
    mounted() {
        this.refreshTimer = setInterval(() => { this.now = new Date(); }, 60000);
    },
    unmounted() { clearInterval(this.refreshTimer); },
    methods: {
        parseTime(timeStr) {
            try {
                const match = timeStr.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
                if (!match) return null;
                return {
                    start: new Date(match[1].replace(/-/g, '/') + ' ' + match[2] + ':00'),
                    end: new Date(match[1].replace(/-/g, '/') + ' ' + match[3] + ':00')
                };
            } catch (e) { return null; }
        },
        getExamStatus(timeStr) {
            const parsed = this.parseTime(timeStr);
            if (!parsed) return { code: -1, text: '时间未定' };

            const now = this.now.getTime();
            const start = parsed.start.getTime();
            const end = parsed.end.getTime();

            if (now > end) return { code: 0, text: '已结束' };
            if (now >= start && now <= end) return { code: 1, text: '考试中' };

            const diff = start - now;
            const days = Math.floor(diff / 86400000);
            const hours = Math.floor((diff % 86400000) / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);

            let cd = '';
            if (days > 0) cd = `倒计时 ${days}天`;
            else if (hours > 0) cd = `倒计时 ${hours}时${mins}分`;
            else cd = `即将开始 ${mins}分`;

            return { code: 2, text: '待考试', countdown: cd };
        },
        getCardStyle(timeStr) {
            const code = this.getExamStatus(timeStr).code;
            if (code === 0) return { opacity: '0.6', filter: 'grayscale(0.8)', background: 'var(--input-bg)' };
            if (code === 1) return { border: '2px solid #ff3b30', background: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(255,0,0,0.05)' };
            return { borderLeft: '4px solid #007aff' };
        },
        getTitleStyle(timeStr) {
            return this.getExamStatus(timeStr).code === 0 ? { textDecoration: 'line-through', color: 'var(--text-sub)' } : { fontWeight: 'bold', color: 'var(--text-main)' };
        },
        getStatusTagStyle(timeStr) {
            const code = this.getExamStatus(timeStr).code;
            const style = { fontSize: '11px', padding: '2px 8px', borderRadius: '10px' };
            if (code === 0) return { ...style, background: 'var(--grid-border)', color: 'var(--text-sub)' };
            if (code === 1) return { ...style, background: '#ff3b30', color: '#fff' };
            return { ...style, background: '#e1f0ff', color: '#007aff' };
        },
        removeExam(examObj) {
            if (confirm('是否移除该考试记录？(移除后需重新同步方可找回)')) {
                const realIndex = store.examsList.findIndex(e => e === examObj);
                if (realIndex !== -1) {
                    store.examsList.splice(realIndex, 1);
                    this.saveToLocal();
                }
            }
        },
        clearExpiredExams() {
            if (!store.examsList || store.examsList.length === 0) return showToast("当前没有考试记录");
            const expiredCount = store.examsList.filter(exam => this.getExamStatus(exam.time).code === 0).length;
            if (expiredCount === 0) return showToast("没有已过期的考试");

            if (confirm(`一键清除 ${expiredCount} 门已结束的考试记录？\n(清除后可通过重新同步相应学期找回)`)) {
                store.examsList = store.examsList.filter(exam => this.getExamStatus(exam.time).code !== 0);
                this.saveToLocal();
                showToast(`成功清理 ${expiredCount} 门考试`, "success");
            }
        },
        saveToLocal() {
            const data = JSON.parse(localStorage.getItem("my_njust_data") || "{}");
            data.exams = store.examsList;
            localStorage.setItem("my_njust_data", JSON.stringify(data));
        },
        injectMultiTermData() {
            const n = new Date();
            const fmt = (d) => {
                const p = (v) => v.toString().padStart(2, '0');
                return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
            };
            const curr = store.currentTerm;
            store.examsList = [
                { term: curr, course_name: "线性代数 (几天后)", course_id: "MATH102", session: "期末考试", room: "YF-402", seat: "110", time: `${fmt(new Date(n.getTime() + 86400000*5))}-${fmt(new Date(n.getTime() + 86400000*5 + 7200000)).split(' ')[1]}` },
                { term: "2023-2024-2", course_name: "大学计算机基础", course_id: "CS001", session: "期末考试", room: "III-201", seat: "01", time: `${fmt(new Date(n.getTime() - 86400000*300))}-${fmt(new Date(n.getTime() - 86400000*300 + 7200000)).split(' ')[1]}` }
            ];
            showToast("全状态测试数据已注入！");
        }
    }
}