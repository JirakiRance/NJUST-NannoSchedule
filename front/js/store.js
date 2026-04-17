const { reactive } = Vue;

// 开学日期没有任何缓存时，坚决使用当天 new Date()
const savedStartDate = localStorage.getItem("my_njust_start_date") || new Date().toISOString().split('T')[0];
let start = new Date(savedStartDate); start.setHours(0, 0, 0, 0);
let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
let initWeek = Math.max(1, Math.min(weekCount, 25));

const defaultTerms = ["2026-2027-2", "2026-2027-1", "2025-2026-2", "2025-2026-1", "2024-2025-2", "2024-2025-1"];
let savedTerms = [];
try {
    const raw = localStorage.getItem("my_njust_term_options");
    if (raw && raw !== "null" && raw !== "undefined" && raw !== '["获取中..."]') {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) savedTerms = parsed;
    }
} catch (e) {}

const savedTermStr = localStorage.getItem("my_njust_term");
// 如果没有缓存，直接传空字符串 ""。教务处接收到空字符串，会自动返回当前最新学期的课表
const finalTerm = (savedTermStr && savedTermStr !== "null" && savedTermStr !== "获取中...") ? savedTermStr : "";
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
    globalNotice: null,
    // 如果没有，先给个占位符，避免在渲染时报错
    currentTerm: finalTerm,
    termOptions: savedTerms.length > 0 ? savedTerms : ["获取中..."],

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

   // 嗅探兽系统状态
    sniffer: {
        enabled: JSON.parse(localStorage.getItem("my_njust_sniffer_enabled") || "false"),
        interval: Number(localStorage.getItem("my_njust_sniffer_interval") || 10), // 底层保活心跳 (小时)
        dataInterval: localStorage.getItem("my_njust_sniffer_data_interval") || "7d", // 业务数据检查频率
        status: 'sleeping', // sleeping, breathing, dead
        sessionId: localStorage.getItem("my_njust_sniffer_session") || "",
        activeNode: localStorage.getItem("my_njust_sniffer_node") || "",
        lastBeat: '',
        intelligence: JSON.parse(localStorage.getItem("my_njust_sniffer_intelligence") || "[]"), // sniffer未读情报数组，持久化存储
        visualMode: localStorage.getItem("my_njust_sniffer_mode") || 'emoji',
        modelId: localStorage.getItem("my_njust_sniffer_model") || 'shizuku'
    },

    userAccount: {
        // 默认开启记住密码（只要不是显式存了 "false"，就认为是 true）
        remember: localStorage.getItem("my_njust_remember") !== "false",
        username: localStorage.getItem("my_njust_username") || "",
        password: localStorage.getItem("my_njust_password") || ""
    }
});