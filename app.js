const API_BASE = "http://127.0.0.1:8000/api";

const { createApp } = Vue;

createApp({
    data() {
        return {
            currentTab: 'schedule',
            loading: false,
            errorMsg: '',
            successMsg: '',
            captchaImg: '',
            loginForm: { username: '', password: '', captcha: '', session_id: '' },
            colors: ['#FFA07A', '#87CEFA', '#98FB98', '#DDA0DD', '#F08080', '#6495ED', '#FFB6C1', '#20B2AA'],
            courseList: []
        }
    },
    mounted() {
        try {
            const savedData = localStorage.getItem('my_njust_schedule');
            if (savedData) {
                this.courseList = JSON.parse(savedData);
            } else {
                this.currentTab = 'profile';
                this.fetchCaptcha();
            }
        } catch (e) {
            this.currentTab = 'profile';
            this.fetchCaptcha();
        }
    },
    methods: {
        switchTab(tab) {
            this.currentTab = tab;
            this.errorMsg = '';
            this.successMsg = '';
            if (tab === 'profile' && !this.captchaImg) {
                this.fetchCaptcha();
            }
        },
        async fetchCaptcha() {
            try {
                this.errorMsg = '';
                const res = await fetch(`${API_BASE}/captcha`);
                if (!res.ok) throw new Error("后端响应错误");
                const data = await res.json();
                this.captchaImg = data.captcha_image;
                this.loginForm.session_id = data.session_id;
                this.loginForm.captcha = '';
            } catch (e) {
                this.errorMsg = "无法连接到 Python 服务器，请确保后端黑框框没关。";
            }
        },
        async doLogin() {
            if(!this.loginForm.username || !this.loginForm.captcha) {
                this.errorMsg = "请填写完整信息"; return;
            }
            this.loading = true; this.errorMsg = ''; this.successMsg = '';
            try {
                const res = await fetch(`${API_BASE}/login_and_get_schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.loginForm)
                });
                const data = await res.json();

                if (res.ok) {
                    this.courseList = data.data;
                    localStorage.setItem('my_njust_schedule', JSON.stringify(data.data));
                    this.successMsg = "同步成功！已保存至本地。";
                    setTimeout(() => { this.switchTab('schedule'); }, 1000);
                } else {
                    this.errorMsg = data.detail || "验证失败，请重试";
                    this.fetchCaptcha();
                }
            } catch (e) {
                this.errorMsg = "网络连接异常，无法访问后端";
            } finally {
                this.loading = false;
            }
        },
        clearLocalData() {
            if(confirm('确定要清空本地的课表数据吗？')) {
                localStorage.removeItem('my_njust_schedule');
                this.courseList = [];
                this.loginForm.password = '';
                this.loginForm.captcha = '';
            }
        },
        getCardStyle(course, index) {
            const columnWidth = 100 / 7;
            const rowHeight = 60;
            const bgColor = this.colors[index % this.colors.length];
            return {
                left: 'calc(' + (columnWidth * (course.day - 1)) + '% + 2px)',
                top: ((course.start - 1) * rowHeight + 2px) + 'px',
                height: (course.duration * rowHeight - 4) + 'px',
                backgroundColor: bgColor
            };
        }
    }
}).mount('#app');