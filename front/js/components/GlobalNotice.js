// front/js/components/GlobalNotice.js
import { store } from '../store.js';

export default {
    template: `
        <div v-if="store.globalNotice && store.globalNotice.show" class="card notice-card">
            <div class="notice-header">
                <span class="notice-title">
                    <i class="ri-notification-3-line" style="vertical-align: text-bottom; margin-right: 4px;"></i>最新公告 ({{ store.globalNotice.version }})
                </span>
                <span class="notice-date">{{ store.globalNotice.date }}</span>
            </div>
            <div class="notice-content">
                {{ store.globalNotice.content }}
            </div>

            <div class="notice-actions" style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn" style="background: var(--input-bg); color: var(--text-main); width: auto; margin: 0; padding: 6px 15px; font-size: 13px;" @click="dismissNotice">
                    我知道了
                </button>
                <button v-if="store.globalNotice.show_update_btn" class="btn btn-update" @click="checkApkUpdate">
                    前往更新
                </button>
            </div>
        </div>
    `,
    data() {
        return {
            store
        };
    },
    methods: {
        checkApkUpdate() {
            if (confirm("即将前往下载页面查看并获取最新版 App，是否继续？")) {
                window.location.href = "https://ns-release.jiraki.top/";
            }
        },
        dismissNotice() {
            // 1. 隐藏 UI
            this.store.globalNotice.show = false;
            // 2. 将当前公告的版本号存入本地，以后刷新不再显示
            localStorage.setItem('dismissed_notice_version', this.store.globalNotice.version);
        }
    }
}