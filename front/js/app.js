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
import SchoolCalendarView from './components/SchoolCalendarView.js';
import ContactView from './components/ContactView.js';
import SettingsView from './components/SettingsView.js';

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
        SchoolCalendarView,
        ContactView,
        SettingsView
    },
    data() {
        return { store };
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
                    'school_calendar': '学校年历',
                    'contact': '联系开发者'
                };
                return titleMap[this.store.currentSubPage] || '应用中心';
            }
            return 'NannoSchedule';
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
        }
    },

    mounted() {
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
            } else { store.currentTab = "profile"; }
        } catch (e) { store.currentTab = "profile"; }
    }
}).mount("#app");