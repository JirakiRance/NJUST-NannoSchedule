# 🎓 南理工 NS 课表 (NJUST NannoSchedule)

![Version](https://img.shields.io/badge/Version-v1.1-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Platform](https://img.shields.io/badge/Platform-Android-brightgreen.svg)
![TechStack](https://img.shields.io/badge/Tech-Vue.js%20%7C%20Android%20WebView-orange.svg)

> 一款为南京理工大学学子打造的第三方课表与教务辅助 App。

[🚀 前往下载页面获取最新版](https://ns-release.jiraki.top) | [反馈问题 (Issues)](https://github.com/JirakiRance/NJUST-NannoSchedule/issues)

---


## 🛠️ 技术架构

本项目采用了**前端页面 + 原生安卓壳**的 Hybrid 混合开发架构，逻辑极度解耦，极其适合前端开发者进行二次开发。

* **前端逻辑**：`Vue.js 3` + 纯原生 CSS/JS (零重型依赖，极速加载)
* **原生外壳**：Android 原生 `WebView`，深度接管返回手势 (`OnBackPressedDispatcher`) 与外部路由。
* **分发架构**：GitHub Releases + Cloudflare Pages/Workers + R2 对象存储构建的无服务器更新分发中心。

## 🚀 本地运行与二次开发

### 1. 前端页面开发
前端代码位于 `front/` 目录下（或者填写你实际的前端目录）。不需要复杂的 Node.js 环境，直接使用浏览器打开 `index.html` 即可预览大部分 UI 与本地逻辑。
*如需调试教务处接口，请处理好跨域问题或连接真实的后端 API。*

### 2. 安卓打包部署
1. 克隆本项目：`git clone https://github.com/JirakiRance/NJUST-NannoSchedule.git`
2. 使用 **Android Studio** 打开项目根目录。
3. 确保你的前置代码已复制到安卓的 `assets` 目录中。
4. 点击 `Build -> Generate Signed Bundle / APK` 进行打包。

## 💡 原理与使用说明

为了让体验最流畅，同时节约服务器资源，本APP如下设计：

### 📱 1. 本地优先
这个 App 的界面本质上是一个网页。所有的代码和图片都已经打包在你的手机里了，**打开它不消耗任何流量**。
* **日常查课表是纯离线的**：你的课表、成绩等数据在第一次“教务同步”后，就永久存在了手机本地。你平时看课表、切周次，都是**纯离线操作，零网络延迟**！
* **只有特定操作才联网**：只有在同步数据、查空教室、蹭课雷达这三个功能时，才会去连服务器。

### 🌐 2. 网页端
因为它是网页写的，你甚至不需要装 App。懂点技术的同学可以直接在电脑上双击打开 `index.html` 文件，配合浏览器直接在电脑端看课表！

### ☁️ 3. 后端服务器
后端服务是用海外免费服务器（Render）搭建的，纯靠“用爱发电”，扛不住太大流量。
* **冷启动**：如果服务器十几分钟没人访问，它就会自动休眠。如果你发现**第一次点同步时一直转圈（大概要等 40~60 秒）**，别急，等它启动，后面的查询就是秒开了。
* **怕拥挤**：免费服务器内存很小，期末查分高峰期容易被挤爆。如果失败了请稍等几分钟再试，**千万别疯狂点重试**！

### 🚀 4. 极速分发官网
为了让大家下载更方便，下载挂在：[download.jiraki.top](https://download.jiraki.top) （实际上是加载Github最新release）

## 🤝 参与贡献

欢迎任何形式的贡献！如果你有绝妙的想法或发现了 Bug，请随时提交 [Pull Request](https://github.com/JirakiRance/NJUST-NannoSchedule/pulls) 或发布 [Issue](https://github.com/JirakiRance/NJUST-NannoSchedule/issues)。

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 发起 Pull Request

## 📜 免责声明

本项目仅供学习与技术交流使用，非南京理工大学官方应用。用户因使用本项目导致的任何数据异常或教务系统账号封禁风险，由使用者自行承担。请合理、低频地请求教务处接口。

## 🌳 薪火相传
如果你是南理工的老熟人，大概率用过「周三课表」小程序。

作为一款用爱发电的校园教务工具，它陪伴了大家很多个学期。但随着学长毕业走上社会，加上学校教务系统风控的日益严格，个人维护的时间成本变得难以为继。4月7日，学长发布了停运通知。在此，向这位前人栽树的开拓者致敬！🫡

其实就在几天前（大约 4 月 3 号），因为遇到服务不稳定的情况，所以我自己想着做一个课表出来临时用用，借助 Vibe Coding ，我花几天时间手搓出了现在这个工具的雏形。原本只是想做个自用的备用方案，没想到恰好赶上了「周三课表」的谢幕。

*Designed & Developed with ❤️ by JirakiRance*