const { reactive } = Vue;

// 计算出当前真实周次
const savedStartDate = localStorage.getItem("my_njust_start_date") || "2026-03-02";
let start = new Date(savedStartDate); start.setHours(0, 0, 0, 0);
let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
let initWeek = Math.max(1, Math.min(weekCount, 25));
const savedTerms = JSON.parse(localStorage.getItem("my_njust_term_options") || "null");
const defaultTerms = ["2026-2027-2", "2026-2027-1", "2025-2026-2", "2025-2026-1", "2024-2025-2", "2024-2025-1"];

// 读取本地持久化的自定义课表
const savedCustomCourses = JSON.parse(localStorage.getItem("my_njust_custom_courses") || "[]");

// 读取并立即应用主题颜色，防止闪烁
const savedThemeColor = localStorage.getItem("my_njust_theme_color") || "#5b9bd5";
document.documentElement.style.setProperty('--primary-color', savedThemeColor);

// 读取并立即应用深浅色模式，防止闪烁
const savedThemeMode = localStorage.getItem("my_njust_theme_mode") || "light";
document.documentElement.setAttribute('data-theme', savedThemeMode);

export const store = reactive({
    currentTab: "schedule",
    currentSubPage: "",
    currentTerm: localStorage.getItem("my_njust_term") || "2025-2026-2",

    termOptions: savedTerms || defaultTerms,

    // 数据缓存
    courseList: [],
    gradeList: [],
    levelExamsList: [],

    // 自定义课表独立存储列
    customCoursesList: savedCustomCourses,

    // 全局设置
    scheduleViewType: localStorage.getItem("my_njust_view_type") || "fixed",
    termStartDate: savedStartDate,
    currentWeek: initWeek,
    realWeek: initWeek,

    // 主题颜色状态
    themeColor: savedThemeColor,
    themeMode: savedThemeMode,

    // 三个精细化不透明度状态
    highlightOpacity: Number(localStorage.getItem("my_njust_highlight_opacity") ?? 0.2),
    cardOpacity: Number(localStorage.getItem("my_njust_card_opacity") ?? 0.95),
    bgOpacity: Number(localStorage.getItem("my_njust_bg_opacity") ?? 1.0),

    // 考试提醒设置
    examReminder: {
        enabled: JSON.parse(localStorage.getItem("exam_reminder_enabled") || "false"),
        // 默认选择：3天, 12h, 1h
        selectedTimings: JSON.parse(localStorage.getItem("exam_reminder_timings") || '["3d", "12h", "1h"]')
    },
});