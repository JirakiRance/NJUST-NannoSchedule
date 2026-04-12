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
                    <span v-show="false" @click="injectMultiTermData" style="color: #007aff; font-size: 11px; cursor: pointer; padding: 4px;">
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
            const n = new Date(); // 动态获取当前时间 (如 2026-04-12 20:44)
            const fmt = (d) => {
                const p = (v) => v.toString().padStart(2, '0');
                return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
            };
            const curr = store.currentTerm;

            // 时间偏移量常量 (毫秒)
            const MIN = 60000;
            const HR = 3600000;
            const DAY = 86400000;

            localStorage.removeItem('njust_exam_notified_log');

            store.examsList = [
                // 1. 正在进行的考试 (半小时前开始，1小时后结束 - 测试红色高亮框)
                { term: curr, course_name: "理论力学 (正在考试)", course_id: "MECH001", session: "期末考试", room: "I-201", seat: "05", time: `${fmt(new Date(n.getTime() - 30*MIN))}-${fmt(new Date(n.getTime() + 60*MIN)).split(' ')[1]}` },

                // 2. 极度危险：即将开始 (45分钟后 - 完美测试 1h 通知提醒)
                { term: curr, course_name: "材料力学 (即将开始)", course_id: "MECH002", session: "期中考试", room: "II-102", seat: "12", time: `${fmt(new Date(n.getTime() + 45*MIN))}-${fmt(new Date(n.getTime() + 165*MIN)).split(' ')[1]}` },

                // 3. 几小时后的考试 (2.5小时后 - 测试 3h 通知提醒)
                { term: curr, course_name: "工程制图 (几小时后)", course_id: "DRAW001", session: "随堂测验", room: "IV-304", seat: "22", time: `${fmt(new Date(n.getTime() + 2.5*HR))}-${fmt(new Date(n.getTime() + 4.5*HR)).split(' ')[1]}` },

                // 4. 明天的考试 (20小时后 - 测试 12h/1天 倒计时UI)
                { term: curr, course_name: "常微分方程 (明天)", course_id: "MATH103", session: "期末考试", room: "YF-402", seat: "110", time: `${fmt(new Date(n.getTime() + 20*HR))}-${fmt(new Date(n.getTime() + 22*HR)).split(' ')[1]}` },

                // 5. 3天后的考试 (测试 3d 通知提醒)
                { term: curr, course_name: "线性代数 (3天后)", course_id: "MATH102", session: "期末考试", room: "YF-405", seat: "15", time: `${fmt(new Date(n.getTime() + 3*DAY))}-${fmt(new Date(n.getTime() + 3*DAY + 2*HR)).split(' ')[1]}` },

                // 6. 7天后的考试 (测试 7d 通知提醒)
                { term: curr, course_name: "大学物理 (7天后)", course_id: "PHYS001", session: "期末考试", room: "III-201", seat: "30", time: `${fmt(new Date(n.getTime() + 7*DAY))}-${fmt(new Date(n.getTime() + 7*DAY + 2*HR)).split(' ')[1]}` },

                // 7. 本学期已过期的考试 (测试灰色滤镜，且会被“清理过期”按钮精准识别)
                { term: curr, course_name: "思想道德修养 (本学期已结束)", course_id: "POL001", session: "考查", room: "I-405", seat: "01", time: `${fmt(new Date(n.getTime() - 2*DAY - 2*HR))}-${fmt(new Date(n.getTime() - 2*DAY)).split(' ')[1]}` },

                // 8. 跨学期已过期的考试 (放在 300 天前，测试历史学期隔离逻辑)
                { term: "2024-2025-2", course_name: "大学计算机基础 (跨学期过期)", course_id: "CS001", session: "期末考试", room: "III-201", seat: "01", time: `${fmt(new Date(n.getTime() - 300*DAY - 2*HR))}-${fmt(new Date(n.getTime() - 300*DAY)).split(' ')[1]}` }
            ];

            this.saveToLocal(); // 把测试数据落盘，方便你刷新测试提醒守护进程
            showToast("8条全场景测试数据已注入！", "success");

            // 注入后若在其他学期，自动切回来看看效果
            if (!this.availableTerms.includes(this.selectedTerm)) {
                this.selectedTerm = curr;
            }
        }
    }
}