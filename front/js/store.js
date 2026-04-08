const { reactive } = Vue;

// 在大脑初始化时直接计算出当前真实周次
const savedStartDate = localStorage.getItem("my_njust_start_date") || "2026-03-02";
let start = new Date(savedStartDate); start.setHours(0, 0, 0, 0);
let weekCount = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 7)) + 1;
let initWeek = Math.max(1, Math.min(weekCount, 25));

export const store = reactive({
    currentTab: "schedule",
    currentSubPage: "",

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