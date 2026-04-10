import { store } from '../store.js';

export default {
    template: `
        <div class="grades-container">
            <div v-if="store.gradeList.length > 0">
                <div class="summary-card">
                    <div class="summary-title"><i class="ri-pie-chart-line" style="vertical-align: text-bottom; margin-right: 4px; color: var(--primary-color);"></i>实时成绩统计</div>
                    <table class="g-table">
                        <thead><tr><th>范围</th><th>总学分</th><th>加权均分</th><th>GPA</th></tr></thead>
                        <tbody>
                            <tr><td>全部</td><td>{{ overallStats.all.credit }}</td><td>{{ overallStats.all.avg }}</td><td>{{ overallStats.all.gpa }}</td></tr>
                            <tr class="text-red"><td>已选</td><td>{{ overallStats.selected.credit }}</td><td>{{ overallStats.selected.avg }}</td><td>{{ overallStats.selected.gpa }}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="semester-block" v-for="semester in semesters" :key="semester.name">
                    <div class="semester-header"><i class="ri-calendar-event-line" style="margin-right: 6px; color: var(--text-sub);"></i>{{ semester.name }}</div>
                    <table class="g-table">
                        <thead><tr><th style="width:30px;">选择</th><th style="text-align:left; padding-left:10px;">详情</th><th style="width:40px">成绩</th><th style="width:35px">学分</th><th style="width:35px">绩点</th></tr></thead>
                        <tbody>
                            <tr v-for="course in semester.courses">
                                <td @click="course.selected = !course.selected"><div class="custom-checkbox" :class="{ checked: course.selected }"></div></td>
                                <td class="course-name-td">
                                    <div class="course-info-row">
                                        <div><div class="course-name-main">{{ course.name }}</div><div class="course-nature-sub">{{ course.nature }}</div></div>
                                        <div :class="['attr-tag', course.attr === '必修' ? 'tag-must' : 'tag-other']">{{ course.attr }}</div>
                                    </div>
                                </td>
                                <td :class="{'text-red': course.numericScore < 60}">{{ course.score }}</td>
                                <td>{{ course.credit }}</td>
                                <td>{{ course.gpa }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="empty-state" v-else>
                <div class="empty-emoji"><i class="ri-bar-chart-2-line"></i></div>
                <p>暂无成绩数据，请前往同步</p>
            </div>
        </div>
    `,
    data() { return { store } },
    computed: {
        semesters() {
            const groups = {};
            this.store.gradeList.forEach(item => {
                if (!groups[item.semester]) groups[item.semester] = { name: item.semester, courses: [] };
                groups[item.semester].courses.push(item);
            });
            return Object.values(groups).sort((a, b) => b.name.localeCompare(a.name));
        },
        overallStats() {
            return {
                all: this.calcGpa(this.store.gradeList),
                selected: this.calcGpa(this.store.gradeList.filter(g => g.selected))
            };
        }
    },
    methods: {
        calcGpa(list) {
            let credit = 0, scoreSum = 0, gpaSum = 0;
            list.forEach(c => {
                const curCredit = parseFloat(c.credit) || 0;
                const curScore = parseFloat(c.numericScore) || 0;
                const curGpa = parseFloat(c.gpa) || 0;
                credit += curCredit; scoreSum += (curScore * curCredit); gpaSum += (curGpa * curCredit);
            });
            return { credit: credit.toFixed(1), avg: credit ? (scoreSum / credit).toFixed(3) : "0.000", gpa: credit ? (gpaSum / credit).toFixed(3) : "0.000" };
        }
    }
}