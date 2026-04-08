import { store } from './store.js';
import ScheduleView from './components/ScheduleView.js';
import GradesView from './components/GradesView.js';
import LevelExamsView from './components/LevelExamsView.js';
import ExamsView from './components/ExamsView.js';
import LibraryView from './components/LibraryView.js';
import ProfileView from './components/ProfileView.js';

const { createApp } = Vue;

createApp({
    // 注册所有的组件
    components: {
        ScheduleView,
        GradesView,
        LevelExamsView,
        ExamsView,
        LibraryView,
        ProfileView
    },
    data() {
        return { store };
    },
    computed: {
        pageTitle() {
            if (this.store.currentTab === 'schedule') return '我的课表';
            if (this.store.currentTab === 'profile') return '我的设置';
            if (this.store.currentTab === 'other') {
                const titleMap = { 'grades': '成绩单', 'exams': '考试安排', 'level_exams': '等级考试', 'books': '图书查询' };
                return titleMap[this.store.currentSubPage] || '应用中心';
            }
            return 'NannoSchedule';
        }
    },
    mounted() {
        // 全局计算一下当前的周次
        let start = new Date(store.termStartDate); start.setHours(0, 0, 0, 0);
        let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
        store.realWeek = store.currentWeek = Math.max(1, Math.min(weekCount, 25));

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