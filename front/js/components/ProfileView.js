import { store } from '../store.js';
import LoginCard from './LoginCard.js';
import SnifferBeast from './SnifferBeast.js';
import { showToast } from '../utils.js';

export default {
    components: { LoginCard, SnifferBeast },
    template: `
        <div class="profile-container" style="padding-bottom: 80px;">
            <div v-if="store.globalNotice && store.globalNotice.show" class="card notice-card">
                <div class="notice-header">
                    <span class="notice-title"><i class="ri-notification-3-line" style="vertical-align: text-bottom; margin-right: 4px;"></i>最新公告 ({{ store.globalNotice.version }})</span>
                    <span class="notice-date">{{ store.globalNotice.date }}</span>
                </div>
                <div class="notice-content">
                    {{ store.globalNotice.content }}
                </div>
                <div class="notice-actions">
                    <button class="btn btn-update" @click="checkApkUpdate">前往更新</button>
                </div>
            </div>

            <login-card></login-card>

            <div class="card" @click="openSettings" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 18px 15px; margin-top: 20px;">
                <div style="display: flex; align-items: center;">
                    <i class="ri-settings-4-line" style="margin-right: 8px; color: var(--text-sub); font-size: 20px;"></i>
                    <span style="font-size: 15px; font-weight: bold; color: var(--text-main);">设置</span>
                </div>
                <i class="ri-arrow-right-s-line" style="color: var(--text-sub); font-size: 20px;"></i>
            </div>

            <sniffer-beast></sniffer-beast>

        </div>
    `,
    data() {
        return {
            store
        };
    },
    methods: {
        async checkApkUpdate() {
            if (confirm("即将前往下载页面查看并获取最新版 App，是否继续？")) window.location.href = "https://ns-release.jiraki.top/";
        },

        openSettings() {
            store.currentSubPage = 'settings';
            window.history.pushState({ target: 'subPage' }, '', '#subPage');
        }
    }
}