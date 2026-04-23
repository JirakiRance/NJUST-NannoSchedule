// front/js/components/GlobalNotice.js
import { store } from '../store.js';

export default {
    template: `
        <div v-if="store.globalNotice && store.globalNotice.show" class="modal-overlay" style="z-index: 20000; animation: fadeIn 0.3s ease;">
            <div class="modal-content" style="padding: 0; overflow: hidden; max-width: 320px;">

                <!-- 顶部横幅 -->
                <div style="background: linear-gradient(135deg, #ff9500, #ff2d55); padding: 25px 20px; text-align: center; color: white;">
                    <i class="ri-notification-4-fill" style="font-size: 45px; text-shadow: 0 2px 8px rgba(0,0,0,0.2);"></i>
                    <div style="font-size: 18px; font-weight: bold; margin-top: 10px; letter-spacing: 1px;">最新公告</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">{{ store.globalNotice.date }}</div>
                </div>

                <!-- 通知正文 -->
                <div style="padding: 25px 20px; font-size: 14px; color: var(--text-main); line-height: 1.6; max-height: 40vh; overflow-y: auto; white-space: pre-wrap;">
                    {{ store.globalNotice.notice_content }}
                </div>

                <!-- 底部操作区 -->
                <div style="padding: 0 20px 20px; display: flex; flex-direction: column; gap: 15px;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-sub); cursor: pointer; user-select: none;">
                        <input type="checkbox" v-model="dontShowAgain" style="width: 15px; height: 15px; accent-color: var(--primary-color);">
                        不再显示此通知
                    </label>

                    <div style="display: flex; gap: 10px;">
                        <button class="btn" style="flex: 1; background: var(--input-bg); color: var(--text-main); margin: 0; padding: 10px; font-size: 14px;" @click="dismissNotice">
                            我知道了
                        </button>
                        <button v-if="store.globalNotice.show_update_btn" class="btn btn-update" style="flex: 1; background-color: #ff9500; margin: 0; padding: 10px; font-size: 14px; color: white;" @click="checkApkUpdate">
                            前往更新
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `,
    data() {
        return {
            store,
            dontShowAgain: false
        };
    },
    methods: {
        checkApkUpdate() {
            if (confirm("即将前往下载页面，是否继续？")) {
                window.location.href = "https://ns-release.jiraki.top/";
            }
        },
        dismissNotice() {
            // 如果用户打勾了，就把通知的 ID 存进 localStorage 黑名单
            if (this.dontShowAgain && this.store.globalNotice.id) {
                const dismissedIdsStr = localStorage.getItem('dismissed_notice_ids') || "[]";
                const dismissedIds = JSON.parse(dismissedIdsStr);

                if (!dismissedIds.includes(this.store.globalNotice.id)) {
                    dismissedIds.push(this.store.globalNotice.id);
                    localStorage.setItem('dismissed_notice_ids', JSON.stringify(dismissedIds));
                }
            }
            // 隐藏弹窗
            this.store.globalNotice.show = false;
        }
    }
}