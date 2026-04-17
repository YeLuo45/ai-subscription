# AI Subscription Aggregator - PC端 (Electron)

> 基于 Electron + React 的 Windows 桌面端实现

## 技术栈

- Electron + React + TypeScript
- Ant Design
- SQLite (better-sqlite3)
- node-cron (定时任务)
- nodemailer (邮件推送)
- Electron Notification (系统通知)

## 功能特性

- ✅ 订阅源管理（预设RSS + 自定义RSS/API）
- ✅ 定时内容抓取（node-cron 精确调度）
- ✅ AI摘要生成（多模型适配器）
- ✅ 系统通知栏推送（Electron Notification）
- ✅ 邮件推送（nodemailer SMTP）
- ✅ 本地 SQLite 存储
- ✅ GitHub Trending 抓取
- ✅ 完整桌面端体验

## 项目状态

MVP版本开发中

## 启动方式

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建Windows安装包
npm run build
```
