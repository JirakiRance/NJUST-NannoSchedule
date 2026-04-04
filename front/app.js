//本地测试
//const API_BASE = "http://127.0.0.1:8000/api";
//服务器
const API_BASE = "https://njust-nannoschedule.onrender.com/api"

const { createApp } = Vue;

createApp({
    data() {
        return {
            // UI 状态
            currentTab: "schedule",
            viewMode: "week",
            loading: false,
            errorMsg: "",
            successMsg: "",

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
            calibratedMsg: ""
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
                if (!c.weeks) return true;
                const ranges = c.weeks.match(/(\d+)-(\d+)/g);
                if (ranges) {
                    return ranges.some(r => {
                        let [start, end] = r.split("-").map(Number);
                        return this.currentWeek >= start && this.currentWeek <= end;
                    });
                }
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
        }
    },
    methods: {
        /* ================= 数据同步接口 ================= */

        switchTab(tab) {
            this.currentTab = tab;
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
                this.errorMsg = "请填写完整信息";
                return;
            }
            this.loading = true;
            this.errorMsg = "";
            this.successMsg = "";
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
                    this.successMsg = "同步成功！";
                    setTimeout(() => { this.switchTab("schedule"); }, 1000);
                } else {
                    this.errorMsg = result.detail || "验证失败";
                    this.fetchCaptcha();
                }
            } catch (e) {
                this.errorMsg = "网络连接异常";
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
                top: `${(minStart - 1) * 60 + 2}px`,
                height: `${maxDuration * 60 - 4}px`,
                backgroundColor: this.colors[colorIndex]
            };
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