import { store } from '../store.js';
import { showToast } from '../utils.js';

export default {
    template: `
        <div class="subpage-container">
            <div style="font-size: 12px; color: #888; margin-bottom: 15px; text-align: center;">
                <i class="ri-information-line" style="vertical-align: middle;"></i> 点击卡片即可一键复制网址
            </div>

            <div class="list-card" v-for="(site, index) in sites" :key="index" @click="copyUrl(site.url)" style="cursor: pointer; transition: transform 0.1s;">
                <div class="list-card-header" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
                    <span class="list-card-title"><i class="ri-global-line" style="color: #007aff; margin-right: 4px; vertical-align: text-bottom;"></i>{{ site.name }}</span>
                    <span class="list-card-date" style="color: var(--primary-color); background: #e1f0ff; font-weight: bold;">
                        <i class="ri-file-copy-line" style="vertical-align: middle;"></i> 复制
                    </span>
                </div>
                <div style="font-size: 12px; color: #888; margin-top: 8px; word-break: break-all; padding-left: 24px;">
                    {{ site.url }}
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            store,
            sites: [
                { name: "南京理工大学", url: "http://www.njust.edu.cn/" },
                { name: "综合教务管理系统", url: "http://202.119.81.113:8080/" },
                { name: "教务处", url: "http://jwc.njust.edu.cn/" },
                { name: "智慧理工服务门户", url: "http://ehall.njust.edu.cn/new/index.html" },
                { name: "图书馆", url: "http://lib.njust.edu.cn/" },
                { name: "四六级报名", url: "http://cet-bm.neea.edu.cn/" },
                { name: "四六级准考证", url: "http://cet-bm.neea.edu.cn/Home/QueryTestTicket" },
                { name: "四六级成绩", url: "http://cet.neea.edu.cn/cet/" },
                { name: "计算机等级考试报名&准考证", url: "http://www.sdzk.cn/floadup/ncrebm/ncrebm.htm" },
                { name: "计算机等级考试成绩", url: "http://cjcx.neea.edu.cn/html1/folder/1508/206-1.htm?sid=300" },
                { name: "CCF", url: "http://cspro.org/" },
                { name: "超星学习通", url: "http://i.mooc.chaoxing.com/space/index" },
                { name: "普通话成绩", url: "http://www.cltt.org/studentscore" }
            ]
        }
    },
    methods: {
        async copyUrl(url) {
            try {
                await navigator.clipboard.writeText(url);
                showToast("链接已复制，快去粘贴吧！", "success");
            } catch (err) {
                const input = document.createElement('input');
                input.setAttribute('value', url);
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                showToast("链接已复制，快去粘贴吧！", "success");
            }
        }
    }
}