import { store } from '../store.js';
import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; height: 100%;">
            <div class="exam-view-header" style="display: flex; justify-content: space-between; align-items: center; padding: 0 15px;">
                <span @click="tryClearExpired" class="exam-action-clear" style="position: static; padding: 4px 8px; border-radius: 6px; background: rgba(255, 59, 48, 0.1);">
                    <i class="ri-delete-bin-line" style="vertical-align: text-bottom;"></i> 清理过期
                </span>

                <div class="exam-header-title" style="flex: 1; text-align: center;">
                    <select v-model="selectedTerm" style="padding: 4px 8px; border-radius: 6px; background: var(--input-bg); color: var(--text-main); border: 1px solid var(--grid-border); outline: none; font-size: 13px; font-weight: bold; text-align: center;">
                        <option v-for="t in availableTerms" :key="t" :value="t">{{ t }}</option>
                    </select>
                </div>

                <div class="exam-header-actions" style="position: static;">
                    <span v-show="true" @click="injectMultiTermData" style="color: #007aff; font-size: 11px; cursor: pointer; padding: 4px;">
                        [测试数据]
                    </span>
                </div>
            </div>

            <div v-if="!displayExams || displayExams.length === 0" class="empty-state">
                <div class="empty-emoji"><i class="ri-cup-line"></i></div>
                <p>暂无 <b>{{ selectedTerm }}</b> 学期的考试安排</p>
                <div style="font-size: 12px; color: var(--text-sub); margin-top: 5px;">同步教务处后数据将持久化保存在本地</div>
            </div>

            <div v-else class="exam-list-area" style="padding: 15px;">
                <div v-for="exam in displayExams" :key="exam.course_id + exam.term"
                     class="list-card"
                     :style="getCardStyle(exam.time)">

                    <div class="exam-card-header-flex">
                        <div class="exam-card-title-group">
                            <div class="exam-tag-group">
                                <span class="exam-tag-term">{{ exam.term }}</span>
                                <span v-if="exam.session" class="exam-tag-session" style="background: #fff7e6; color: #fa8c16;">{{ exam.session }}</span>
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
                        <div><span class="exam-detail-label"><i class="ri-time-line" style="vertical-align: middle; margin-right:4px;"></i> 时间：</span><span style="color: var(--text-main);">{{ exam.time }}</span></div>
                        <div><span class="exam-detail-label"><i class="ri-map-pin-line" style="vertical-align: middle; margin-right:4px;"></i> 考场：</span><b style="color: var(--text-main);">{{ exam.room || '待定' }}</b></div>
                        <div><span class="exam-detail-label"><i class="ri-user-location-line" style="vertical-align: middle; margin-right:4px;"></i> 座位：</span><b class="exam-seat-highlight">{{ exam.seat || '--' }}</b></div>

                        <button v-if="getExamStatus(exam.time).code === 0"
                                @click="removeExam(exam)"
                                class="exam-btn-remove" style="border: 1px solid var(--grid-border); color: var(--text-sub); background: transparent;">
                            移除
                        </button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" v-if="showClearModal" @click.self="showClearModal = false">
                <div class="modal-content" style="max-width: 300px; padding: 25px 20px; text-align: center;">
                    <div style="font-size: 40px; color: #ff3b30; margin-bottom: 10px;">
                        <i class="ri-alert-fill"></i>
                    </div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--text-main); margin-bottom: 15px;">
                        确定清理过期考试吗？
                    </div>
                    <div style="font-size: 13px; color: var(--text-main); margin-bottom: 8px;">
                        即将清除 <b style="color: var(--primary-color);">{{ selectedTerm }}</b> 学期下
                    </div>
                    <div style="font-size: 13px; color: var(--text-main); margin-bottom: 15px;">
                        共 <b style="color: #ff3b30; font-size: 16px;">{{ expiredCountToClear }}</b> 门已结束的考试
                    </div>
                    <div style="font-size: 12px; color: var(--text-sub); background: rgba(255, 59, 48, 0.05); padding: 10px; border-radius: 8px; margin-bottom: 20px; line-height: 1.5; border: 1px dashed rgba(255, 59, 48, 0.2);">
                        ⚠️ <b>危险警告：</b> 清除后跨学期同步<b>无法找回</b>这些记录！
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button class="btn" style="background: var(--input-bg); color: var(--text-main); margin: 0; flex: 1;" @click="showClearModal = false">取消</button>
                        <button class="btn btn-danger" style="margin: 0; flex: 1;" @click="executeClear">确认清除</button>
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
            selectedTerm: store.currentTerm, // 默认选中当前学期
            showClearModal: false,           // 控制弹窗显示
            expiredCountToClear: 0           // 记录将要删除的数量
        };
    },
    computed: {
        // 动态提取所有包含考试的学期
        availableTerms() {
            if (!store.examsList || store.examsList.length === 0) return [store.currentTerm];
            // 提取所有存在考试的学期并去重
            const termsSet = new Set(store.examsList.map(e => e.term).filter(Boolean));
            termsSet.add(store.currentTerm); // 确保当前学期始终存在于选项中
            // 降序排列 (例如: 2025-2026-2 在 2025-2026-1 前面)
            return Array.from(termsSet).sort((a, b) => b.localeCompare(a));
        },
        // 仅展示所选学期的考试
        displayExams() {
            if (!store.examsList) return [];
            return store.examsList
                .filter(e => e.term === this.selectedTerm)
                .sort((a, b) => {
                    const parsedA = this.parseTime(a.time);
                    const parsedB = this.parseTime(b.time);
                    const timeA = parsedA ? parsedA.start.getTime() : 0;
                    const timeB = parsedB ? parsedB.start.getTime() : 0;
                    return timeA - timeB; // 按时间升序
                });
        }
    },
    mounted() {
        this.refreshTimer = setInterval(() => { this.now = new Date(); }, 60000);
        // 如果外部切换了 store.currentTerm，自动同步
        if (this.selectedTerm !== store.currentTerm) {
            this.selectedTerm = store.currentTerm;
        }
    },
    unmounted() { clearInterval(this.refreshTimer); },
    methods: {
        parseTime(timeStr) {
            try {
                //const match = timeStr.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
                // 修改正则：用 \s*[-~]\s* 来兼容真实教务处的波浪号 ~ 和测试数据的短横线 -
                const match = timeStr.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*[-~]\s*(\d{2}:\d{2})/);
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
            return { borderLeft: '4px solid var(--primary-color)', background: 'var(--card-bg)' };
        },
        getTitleStyle(timeStr) {
            return this.getExamStatus(timeStr).code === 0 ? { textDecoration: 'line-through', color: 'var(--text-sub)' } : { fontWeight: 'bold', color: 'var(--text-main)' };
        },
        getStatusTagStyle(timeStr) {
            const code = this.getExamStatus(timeStr).code;
            const style = { fontSize: '11px', padding: '2px 8px', borderRadius: '10px' };
            if (code === 0) return { ...style, background: 'var(--grid-border)', color: 'var(--text-sub)' };
            if (code === 1) return { ...style, background: '#ff3b30', color: '#fff' };
            return { ...style, background: 'var(--primary-color)', color: '#fff', opacity: 0.9 }; // 用主色调高亮
        },
        removeExam(examObj) {
            // 单条移除依然保留系统 confirm，因为它足够轻量且操作明确
            if (confirm('是否移除该考试记录？(移除后需重新同步方可找回)')) {
                const realIndex = store.examsList.findIndex(e => e === examObj);
                if (realIndex !== -1) {
                    store.examsList.splice(realIndex, 1);
                    this.saveToLocal();
                }
            }
        },
        // 拦截清理按钮，弹出自定义警告窗
        tryClearExpired() {
            // 只寻找【当前选中学期】下，且【已结束】的考试
            const expiredExams = this.displayExams.filter(exam => this.getExamStatus(exam.time).code === 0);

            if (expiredExams.length === 0) {
                return showToast(`【${this.selectedTerm}】暂无已过期的考试`, "error");
            }

            this.expiredCountToClear = expiredExams.length;
            this.showClearModal = true;
        },
        //  在确认弹窗中点击继续后执行清理
        executeClear() {
            store.examsList = store.examsList.filter(exam => {
                // 如果不是当前选中的学期，保留！
                if (exam.term !== this.selectedTerm) return true;
                // 如果是当前选中的学期，则只保留尚未过期的考试 (code !== 0)
                return this.getExamStatus(exam.time).code !== 0;
            });

            this.saveToLocal();
            this.showClearModal = false;
            showToast(`成功清理 ${this.expiredCountToClear} 门过期考试`, "success");
        },
        saveToLocal() {
            const data = JSON.parse(localStorage.getItem("my_njust_data") || "{}");
            data.exams = store.examsList;
            localStorage.setItem("my_njust_data", JSON.stringify(data));
        },
        injectMultiTermData() {
            const n = new Date();
            // 默认用真实的学期号，如果没取到就兜底
            const curr = store.currentTerm || "2025-2026-2";

            // 例如: "2026-06-04 13:30~15:30"
            const fmtTilde = (start, end) => {
                const p = (v) => v.toString().padStart(2, '0');
                const dateStr = `${start.getFullYear()}-${p(start.getMonth()+1)}-${p(start.getDate())}`;
                const startTimeStr = `${p(start.getHours())}:${p(start.getMinutes())}`;
                const endTimeStr = `${p(end.getHours())}:${p(end.getMinutes())}`;
                return `${dateStr} ${startTimeStr}~${endTimeStr}`;
            };

            const MIN = 60000;
            const HR = 3600000;
            const DAY = 86400000;

            // 清理你可能有的通知日志，确保能重新触发提醒
            localStorage.removeItem('njust_exam_notified_log');

            store.examsList = [
                // 1. 【真实历史数据】(测试清理逻辑与灰色蒙版)
                // 来源于 HTML：振动理论，设定为绝对过去式 (3天前)
                { term: curr, course_name: "振动理论 (历史数据)", course_id: "11031801", session: "期末考试", room: "Ⅳ-A210", seat: "32", time: fmtTilde(new Date(n.getTime() - 3*DAY), new Date(n.getTime() - 3*DAY + 2*HR)) },

                // 2. 【正在考试】(测试状态=1 "考试中" 的红色高亮框)
                // 来源于 HTML：计算力学，动态设定为半小时前开始，1个半小时后结束
                { term: curr, course_name: "计算力学 (正在考试)", course_id: "11025403", session: "期末考试", room: "Ⅳ-A207", seat: "32", time: fmtTilde(new Date(n.getTime() - 30*MIN), new Date(n.getTime() + 90*MIN)) },

                // 3. 【极度危险：即将开始】(测试分钟级倒计时，及【通知触发】逻辑！)
                // 设定在 15 分钟后开始！(如果是30分钟内提醒，这个数据一注入就会立刻触发系统的推送)
                { term: curr, course_name: "模式识别与大数据 (即将开始)", course_id: "CS1001", session: "考查", room: "Ⅳ-A109", seat: "15", time: fmtTilde(new Date(n.getTime() + 15*MIN), new Date(n.getTime() + 135*MIN)) },

                // 4. 【几小时后的考试】(测试小时级倒计时UI)
                { term: curr, course_name: "数字逻辑电路 (几小时后)", course_id: "EE2001", session: "期中考试", room: "Ⅰ-102", seat: "08", time: fmtTilde(new Date(n.getTime() + 3.5*HR), new Date(n.getTime() + 5.5*HR)) },

                // 5. 【明天的考试】(测试天数级倒计时UI)
                { term: curr, course_name: "空气动力学 (明天)", course_id: "AE3001", session: "期末考试", room: "Ⅳ-A111", seat: "22", time: fmtTilde(new Date(n.getTime() + 24*HR), new Date(n.getTime() + 26*HR)) },

                // 6. 【跨学期已过期】(测试历史学期隔离与跨学期清理防误删功能)
                { term: "2024-2025-1", course_name: "高等数学 (跨学期过期)", course_id: "MATH001", session: "期末考试", room: "Ⅲ-201", seat: "01", time: fmtTilde(new Date(n.getTime() - 300*DAY), new Date(n.getTime() - 300*DAY + 2*HR)) },

                // 7. 【差 2 天】 - 测试中短期倒计时与提醒
                { term: curr, course_name: "通信原理 (差 2 天)", course_id: "EE3002", session: "期末考试", room: "Ⅰ-102", seat: "22", time: fmtTilde(new Date(n.getTime() + 2*DAY), new Date(n.getTime() + 2*DAY + 2*HR)) },

                // 8. 【差 3 天】 - 测试 3 天警戒线提醒
                { term: curr, course_name: "线性代数 (差 3 天)", course_id: "MATH102", session: "期末考试", room: "Ⅳ-B414", seat: "10", time: fmtTilde(new Date(n.getTime() + 3*DAY), new Date(n.getTime() + 3*DAY + 2*HR)) },

                // 9. 【差 5 天】 - 测试中长期倒计时
                { term: curr, course_name: "软件工程 (差 5 天)", course_id: "CS2004", session: "期末考试", room: "Ⅱ-204", seat: "45", time: fmtTilde(new Date(n.getTime() + 5*DAY), new Date(n.getTime() + 5*DAY + 2*HR)) },

                // 10. 【差 8 天】 - 测试一周以上的长线提醒 (例如提前一周推送)
                { term: curr, course_name: "计算机网络 (差 8 天)", course_id: "CS3001", session: "期末考试", room: "Ⅲ-101", seat: "05", time: fmtTilde(new Date(n.getTime() + 8*DAY), new Date(n.getTime() + 8*DAY + 2*HR)) }

            ];

            this.saveToLocal();
            showToast("基于真实格式的6条测试数据已注入！", "success");

            // 注入后若在其他学期，自动切回来看看效果
            if (!this.availableTerms.includes(this.selectedTerm)) {
                this.selectedTerm = curr;
            }
        }
    }
}