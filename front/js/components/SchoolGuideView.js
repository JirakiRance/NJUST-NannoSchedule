import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="text-align: center; padding-bottom: 30px;">

            <div style="text-align: left; font-size: 14px; font-weight: bold; color: var(--text-sub); margin-bottom: 15px; padding-left: 5px;">
                校园导览与日程
            </div>

            <div v-for="item in images" :key="item.id"
                 class="card"
                 style="padding: 12px; background: var(--card-bg); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 18px; cursor: pointer;"
                 @click="openPreview(item)">

                <div style="font-size: 15px; font-weight: bold; color: var(--text-main); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; text-align: left;">
                    <i :class="item.icon" style="color: var(--primary-color); font-size: 18px;"></i> {{ item.title }}
                </div>

                <div style="position: relative; width: 100%; height: 160px; border-radius: 8px; overflow: hidden; border: 1px solid var(--grid-border);">
                    <img :src="item.src" :alt="item.title" style="width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0.9;">
                    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.15); display: flex; justify-content: center; align-items: center; transition: background 0.2s;">
                        <div style="background: rgba(255,255,255,0.8); color: var(--primary-color); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; backdrop-filter: blur(4px);">
                            <i class="ri-zoom-in-line" style="vertical-align: text-bottom; margin-right: 2px;"></i> 点击查看大图
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showPreview" class="fullscreen-preview" style="touch-action: none; background-color: rgba(0, 0, 0, 0.98);">

                <div style="position: absolute; top: env(safe-area-inset-top, 20px); left: 20px; z-index: 10001; padding: 10px;" @click="closePreview">
                    <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(8px);">
                        <i class="ri-close-line" style="color: white; font-size: 20px;"></i>
                    </div>
                </div>

                <div style="position: absolute; top: env(safe-area-inset-top, 20px); left: 0; width: 100%; z-index: 10000; pointer-events: none; padding-top: 15px;">
                    <div style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                        {{ currentImg.title }}
                    </div>
                </div>

                <div style="width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; overflow: hidden;"
                     @touchstart="handleTouchStart"
                     @touchmove="handleTouchMove"
                     @touchend="handleTouchEnd"
                     @touchcancel="handleTouchEnd"
                     @wheel.prevent="handleWheel">

                    <img :src="currentImg.src"
                         style="max-width: 100%; max-height: 85vh; object-fit: contain; transform-origin: center; will-change: transform;"
                         :style="{ transform: 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')' }">
                </div>

                <div style="position: absolute; bottom: calc(30px + env(safe-area-inset-bottom)); z-index: 10001; width: 100%; display: flex; justify-content: center;">
                    <div @click.stop="downloadImage" class="glass-btn-wrapper">
                        <div class="glass-btn">
                            <i class="ri-download-2-line" style="color: white; font-size: 20px;"></i>
                        </div>
                        <span class="glass-btn-text">保存</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            images: [
                { id: 'nanjing', title: '南京校区地图', icon: 'ri-map-2-line', src: './img/NJUST_map_nanjing.jpg', filename: 'NJUST_map_nanjing.jpg' },
                { id: 'jiangyin', title: '江阴校区地图', icon: 'ri-map-pin-line', src: './img/NJUST_map_jiangyin.jpg', filename: 'NJUST_map_jiangyin.jpg' },
                { id: 'calendar', title: '2025-2026 学年校历', icon: 'ri-calendar-event-line', src: './img/calendar_2025_2026.jpg', filename: 'NJUST_Calendar_25_26.jpg' }
            ],
            showPreview: false,
            currentImg: null,

            // 物理引擎：手势缩放与平移状态
            scale: 1, lastScale: 1,
            translateX: 0, translateY: 0,
            lastTranslateX: 0, lastTranslateY: 0,
            isDragging: false, isPinching: false,
            startDistance: 0, startTouches: []
        }
    },
    methods: {
        openPreview(item) {
            this.currentImg = item;
            // 每次打开图片时，重置物理状态归零
            this.scale = 1; this.lastScale = 1;
            this.translateX = 0; this.translateY = 0;
            this.lastTranslateX = 0; this.lastTranslateY = 0;
            this.showPreview = true;
        },
        closePreview() {
            this.showPreview = false;
            this.currentImg = null;
        },
        downloadImage() {
            if (!this.currentImg) return;
            showToast("正在处理下载请求...", "success");
            const absoluteUrl = new URL(this.currentImg.src, window.location.href).href;
            const link = document.createElement('a');
            link.href = absoluteUrl;
            link.download = this.currentImg.filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        // ================= 手势引擎 =================
        handleTouchStart(e) {
            if (e.touches.length === 2) {
                // 双指：触发缩放
                this.isPinching = true;
                this.isDragging = false;
                this.startDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            } else if (e.touches.length === 1) {
                // 单指：触发平移
                this.isDragging = true;
                this.isPinching = false;
                this.startTouches = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
            }
        },
        handleTouchMove(e) {
            if (!this.isDragging && !this.isPinching) return;
            e.preventDefault(); // 阻断浏览器默认的下拉刷新和滚动

            if (this.isPinching && e.touches.length === 2) {
                // 计算双指距离差，应用缩放比例 (限制最大 5 倍，最小 0.5 倍)
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const scaleDelta = dist / this.startDistance;
                this.scale = Math.max(0.5, Math.min(this.lastScale * scaleDelta, 5));
            } else if (this.isDragging && e.touches.length === 1) {
                // 计算单指滑动偏移量
                const deltaX = e.touches[0].clientX - this.startTouches[0].x;
                const deltaY = e.touches[0].clientY - this.startTouches[0].y;
                this.translateX = this.lastTranslateX + deltaX;
                this.translateY = this.lastTranslateY + deltaY;
            }
        },
        handleTouchEnd(e) {
            // 动作结束，保存最后一刻的状态，作为下次滑动的基准
            this.isDragging = false;
            this.isPinching = false;
            this.lastScale = this.scale;
            this.lastTranslateX = this.translateX;
            this.lastTranslateY = this.translateY;
        },
        handleWheel(e) {
            // 兼容电脑端滚轮缩放
            const zoomFactor = 0.1;
            if (e.deltaY < 0) {
                this.scale = Math.min(this.lastScale * (1 + zoomFactor), 5); // 向上滚放大
            } else {
                this.scale = Math.max(this.lastScale * (1 - zoomFactor), 0.5); // 向下滚缩小
            }
            this.lastScale = this.scale;
        }
    }
}