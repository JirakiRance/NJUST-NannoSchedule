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
                            <tr v-if="overallStats.selectedWithCET" style="color: var(--primary-color); font-weight: bold;">
                                <td>已选+四六级</td>
                                <td>{{ overallStats.selectedWithCET.credit }}</td>
                                <td>{{ overallStats.selectedWithCET.avg }}</td>
                                <td>{{ overallStats.selectedWithCET.gpa }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="semester-block" v-for="semester in semesters" :key="semester.name">
                    <div class="semester-header"><i class="ri-calendar-event-line" style="margin-right: 6px; color: var(--text-sub);"></i>{{ semester.name }}</div>
                    <table class="g-table">
                        <thead>
                            <tr>
                                <th style="width:40px; cursor:pointer;" @click="toggleSemester(semester)">
                                    <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                                        <div class="custom-checkbox" :class="{ checked: isAllSelected(semester) }"></div>
                                        <span style="font-size:9px; font-weight:normal; color:#888;">全选</span>
                                    </div>
                                </th>
                                <th style="text-align:left; padding-left:10px;">详情</th>
                                <th style="width:40px">成绩</th>
                                <th style="width:35px">学分</th>
                                <th style="width:35px">绩点</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="course in semester.courses">
                                <td @click="course.selected = !course.selected">
                                    <div style="display:flex; justify-content:center;">
                                        <div class="custom-checkbox" :class="{ checked: course.selected }"></div>
                                    </div>
                                </td>
                                <td class="course-name-td">
                                    <div class="course-info-row">
                                        <div><div class="course-name-main">{{ course.name }}</div><div class="course-nature-sub">{{ course.nature }}</div></div>
                                        <div :class="['attr-tag', (course.attr === '必修' || course.attr === '专选') ? 'tag-must' : 'tag-other']">{{ course.attr }}</div>
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
            const selectedCourses = this.store.gradeList.filter(g => g.selected);

            // 1. 寻找最高四六级成绩
            let maxCET = 0;
            (this.store.levelExamsList || []).forEach(exam => {
                if (exam.name.includes('四级') || exam.name.includes('六级') || exam.name.includes('CET')) {
                    const score = parseFloat(exam.score_total) || 0;
                    if (score > maxCET) maxCET = score;
                }
            });

            // 2. 如果考过，将其伪装成一门 8 学分的神课
            let cetCourse = null;
            if (maxCET > 0) {
                const normScore = (maxCET / 710) * 100; // 满分 710 归一化
                cetCourse = {
                    credit: 8,
                    numericScore: normScore,
                    gpa: this.getGpaFromScore(normScore) // 转为 4.0 绩点
                };
            }

            return {
                all: this.calcGpa(this.store.gradeList),
                selected: this.calcGpa(selectedCourses),
                // 如果有四六级，混进去一起算，否则返回 null（不显示这一行）
                selectedWithCET: cetCourse ? this.calcGpa([...selectedCourses, cetCourse]) : null
            };
        }
    },
    watch: {
        'store.gradeList': {
            immediate: true,
            handler(newList) {
                if (newList && newList.length > 0) {
                    newList.forEach(course => {
                        if (!course._normalized) {
                            if (course.nature && course.nature.includes('专业选修')) {
                                course.attr = '专选';
                                course.selected = true;
                            }
                            course._normalized = true;
                        }
                    });
                }
            }
        }
    },
    methods: {
        // 南理工绩点折算阶梯
        getGpaFromScore(num) {
            if (num >= 90) return 4.0;
            if (num >= 85) return 3.7;
            if (num >= 82) return 3.3;
            if (num >= 78) return 3.0;
            if (num >= 75) return 2.7;
            if (num >= 72) return 2.3;
            if (num >= 68) return 2.0;
            if (num >= 64) return 1.5;
            if (num >= 60) return 1.0;
            return 0.0;
        },
        isAllSelected(semester) {
            if (!semester.courses || semester.courses.length === 0) return false;
            return semester.courses.every(c => c.selected);
        },
        toggleSemester(semester) {
            const targetState = !this.isAllSelected(semester);
            semester.courses.forEach(c => c.selected = targetState);
        },
        calcGpa(list) {
            let credit = 0, scoreSum = 0, gpaSum = 0;
            list.forEach(c => {
                const curCredit = parseFloat(c.credit) || 0;
                const curScore = parseFloat(c.numericScore) || 0;
                const curGpa = parseFloat(c.gpa) || 0;
                credit += curCredit;
                scoreSum += (curScore * curCredit);
                gpaSum += (curGpa * curCredit);
            });
            return {
                credit: credit.toFixed(1),
                avg: credit ? (scoreSum / credit).toFixed(3) : "0.000",
                gpa: credit ? (gpaSum / credit).toFixed(3) : "0.000"
            };
        }
    }
}