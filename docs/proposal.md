# P-20260412-008: AI 订阅内容聚合应用 — 原始提案

> **提案 ID**：`P-20260412-008`
> **原始日期**：2026-04-12
> **请求者**：boss
> **协调者**：小墨
> **状态**：`delivered`

---

## 原始需求

boss 提出的需求是：开发一个跨平台 AI 订阅内容聚合应用，能够：

1. 接入多源 RSS/Atom/JSON API 订阅
2. AI 大模型自动生成摘要（多模型适配）
3. 定时抓取 + 推送通知
4. 覆盖 Web、微信小程序、PC（Electron）、Android 四端
5. 数据各自存储，不互通

---

## Clarification（澄清轮次）

### Round 1

**问题**：四端的优先级是什么？先做哪端？

**回答**：Web 优先（GitHub Pages 部署），其他端看 boss 需求再定。

### Round 2

**问题**：AI 模型 API Key 如何管理？

**回答**：每个模型独立配置 API Key，用户自行填写，支持多模型优先级 fallback。

### Round 3

**问题**：GitHub Trending 抓取如何实现？

**回答**：定时爬取 GitHub Trending Atom feed，缓存在本地，配合 RSS 统一处理。

---

## 最终假设

1. Web 端为 MVP 首发，GitHub Pages 部署
2. 小程序和 PC 端独立数据存储
3. AI 摘要为可选功能，无 API Key 时跳过
4. 所有推送基于浏览器系统通知（Web Push 或 Notification API）

---

## 提案 ID 说明

本项目在提案体系中的 ID 为 `P-20260412-008`，与 PRD 文档中的编号一致。

---

## 主修复记录

以下为本提案交付后的优化记录（已包含在本项目的 `docs/` 中）：

### P-20260412-007 优化（2026-04-18）

**问题 1：MiniMax 和小米 AI 模型测试不通过**
- **根因**：API Base URL 配置错误
  - MiniMax 错误：`https://api.minimax.chat/v`（缺少 `/1`）
  - 小米错误：`https://account.platform.minimax.io`（应为 `https://api.xiaomimimo.com/v1`）
- **修复**：8 个文件同步修正 URL（web/miniapp/pc/shared 各端）
- **提交**：`dfa0885`

**问题 2：大部分 RSS 订阅源抓取失败**
- **根因**：GitHub Pages 静态页面受 CORS 限制
- **修复**：`feedParser.ts` 添加 allorigins CORS 代理（`https://api.allorigins.win/raw?url=`）
- **提交**：`dfa0885`

**问题 3：抓取缺少日志和调试工具**
- **修复**：
  - Header 右侧添加 🐛 日志按钮 + 未读计数 Badge
  - 右侧 Drawer 面板，Timeline 展示抓取日志
  - 表格每行显示抓取状态（pending/成功条数+耗时/失败红色标签）
  - `fetchSubscription` 改造，记录 pending → success/fail 三阶段日志
- **新增类型**：`FetchLogEntry` 接口
- **提交**：`2187cdd`

---

## 确认门

| 门 | 状态 | 说明 |
|---|------|------|
| PRD 确认 | 已确认 | PRD v1.0 已确认 |
| 技术方案确认 | 已确认 | Technical Solution v1.0 已确认 |
