import { store } from '../store.js';
import LoginCard from './LoginCard.js';
import SnifferBeast from './SnifferBeast.js'; // 引入新组件
import { showToast } from '../utils.js';

export default {
    components: { LoginCard, SnifferBeast },
    template: `
        <div class="profile-container" style="padding-bottom: 80px;">
            <div v-if="noticeInfo && noticeInfo.show" class="card notice-card">
                <div class="notice-header">
                    <span class="notice-title"><i class="ri-notification-3-line" style="vertical-align: text-bottom; margin-right: 4px;"></i>最新公告 ({{ noticeInfo.version }})</span>
                    <span class="notice-date">{{ noticeInfo.date }}</span>
                </div>
                <div class="notice-content">
                    {{ noticeInfo.content }}
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
            store,
            noticeInfo: null
        };
    },
    methods: {
        async fetchNotice() {
            try {
                const timestamp = new Date().getTime();
                const res = await fetch(`https://ns-release.jiraki.top/notice.json?t=${timestamp}`);
                if (res.ok) {
                    this.noticeInfo = await res.json();
                    if (this.noticeInfo.term_update) {
                        const remoteConfig = this.noticeInfo.term_update;
                        const localConfigVersion = localStorage.getItem("my_njust_term_config_version");

                        if (localConfigVersion !== remoteConfig.version_id) {
                            store.currentTerm = remoteConfig.term;
                            store.termStartDate = remoteConfig.start_date;
                            localStorage.setItem("my_njust_term", remoteConfig.term);
                            localStorage.setItem("my_njust_start_date", remoteConfig.start_date);
                            localStorage.setItem("my_njust_term_config_version", remoteConfig.version_id);

                            if (!store.termOptions.includes(remoteConfig.term)) {
                                store.termOptions.unshift(remoteConfig.term);
                                localStorage.setItem("my_njust_term_options", JSON.stringify(store.termOptions));
                            }

                            let start = new Date(remoteConfig.start_date);
                            start.setHours(0, 0, 0, 0);
                            let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
                            store.realWeek = Math.max(1, Math.min(weekCount, 25));
                            store.currentWeek = store.realWeek;

                            setTimeout(() => {
                                showToast(`已自动为您校准至 ${remoteConfig.term} 学期`, "success");
                            }, 800);
                        }
                    }
                }
            } catch (e) {
                console.log("获取公告失败，静默处理");
            }
        },

        async checkApkUpdate() {
            if (confirm("即将前往下载页面查看并获取最新版 App，是否继续？")) window.location.href = "https://ns-release.jiraki.top/";
        },

        openSettings() {
            store.currentSubPage = 'settings';
            window.history.pushState({ target: 'subPage' }, '', '#subPage');
        }
    },
    mounted() {
        this.fetchNotice();
    }
}