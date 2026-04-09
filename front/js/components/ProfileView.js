import { store } from '../store.js';
import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">
            <div style="font-size: 13px; color: #888; margin-bottom: 15px; text-align: center; position: relative; padding: 0 60px;">
                <span @click="clearExpiredExams" style="position: absolute; left: 0; top: 0; color: #ff3b30; font-size: 11px; cursor: pointer; padding: 2px;">
                    🧹 清理过期
                </span>

                <span style="font-weight: bold; color: #333; font-size: 14px;">
                    {{ showHistory ? '🕰️ 历史学期考试' : '📅 本学期考试' }}
                </span>

                <div style="position: absolute; right: 0; top: 0; display: flex; gap: 8px;">
                    <span @click="showHistory = !showHistory" style="color: #ff9500; font-size: 11px; cursor: pointer; padding: 2px; font-weight: bold;">
                        {{ showHistory ? '返回本学期' : '历史学期' }}
                    </span>
                    <span v-show="false" @click="injectMultiTermData" style="color: #007aff; font-size: 11px; cursor: pointer; padding: 2px;">
                        [测试]
                    </span>
                </div>
            </div>

            <div v-if="!displayExams || displayExams.length === 0" class="empty-state">
                <div style="font-size: 45px; margin-bottom: 10px;">{{ showHistory ? '🗄️' : '☕' }}</div>
                <p>{{ showHistory ? '暂无历史考试记录' : '本学期暂无考试安排' }}</p>
                <div style="font-size: 12px; color: #999; margin-top: 5px;">同步教务处后数据将持久化保存在本地</div>
            </div>

            <div v-else style="flex: 1; overflow-y: auto; padding-bottom: 20px;">
                <div v-for="exam in displayExams" :key="exam.course_id + exam.term"
                     class="list-card"
                     :style="getCardStyle(exam.time)">

                    <div class="list-card-header" style="border-bottom: 1px dashed #eee; padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <span style="font-size: 10px; background: #f2f2f7; color: #666; padding: 2px 6px; border-radius: 4px; border: 1px solid #ddd;">
                                    {{ exam.term }}
                                </span>
                                <span v-if="exam.session" style="font-size: 10px; background: #fff7e6; color: #fa8c16; padding: 2px 6px; border-radius: 4px;">
                                    {{ exam.session }}
                                </span>
                            </div>
                            <span class="list-card-title" :style="getTitleStyle(exam.time)">
                                {{ exam.course_name }}
                            </span>
                        </div>

                        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                            <span :style="getStatusTagStyle(exam.time)">
                                {{ getExamStatus(exam.time).text }}
                            </span>
                            <span v-if="getExamStatus(exam.time).code === 2" style="font-size: 12px; font-weight: bold; color: #ff3b30; font-family: monospace;">
                                {{ getExamStatus(exam.time).countdown }}
                            </span>
                        </div>
                    </div>

                    <div style="font-size: 13px; color: #555; line-height: 1.8; position: relative;">
                        <div><span style="color: #999;">🕙 时间：</span>{{ exam.time }}</div>
                        <div><span style="color: #999;">📍 考场：</span><b>{{ exam.room || '待定' }}</b></div>
                        <div><span style="color: #999;">🪑 座位：</span><b style="color: #ff9500;">{{ exam.seat || '--' }}</b></div>

                        <button v-if="getExamStatus(exam.time).code === 0"
                                @click="removeExam(exam)"
                                style="position: absolute; right: 0; bottom: 0; background: none; border: 1px solid #ddd; color: #999; padding: 2px 8px; border-radius: 6px; font-size: 11px; cursor: pointer;">
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
            showHistory: false // 状态开关：默认展示本学期
        };
    },
    computed: {
        // 核心展示逻辑：动态过滤并精确排序
        displayExams() {
            if (!store.examsList) return [];

            let filtered = [];
            const currentTerm = store.currentTerm;

            if (this.showHistory) {
                // 历史模式：过滤出非当前学期的记录
                filtered = store.examsList.filter(e => e.term !== currentTerm);
            } else {
                // 主页模式：仅保留当前学期
                filtered = store.examsList.filter(e => e.term === currentTerm || !e.term);
            }

            // 执行排序
            return filtered.sort((a, b) => {
                if (this.showHistory && a.term !== b.term) {
                    return b.term.localeCompare(a.term);
                }

                // 精确提取完整时间进行时间戳比对
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
            if (code === 0) return { opacity: '0.6', filter: 'grayscale(0.8)', background: '#f9f9f9' };
            if (code === 1) return { border: '2px solid #ff3b30', background: '#fffcfc', boxShadow: '0 4px 12px rgba(255,0,0,0.05)' };
            return { borderLeft: '4px solid #007aff' };
        },
        getTitleStyle(timeStr) {
            return this.getExamStatus(timeStr).code === 0 ? { textDecoration: 'line-through', color: '#999' } : { fontWeight: 'bold' };
        },
        getStatusTagStyle(timeStr) {
            const code = this.getExamStatus(timeStr).code;
            const style = { fontSize: '11px', padding: '2px 8px', borderRadius: '10px' };
            if (code === 0) return { ...style, background: '#eee', color: '#999' };
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
                { term: "2023-2024-2", course_name: "大学计算机基础", course_id: "CS001", session: "期末考试", room: "III-201", seat: "01", time: `${fmt(new Date(n.getTime() - 86400000*300))}-${fmt(new Date(n.getTime() - 86400000*300 + 7200000)).split(' ')[1]}` },
                { term: curr, course_name: "面向对象编程 (马上考)", course_id: "CS205", session: "随堂测验", room: "机房A", seat: "10", time: `${fmt(new Date(n.getTime() + 1800000))}-${fmt(new Date(n.getTime() + 9000000)).split(' ')[1]}` },
                { term: "2024-2025-1", course_name: "高等数学 (上学期历史)", course_id: "MATH001", session: "期末考试", room: "IV-C101", seat: "22", time: `${fmt(new Date(n.getTime() - 86400000*30))}-${fmt(new Date(n.getTime() - 86400000*30 + 7200000)).split(' ')[1]}` },
                { term: curr, course_name: "数据结构 (正在考试)", course_id: "CS102", session: "期中考试", room: "I-201", seat: "45", time: `${fmt(new Date(n.getTime() - 1800000))}-${fmt(new Date(n.getTime() + 5400000)).split(' ')[1]}` },
                { term: "2026-2027-1", course_name: "操作系统 (未来学期)", course_id: "CS301", session: "期末考试", room: "未知", seat: "未知", time: `${fmt(new Date(n.getTime() + 86400000*120))}-${fmt(new Date(n.getTime() + 86400000*120 + 7200000)).split(' ')[1]}` },
                { term: curr, course_name: "大学物理 (明天考)", course_id: "PHY202", session: "期末考试", room: "II-405", seat: "12", time: `${fmt(new Date(n.getTime() + 86400000))}-${fmt(new Date(n.getTime() + 86400000 + 7200000)).split(' ')[1]}` },
                { term: curr, course_name: "马原 (刚刚考完)", course_id: "POL301", session: "期中考试", room: "II-101", seat: "08", time: `${fmt(new Date(n.getTime() - 14400000))}-${fmt(new Date(n.getTime() - 7200000)).split(' ')[1]}` }
            ];

            showToast("全状态测试数据已注入！");
        }
    }
}