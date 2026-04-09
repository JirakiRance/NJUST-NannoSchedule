const { reactive } = Vue;

// 在大脑初始化时直接计算出当前真实周次
const savedStartDate = localStorage.getItem("my_njust_start_date") || "2026-03-02";
let start = new Date(savedStartDate); start.setHours(0, 0, 0, 0);
let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
let initWeek = Math.max(1, Math.min(weekCount, 25));
const savedTerms = JSON.parse(localStorage.getItem("my_njust_term_options") || "null");
const defaultTerms = ["2026-2027-2", "2026-2027-1", "2025-2026-2", "2025-2026-1", "2024-2025-2", "2024-2025-1"];

export const store = reactive({
    currentTab: "schedule",
    currentSubPage: "",
    currentTerm: localStorage.getItem("my_njust_term") || "2025-2026-2",

    termOptions: savedTerms || defaultTerms,

    // 数据缓存
    courseList: [],
    gradeList: [],
    levelExamsList: [],

    // 全局设置
    scheduleViewType: localStorage.getItem("my_njust_view_type") || "fixed",
    termStartDate: savedStartDate,
    currentWeek: initWeek,
    realWeek: initWeek
});