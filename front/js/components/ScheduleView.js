import { store } from '../store.js';

export default {
    template: `
        <div style="height: 100%; position: relative;" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
            <div v-if="store.courseList.length > 0">
                <div style="display: flex; justify-content: center; background: #fff; padding-top: 6px;">
                    <div class="switch-capsule">
                        <div class="switch-item" :class="{active: viewMode === 'week'}" @click="viewMode = 'week'">单周模式</div>
                        <div class="switch-item" :class="{active: viewMode === 'semester'}" @click="viewMode = 'semester'">全学期模式</div>
                    </div>
                </div>

                <div class="week-nav" v-show="viewMode === 'week'">
                    <button class="icon-btn" @click="changeWeek(-1)">&#9664;</button>
                    <div class="week-title" @click="showWeekSelector = true">
                        第 {{ store.currentWeek }} 周 <span class="week-tag" v-if="store.currentWeek === store.realWeek">本周</span>
                    </div>
                    <button class="icon-btn" @click="changeWeek(1)">&#9654;</button>
                </div>
                <div class="week-nav" v-show="viewMode === 'semester'" style="justify-content: center;">
                    <div style="font-size: 12px; color: #888;">点击重叠卡片，可查看该时段所有课程</div>
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
                            <div class="time-line"
                                 v-if="viewMode === 'week' && store.currentWeek === store.realWeek && showTimeLine"
                                 :style="{ top: currentTimeY + 'px', left: 'calc(' + ((100 / 7) * (currentDayOfWeek - 1)) + '%)', width: 'calc(100% / 7)' }">
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
                                <div class="course-name" :style="{ '--max-lines': group[0].duration <= 2 ? 2 : 4 }">
                                    {{ group[0].name }}
                                </div>
                                <div v-if="group.length > 1" class="overlap-badge">{{ group.length }}门交替</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="empty-state" v-else>
                <div style="font-size: 40px; margin-bottom: 10px;">📭</div>
                <p>课表空空如也，请前往同步</p>
            </div>

            <div class="modal-overlay" v-if="showModal" @click.self="closeDetails">
                <div class="modal-content">
                    <div class="modal-title">{{ selectedCourseGroup.length > 1 ? '时段重叠课程 (' + selectedCourseGroup.length + '门)' : '课程详情' }}</div>
                    <div v-for="(course, idx) in selectedCourseGroup" :key="idx">
                        <div v-if="selectedCourseGroup.length > 1" style="font-weight: bold; font-size: 14px; color: #007aff; margin-bottom: 8px;">📚 {{ course.name }}</div>
                        <div v-else style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 12px; text-align: center;">{{ course.name }}</div>

                        <div class="modal-detail-item"><div><strong>教师：</strong>{{ course.teacher || '未知' }}</div></div>
                        <div class="modal-detail-item"><div><strong>教室：</strong>{{ course.room || '待定' }}</div></div>
                        <div class="modal-detail-item"><div><strong>周次：</strong>{{ course.weeks }}</div></div>

                        <div class="modal-detail-item" v-if="course.isPending">
                            <div><strong>类型：</strong>网络课程 / 时间待定</div>
                        </div>
                        <div class="modal-detail-item" v-else-if="course.day && course.start <= 12">
                            <div><strong>节次：</strong>星期{{ getDayName(course.day) }} (第 {{ course.start }} - {{ course.start + course.duration - 1 }} 节)</div>
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
        </div>
    `,
    data() {
        return {
            store,
            viewMode: "week",
            touchStartX: 0, touchStartY: 0,
            colors: [
                "#FFA07A", // 浅鲑鱼红
                "#87CEFA", // 天蓝色
                "#98FB98", // 苍绿色
                "#DDA0DD", // 梅红色
                "#F08080", // 浅珊瑚色
                "#6495ED", // 矢车菊蓝
                "#FFB6C1", // 浅粉色
                "#20B2AA", // 浅海洋绿
                "#F4A460", // 沙褐色
                "#B0C4DE", // 亮钢兰色
                "#FFE4B5", // 鹿皮色/浅黄
                "#48D1CC", // 中绿宝石
                "#D8BFD8", // 蓟色/浅紫
                "#FFDAB9"  // 桃色
            ],
            showModal: false, showWeekSelector: false, selectedCourseGroup: [],
            currentTimeY: 0, currentDayOfWeek: 1, showTimeLine: false, timeTrackerInterval: null,
            pixelsPerSlot: 60, totalSlots: 15
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
        filteredCourseList() {
            if (!this.store.courseList || this.store.courseList.length === 0) return [];
            return this.store.courseList.filter(c => {
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
            const targetList = this.viewMode === 'week' ? this.filteredCourseList : this.store.courseList;
            let groups = []; let nextSlotTracker = {1: 14, 2: 14, 3: 14, 4: 14, 5: 14, 6: 14, 7: 14};
            targetList.forEach(originalCourse => {
                let c = { ...originalCourse };
                const textInfo = [c.name, c.room, c.teacher, c.weeks].join(" ");
                const isOnlineOrPending = textInfo.includes('网课') || textInfo.includes('待定') || textInfo.includes('线上') || textInfo.includes('无');
                if (c.start >= 14 || isOnlineOrPending) {
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
        'store.scheduleViewType'() { this.calculateSlotHeight(); }
    },
    methods: {
        calculateSlotHeight() {
            const screenHeight = window.innerHeight; const screenWidth = window.innerWidth;
            if (screenWidth > screenHeight || this.store.scheduleViewType === 'scroll') { this.pixelsPerSlot = 60; } else {
                const availableHeight = screenHeight - 200; this.pixelsPerSlot = availableHeight / this.totalSlots;
            }
            document.documentElement.style.setProperty('--slot-height', this.pixelsPerSlot + 'px');
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
        getGroupCardStyle(group, index) {
            const minStart = Math.min(...group.map(c => c.start));
            const maxEnd = Math.max(...group.map(c => c.start + c.duration));
            const maxDuration = maxEnd - minStart;
            const firstCourse = group.find(c => c.start === minStart) || group[0];
            const colorIndex = firstCourse.name.length % this.colors.length;

            // 安全的字符串拼接，防止转义破坏 CSS
            return {
                left: 'calc(' + ((100 / 7) * (firstCourse.day - 1)) + '% + 2px)',
                top: ((minStart - 1) * this.pixelsPerSlot + 2) + 'px',
                height: (maxDuration * this.pixelsPerSlot - 4) + 'px',
                backgroundColor: this.colors[colorIndex]
            };
        },
        handleTouchStart(e) { this.touchStartX = e.changedTouches[0].clientX; this.touchStartY = e.changedTouches[0].clientY; },
        handleTouchEnd(e) {
            if (this.showModal || this.viewMode !== 'week') return;
            const deltaX = e.changedTouches[0].clientX - this.touchStartX; const deltaY = e.changedTouches[0].clientY - this.touchStartY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) { if (deltaX > 0) this.changeWeek(-1); else this.changeWeek(1); }
        }
    },
    mounted() {
        this.calculateSlotHeight();
        window.addEventListener('resize', this.calculateSlotHeight);
        this.updateTimeLine();
        this.timeTrackerInterval = setInterval(() => { this.updateTimeLine(); }, 60000);
    },
    unmounted() {
        window.removeEventListener('resize', this.calculateSlotHeight);
        clearInterval(this.timeTrackerInterval);
    }
}