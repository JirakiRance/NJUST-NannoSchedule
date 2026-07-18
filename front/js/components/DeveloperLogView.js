import { API_BASE } from '../utils.js';

export default {
    template: `
        <div class="card" style="margin-top: 20px;">
            <div class="card-title">
                <i class="ri-code-line" style="vertical-align: text-bottom; margin-right: 6px; color: var(--primary-color);"></i>
                通知栏
            </div>
            <div v-if="loading" class="markdown-loading">正在获取通知...</div>
            <div v-else-if="logContent" class="contact-markdown-area" v-html="renderMarkdown(logContent)" style="margin-top: 0; padding-top: 10px; border: none;"></div>
            <div v-else class="empty-state" style="padding: 10px 0; font-size: 12px;">暂无通知</div>
        </div>
    `,
    data() {
        return {
            loading: true,
            logContent: ""
        };
    },
    mounted() {
        fetch('https://ns-release.jiraki.top/md/logs.md?t=' + new Date().getTime())
            .then(res => res.text())
            .then(text => {
                this.logContent = text;
            })
            .catch(e => console.log("日志获取失败", e))
            .finally(() => { this.loading = false; });
    },
    methods: {
        renderMarkdown(md) {
            return window.marked ? marked.parse(md) : md;
        }
    }
}