import { store } from './store.js';
import ScheduleView from './components/ScheduleView.js';
import GradesView from './components/GradesView.js';
import LevelExamsView from './components/LevelExamsView.js';
import ExamsView from './components/ExamsView.js';
import LibraryView from './components/LibraryView.js';
import ProfileView from './components/ProfileView.js';
import WebsitesView from './components/WebsitesView.js';
import PublicCourseView from './components/PublicCourseView.js';
import EmptyRoomsView from './components/EmptyRoomsView.js';
import SchoolGuideView from './components/SchoolGuideView.js';
import ContactView from './components/ContactView.js';
import SettingsView from './components/SettingsView.js';
import LoginCard from './components/LoginCard.js';

const { createApp } = Vue;

createApp({
    // 注册所有的组件
    components: {
        ScheduleView,
        GradesView,
        LevelExamsView,
        ExamsView,
        LibraryView,
        ProfileView,
        WebsitesView,
        PublicCourseView,
        EmptyRoomsView,
        SchoolGuideView,
        ContactView,
        SettingsView,
        LoginCard
    },
    data() {
        return {
            store,
            notificationTimer: null
         };
    },
    computed: {
        pageTitle() {
            // 1. 课表页标题
            if (this.store.currentTab === 'schedule') return '我的课表';

            // 2. 个人中心页标题 (处理子页面逻辑)
            if (this.store.currentTab === 'profile') {
                if (this.store.currentSubPage === 'settings') return '更多设置';
                return '个人中心'; // Profile 主界面标题
            }

            // 3. 应用中心页标题
            if (this.store.currentTab === 'other') {
                const titleMap = {
                    'grades': '成绩查询',
                    'exams': '考试安排',
                    'level_exams': '等级考试',
                    'books': '图书查询',
                    'websites': '常用网站',
                    'public_course': '蹭课查询',
                    'empty_rooms': '空闲教室',
                    'school_guide': '校园导览',
                    'contact': '联系开发者'
                };
                return titleMap[this.store.currentSubPage] || '应用中心';
            }
            return 'NannoSchedule';
        }
    },

    watch: {
        // 1. 监听考试列表：不论是点击【同步】还是【注入测试数据】，只要数据变了，立刻触发检查！
        'store.examsList': {
            deep: true,
            handler() {
                if (this.isEligibleEnv()) this.checkExamNotifications();
            }
        },
        // 2. 监听提醒开关：用户在设置里刚刚点开，立刻触发检查！
        'store.examReminder.enabled'(newVal) {
            if (newVal && this.isEligibleEnv()) this.checkExamNotifications();
        }
    },

    methods: {
        openSubPage(pageName) {
            this.store.currentSubPage = pageName;
            window.history.pushState({ target: 'subPage' }, '', '#subPage');
        },
        closeSubPage() {
            window.history.back();
        },
        handleSystemBack(event) {
            if (this.store.currentSubPage !== '') {
                this.store.currentSubPage = '';
            }
        },
        switchTab(tabName) {
            if (this.store.currentTab === tabName) {
                // 如果用户连续点击当前高亮的 Tab，且正处于子页面中，则快速返回主界面
                if (this.store.currentSubPage !== '') {
                    this.closeSubPage();
                }
            } else {
                // 如果切换到其他 Tab，强制清空子页面状态，彻底防止“串台”导致的白屏
                this.store.currentSubPage = '';
                this.store.currentTab = tabName;
            }
        },

        // 增加手机端检测逻辑
        isEligibleEnv() {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
            return isMobile || isLocal;
        },

        // 检查并触发考试提醒
        checkExamNotifications() {
            console.log("[通知扫描] 开始扫描考试时间...");
            if (!this.isEligibleEnv()) {
                console.log("[通知扫描] 检测为生产网页端，已跳过");
                return;
            }

            if (!this.store.examReminder.enabled) {
                console.log("[通知扫描] 用户未开启考试提醒");
                return;
            }

            // 权限拦截逻辑：如果没有安卓原生接口，且网页 Notification 权限未授权，则拦截
            if (!window.AndroidNative && "Notification" in window && Notification.permission !== 'granted') {
                 console.log("[通知扫描] 无浏览器通知权限，且无原生接口");
                 return;
            }

            if (!this.store.examsList || this.store.examsList.length === 0) {
                console.log("[通知扫描] 考试列表为空，跳过");
                return;
            }

            const now = new Date().getTime();
            const notifiedLog = JSON.parse(localStorage.getItem('njust_exam_notified_log') || '{}');
            let hasNewNotification = false;

            const timeLimits = {
                '7d': 7 * 24 * 60 * 60 * 1000, '3d': 3 * 24 * 60 * 60 * 1000, '1d': 1 * 24 * 60 * 60 * 1000,
                '12h': 12 * 60 * 60 * 1000, '3h': 3 * 60 * 60 * 1000, '1h': 1 * 60 * 60 * 1000
            };

            let checkCount = 0;
            let delayQueue = 0;

            this.store.examsList.forEach(exam => {
                const match = exam.time.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
                if (!match) return;
                const startTime = new Date(match[1].replace(/-/g, '/') + ' ' + match[2] + ':00').getTime();
                const timeDiff = startTime - now;

                if (timeDiff <= 0) return;
                checkCount++;

                this.store.examReminder.selectedTimings.forEach(timing => {
                    const limitMs = timeLimits[timing];
                    const notifKey = `${exam.course_name}_${startTime}_${timing}`;

                    if (timeDiff <= limitMs && !notifiedLog[notifKey]) {
                        console.log(`[通知扫描] 触发目标: ${exam.course_name} (策略: ${timing})`);

                        setTimeout(() => {
                            this.sendSystemNotification(`考试提醒：${exam.course_name}`, {
                                body: `距离考试不到 ${timing.replace('d','天').replace('h','小时')}！\n时间：${exam.time}\n考场：${exam.room || '待定'} | 座位：${exam.seat || '--'}`,
                                icon: './img/logo.png',
                                vibrate: [200, 100, 200]
                            });
                        }, delayQueue * 800);

                        delayQueue++;
                        notifiedLog[notifKey] = true;
                        hasNewNotification = true;
                    }
                });
            });

            console.log(`[通知扫描] 扫描完毕，有效待考科目: ${checkCount}`);
            if (hasNewNotification) {
                localStorage.setItem('njust_exam_notified_log', JSON.stringify(notifiedLog));
            }
        },

        sendSystemNotification(title, options) {
            console.log("[系统推送] 准备分发通知:", title);

            // 1. 优先尝试通过 Android JS Bridge 发送原生通知
            if (window.AndroidNative && window.AndroidNative.showNotification) {
                console.log("[系统推送] 调用底层 Android 原生通知");
                window.AndroidNative.showNotification(title, options.body);
                return;
            }

            // 2. 如果不支持原生 API 且没有桥接对象，执行应用内横幅降级
            if (!("Notification" in window)) {
                console.log("[系统推送] 环境受限，触发应用内强力横幅");
                const toastDiv = document.createElement('div');
                toastDiv.className = 'toast show';
                toastDiv.style.backgroundColor = '#ff9500';
                toastDiv.style.boxShadow = '0 10px 25px rgba(255, 149, 0, 0.4)';
                toastDiv.style.padding = '15px';
                toastDiv.innerHTML = `
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;"><i class="ri-alarm-warning-fill"></i> ${title}</div>
                    <div style="font-size: 13px; line-height: 1.5; white-space: pre-wrap; text-align: left;">${options.body}</div>
                `;
                document.getElementById('toast-container').appendChild(toastDiv);

                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

                setTimeout(() => {
                    toastDiv.classList.remove('show');
                    setTimeout(() => toastDiv.remove(), 300);
                }, 8000);
                return;
            }

            // 3. PWA 或 桌面浏览器兜底逻辑
            try {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistration().then(reg => {
                        if (reg && reg.active) {
                            console.log("[系统推送] 走 ServiceWorker 发送");
                            reg.showNotification(title, options);
                        } else {
                            console.log("[系统推送] 无激活的 SW，降级走网页 Notification");
                            new Notification(title, options);
                        }
                    }).catch(err => {
                        console.log("[系统推送] SW 捕获异常，强制兜底发送", err);
                        new Notification(title, options);
                    });
                } else {
                    console.log("[系统推送] 走传统原生 Notification 发送");
                    new Notification(title, options);
                }
            } catch (e) {
                console.error("[系统推送] 发送彻底异常:", e);
            }
        },

        // 全局初始化配置
        async initAppConfig() {
            try {
                const timestamp = new Date().getTime();
                const res = await fetch(`https://ns-release.jiraki.top/notice.json?t=${timestamp}`);
                if (!res.ok) return;

                const data = await res.json();

                // 1. 处理全局公告栏 (存入全局 store 以便 ProfileView 读取)
                if (data.show) {
                     this.store.globalNotice = data;
                }

                // 2. 处理学期基准自动更新
                if (data.term_update) {
                    const remoteConfig = data.term_update;
                    const localConfigVersion = localStorage.getItem("my_njust_term_config_version");
                    const hasLocalTerm = localStorage.getItem("my_njust_term"); // 判断是不是全新用户

                    // 如果版本号不同，或者是第一次打开软件，则强制覆盖
                    if (localConfigVersion !== remoteConfig.version_id || !hasLocalTerm) {
                        this.store.currentTerm = remoteConfig.term;
                        this.store.termStartDate = remoteConfig.start_date;
                        localStorage.setItem("my_njust_term", remoteConfig.term);
                        localStorage.setItem("my_njust_start_date", remoteConfig.start_date);
                        localStorage.setItem("my_njust_term_config_version", remoteConfig.version_id);

                        // 清除"获取中..."的占位符并更新列表
                        const newOptions = this.store.termOptions.filter(t => t !== "获取中...");
                        if (!newOptions.includes(remoteConfig.term)) {
                            newOptions.unshift(remoteConfig.term);
                        }
                        this.store.termOptions = newOptions;
                        localStorage.setItem("my_njust_term_options", JSON.stringify(newOptions));

                        // 重新计算周次
                        let start = new Date(remoteConfig.start_date);
                        start.setHours(0, 0, 0, 0);
                        let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
                        this.store.realWeek = Math.max(1, Math.min(weekCount, 25));
                        this.store.currentWeek = this.store.realWeek;

                        // 只有老用户（本地有版本号但不同）更新学期时才弹窗，首次打开新用户不弹窗打扰
                        if (localConfigVersion) {
                            setTimeout(() => {
                                // 这里使用原生的 alert 或者简单的 console，因为主组件可能没有引用 showToast
                                console.log(`已自动为您校准至 ${remoteConfig.term} 学期`);
                            }, 800);
                        }
                    }
                }
            } catch (e) {
                console.log("初始化配置失败，使用本地缓存");
            }
        },

    },
    mounted() {

        // 应用启动时立刻拉取云端配置
        this.initAppConfig();

        // 监听系统的历史回退事件
        window.addEventListener('popstate', this.handleSystemBack);
        // 读取本地缓存
        try {
            const saved = localStorage.getItem("my_njust_data");
            if (saved) {
                const parsed = JSON.parse(saved);
                store.courseList = parsed.courses || [];
                store.gradeList = parsed.grades || [];
                store.levelExamsList = parsed.level_exams || [];
                store.examsList = parsed.exams || [];
            } else { store.currentTab = "profile"; }
        } catch (e) { store.currentTab = "profile"; }

        // 只有在手机端才启动守护进程
        if (this.isEligibleEnv()) {
            console.log("手机端环境，启动考试提醒守护进程...");
            this.checkExamNotifications();
            this.notificationTimer = setInterval(this.checkExamNotifications, 60000);
        }
    },
    unmounted() {
        // 防止内存泄漏
        if (this.notificationTimer) clearInterval(this.notificationTimer);
    }
}).mount("#app");