import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container" style="display: flex; flex-direction: column; align-items: center; padding-top: 30px;">
            <div class="card" style="width: 100%; max-width: 400px; text-align: center; padding: 40px 20px;">

                <div style="font-size: 50px; margin-bottom: 15px;">👨‍💻</div>
                <h2 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">联系开发者</h2>

                <p style="color: #666; font-size: 14px; margin-bottom: 30px; line-height: 1.6;">
                    如果您在使用过程中遇到任何 Bug，或者有神仙功能建议，欢迎随时通过邮件与我联系！
                </p>

                <div style="background: #f4f5f7; padding: 15px; border-radius: 12px; border: 1px dashed #ccc; cursor: pointer; transition: all 0.2s; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);" @click="copyEmail">
                    <div style="font-size: 12px; color: #888; margin-bottom: 5px;">开发者邮箱 (点击一键复制)</div>
                    <div style="font-size: 18px; font-weight: bold; color: var(--primary-color);">
                        {{ developerEmail }}
                    </div>
                </div>

                <div
                    class="markdown-body"
                    style="margin-top: 30px; text-align: left; font-size: 14px; color: #444; line-height: 1.8; border-top: 1px solid #eee; padding-top: 20px;"
                    v-html="compiledMarkdown"
                ></div>

            </div>
        </div>
    `,
    data() {
        return {
            developerEmail: "ralowd22@gmail.com",
            // 初始占位文本，等待 fetch 加载
            rawMarkdown: `<div style="text-align:center; color:#999; animation: breathing 1.5s infinite;">正在加载文档...</div>`
        }
    },
    computed: {
        compiledMarkdown() {
            if (typeof marked === 'undefined') {
                return '<p style="color: red;">Markdown 解析器加载失败，请检查网络。</p>';
            }
            // 如果是在加载中，直接返回带 HTML 标签的占位符；如果加载完了，再交给 marked 编译
            if (this.rawMarkdown.includes("正在加载文档")) {
                return this.rawMarkdown;
            }
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
    // 核心：组件挂载后，自动去服务器拉取 .md 文件
    async mounted() {
        try {
            // 请求同一域名下的静态 md 文件
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