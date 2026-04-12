import { store } from '../store.js';
import { showToast } from '../utils.js';

export default {
    template: `
        <div style="height: 100%; position: relative;" @touchstart="handleTouchStart" @touchend="handleTouchEnd" :class="{'has-bg': bgImage}">

            <div v-if="bgImage" :style="{ backgroundImage: 'url(' + bgImage + ')', opacity: store.bgOpacity }" class="schedule-bg-layer"></div>

            <input type="file" id="bgUploader" accept="image/*" style="display: none" @change="handleBgUpload">

            <div v-if="combinedCourseList.length > 0 || store.customCoursesList.length > 0">
                <div class="top-nav-bar">
                    <button class="icon-btn btn-set-bg" style="width: 50px; display: flex; align-items: center; justify-content: flex-start; gap: 3px; padding: 0; margin: 0; color: var(--primary-color); background: transparent; border: none;" @click="triggerBgUpload">
                        <i class="ri-image-add-line" style="font-size: 18px;"></i> 背景
                    </button>

                    <div class="switch-capsule" style="margin: 0;">
                        <div class="switch-item" :class="{active: viewMode === 'week'}" @click="viewMode = 'week'">单周模式</div>
                        <div class="switch-item" :class="{active: viewMode === 'semester'}" @click="viewMode = 'semester'">全学期模式</div>
                    </div>
                    <button class="icon-btn btn-add-custom" style="width: 50px; font-size: 14px; display: flex; align-items: center; justify-content: flex-end; gap: 3px; padding: 0; margin: 0; color: var(--primary-color); background: transparent; border: none;" @click="openCustomManager">
                        <i class="ri-add-box-line" style="font-size: 18px;"></i> 添加
                    </button>
                </div>

                <div class="week-nav" v-show="viewMode === 'week'" style="display: flex; height: 36px; padding: 0;">
                    <button class="icon-btn" style="height: 100%; display: flex; align-items: center; padding: 0 20px;" @click="changeWeek(-1)"><i class="ri-arrow-left-s-line"></i></button>
                    <div class="week-title" style="height: 100%; display: flex; align-items: center; justify-content: center; min-width: 80px; transition: color 0.2s;"
                         :style="{ color: store.currentWeek === store.realWeek ? 'var(--primary-color)' : '#333' }"
                         @click="showWeekSelector = true">
                        第 {{ store.currentWeek }} 周
                    </div>
                    <button class="icon-btn" style="height: 100%; display: flex; align-items: center; padding: 0 20px;" @click="changeWeek(1)"><i class="ri-arrow-right-s-line"></i></button>
                </div>

                <div class="week-nav" v-show="viewMode === 'semester'" style="display: flex; justify-content: center; height: 36px; padding: 0;">
                    <div class="setting-desc" style="margin: 0; font-size: 12px; color: #888; display: flex; align-items: center; height: 100%;">
                        <i class="ri-information-line" style="margin-right: 4px; font-size: 14px;"></i> 点击重叠卡片，可查看该时段所有课程
                    </div>
                </div>

                <div class="schedule-container">
                    <div class="time-sidebar">
                        <div class="time-slot" style="height: 38px;"></div>
                        <div class="time-slot" v-for="i in 15" :key="i">
                            <span v-if="i <= 13">{{ i }}</span>
                            <span v-else-if="i === 14" style="font-size: 11px; color: #888;">网</span>
                            <span v-else-if="i === 15" style="font-size: 11px; color: #888;">课</span>
                        </div>
                    </div>
                    <div class="grid-area">
                        <div class="week-header">
                            <div class="day-header" v-for="(day, index) in ['一', '二', '三', '四', '五', '六', '日']" :key="index"
                                 :class="{'is-today': currentDayOfWeek === index + 1 && store.currentWeek === store.realWeek}">
                                <div>周{{ day }}</div>
                                <div class="date-text" v-if="viewMode === 'week'">{{ currentWeekDates[index] }}</div>
                                <div class="date-text" v-else>全学期</div>
                            </div>
                        </div>
                        <div class="course-grid">
                            <div class="current-day-column"
                                 v-if="store.currentWeek === store.realWeek"
                                 :style="{ left: 'calc(' + ((100 / 7) * (currentDayOfWeek - 1)) + '%)', width: 'calc(100% / 7)', backgroundColor: getHighlightColor() }">
                            </div>

                            <div class="time-line"
                                 v-if="viewMode === 'week' && store.currentWeek === store.realWeek && showTimeLine"
                                 :style="{ top: currentTimeY + 'px', left: 'calc(' + ((100 / 7) * (currentDayOfWeek - 1)) + '%)', width: 'calc(100% / 7)', transition: isTimeLineAnimating ? 'top 1s linear' : 'none' }">
                                 <div class="time-dot"></div>
                            </div>

                            <div class="course-card"
                                 v-for="(group, index) in gridCourseGroups" :key="index"
                                 @click="openDetails(group)"
                                 :style="getGroupCardStyle(group, index)"
                                 :class="{'is-overlap': group.length > 1}">
                                <div class="course-info-top">
                                    <div class="course-time" v-if="getStartTime(group[0])">{{ getStartTime(group[0]) }}</div>
                                    <div class="course-room" v-if="group.length === 1 && group[0].room">{{ group[0].room }}</div>
                                </div>
                                <div v-if="group[0].isCustom" style="position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.15); color: #fff; font-size: 8px; padding: 2px 4px; border-bottom-left-radius: 6px; z-index: 2; font-weight: normal;">自建</div>

                                <div class="course-name" :style="{
                                    fontSize: store.scheduleViewType === 'scroll' ? '12px' : '9px',
                                    WebkitLineClamp: store.scheduleViewType === 'scroll' ? 6 : (group[0].duration <= 2 ? 2 : 4),
                                    marginTop: group[0].isCustom ? '10px' : 'auto'
                                }">
                                    {{ group[0].name }}
                                </div>
                                <div v-if="group.length > 1" class="overlap-badge">{{ group.length }}门交替</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="empty-state" v-else>
                <div class="empty-emoji"><i class="ri-calendar-2-line"></i></div>
                <p>课表空空如也，请前往同步</p>
                <button class="btn btn-submit" style="width: auto; margin-top: 15px;" @click="openCustomManager">手动添加课程</button>
            </div>

            <div class="modal-overlay" v-if="showModal" @click.self="closeDetails">
                <div class="modal-content">
                    <div class="modal-title">{{ selectedCourseGroup.length > 1 ? '时段重叠课程 (' + selectedCourseGroup.length + '门)' : '课程详情' }}</div>
                    <div v-for="(course, idx) in selectedCourseGroup" :key="idx">
                        <div v-if="selectedCourseGroup.length > 1" style="font-weight: bold; font-size: 14px; color: #007aff; margin-bottom: 8px;">
                            <i class="ri-book-read-line" style="margin-right: 4px; vertical-align: text-bottom;"></i>
                            <span v-if="course.isCustom" style="color: #ff9500; font-size: 12px;">[自]</span> {{ course.name }}
                        </div>
                        <div v-else style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 12px; text-align: center;">
                            <span v-if="course.isCustom" style="color: #ff9500; font-size: 12px;">[自]</span> {{ course.name }}
                        </div>

                        <div class="modal-detail-item"><div><i class="ri-user-smile-line" style="margin-right: 4px; color:#999;"></i><strong>教师：</strong>{{ course.teacher || '未知' }}</div></div>
                        <div class="modal-detail-item"><div><i class="ri-map-pin-2-line" style="margin-right: 4px; color:#999;"></i><strong>教室：</strong>{{ course.room || '待定' }}</div></div>
                        <div class="modal-detail-item"><div><i class="ri-calendar-todo-line" style="margin-right: 4px; color:#999;"></i><strong>周次：</strong>{{ course.weeks }}</div></div>

                        <div class="modal-detail-item" v-if="course.isPending">
                            <div><i class="ri-information-line" style="margin-right: 4px; color:#999;"></i><strong>类型：</strong>网络课程 / 时间待定</div>
                        </div>
                        <div class="modal-detail-item" v-else-if="course.day && course.start <= 13">
                            <div>
                                <i class="ri-time-line" style="margin-right: 4px; color:#999;"></i><strong>节次：</strong>星期{{ getDayName(course.day) }} (第 {{ course.start }}-{{ course.start + course.duration - 1 }} 节)
                                <div style="color: var(--primary-color); font-weight: bold; font-size: 12px; margin-top: 4px; padding-left: 20px;">
                                    <i class="ri-alarm-line" style="margin-right: 4px; vertical-align: text-bottom;"></i> {{ getCourseTimeRange(course.start, course.duration) }}
                                </div>
                            </div>
                        </div>
                        <hr v-if="idx !== selectedCourseGroup.length - 1" style="border: none; border-top: 1px dashed #ddd; margin: 15px 0;">
                    </div>
                    <button class="modal-close-btn" @click="closeDetails">我知道了</button>
                </div>
            </div>

            <div class="modal-overlay" v-if="showWeekSelector" @click.self="showWeekSelector = false">
                <div class="modal-content" style="max-height: initial;">
                    <div class="modal-title">选择周次</div>
                    <div class="week-grid">
                        <button class="week-btn" v-for="w in 25" :key="w" :class="{ active: store.currentWeek === w, current: store.realWeek === w }" @click="selectWeek(w)">{{ w }}</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" v-if="showBgMenu" @click.self="showBgMenu = false">
                <div class="modal-content" style="max-height: initial; padding: 20px;">
                    <div class="modal-title" style="margin-bottom: 20px;">背景设置</div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="btn" style="margin: 0;" @click="execChangeBg">更改背景</button>
                        <button class="btn btn-danger" style="margin: 0;" @click="execClearBg">清除背景</button>
                        <button class="btn" style="margin: 0; background: #e5e5ea; color: #333;" @click="showBgMenu = false">取消</button>
                    </div>
                </div>
            </div>

            <div class="modal-overlay" v-if="showCustomManager" @click.self="showCustomManager = false">
                <div class="modal-content custom-manager-modal">
                    <div class="modal-title" style="margin-bottom: 10px;">
                        <i v-if="!isEditingCustom" class="ri-equalizer-line" style="margin-right: 4px; color: var(--primary-color);"></i>
                        <i v-else class="ri-edit-box-line" style="margin-right: 4px; color: var(--primary-color);"></i>
                        {{ isEditingCustom ? (customForm.id ? '编辑自定义课程' : '新建课程') : '自定义课表管理' }}
                    </div>

                    <div v-if="!isEditingCustom" class="custom-manager-scroll">
                        <p class="custom-manager-subtitle">当前学期: {{ store.currentTerm }}</p>

                        <div v-if="currentTermCustomCourses.length === 0" style="text-align: center; padding: 20px; color: #999; font-size: 13px;">
                            暂无自定义课程
                        </div>

                        <div v-else class="custom-course-item" v-for="c in currentTermCustomCourses" :key="c.id">
                            <div class="custom-course-title">{{ c.name }}</div>
                            <div class="custom-course-time">星期{{ getDayName(c.day) }} · 第{{ c.start }}-{{ c.start + c.duration - 1 }}节</div>
                            <div class="custom-course-meta">{{ c.room || '无教室' }} | {{ c.teacher || '无教师' }} | {{ c.weeks }}周</div>

                            <div class="custom-course-actions">
                                <button class="icon-btn action-btn-edit" @click="editCustomCourse(c)"><i class="ri-pencil-line"></i></button>
                                <button class="icon-btn action-btn-del" @click="deleteCustomCourse(c.id)"><i class="ri-delete-bin-6-line"></i></button>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button class="btn btn-cancel" @click="showCustomManager = false">关闭</button>
                            <button class="btn btn-submit" @click="createNewCustomCourse">添加新课程</button>
                        </div>
                    </div>

                    <div v-else class="custom-manager-scroll" style="text-align: left;">
                        <div class="input-group"><input type="text" v-model="customForm.name" placeholder="课程名称 (必填)"></div>
                        <div class="input-group"><input type="text" v-model="customForm.weeks" placeholder="周次 (必填, 格式如: 1-16, 2,4)"></div>

                        <div class="custom-form-row">
                            <div class="custom-form-col">
                                <label class="custom-form-label">星期 (必填)</label>
                                <select v-model.number="customForm.day" class="custom-select">
                                    <option v-for="d in 7" :key="d" :value="d">星期{{ getDayName(d) }}</option>
                                </select>
                            </div>
                            <div class="custom-form-col">
                                <label class="custom-form-label">起始节 (必填)</label>
                                <select v-model.number="customForm.start" class="custom-select">
                                    <option v-for="s in 13" :key="s" :value="s">第{{ s }}节 ({{ getSlotTimeStr(s) }})</option>
                                </select>
                            </div>
                            <div class="custom-form-col">
                                <label class="custom-form-label">连上节数</label>
                                <select v-model.number="customForm.duration" class="custom-select">
                                    <option v-for="l in 5" :key="l" :value="l">{{ l }}节</option>
                                </select>
                            </div>
                        </div>

                        <div class="input-group"><input type="text" v-model="customForm.teacher" placeholder="授课教师 (选填)"></div>
                        <div class="input-group"><input type="text" v-model="customForm.room" placeholder="上课地点 (选填)"></div>

                        <div class="form-actions">
                            <button class="btn btn-cancel" @click="isEditingCustom = false">取消</button>
                            <button class="btn btn-submit" @click="saveCustomCourse">保存课程</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="cropper-overlay" v-if="showCropper" @touchmove.prevent>
                <div class="cropper-viewport"
                     @touchstart="cropStart" @mousedown="cropStart"
                     @touchmove="cropMove" @mousemove="cropMove"
                     @touchend="cropEnd" @mouseup="cropEnd" @mouseleave="cropEnd"
                     @wheel.prevent="cropWheel">
                    <img :src="rawImgSrc" class="cropper-img" ref="cropImg"
                         :style="{ transform: 'translate(' + cropX + 'px, ' + cropY + 'px) scale(' + cropScale + ')' }">
                    <div class="cropper-mask">
                        <div class="cropper-guide">可以单指拖拽定位，双指缩放大小</div>
                    </div>
                </div>
                <div class="cropper-actions">
                    <button class="btn btn-cancel" @click="showCropper = false" style="margin:0;">取消</button>
                    <button class="btn btn-submit" @click="confirmCrop" style="margin:0;">保存为背景</button>
                </div>
            </div>

        </div>
    `,
    data() {
        return {
            store,
            viewMode: "week",
            touchStartX: 0, touchStartY: 0,
            bgImage: localStorage.getItem('njust_schedule_bg') || '',
            showCropper: false, rawImgSrc: '',
            showBgMenu: false,
            cropX: 0, cropY: 0, cropScale: 1,
            lastCropX: 0, lastCropY: 0, lastScale: 1,
            isDragging: false, isPinching: false, touchStartDist: 0, startTouches: [],
            colors: [
                "#87CEFA", "#DDA0DD", "#F08080", "#6495ED", "#FFB6C1",
                "#20B2AA", "#F4A460", "#B0C4DE", "#FFDAB9", "#9370DB", "#40E0D0"
            ],
            showModal: false, showWeekSelector: false, selectedCourseGroup: [],
            currentTimeY: 0, currentDayOfWeek: 1, showTimeLine: false, timeTrackerInterval: null,
            pixelsPerSlot: 60, totalSlots: 15,
            isTimeLineAnimating: false, animTimer: null,

            showCustomManager: false,
            isEditingCustom: false,
            customForm: { id: '', name: '', teacher: '', room: '', weeks: '', day: 1, start: 1, duration: 2, term: '', isCustom: true }
        }
    },
    computed: {
        currentWeekDates() {
            const start = new Date(this.store.termStartDate);
            start.setDate(start.getDate() + (this.store.currentWeek - 1) * 7);
            let dates = [];
            for (let i = 0; i < 7; i++) {
                let d = new Date(start); d.setDate(start.getDate() + i);
                dates.push((d.getMonth() + 1) + "/" + d.getDate());
            }
            return dates;
        },
        currentTermCustomCourses() {
            return (this.store.customCoursesList || []).filter(c => c.term === this.store.currentTerm);
        },
        combinedCourseList() {
            const official = this.store.courseList || [];
            return [...official, ...this.currentTermCustomCourses];
        },
        filteredCourseList() {
            if (!this.combinedCourseList || this.combinedCourseList.length === 0) return [];
            return this.combinedCourseList.filter(c => {
                if (!c.weeks) return true;
                const parts = c.weeks.match(/(\d+-\d+|\d+)/g);
                if (parts) {
                    return parts.some(part => {
                        if (part.includes("-")) {
                            let [start, end] = part.split("-").map(Number);
                            return this.store.currentWeek >= start && this.store.currentWeek <= end;
                        } else { return this.store.currentWeek === Number(part); }
                    });
                }
                return true;
            });
        },
        gridCourseGroups() {
            const targetList = this.viewMode === 'week' ? this.filteredCourseList : this.combinedCourseList;
            let groups = []; let nextSlotTracker = {1: 14, 2: 14, 3: 14, 4: 14, 5: 14, 6: 14, 7: 14};
            targetList.forEach(originalCourse => {
                let c = { ...originalCourse };
                const textInfo = [c.name, c.room, c.teacher, c.weeks].join(" ");
                const isOnlineOrPending = textInfo.includes('网课') || textInfo.includes('待定') || textInfo.includes('线上') || textInfo.includes('无');
                if (c.start >= 14 || (isOnlineOrPending && !c.isCustom)) {
                    c.start = nextSlotTracker[c.day]; c.duration = 2; c.isPending = true; nextSlotTracker[c.day] += 2;
                }
                let overlapGroup = groups.find(g => {
                    return g.some(existing => {
                        const end1 = existing.start + existing.duration; const end2 = c.start + c.duration;
                        return existing.day === c.day && Math.max(existing.start, c.start) < Math.min(end1, end2);
                    });
                });
                if (overlapGroup) {
                    if (!overlapGroup.some(existing => existing.name === c.name && existing.weeks === c.weeks)) { overlapGroup.push(c); }
                } else { groups.push([c]); }
            });
            return groups;
        }
    },
    watch: {
        'store.scheduleViewType'() {
            this.calculateSlotHeight();
        },
        viewMode() {
            this.$nextTick(() => {
                this.calculateSlotHeight();
                const container = document.querySelector('.content-area');
                if (container && this.store.scheduleViewType === 'scroll') {
                    container.scrollTop = 0;
                }
            });
        }
    },
    methods: {

        // 触发背景图片选择
        // 1. 触发背景按钮点击
        triggerBgUpload() {
            if (this.bgImage) {
                // 如果已经有背景了，不再用原生的 confirm，而是打开我们写的三个选项菜单
                this.showBgMenu = true;
            } else {
                // 没有背景时，直接唤起相册
                document.getElementById('bgUploader').click();
            }
        },

        // 2. 执行：更改背景
        execChangeBg() {
            this.showBgMenu = false;
            document.getElementById('bgUploader').click();
        },

        // 3. 执行：清除背景
        execClearBg() {
            this.showBgMenu = false;
            this.bgImage = '';
            localStorage.removeItem('njust_schedule_bg');
            showToast("背景已清除", "success");
        },

        // 图片选择后，利用 Canvas 强力压缩，转存 Base64
        handleBgUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.rawImgSrc = e.target.result;
                    this.showCropper = true;

                    // 计算让图片恰好填满屏幕的初始缩放比例 (Cover 模式)
                    const screenW = window.innerWidth;
                    const screenH = window.innerHeight;
                    const scale = Math.max(screenW / img.width, screenH / img.height);

                    this.cropScale = scale;
                    this.lastScale = scale;
                    // 默认居中显示
                    this.cropX = (screenW - img.width * scale) / 2;
                    this.cropY = (screenH - img.height * scale) / 2;
                    this.lastCropX = this.cropX;
                    this.lastCropY = this.cropY;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        },

        cropWheel(e) {
            // 设置每次滚动的缩放灵敏度（0.1代表每次滚动变化10%）
            const zoomFactor = 0.1;

            if (e.deltaY < 0) {
                // 滚轮向上滚：放大
                this.cropScale = this.lastScale * (1 + zoomFactor);
            } else {
                // 滚轮向下滚：缩小
                this.cropScale = this.lastScale * (1 - zoomFactor);
            }

            // 加一个极限保护，防止缩得太小找不到图片，或者放得太大浏览器卡死
            if (this.cropScale < 0.1) this.cropScale = 0.1;
            if (this.cropScale > 10) this.cropScale = 10;

            // 同步 lastScale，保证下次拖拽或继续滚动时基准正确
            this.lastScale = this.cropScale;
        },

        // 触摸/鼠标 按下：记录初始位置和双指距离
        cropStart(e) {
            if (e.type === 'touchstart' && e.touches.length === 2) {
                this.isPinching = true;
                this.touchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                return;
            }
            this.isDragging = true;
            this.isPinching = false;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.startTouches = [{ x: clientX, y: clientY }];
        },

        // 触摸/鼠标 移动：计算平移或缩放
        cropMove(e) {
            if (!this.isDragging && !this.isPinching) return;
            e.preventDefault(); // 阻止屏幕跟随滚动

            if (this.isPinching && e.touches && e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const scaleDelta = dist / this.touchStartDist;
                this.cropScale = this.lastScale * scaleDelta;
                return;
            }

            if (this.isDragging) {
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                this.cropX = this.lastCropX + (clientX - this.startTouches[0].x);
                this.cropY = this.lastCropY + (clientY - this.startTouches[0].y);
            }
        },

        // 触摸/鼠标 抬起：保存最后的位置参数
        cropEnd() {
            this.isDragging = false;
            this.isPinching = false;
            this.lastCropX = this.cropX;
            this.lastCropY = this.cropY;
            this.lastScale = this.cropScale;
        },

        // 点击确认：截取屏幕可视区域，压制 Base64 保存！
        confirmCrop() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;

            // 划定 Canvas 尺寸与屏幕 1:1 等大
            canvas.width = screenW;
            canvas.height = screenH;

            const img = this.$refs.cropImg;

            // 绘制核心：通过坐标转换，把拖拽好的画面精确“印”到画布上
            ctx.translate(this.cropX, this.cropY);
            ctx.scale(this.cropScale, this.cropScale);
            ctx.drawImage(img, 0, 0);

            // 导出 60% 画质的 JPEG（背景图 60% 足够清晰且体积超小）
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

            try {
                localStorage.setItem('njust_schedule_bg', compressedBase64);
                this.bgImage = compressedBase64;
                this.showCropper = false;
                showToast("背景裁剪并设置成功！", "success");
            } catch (err) {
                showToast("图片依然过大，保存失败", "error");
            }
        },

        getCourseTimeRange(start, duration) {
            const startTimes = ["", "08:00", "08:50", "09:40", "10:40", "11:30", "14:00", "14:50", "15:50", "16:40", "17:30", "19:00", "19:50", "20:40"];
            const endTimes =   ["", "08:45", "09:35", "10:25", "11:25", "12:15", "14:45", "15:35", "16:35", "17:25", "18:15", "19:45", "20:35", "21:25"];

            if (start < 1 || start > 13) return "";

            const end = Math.min(13, start + duration - 1);

            return `${startTimes[start]} - ${endTimes[end]}`;
        },

        getSlotTimeStr(s) {
            const times = [
                "",
                "08:00", "08:50", "09:40", "10:40", "11:30",
                "14:00", "14:50", "15:50", "16:40", "17:30",
                "19:00", "19:50", "20:40"
            ];
            return times[s] || "";
        },
        openCustomManager() {
            this.isEditingCustom = false;
            this.showCustomManager = true;
        },
        createNewCustomCourse() {
            this.customForm = { id: '', name: '', teacher: '', room: '', weeks: '1-16', day: 1, start: 1, duration: 2, term: this.store.currentTerm, isCustom: true };
            this.isEditingCustom = true;
        },
        editCustomCourse(course) {
            this.customForm = { ...course };
            this.isEditingCustom = true;
        },
        deleteCustomCourse(id) {
            if(confirm("确定删除这门自定义课程吗？")) {
                this.store.customCoursesList = this.store.customCoursesList.filter(c => c.id !== id);
                this.persistCustomCourses();
            }
        },
        saveCustomCourse() {
            if (!this.customForm.name.trim() || !this.customForm.weeks.trim()) {
                showToast("课程名称和周次为必填项", "error");
                return;
            }
            if (this.customForm.start + this.customForm.duration - 1 > 15) {
                showToast("课程结束时间超出了最大节次(15)", "error");
                return;
            }

            if (this.customForm.id) {
                const idx = this.store.customCoursesList.findIndex(c => c.id === this.customForm.id);
                if(idx !== -1) this.store.customCoursesList[idx] = { ...this.customForm };
            } else {
                this.customForm.id = 'cus_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                this.store.customCoursesList.push({ ...this.customForm });
            }

            this.persistCustomCourses();
            this.isEditingCustom = false;
            showToast("保存成功", "success");
        },
        persistCustomCourses() {
            localStorage.setItem("my_njust_custom_courses", JSON.stringify(this.store.customCoursesList));
        },

        getStringHash(str) {
            let hash = 0;
            if (!str) return hash;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return Math.abs(hash);
        },
        calculateSlotHeight() {
            // 重新排版前先关闭动画，防止光追线乱飞
            this.isTimeLineAnimating = false;

            const screenHeight = window.innerHeight; const screenWidth = window.innerWidth;
            if (screenWidth > screenHeight || this.store.scheduleViewType === 'scroll') { this.pixelsPerSlot = 60; } else {
                const availableHeight = screenHeight - 210;
                this.pixelsPerSlot = availableHeight / this.totalSlots;
            }
            document.documentElement.style.setProperty('--slot-height', this.pixelsPerSlot + 'px');
            this.updateTimeLine();

            // 排版瞬间就位后（延时100毫秒），重新开启一分钟一次的自然平滑动画
            if (this.animTimer) clearTimeout(this.animTimer);
            this.animTimer = setTimeout(() => { this.isTimeLineAnimating = true; }, 100);
        },
        getStartTime(course) {
            if (course.isPending) return "";
            const timeMap = { 1: "8:00", 2: "8:50", 4: "10:40", 6: "14:00", 8: "15:50", 11: "19:00" };
            return timeMap[course.start] || "";
        },
        updateTimeLine() {
            const now = new Date(); let day = now.getDay(); this.currentDayOfWeek = day === 0 ? 7 : day;
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const schedule = [ { s: 8*60+0, e: 8*60+45 }, { s: 8*60+50, e: 9*60+35 }, { s: 9*60+40, e: 10*60+25 }, { s: 10*60+40, e: 11*60+25 }, { s: 11*60+30, e: 12*60+15 }, { s: 14*60+0, e: 14*60+45 }, { s: 14*60+50, e: 15*60+35 }, { s: 15*60+50, e: 16*60+35 }, { s: 16*60+40, e: 17*60+25 }, { s: 17*60+30, e: 18*60+15 }, { s: 19*60+0, e: 19*60+45 }, { s: 19*60+50, e: 20*60+35 }, { s: 20*60+40, e: 21*60+25 } ];
            if (currentMins < schedule[0].s - 30 || currentMins > schedule[12].e + 30) { this.showTimeLine = false; return; }
            this.showTimeLine = true; let logicalSlot = -1;
            for (let i = 0; i < schedule.length; i++) {
                if (currentMins < schedule[i].s) { logicalSlot = i; break; }
                else if (currentMins <= schedule[i].e) { const progress = (currentMins - schedule[i].s) / (schedule[i].e - schedule[i].s); logicalSlot = i + progress; break; }
            }
            if (logicalSlot === -1 && currentMins > schedule[schedule.length-1].e) logicalSlot = 13;
            this.currentTimeY = logicalSlot * this.pixelsPerSlot;
        },
        changeWeek(delta) {
            let target = this.store.currentWeek + delta;
            this.store.currentWeek = target > 25 ? 1 : (target < 1 ? 25 : target);
        },
        selectWeek(w) { this.store.currentWeek = w; this.showWeekSelector = false; },
        openDetails(group) { this.selectedCourseGroup = group; this.showModal = true; },
        closeDetails() { this.showModal = false; this.selectedCourseGroup = []; },
        getDayName(d) { return ["一", "二", "三", "四", "五", "六", "日"][d - 1] || "未知"; },

        // 动态解析主题色并注入不透明度 (给当日列高亮使用)
        getHighlightColor() {
            let hex = this.store.themeColor || '#5b9bd5';
            if (hex.startsWith('#')) hex = hex.slice(1);
            let r = parseInt(hex.substring(0, 2), 16) || 91;
            let g = parseInt(hex.substring(2, 4), 16) || 155;
            let b = parseInt(hex.substring(4, 6), 16) || 213;
            return `rgba(${r}, ${g}, ${b}, ${this.store.highlightOpacity})`;
        },

        // 让卡片也支持不透明度渲染
        getGroupCardStyle(group, index) {
            const minStart = Math.min(...group.map(c => c.start));
            const maxEnd = Math.max(...group.map(c => c.start + c.duration));
            const maxDuration = maxEnd - minStart;
            const firstCourse = group.find(c => c.start === minStart) || group[0];

            const hashString = firstCourse.name;
            const colorIndex = this.getStringHash(hashString) % this.colors.length;

            // 获取计算出的基础 Hex 颜色
            let baseHex = firstCourse.isCustom ? this.shadeColor(this.colors[colorIndex], -10) : this.colors[colorIndex];

            // 转化为 RGBA 并混入用户设置的卡片透明度
            if (baseHex.startsWith('#')) baseHex = baseHex.slice(1);
            let r = parseInt(baseHex.substring(0, 2), 16);
            let g = parseInt(baseHex.substring(2, 4), 16);
            let b = parseInt(baseHex.substring(4, 6), 16);
            let rgbaColor = `rgba(${r}, ${g}, ${b}, ${this.store.cardOpacity})`;

            return {
                left: 'calc(' + ((100 / 7) * (firstCourse.day - 1)) + '% + 2px)',
                top: ((minStart - 1) * this.pixelsPerSlot + 2) + 'px',
                height: (maxDuration * this.pixelsPerSlot - 4) + 'px',
                backgroundColor: rgbaColor,
                border: firstCourse.isCustom ? '1px dashed rgba(0,0,0,0.2)' : 'none'
            };
        },
        shadeColor(color, percent) {
            let R = parseInt(color.substring(1,3),16);
            let G = parseInt(color.substring(3,5),16);
            let B = parseInt(color.substring(5,7),16);
            R = parseInt(R * (100 + percent) / 100);
            G = parseInt(G * (100 + percent) / 100);
            B = parseInt(B * (100 + percent) / 100);
            R = (R<255)?R:255; G = (G<255)?G:255; B = (B<255)?B:255;
            R = Math.round(R); G = Math.round(G); B = Math.round(B);
            let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
            let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
            let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
            return "#"+RR+GG+BB;
        },
        handleTouchStart(e) { this.touchStartX = e.changedTouches[0].clientX; this.touchStartY = e.changedTouches[0].clientY; },
        handleTouchEnd(e) {
            if (this.showModal || this.showWeekSelector || this.showCustomManager || this.viewMode !== 'week') return;
            const deltaX = e.changedTouches[0].clientX - this.touchStartX; const deltaY = e.changedTouches[0].clientY - this.touchStartY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) { if (deltaX > 0) this.changeWeek(-1); else this.changeWeek(1); }
        }
    },
    mounted() {
        this.$nextTick(() => {
            this.calculateSlotHeight();
            const container = document.querySelector('.content-area');
            if (container) {
                container.scrollTop = 0;
            }
        });
        window.addEventListener('resize', this.calculateSlotHeight);
        //this.updateTimeLine();
        this.timeTrackerInterval = setInterval(() => { this.updateTimeLine(); }, 60000);
    },
    unmounted() {
        window.removeEventListener('resize', this.calculateSlotHeight);
        clearInterval(this.timeTrackerInterval);
    }
}