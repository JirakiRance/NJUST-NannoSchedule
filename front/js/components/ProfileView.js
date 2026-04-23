// front/js/components/ProfileView.js
import { store } from '../store.js';
import LoginCard from './LoginCard.js';
import SnifferBeast from './SnifferBeast.js';
import GlobalNotice from './GlobalNotice.js';

export default {
    components: { LoginCard, SnifferBeast, GlobalNotice },
    template: `
        <div class="profile-container" style="padding-bottom: 80px;">

            <global-notice></global-notice>

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
        openSettings() {
            store.currentSubPage = 'settings';
            window.history.pushState({ target: 'subPage' }, '', '#subPage');
        }
    }
}