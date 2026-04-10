import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="text-align: center;">
            <div class="card" style="padding: 10px; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <img src="./img/calendar_2025_2026.jpg"
                     alt="学校年历"
                     style="width: 100%; height: auto; display: block; border-radius: 6px; cursor: pointer;"
                     @click="showPreview = true">
            </div>

            <div style="font-size: 12px; color: #888; margin-top: 15px; line-height: 1.6;">
                📅 2025-2026学年校历<br>
                提示：点击图片查看详情
            </div>

            <div v-if="showPreview"
                 @click="showPreview = false"
                 style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.95); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; animation: fadeIn 0.2s ease;">

                <img src="./img/calendar_2025_2026.jpg"
                     style="width: 100%; max-height: 75vh; object-fit: contain;">

                <div style="margin-top: 40px; display: flex; gap: 30px; align-items: center;">

                    <div @click.stop="downloadImage" style="display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); display: flex; justify-content: center; align-items: center; backdrop-filter: blur(8px);">

                            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>

                        </div>
                        <span style="color: rgba(255,255,255,0.8); font-size: 11px; letter-spacing: 1px;">保存到手机</span>
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
            // 先把全屏遮罩关掉
            this.showPreview = false;
            showToast("正在处理下载请求...", "success");

            const absoluteUrl = new URL('./img/calendar_2025_2026.jpg', window.location.href).href;

            const link = document.createElement('a');
            link.href = absoluteUrl;
            link.download = 'NJUST_Calendar_25_26.jpg';
            link.target = '_blank'; // 加上这个，防止部分严格的电脑浏览器直接在当前页打开图片
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}