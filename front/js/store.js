const { reactive } = Vue;

// 把以前在 app.js data() 里的核心数据，全部挪到这里当“共享大脑”
export const store = reactive({
    currentTab: "schedule",
    currentSubPage: "",

    // 数据缓存
    courseList: [],
    gradeList: [],
    levelExamsList: [],

    // 全局设置
    scheduleViewType: localStorage.getItem("my_njust_view_type") || "fixed",
    termStartDate: localStorage.getItem("my_njust_start_date") || "2026-03-02",
    currentWeek: 1,
    realWeek: 1
});