# P-20260412-008 Technical Solution

## 项目名称
AI Subscription Aggregator（AI订阅内容聚合应用）

## 提案 ID
P-20260412-008

## 明确技术约束

| 维度 | 明确约束 |
|---|---|
| Web 端 | React |
| 小程序端 | uni-app |
| PC 端 | Electron |
| Android 端 | TBD（Phase 2+） |
| 数据存储 | 用户本地存储，四端各自独立，不互通 |
| 推送 | MVP 仅通知栏推送（系统通知） |
| AI 模型 | miniMax → 小米 → 智谱 → Claude → Gemini（优先级顺序） |
| GitHub Trending | 定时爬取后缓存本地 |

## 整体架构

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Web     │  │ 小程序   │  │ PC      │  │ Android │
│ React   │  │ uni-app │  │Electron │  │ TBD     │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     └──────────────┬──────────────┬──────────┘
                    ▼
            AI Model Adapter
         (miniMax → 小米 → 智谱
          → Claude → Gemini)
                    │
            Local Storage
          (各端独立，不互通)
```

## 核心模块

### 1. 订阅源管理
- 预设 RSS 列表（知名科技/AI/新闻站点）
- 自定义 RSS / API 支持
- GitHub Trending：定时爬取缓存本地

### 2. 内容抓取
- 定时任务调度（各端原生定时器）
- 本地缓存（最新 N 条记录）
- 去重与增量更新

### 3. AI 摘要生成
- 调用 AI 模型生成内容摘要
- 统一 Adapter，支持多模型按优先级切换
- 用户自配 API Key（平台零成本）

### 4. 通知推送
- 各端原生通知 API
- Web: Notification API
- 小程序: 订阅消息
- PC: Electron Notification (主进程)

### 5. AI Model Adapter
- 统一接口：ISummarizer
- 支持规范：OpenAI / Anthropic 双规范
- 优先级调度：miniMax → 小米 → 智谱 → Claude → Gemini
- 失败自动切换下一模型

## MVP 功能范围

| 模块 | 内容 |
|---|---|
| 订阅源管理 | 预设 RSS 列表 + 自定义 RSS/API |
| 内容抓取 | 定时爬取 + 本地缓存 |
| AI 摘要 | 调用 AI 模型生成摘要 |
| 通知推送 | 系统通知栏推送 |
| AI 模型调度 | 统一 Adapter，支持多模型按优先级切换 |

## 技术栈

| 端 | 技术选型 |
|---|---|
| Web | React + Vite + TypeScript |
| 小程序 | uni-app + Vue 3 |
| PC | Electron + React |
| 存储 | 各端本地存储（localStorage / SQLite 等）|
| AI 调度 | LangChain 或自研 Adapter |

## 状态
- PRD 确认：✅ confirmed
- 技术方案确认：✅ confirmed（boss 无异议，2026-04-12）
- 开发阶段：P-20260412-008 MVP
