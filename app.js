const API_BASE = "http://127.0.0.1:8000/api";
const { createApp } = Vue;

createApp({
    data() {
        return {
            currentTab: "schedule",
            viewMode: "week", // 模式：'week' (单周) 或 'semester' (全学期)

            loading: false,
            errorMsg: "",
            successMsg: "",
            captchaImg: "",
            loginForm: { username: "", password: "", captcha: "", session_id: "" },

            courseList: [],
            gradeList: [],

            colors: ["#FFA07A", "#87CEFA", "#98FB98", "#DDA0DD", "#F08080", "#6495ED", "#FFB6C1", "#20B2AA"],
            showModal: false,
            showWeekSelector: false,
            selectedCourseGroup: [], // 支持传入多门课的数组
            termStartDate: "2026-03-02", // 第一周的星期一
            currentWeek: 1,
            realWeek: 1
        };
    },
    computed: {
        /* ================= 课表模块 ================= */
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
        // 核心：把同一时间点的课组合到一起（重叠算法）
        gridCourseGroups() {
            const targetList = this.viewMode === 'week' ? this.filteredCourseList : this.courseList;
            const regular = targetList.filter(c => c.start >= 1 && c.start <= 12 && c.day >= 1 && c.day <= 7);
            const groups = {};
            regular.forEach(c => {
                const key = `${c.day}-${c.start}`;
                if (!groups[key]) groups[key] = [];
                // 去重保护：防止同名同时间的课被推入多次
                if (!groups[key].some(existing => existing.name === c.name && existing.weeks === c.weeks)) {
                    groups[key].push(c);
                }
            });
            return Object.values(groups);
        },
        otherCourses() {
            const targetList = this.viewMode === 'week' ? this.filteredCourseList : this.courseList;
            return targetList.filter(c => !(c.start >= 1 && c.start <= 12 && c.day >= 1 && c.day <= 7));
        },

        /* ================= 成绩模块 ================= */
        semesters() {
            const groups = {};
            this.gradeList.forEach(item => {
                if (!groups[item.semester]) groups[item.semester] = { name: item.semester, courses: [] };
                groups[item.semester].courses.push(item);
            });
            return Object.values(groups).sort((a, b) => b.name.localeCompare(a.name));
        },
        overallStats() {
            return {
                all: this.calcGpa(this.gradeList),
                selected: this.calcGpa(this.gradeList.filter(g => g.selected))
            };
        }
    },
    methods: {
        /* ================= 通用与同步 ================= */
        switchTab(tab) {
            this.currentTab = tab; this.errorMsg = ""; this.successMsg = "";
            if (tab === "profile" && !this.captchaImg) this.fetchCaptcha();
        },
        async fetchCaptcha() {
            try {
                this.errorMsg = "";
                const res = await fetch(`${API_BASE}/captcha`);
                const data = await res.json();
                this.captchaImg = data.captcha_image;
                this.loginForm.session_id = data.session_id;
            } catch (e) { this.errorMsg = "无法连接服务器，请检查 Python 是否运行"; }
        },
        async syncAllData() {
            if(!this.loginForm.username || !this.loginForm.captcha) { this.errorMsg = "请填写完整信息"; return; }
            this.loading = true; this.errorMsg = ""; this.successMsg = "";
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
            } catch (e) { this.errorMsg = "网络连接异常"; } finally { this.loading = false; }
        },
        clearLocalData() {
            if(confirm("确定要清空所有本地缓存吗？")) {
                localStorage.removeItem("my_njust_data");
                this.courseList = []; this.gradeList = [];
                this.loginForm.password = ""; this.loginForm.captcha = "";
            }
        },

        /* ================= 课表操作 ================= */
        calculateRealWeek() {
            const start = new Date(this.termStartDate); start.setHours(0, 0, 0, 0);
            let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
            this.realWeek = this.currentWeek = Math.max(1, Math.min(weekCount, 25));
        },
        changeWeek(delta) {
            let target = this.currentWeek + delta;
            this.currentWeek = target > 25 ? 1 : (target < 1 ? 25 : target);
        },
        selectWeek(w) { this.currentWeek = w; this.showWeekSelector = false; },

        openDetails(group) { this.selectedCourseGroup = group; this.showModal = true; },
        closeDetails() { this.showModal = false; this.selectedCourseGroup = []; },
        getDayName(d) { return ["一", "二", "三", "四", "五", "六", "日"][d - 1] || "未知"; },

        getGroupCardStyle(group, index) {
            const firstCourse = group[0];
            const maxDuration = Math.max(...group.map(c => c.duration));
            const colorIndex = firstCourse.name.length % this.colors.length;
            return {
                left: `calc(${(100 / 7) * (firstCourse.day - 1)}% + 2px)`,
                top: `${(firstCourse.start - 1) * 60 + 2}px`,
                height: `${maxDuration * 60 - 4}px`,
                backgroundColor: this.colors[colorIndex]
            };
        },

        /* ================= 成绩计算 ================= */
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
        toggleCourseSelection(course) { course.selected = !course.selected; }
    },
    mounted() {
        this.calculateRealWeek();
        try {
            const saved = localStorage.getItem("my_njust_data");
            if (saved) {
                const parsed = JSON.parse(saved);
                this.courseList = parsed.courses || [];
                this.gradeList = parsed.grades || [];
            } else { this.switchTab("profile"); }
        } catch (e) { this.switchTab("profile"); }
    }
}).mount("#app");