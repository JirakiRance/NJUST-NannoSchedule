import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="text-align: center;">
            <div class="card" style="padding: 10px; background: var(--card-bg); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <img src="./img/calendar_2025_2026.jpg"
                     alt="学校年历"
                     style="width: 100%; height: auto; display: block; border-radius: 6px; cursor: pointer;"
                     @click="showPreview = true">
            </div>

            <div style="font-size: 12px; color: var(--text-sub); margin-top: 15px; line-height: 1.6;">
                <i class="ri-calendar-event-line" style="vertical-align: text-bottom;"></i> 2025-2026学年校历<br>
                提示：点击图片查看详情
            </div>

            <div v-if="showPreview"
                 @click="showPreview = false"
                 class="fullscreen-preview">

                <img src="./img/calendar_2025_2026.jpg" class="preview-img">

                <div class="preview-actions">
                    <div @click.stop="downloadImage" class="glass-btn-wrapper">
                        <div class="glass-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </div>
                        <span class="glass-btn-text">保存到手机</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            showPreview: false
        }
    },
    methods: {
        downloadImage() {
            this.showPreview = false;
            showToast("正在处理下载请求...", "success");
            const absoluteUrl = new URL('./img/calendar_2025_2026.jpg', window.location.href).href;
            const link = document.createElement('a');
            link.href = absoluteUrl;
            link.download = 'NJUST_Calendar_25_26.jpg';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}