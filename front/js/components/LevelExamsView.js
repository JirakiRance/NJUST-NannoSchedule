import { store } from '../store.js';

export default {
    template: `
        <div class="subpage-container">
            <div v-if="store.levelExamsList.length > 0">
                <div class="list-card" v-for="(exam, index) in store.levelExamsList" :key="index">
                    <div class="list-card-header">
                        <span class="list-card-title">📝 {{ exam.name }}</span>
                        <span class="list-card-date">{{ exam.date }}</span>
                    </div>
                    <div class="list-card-body">
                        <div class="score-item" v-if="exam.score_total && exam.score_total !== '0'">
                            <span class="score-label">总成绩</span>
                            <span class="score-value highlight">{{ exam.score_total }}</span>
                        </div>
                        <div class="score-item" v-else-if="exam.grade_total">
                            <span class="score-label">考试等级</span>
                            <span class="score-value highlight">{{ exam.grade_total }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="empty-state" v-else>
                <div style="font-size: 40px; margin-bottom: 10px;">🏅</div><p>暂无等级考试数据，请前往同步</p>
            </div>
        </div>
    `,
    data() { return { store } }
}