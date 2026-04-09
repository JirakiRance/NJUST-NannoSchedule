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
                     style="width: 100%; max-height: 85vh; object-fit: contain;"
                     @click.stop="showPreview = false"> <div style="color: #aaa; font-size: 12px; margin-top: 25px; letter-spacing: 1px;">
                    长按图片即可保存 · 点击任意处返回
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            showPreview: false // 控制大图显示的开关
        }
    }
}