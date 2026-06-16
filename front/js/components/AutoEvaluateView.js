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
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div class="empty-emoji"><i class="ri-star-smile-line" style="color: #ff2d55;"></i></div>
                        <div class="list-card-title">一键评教</div>
                        <div class="setting-desc" style="margin-top: 5px;">自动完成评教，需要保持教务处连接</div>
                    </div>
                </template>
            </login-card>

            <div v-else style="display: flex; flex-direction: column; height: 100%; align-items: center; justify-content: center; padding: 20px;">

                <div style="text-align: center; margin-bottom: 30px;">
                    <i class="ri-robot-2-line" style="font-size: 60px; color: var(--primary-color);"></i>
                    <h3 style="margin: 15px 0 5px;">智能一键评教</h3>
                    <p style="color: var(--text-sub); font-size: 13px; line-height: 1.5;">
                        策略：除“总分”项打次高分防拦截外，<br>其余选项全部自动打满分。
                    </p>
                </div>

                <button class="btn" style="width: 80%; border-radius: 25px; padding: 12px; font-size: 16px;"
                        @click="startAutoEvaluate" :disabled="isEvaluating">
                    <i v-if="isEvaluating" class="ri-loader-4-line ri-spin" style="margin-right: 5px;"></i>
                    {{ isEvaluating ? '疯狂提交中...' : '开始一键评教' }}
                </button>

                <div v-if="resultLog.length > 0" style="margin-top: 30px; width: 100%; background: #f8f9fa; border-radius: 10px; padding: 15px; max-height: 250px; overflow-y: auto;">
                    <div style="font-size: 13px; font-weight: bold; margin-bottom: 10px; color: var(--text-main);">执行战报：</div>
                    <div v-for="(log, idx) in resultLog" :key="idx"
                         style="font-size: 12px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #eee;"
                         :style="{ color: log.includes('✅') ? '#34c759' : '#ff3b30' }">
                        {{ log }}
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
            isEvaluating: false,
            resultLog: []
        }
    },
    mounted() {
        // 与空教室保持一致的严谨逻辑
        const savedSession = localStorage.getItem("my_njust_session_id");
        if (!savedSession) return;
        this.sessionId = savedSession;
        this.tryRestoreSession(savedSession);
    },
    methods: {
        async tryRestoreSession(sessionId) {
            this.isRestoringSession = true;
            try {
                const res = await fetch(`${API_BASE}/auto_relogin`, {
                    method: "POST", headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({session_id: sessionId})
                });
                if (res.ok) {
                    this.roomSessionValid = true;
                }
            } catch(e) {}
            this.isRestoringSession = false;
        },
        onLoginSuccess(id) {
            this.sessionId = id;
            this.roomSessionValid = true;
        },
        async startAutoEvaluate() {
            if (!confirm("即将自动完成所有未评教的课程\n\n是否确认开始？")) return;

            this.isEvaluating = true;
            this.resultLog = [];

            try {
                const res = await fetch(`${API_BASE}/auto_evaluate`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: this.sessionId })
                });

                if (res.status === 401 || res.status === 400) {
                    this.roomSessionValid = false;
                    showToast("连接断开，请重新登录", "error");
                    return;
                }

                const data = await res.json();
                if (data.code === 200) {
                    if (data.total === 0) {
                        this.resultLog.push("扫描完毕！没有需要评价的课程。");
                    } else {
                        this.resultLog = data.details;
                        showToast(`成功评教 ${data.total} 门课程！`, "success");
                    }
                } else {
                    showToast(data.detail || data.message || "执行过程发生异常", "error");
                    if(data.details) this.resultLog = data.details;
                }
            } catch (e) {
                showToast("网络请求异常", "error");
            } finally {
                this.isEvaluating = false;
            }
        }
    }
}