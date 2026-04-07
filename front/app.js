//本地测试
//const API_BASE = "http://127.0.0.1:8000/api";
//服务器
const API_BASE = "https://njust-nannoschedule.onrender.com/api"




// ====== 全局消息提示函数 ======
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => { toast.classList.add('show'); }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}
// ===================================



const { createApp } = Vue;

createApp({
    data() {
        return {
            // UI 状态
            currentTab: "schedule",
            currentSubPage: "",
            viewMode: "week",
            loading: false,
            errorMsg: "",
            successMsg: "",

            // 记录触摸起点
            touchStartX: 0,
            touchStartY: 0,

            // 登录与表单
            captchaImg: "",
            loginForm: { username: "", password: "", captcha: "", session_id: "" },
            showPassword: false,

            // 数据缓存
            courseList: [],
            gradeList: [],

            // 组件参数
            colors: ["#FFA07A", "#87CEFA", "#98FB98", "#DDA0DD", "#F08080", "#6495ED", "#FFB6C1", "#20B2AA"],
            showModal: false,
            showWeekSelector: false,
            selectedCourseGroup: [],

            // 时间管理
            termStartDate: localStorage.getItem("my_njust_start_date") || "2026-03-02",
            currentWeek: 1,
            realWeek: 1,
            settingWeek: 1,
            calibratedMsg: "",

            currentTimeY: 0,
            currentDayOfWeek: 1,
            showTimeLine: false,
            timeTrackerInterval: null,

            // UI 状态
            pixelsPerSlot: 60, // 动态格子高度，默认给个60
            totalSlots: 15,

            // UI 状态
            scheduleViewType: localStorage.getItem("my_njust_view_type") || "fixed",
        };
    },
    computed: {
        /* ================= 课表渲染模块 ================= */

        // 计算当前周的 7 天日期字符串
        currentWeekDates() {
            const start = new Date(this.termStartDate);
            start.setDate(start.getDate() + (this.currentWeek - 1) * 7);
            let dates = [];
            for (let i = 0; i < 7; i++) {
                let d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push((d.getMonth() + 1) + "/" + d.getDate());
            }
            return dates;
        },

        // 根据单周模式过滤课程
        filteredCourseList() {
            if (!this.courseList || this.courseList.length === 0) return [];
            return this.courseList.filter(c => {
                // 如果没有周次信息，默认显示
                if (!c.weeks) return true;

                const parts = c.weeks.match(/(\d+-\d+|\d+)/g);

                if (parts) {
                    return parts.some(part => {
                        // 如果包含短横线，说明是区间 (比如 "9-12")
                        if (part.includes("-")) {
                            let [start, end] = part.split("-").map(Number);
                            return this.currentWeek >= start && this.currentWeek <= end;
                        } else {
                            // 如果没有短横线，说明是单周 (比如 "6" 或 "16")
                            return this.currentWeek === Number(part);
                        }
                    });
                }

                // 如果实在解析不出任何数字，为了防丢，兜底显示
                return true;
            });
        },

        // 核心渲染逻辑：重叠检测与网课分离
        gridCourseGroups() {
            const targetList = this.viewMode === 'week' ? this.filteredCourseList : this.courseList;
            let groups = [];

            // 用于管理每天网课流放队列的发号器 (默认从 14 节开始)
            let nextSlotTracker = {1: 14, 2: 14, 3: 14, 4: 14, 5: 14, 6: 14, 7: 14};

            targetList.forEach(originalCourse => {
                let c = { ...originalCourse };

                // 强制网课向 14 节之后顺序排队
                const textInfo = [c.name, c.room, c.teacher, c.weeks].join(" ");
                const isOnlineOrPending = textInfo.includes('网课') || textInfo.includes('待定') || textInfo.includes('线上') || textInfo.includes('无');

                if (c.start >= 14 || isOnlineOrPending) {
                    c.start = nextSlotTracker[c.day];
                    c.duration = 2;
                    c.isPending = true;
                    nextSlotTracker[c.day] += 2;
                }

                // 时间轴区间碰撞检测（处理重叠课程）
                let overlapGroup = groups.find(g => {
                    return g.some(existing => {
                        const end1 = existing.start + existing.duration;
                        const end2 = c.start + c.duration;
                        return existing.day === c.day && Math.max(existing.start, c.start) < Math.min(end1, end2);
                    });
                });

                if (overlapGroup) {
                    if (!overlapGroup.some(existing => existing.name === c.name && existing.weeks === c.weeks)) {
                        overlapGroup.push(c);
                    }
                } else {
                    groups.push([c]);
                }
            });
            return groups;
        },

        /* ================= 成绩统计模块 ================= */

        // 按学期分组
        semesters() {
            const groups = {};
            this.gradeList.forEach(item => {
                if (!groups[item.semester]) groups[item.semester] = { name: item.semester, courses: [] };
                groups[item.semester].courses.push(item);
            });
            return Object.values(groups).sort((a, b) => b.name.localeCompare(a.name));
        },

        // 动态绩点统计
        overallStats() {
            return {
                all: this.calcGpa(this.gradeList),
                selected: this.calcGpa(this.gradeList.filter(g => g.selected))
            };
        }
    },
    watch: {
        termStartDate(newVal) {
            localStorage.setItem("my_njust_start_date", newVal);
            this.calculateRealWeek();
        },
        scheduleViewType(newVal) {
            localStorage.setItem("my_njust_view_type", newVal);
            this.calculateSlotHeight();
        }
    },
    methods: {

        /* ================= 屏幕高度自适应引擎 ================= */
        /* ================= 屏幕高度自适应引擎 ================= */
        calculateSlotHeight() {
            const screenHeight = window.innerHeight;
            const screenWidth = window.innerWidth;

            // 👇 核心修改：如果是横屏，或者用户手动选择了 'scroll' (滑动) 模式，就用 60px！
            if (screenWidth > screenHeight || this.scheduleViewType === 'scroll') {
                this.pixelsPerSlot = 60;
            } else {
                // fixed 模式：自动压缩
                const availableHeight = screenHeight - 200;
                this.pixelsPerSlot = availableHeight / this.totalSlots;
            }

            document.documentElement.style.setProperty('--slot-height', this.pixelsPerSlot + 'px');
        },

        /* ================= 课程时间转换 ================= */
        getStartTime(course) {
            // 网课或待定课程直接返回空
            if (course.isPending) return "";

            // 根据规则硬编码写死
            const timeMap = {
                1: "8:00",
                2: "8:50",
                4: "10:40",
                6: "14:00",
                8: "15:50",
                11: "19:00"
            };

            // 返回对应的时间，如果没匹配上（比如第3节）就不显示
            return timeMap[course.start] || "";
        },
        /* ================= 数据同步接口 ================= */

        switchTab(tab) {
            this.currentTab = tab;
            this.currentSubPage = "";
            this.errorMsg = "";
            this.successMsg = "";
            if (tab === "profile" && !this.captchaImg) this.fetchCaptcha();
        },

        async fetchCaptcha() {
            try {
                this.errorMsg = "";
                const res = await fetch(`${API_BASE}/captcha`);
                const data = await res.json();
                this.captchaImg = data.captcha_image;
                this.loginForm.session_id = data.session_id;
            } catch (e) {
                this.errorMsg = "无法连接服务器，请检查后端是否正常运行";
            }
        },

        async syncAllData() {
            if(!this.loginForm.username || !this.loginForm.captcha) {
                showToast("请填写完整账号和验证码", "error"); // 换成弹窗
                return;
            }
            this.loading = true;
            try {
                const res = await fetch(`${API_BASE}/sync_all`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(this.loginForm)
                });
                const result = await res.json();

                if (res.ok) {
                    this.courseList = result.data.courses;
                    this.gradeList = result.data.grades;
                    localStorage.setItem("my_njust_data", JSON.stringify(result.data));
                    showToast("同步成功！", "success"); // 成功也换成绿色弹窗
                    setTimeout(() => { this.switchTab("schedule"); }, 1000);
                } else {
                    showToast(result.detail || "验证失败，请检查账号密码或验证码", "error"); // 后端报错弹窗
                    this.fetchCaptcha(); // 自动刷新验证码
                }
            } catch (e) {
                showToast("网络连接异常，请稍后再试", "error"); // 网络报错弹窗
            } finally {
                this.loading = false;
            }
        },

        clearLocalData() {
            if(confirm("确定要清空所有本地缓存吗？")) {
                localStorage.removeItem("my_njust_data");
                this.courseList = [];
                this.gradeList = [];
                this.loginForm.password = "";
                this.loginForm.captcha = "";
            }
        },

        /* ================= 光追时间线系统 ================= */
        updateTimeLine() {
            const now = new Date();
            let day = now.getDay();
            this.currentDayOfWeek = day === 0 ? 7 : day; // 周日转换

            const hour = now.getHours();
            const minute = now.getMinutes();
            const currentMins = hour * 60 + minute;

            // 精确作息时间表（换算成距离 00:00 的分钟数）
            const schedule = [
                { s: 8*60+0,  e: 8*60+45 },   // 第 1 节: 08:00 - 08:45
                { s: 8*60+50, e: 9*60+35 },   // 第 2 节: 08:50 - 09:35
                { s: 9*60+40, e: 10*60+25 },  // 第 3 节: 09:40 - 10:25
                { s: 10*60+40, e: 11*60+25 }, // 第 4 节: 10:40 - 11:25
                { s: 11*60+30, e: 12*60+15 }, // 第 5 节: 11:30 - 12:15
                { s: 14*60+0,  e: 14*60+45 }, // 第 6 节: 14:00 - 14:45 (下午开始)
                { s: 14*60+50, e: 15*60+35 }, // 第 7 节: 14:50 - 15:35
                { s: 15*60+50, e: 16*60+35 }, // 第 8 节: 15:50 - 16:35
                { s: 16*60+40, e: 17*60+25 }, // 第 9 节: 16:40 - 17:25
                { s: 17*60+30, e: 18*60+15 }, // 第 10节: 17:30 - 18:15
                { s: 19*60+0,  e: 19*60+45 }, // 第 11节: 19:00 - 19:45 (晚上开始)
                { s: 19*60+50, e: 20*60+35 }, // 第 12节: 19:50 - 20:35
                { s: 20*60+40, e: 21*60+25 }  // 第 13节: 20:40 - 21:25
            ];

            // 如果还没到早八点前半小时，或者已经下晚课半小时后，直接隐藏光追线
            if (currentMins < schedule[0].s - 30 || currentMins > schedule[12].e + 30) {
                this.showTimeLine = false;
                return;
            }

            this.showTimeLine = true;
            let logicalSlot = -1; // 用来记录当前线应该处在“第几个格子”的位置

            // 遍历寻找当前时间在哪个区间
            for (let i = 0; i < schedule.length; i++) {
                if (currentMins < schedule[i].s) {
                    // 【情况A：在课间休息、中午休息、傍晚休息】
                    // 此时时间还没到第 i+1 节课的开始。
                    // 线条会精准停靠在上一节课的底边（也就是下一节课的顶边）原地待命！
                    // 例如：12:15 - 14:00 期间，logicalSlot = 5，线会死死贴在第5格的底线。
                    logicalSlot = i;
                    break;
                } else if (currentMins <= schedule[i].e) {
                    // 【情况B：正在上课】
                    // 计算在这 45 分钟内的进度比例 (0.0 ~ 1.0)
                    const progress = (currentMins - schedule[i].s) / (schedule[i].e - schedule[i].s);
                    // 实际位置 = 当前第几格 + 这节课上了百分之几
                    logicalSlot = i + progress;
                    break;
                }
            }

            // 如果超过了最后一节课，就让它停在课表的最底部
            if (logicalSlot === -1 && currentMins > schedule[schedule.length-1].e) {
                logicalSlot = 13;
            }

            // 最终把“逻辑格子数”乘以“物理像素高度”，输出完美的光追坐标！
            this.currentTimeY = logicalSlot * this.pixelsPerSlot;
        },

        /* ================= 课表交互控制 ================= */

        calculateRealWeek() {
            const start = new Date(this.termStartDate);
            start.setHours(0, 0, 0, 0);
            let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
            this.realWeek = this.currentWeek = Math.max(1, Math.min(weekCount, 25));
            this.settingWeek = this.realWeek;
        },

        changeWeek(delta) {
            let target = this.currentWeek + delta;
            this.currentWeek = target > 25 ? 1 : (target < 1 ? 25 : target);
        },

        selectWeek(w) {
            this.currentWeek = w;
            this.showWeekSelector = false;
        },

        calibrateWeek() {
            if (!this.settingWeek || this.settingWeek < 1 || this.settingWeek > 25) {
                alert("请输入 1-25 之间的有效周次");
                return;
            }

            let now = new Date();
            now.setHours(0, 0, 0, 0);
            let day = now.getDay() || 7;

            let monday = new Date(now);
            monday.setDate(monday.getDate() - day + 1);
            monday.setDate(monday.getDate() - (this.settingWeek - 1) * 7);

            let yyyy = monday.getFullYear();
            let mm = String(monday.getMonth() + 1).padStart(2, '0');
            let dd = String(monday.getDate()).padStart(2, '0');

            this.termStartDate = `${yyyy}-${mm}-${dd}`;
            localStorage.setItem("my_njust_start_date", this.termStartDate);
            this.calculateRealWeek();

            this.calibratedMsg = `校准成功！已推算开学日为 ${this.termStartDate}`;
            setTimeout(() => { this.calibratedMsg = ""; }, 3000);
        },

        openDetails(group) {
            this.selectedCourseGroup = group;
            this.showModal = true;
        },

        closeDetails() {
            this.showModal = false;
            this.selectedCourseGroup = [];
        },

        getDayName(d) {
            return ["一", "二", "三", "四", "五", "六", "日"][d - 1] || "未知";
        },

        getGroupCardStyle(group, index) {
            const minStart = Math.min(...group.map(c => c.start));
            const maxEnd = Math.max(...group.map(c => c.start + c.duration));
            const maxDuration = maxEnd - minStart;

            const firstCourse = group.find(c => c.start === minStart) || group[0];
            const colorIndex = firstCourse.name.length % this.colors.length;

            return {
                left: `calc(${(100 / 7) * (firstCourse.day - 1)}% + 2px)`,
                top: `${(minStart - 1) * this.pixelsPerSlot + 2}px`,
                height: `${maxDuration * this.pixelsPerSlot - 4}px`,
                backgroundColor: this.colors[colorIndex]
            };
        },

        /* ================= 滑动手势处理 ================= */
        handleTouchStart(e) {
            // 记录手指刚接触屏幕时的坐标
            this.touchStartX = e.changedTouches[0].clientX;
            this.touchStartY = e.changedTouches[0].clientY;
        },

        handleTouchEnd(e) {
            // 如果弹窗开着，或者不是单周模式，就不处理滑动切周
            if (this.showModal || this.viewMode !== 'week') return;

            // 记录手指离开屏幕时的坐标
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            // 计算水平和垂直滑动的距离
            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;

            // 【防误触判定】
            // 1. 只有水平滑动距离大于垂直滑动距离，才算左右滑（防止用户上下划屏幕看课表时误触发）
            // 2. 滑动距离必须大于 50 像素，才算有效操作
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    // 向右滑动（手指向右边甩）：查看上一周
                    this.changeWeek(-1);
                } else {
                    // 向左滑动（手指向左边甩）：查看下一周
                    this.changeWeek(1);
                }
            }
        },

        /* ================= 绩点计算 ================= */

        calcGpa(list) {
            let credit = 0, scoreSum = 0, gpaSum = 0;
            list.forEach(c => {
                const curCredit = parseFloat(c.credit) || 0;
                const curGpa = parseFloat(c.gpa) || 0;
                const curScore = parseFloat(c.numericScore) || 0;
                credit += curCredit;
                scoreSum += (curScore * curCredit);
                gpaSum += (curGpa * curCredit);
            });
            return {
                credit: credit.toFixed(1),
                avg: credit ? (scoreSum / credit).toFixed(3) : "0.000",
                gpa: credit ? (gpaSum / credit).toFixed(3) : "0.000"
            };
        },

        toggleCourseSelection(course) {
            course.selected = !course.selected;
        }
    },
    mounted() {
        this.calculateRealWeek();

        // 启动高度自适应
        this.calculateSlotHeight();
        // 监听屏幕旋转，随时重新计算
        window.addEventListener('resize', this.calculateSlotHeight);
        // 启动光追系统
        this.updateTimeLine();
        this.timeTrackerInterval = setInterval(() => {
            this.updateTimeLine();
        }, 60000); // 每 60 秒刷新一次时间线位置

        try {
            const saved = localStorage.getItem("my_njust_data");
            if (saved) {
                const parsed = JSON.parse(saved);
                this.courseList = parsed.courses || [];
                this.gradeList = parsed.grades || [];
            } else {
                this.switchTab("profile");
            }
        } catch (e) {
            this.switchTab("profile");
        }
    }
}).mount("#app");