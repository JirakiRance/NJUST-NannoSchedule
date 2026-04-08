export default {
    template: `
        <div class="subpage-container" style="text-align: center;">
            <div class="card" style="padding: 10px; background: #fff; border-radius: 12px; overflow: hidden;">
                <img src="./img/calendar_2025_2026.jpg"
                     alt="学校年历"
                     style="width: 100%; height: auto; display: block; border-radius: 6px;"
                     @click="previewImage">
            </div>
            <div style="font-size: 12px; color: #888; margin-top: 15px; line-height: 1.6;">
                📅 2025-2026学年校历<br>
                提示：长按图片可以保存到手机相册
            </div>
        </div>
    `,
    methods: {
        previewImage() {
            // 如果以后想做点击全屏预览，可以在这里扩展逻辑
            // 目前保持简单直接显示
        }
    }
}