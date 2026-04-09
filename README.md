# 🎓 南理工 NS 课表 (NJUST NannoSchedule)

![Version](https://img.shields.io/badge/Version-v1.1-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Platform](https://img.shields.io/badge/Platform-Android-brightgreen.svg)
![TechStack](https://img.shields.io/badge/Tech-Vue.js%20%7C%20Android%20WebView-orange.svg)

> 一款专为南京理工大学学子打造的现代化、高颜值的第三方课表与教务辅助 App。

[🚀 前往官方下载页面获取最新版](https://download.jiraki.top) | [反馈问题 (Issues)](https://github.com/JirakiRance/NJUST-NannoSchedule/issues)

---

## ✨ 核心功能

* **📅 多彩课表**：支持一屏固定与自由滑动双模式，智能防撞色，日程一目了然。
* **🎒 蹭课雷达**：全校课程快速检索，发现你感兴趣的旁听课。
* **☕ 空闲教室**：精准过滤时段与教学楼，考研自习找座不求人。
* **🏆 教务直连**：成绩查询、等级考试查询、学校年历一键触达。
* **📢 云端公告**：基于边缘计算的云端动态公告板，无缝获取最新通知。


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

---
*Designed & Developed with ❤️ by JirakiRance*