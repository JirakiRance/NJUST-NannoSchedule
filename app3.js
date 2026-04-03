const API_BASE = "http://127.0.0.1:8000/api";
const { createApp } = Vue;

createApp({
    data() {
        return {
            loading: false,
            errorMsg: "",
            successMsg: "",
            captchaImg: "",
            loginForm: { username: "", password: "", captcha: "", session_id: "" },
            gradeList: [] // 后端抓取的真实数据
        };
    },
    computed: {
        // 将扁平的数据列表按学期进行分组，并按时间倒序排列
        semesters() {
            const groups = {};
            this.gradeList.forEach(item => {
                if (!groups[item.semester]) {
                    groups[item.semester] = { name: item.semester, courses: [] };
                }
                groups[item.semester].courses.push(item);
            });
            return Object.values(groups).sort((a, b) => b.name.localeCompare(a.name));
        },
        // 全局动态统计
        overallStats() {
            const all = this.calc(this.gradeList);
            const selected = this.calc(this.gradeList.filter(g => g.selected));
            return { all, selected };
        }
    },
    methods: {
        // 通用成绩计算逻辑：总学分、加权均分、平均GPA
        calc(list) {
            let credit = 0, scoreSum = 0, gpaSum = 0;
            list.forEach(c => {
                credit += c.credit;
                scoreSum += (c.numericScore * c.credit);
                gpaSum += (c.gpa * c.credit);
            });
            return {
                credit: credit.toFixed(1),
                avg: credit ? (scoreSum / credit).toFixed(3) : "0.000",
                gpa: credit ? (gpaSum / credit).toFixed(3) : "0.000"
            };
        },
        // 获取单个学期的统计数据
        getSemesterStats(semester) {
            return {
                all: this.calc(semester.courses),
                selected: this.calc(semester.courses.filter(c => c.selected))
            };
        },
        // 刷新验证码
        async fetchCaptcha() {
            try {
                const res = await fetch(`${API_BASE}/captcha`);
                const data = await res.json();
                this.captchaImg = data.captcha_image;
                this.loginForm.session_id = data.session_id;
                this.loginForm.captcha = "";
            } catch (e) {
                this.errorMsg = "无法连接后端，请检查 main.py 是否启动";
            }
        },
        // 同步成绩主函数
        async syncGrades() {
            if (!this.loginForm.captcha) { this.errorMsg = "请输入验证码"; return; }
            this.loading = true;
            this.errorMsg = "";
            try {
                const res = await fetch(`${API_BASE}/get_grades`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(this.loginForm)
                });
                const data = await res.json();
                if (res.ok) {
                    this.gradeList = data.data;
                    this.successMsg = "同步成功！";
                    localStorage.setItem("my_grades", JSON.stringify(data.data));
                } else {
                    this.errorMsg = data.detail || "同步失败，请检查验证码";
                    this.fetchCaptcha();
                }
            } catch (e) {
                this.errorMsg = "请求超时或网络错误";
            }
            this.loading = false;
        },
        // 切换单门课是否计入统计
        toggleCourseSelection(course) {
            course.selected = !course.selected;
        }
    },
    mounted() {
        this.fetchCaptcha();
        // 启动时读取本地缓存
        const saved = localStorage.getItem("my_grades");
        if (saved) {
            this.gradeList = JSON.parse(saved);
        }
    }
}).mount("#app3");