import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container contact-page">
            <div class="card contact-card">
                <div class="contact-icon"><i class="ri-terminal-box-line" style="color: #333;"></i></div>
                <h2 class="contact-title">联系开发者</h2>
                <p class="contact-desc">如果您在使用过程中遇到任何 Bug，或者有神仙功能建议，欢迎随时通过邮件与我联系！</p>

                <div class="contact-email-box" @click="copyEmail">
                    <div class="contact-email-label">开发者邮箱 (点击一键复制)</div>
                    <div class="contact-email-value">{{ developerEmail }}</div>
                </div>

                <div class="markdown-body contact-markdown-area" v-html="compiledMarkdown"></div>
            </div>
        </div>
    `,
    data() {
        return {
            developerEmail: "ralowd22@gmail.com",
            rawMarkdown: `<div class="markdown-loading"><i class="ri-loader-4-line ri-spin" style="margin-right: 4px;"></i> 正在加载文档...</div>`
        }
    },
    computed: {
        compiledMarkdown() {
            if (typeof marked === 'undefined') return '<p style="color: red;"><i class="ri-error-warning-line"></i> Markdown 解析器加载失败，请检查网络。</p>';
            if (this.rawMarkdown.includes("正在加载文档")) return this.rawMarkdown;
            return marked.parse(this.rawMarkdown);
        }
    },
    methods: {
        async copyEmail() {
            try {
                await navigator.clipboard.writeText(this.developerEmail);
                showToast("邮箱已复制，期待你的来信！", "success");
            } catch (err) {
                const input = document.createElement('input');
                input.setAttribute('value', this.developerEmail);
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                showToast("邮箱已复制，期待你的来信！", "success");
            }
        }
    },
    async mounted() {
        try {
            const res = await fetch('./md/contact.md');
            if (res.ok) {
                this.rawMarkdown = await res.text();
            } else {
                throw new Error("文件不存在或网络错误");
            }
        } catch (error) {
            this.rawMarkdown = "> ⚠️ 加载文档失败，请检查 `front/md/contact.md` 文件是否存在。";
        }
    }
}