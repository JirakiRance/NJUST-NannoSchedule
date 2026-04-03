const API_BASE = "http://127.0.0.1:8000/api";

const { createApp } = Vue;

createApp({
    data() {
        return {
            currentTab: "schedule",
            loading: false,
            errorMsg: "",
            successMsg: "",
            captchaImg: "",
            loginForm: { username: "", password: "", captcha: "", session_id: "" },
            colors: ["#FFA07A", "#87CEFA", "#98FB98", "#DDA0DD", "#F08080", "#6495ED", "#FFB6C1", "#20B2AA"],
            courseList: [],

            showModal: false,
            showWeekSelector: false, // 控制周次选择弹窗
            selectedCourse: null,

            // 【配置项】第一周的星期一
            termStartDate: "2026-03-02",
            currentWeek: 1,
            realWeek: 1
        };
    },
    computed: {
        // 计算当前周每天的具体日期 (如: 3/2)
        currentWeekDates() {
            const start = new Date(this.termStartDate);
            // 移动到当前选择周的星期一
            start.setDate(start.getDate() + (this.currentWeek - 1) * 7);
            let dates = [];
            for (let i = 0; i < 7; i++) {
                let d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push((d.getMonth() + 1) + "/" + d.getDate());
            }
            return dates;
        },
        // 核心过滤器：过滤出本周所有的课
        filteredCourseList() {
            if (!this.courseList || this.courseList.length === 0) return [];
            return this.courseList.filter(course => {
                if (!course.weeks) return true;
                const ranges = course.weeks.match(/(\d+)-(\d+)/g);
                if (ranges) {
                    for (let i = 0; i < ranges.length; i++) {
                        let parts = ranges[i].split("-");
                        let start = parseInt(parts[0]);
                        let end = parseInt(parts[1]);
                        if (this.currentWeek >= start && this.currentWeek <= end) {
                            return true;
                        }
                    }
                    return false;
                } else {
                    return true;
                }
            });
        },
        // 正常显示在网格里的课 (1-12节内)
        regularCourses() {
            return this.filteredCourseList.filter(c => c.start >= 1 && c.start <= 12 && c.day >= 1 && c.day <= 7);
        },
        // 网课或时间未知的课 (放在底部)
        otherCourses() {
            return this.filteredCourseList.filter(c => !(c.start >= 1 && c.start <= 12 && c.day >= 1 && c.day <= 7));
        }
    },
    mounted() {
        this.calculateRealWeek();
        try {
            const savedData = localStorage.getItem("my_njust_schedule");
            if (savedData) {
                this.courseList = JSON.parse(savedData);
            } else {
                this.currentTab = "profile";
                this.fetchCaptcha();
            }
        } catch (e) {
            this.currentTab = "profile";
            this.fetchCaptcha();
        }
    },
    methods: {
        calculateRealWeek() {
            const start = new Date(this.termStartDate);
            start.setHours(0, 0, 0, 0);
            const now = new Date();
            const diffTime = now - start;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            let weekCount = Math.floor(diffDays / 7) + 1;
            if (weekCount < 1) weekCount = 1;
            if (weekCount > 25) weekCount = 25;

            this.realWeek = weekCount;
            this.currentWeek = weekCount;
        },
        // 增减周次，实现 1-25 循环
        changeWeek(delta) {
            let target = this.currentWeek + delta;
            if (target > 25) target = 1;  // 超过 25 回到 1
            if (target < 1) target = 25;  // 低于 1 回到 25
            this.currentWeek = target;
        },
        // 直接选择某一周
        selectWeek(w) {
            this.currentWeek = w;
            this.showWeekSelector = false;
        },

        switchTab(tab) {
            this.currentTab = tab;
            this.errorMsg = "";
            this.successMsg = "";
            if (tab === "profile" && !this.captchaImg) {
                this.fetchCaptcha();
            }
        },
        async fetchCaptcha() {
            try {
                this.errorMsg = "";
                const res = await fetch(API_BASE + "/captcha");
                if (!res.ok) throw new Error("Backend error");
                const data = await res.json();
                this.captchaImg = data.captcha_image;
                this.loginForm.session_id = data.session_id;
                this.loginForm.captcha = "";
            } catch (e) {
                this.errorMsg = "无法连接到 Python 服务器。";
            }
        },
        async doLogin() {
            if(!this.loginForm.username || !this.loginForm.captcha) {
                this.errorMsg = "请填写完整信息";
                return;
            }
            this.loading = true; this.errorMsg = ""; this.successMsg = "";
            try {
                const res = await fetch(API_BASE + "/login_and_get_schedule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(this.loginForm)
                });
                const data = await res.json();

                if (res.ok) {
                    this.courseList = data.data;
                    localStorage.setItem("my_njust_schedule", JSON.stringify(data.data));
                    this.successMsg = "同步成功！";
                    setTimeout(() => { this.switchTab("schedule"); }, 1000);
                } else {
                    this.errorMsg = data.detail || "验证失败";
                    this.fetchCaptcha();
                }
            } catch (e) {
                this.errorMsg = "网络连接异常";
            } finally {
                this.loading = false;
            }
        },
        clearLocalData() {
            if(confirm("确定要清空数据吗？")) {
                localStorage.removeItem("my_njust_schedule");
                this.courseList = [];
                this.loginForm.password = "";
                this.loginForm.captcha = "";
            }
        },
        openDetails(course) {
            this.selectedCourse = course;
            this.showModal = true;
        },
        closeDetails() {
            this.showModal = false;
            this.selectedCourse = null;
        },
        getDayName(dayIndex) {
            const days = ["一", "二", "三", "四", "五", "六", "日"];
            return days[dayIndex - 1] || "未知";
        },
        getCardStyle(course, index) {
            var colWidth = 100 / 7;
            var rowHeight = 60;
            var bgColor = this.colors[index % this.colors.length];

            var leftPos = "calc(" + (colWidth * (course.day - 1)) + "% + 2px)";
            var topPos = ((course.start - 1) * rowHeight + 2) + "px";
            var heightVal = (course.duration * rowHeight - 4) + "px";

            return {
                left: leftPos,
                top: topPos,
                height: heightVal,
                backgroundColor: bgColor
            };
        }
    }
}).mount("#app");