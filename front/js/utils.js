//本地测试
export const API_BASE = "http://127.0.0.1:8000/api";
//服务器(挂了，用不了了)
//export const API_BASE = "https://njust-nannoschedule.onrender.com/api";
//打包版本
//export const API_BASE = "/api";

// 统一的远端静态资源与发布仓库域名
export const RELEASE_BASE = "https://ns-release.jiraki.top";

export function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}