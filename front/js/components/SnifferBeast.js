import { store } from '../store.js';
import { API_BASE, showToast } from '../utils.js';

export default {
    template: `
        <div v-if="store.sniffer.enabled" class="card sniffer-console">

            <div class="sniffer-header">
                <span class="sniffer-title">
                    <i class="ri-radar-line" :class="{'ri-spin': store.sniffer.status === 'breathing'}"></i> 嗅探监控
                </span>
                <span class="sniffer-status" :class="'status-' + store.sniffer.status">[{{ statusText }}]</span>
            </div>

            <div class="mascot-container">
                <div class="mascot-face" :class="'mascot-' + mascotState">
                    {{ mascotFace }}
                </div>
                <div class="mascot-text">{{ mascotStatusText }}</div>
            </div>

            <div v-if="store.sniffer.intelligence.length > 0" class="intelligence-box">
                <div class="intelligence-title">
                    <i class="ri-alarm-warning-line"></i> 截获新情报 ({{ store.sniffer.intelligence.length }}条)
                </div>
                <ul class="intelligence-list">
                    <li v-for="(msg, index) in store.sniffer.intelligence" :key="index">{{ msg }}</li>
                </ul>
                <div style="text-align: right; margin-top: 10px;">
                    <button @click="clearIntelligence" class="btn" style="background: #ff2d55; color: #fff; font-size: 11px; padding: 4px 12px; min-height: unset; width: auto; margin: 0;">
                        确认
                    </button>
                </div>
            </div>

            <div class="sniffer-info">
                Session: {{ store.sniffer.sessionId ? store.sniffer.sessionId.substring(0,8) + '...' : '尚未绑定' }}
                <span class="right">心跳:{{ store.sniffer.interval }}m | 嗅探:{{ store.sniffer.dataInterval }}</span>
            </div>
            <div class="sniffer-info" style="margin-bottom: 10px;">
                最后活跃: <span class="light">{{ store.sniffer.lastBeat || '未启动' }}</span>
            </div>

            <div class="log-toggle">
                <span @click="showLogs = !showLogs">
                    {{ showLogs ? '收起运行日志' : '展开运行日志' }} <i :class="showLogs ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"></i>
                </span>
            </div>

            <div v-show="showLogs" style="animation: fade-in 0.2s ease-out;">
                <div class="log-box" @wheel.stop @touchmove.stop ref="logBox">
                    <div v-for="(log, i) in snifferLog" :key="i" class="log-item">
                        <span class="log-arrow">></span> {{ log }}
                    </div>
                    <div v-if="snifferLog.length === 0" class="log-empty">暂无日志输出</div>
                </div>

                <div class="sniffer-actions">
                    <button v-show="false" @click="simulateDeath"  class="btn" style="background: rgba(255, 45, 85, 0.2); color: #ff2d55;">模拟宕机</button>
                    <button @click="clearLogs" class="btn" style="background: var(--input-bg); color: var(--text-sub);">清空日志</button>
                    <button @click="triggerDataSniff(true)" class="btn" style="background: #5ac8fa; color: #000;">测嗅探</button>
                    <button @click="triggerHeartbeat(true)" class="btn" style="background: #34c759; color: #000;">测心跳</button>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store,
            heartbeatTimer: null,
            dataSniffTimer: null,
            snifferLog: [],
            showLogs: false
        };
    },
    computed: {
        // --- 状态实体映射逻辑 ---
        mascotState() {
            if (this.store.sniffer.intelligence.length > 0) return 'alert';
            if (this.store.sniffer.status === 'dead') return 'dead';
            if (this.store.sniffer.status === 'breathing') return 'alive';
            return 'sleeping';
        },
        mascotFace() {
            const faces = {
                'alert': '🚨(✧Д✧)🚨',
                'dead': '😵(x_x)😵',
                'alive': '🐾(•̀ᴗ•́)و🐾',
                'sleeping': '💤(-_-)zzz'
            };
            return faces[this.mascotState];
        },
        mascotStatusText() {
            const texts = { 'alert': '发现高价值情报！', 'dead': '连接断开，尝试重新登录', 'alive': '环境安全，侦察中...', 'sleeping': '休眠待机状态' };
            return texts[this.mascotState];
        },
        // -------------------------------

        statusText() {
            if(this.store.sniffer.status === 'breathing') return '在线';
            if(this.store.sniffer.status === 'dead') return '掉线';
            return '休眠';
        }
    },
    watch: {
        'store.sniffer.interval'(newVal, oldVal) {
            if (this.store.sniffer.enabled && this.store.sniffer.sessionId && newVal !== oldVal) {
                this.addLog(`[系统] 底层心跳间隔调整为 ${newVal} 分钟`);
                this.mountHeartbeat();
            }
        },
        'store.sniffer.dataInterval'(newVal, oldVal) {
            if (this.store.sniffer.enabled && this.store.sniffer.sessionId && newVal !== oldVal) {
                this.addLog(`[系统] 数据检查频率调整为 ${newVal}`);
                this.mountDataSniffer();
            }
        },
        'store.sniffer.enabled'(newVal) {
            if (newVal) {
                if (this.store.sniffer.sessionId) this.mountAllDaemons();
            } else {
                this.killAllDaemons();
            }
        },
        'store.sniffer.sessionId'(newVal, oldVal) {
            if (newVal && newVal !== oldVal && this.store.sniffer.enabled) {
                this.addLog("[系统] 捕获到全新 Session，挂载双核任务...");
                this.mountAllDaemons();
            }
        }
    },
    methods: {
        // 精确时间生成器 YYYY-MM-DD HH:mm:ss
        getPreciseTime() {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const h = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            return `${y}-${m}-${d} ${h}:${min}:${s}`;
        },

        addLog(msg) {
            const t = this.getPreciseTime();
            this.snifferLog.push(`[${t}] ${msg}`);
            if (this.snifferLog.length > 80) this.snifferLog.shift();

            this.$nextTick(() => {
                if (this.$refs.logBox) this.$refs.logBox.scrollTop = this.$refs.logBox.scrollHeight;
            });
        },

        clearLogs() {
            this.snifferLog = [];
        },

        // --- 模拟宕机测试按钮 ---
        simulateDeath() {
            this.addLog(">> [调试] 正在强制阻断连接，模拟宕机...");
            this.store.sniffer.status = 'dead';
            this.addLog("!! 核心连接已丢失，进程死亡。");
            // 杀掉所有定时器，彻底模拟死亡状态
            if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
            if (this.dataSniffTimer) { clearInterval(this.dataSniffTimer); this.dataSniffTimer = null; }
            showToast("已模拟宕机，请检查小兽状态", "error");
        },

        addIntelligence(msg) {
            this.store.sniffer.intelligence.push(msg);
            localStorage.setItem("my_njust_sniffer_intelligence", JSON.stringify(this.store.sniffer.intelligence));
        },

        clearIntelligence() {
            this.store.sniffer.intelligence = [];
            localStorage.setItem("my_njust_sniffer_intelligence", "[]");
            showToast("情报已阅", "success");
        },

       async triggerHeartbeat(isManual = false) {
            if(!store.sniffer.sessionId) return;
            this.addLog(isManual ? ">> [手动] 发起防踢心跳..." : ">> [自动] 发起防踢心跳...");

            try {
                const res = await fetch(`${API_BASE}/keep_alive`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: store.sniffer.sessionId })
                });

                // 【核心改动】：明确接收到 401 状态码，才说明教务处把我们踢了
                if (res.status === 401) {
                    this.addLog("!! Session 已在教务处端过期清理。");
                    this.killAllDaemons('dead'); // 彻底挂起并标记为红色离线
                    return;
                }

                if (!res.ok) throw new Error("网络异常");

                const data = await res.json();
                if (data.status === "alive") {
                    this.store.sniffer.status = 'breathing';
                    this.store.sniffer.lastBeat = new Date().toLocaleTimeString('en-GB');
                    this.addLog(`<< 心跳成功`);
                }
            } catch (e) {
                // 如果是断网（比如切后台断连），只做提示，不杀进程！定时器会继续跑，等网络恢复就活了！
                this.store.sniffer.status = 'sleeping'; // 临时变为灰色休眠状态
                this.addLog(`!! 网络连接异常 (稍后自动重试)`);
            }
        },

        async triggerDataSniff(isManual = false) {
            if(!store.sniffer.sessionId) return;
            this.addLog(isManual ? ">> [手动] 对比教务处数据..." : ">> [自动] 对比教务处数据...");

            try {
                const res = await fetch(`${API_BASE}/sniff_data`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        session_id: store.sniffer.sessionId,
                        term: store.currentTerm
                    })
                });

                if (!res.ok) throw new Error("Sniff API Failed");
                const result = await res.json();

                const remoteExams = result.data.exams || [];
                const remoteTerms = result.data.term_options || [];

                let isChanged = false;

                if (remoteTerms.length > this.store.termOptions.length) {
                    const newTerm = remoteTerms.find(t => !this.store.termOptions.includes(t));
                    this.store.termOptions = remoteTerms;
                    localStorage.setItem("my_njust_term_options", JSON.stringify(remoteTerms));

                    isChanged = true;
                    const msg = `✨ 教务处发布了新学期：${newTerm || '未知学期'}`;
                    this.addIntelligence(msg);
                    this.addLog(`<< 嗅探完毕: 发现新学期`);

                    showToast(msg, "success");
                    if (navigator.vibrate) navigator.vibrate([200, 100, 500]);
                }

                const currentTermLocalExams = this.store.examsList.filter(e => e.term === this.store.currentTerm);
                if (remoteExams.length > currentTermLocalExams.length) {

                    const formattedRemoteExams = remoteExams.map(e => ({ ...e, term: this.store.currentTerm }));
                    const otherTermExams = this.store.examsList.filter(e => e.term !== this.store.currentTerm);
                    this.store.examsList = [...otherTermExams, ...formattedRemoteExams];

                    const savedData = JSON.parse(localStorage.getItem("my_njust_data") || "{}");
                    savedData.exams = this.store.examsList;
                    localStorage.setItem("my_njust_data", JSON.stringify(savedData));

                    const newExamCount = remoteExams.length - currentTermLocalExams.length;
                    const representExamName = remoteExams[remoteExams.length - 1]?.course_name || "未知科目";

                    isChanged = true;
                    const msg = `🚨 发现 ${newExamCount} 门新考试安排 (如: ${representExamName})`;
                    this.addIntelligence(msg);
                    this.addLog(`<< 嗅探完毕: 发现新考试`);

                    showToast("发现新考试安排，已同步！", "success");
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
                }

                if (!isChanged) {
                    this.addLog("<< 嗅探完毕: 数据无变动");
                }

            } catch(e) {
                console.error("嗅探错误:", e);
                this.addLog(`!! 嗅探网络阻断: ${e.message || 'Error'}`);
            }
        },

        mountAllDaemons() {
            this.store.sniffer.status = 'breathing';
            this.mountHeartbeat();
            this.mountDataSniffer();
        },

        mountHeartbeat() {
            if(this.heartbeatTimer) clearInterval(this.heartbeatTimer);
            const intervalMs = this.store.sniffer.interval * 60 * 1000;
            setTimeout(() => this.triggerHeartbeat(), 2000);
            this.heartbeatTimer = setInterval(() => this.triggerHeartbeat(), intervalMs);
        },

        mountDataSniffer() {
            if(this.dataSniffTimer) clearInterval(this.dataSniffTimer);

            const timeMap = {
                '30s': 30 * 1000,
                '1d': 24 * 60 * 60 * 1000,
                '3d': 3 * 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '14d': 14 * 24 * 60 * 60 * 1000
            };
            const intervalMs = timeMap[this.store.sniffer.dataInterval] || timeMap['7d'];

            this.addLog(`[系统] 嗅探定时器启动 (${this.store.sniffer.dataInterval}一次)`);
            this.dataSniffTimer = setInterval(() => this.triggerDataSniff(), intervalMs);
        },

        killAllDaemons(targetStatus = 'sleeping') {
            this.addLog("[系统] 任务已挂起。");
            this.store.sniffer.status = targetStatus;
            if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
            if (this.dataSniffTimer) { clearInterval(this.dataSniffTimer); this.dataSniffTimer = null; }
        }
    },
    mounted() {
        if (store.sniffer.enabled && store.sniffer.sessionId) {
            this.addLog("[系统] 唤醒嗅探兽...");
            this.mountAllDaemons();
        }
    },

    unmounted() {
        // 用户切走页面时，清空旧定时器，防止重进页面时产生双倍心跳
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        if (this.dataSniffTimer) clearInterval(this.dataSniffTimer);
    }
}