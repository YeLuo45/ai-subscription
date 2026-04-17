# AI订阅内容聚合 + 定时推送应用 - 项目文档索引

## 项目概述

端侧AI订阅聚合应用，支持RSS/API数据源，AI摘要生成，定时推送（通知栏）。
技术栈：React（Web）+ Electron（PC）+ 微信小程序（待HBuilderX构建验证）。

## 提案归属

| 提案ID | 角色 | 状态 | 说明 |
|--------|------|------|------|
| P-20260412-008 | 主提案 | in_dev | Web+PC已完成，小程序HBuilderX方案重做中（2026-04-14） |

## 迭代历史

| 版本 | 日期 | 提案ID | 类型 | 主要变更 |
|------|------|--------|------|----------|
| MVP | 2026-04-12 | P-20260412-008 | PRD + Tech | Web+PC交付（15个订阅源、5个默认模型、electron-store存储） |
| 小程序 | 2026-04-14 | P-20260412-008 | Tech变更 | 放弃Taro（Node.js v24不兼容），改用HBuilderX + uni-app（源码在 `miniapp/`） |

## 文档清单

### PRD

| 版本 | 文件 | 提案ID | 确认状态 |
|------|------|--------|----------|
| v1 | `2026-04-12-ai-subscription-prd.md` | P-20260412-008 | confirmed |

### Tech Solution

| 版本 | 文件 | 提案ID | 主要内容 |
|------|------|--------|----------|
| v1 | `P-20260412-008-tech-solution.md` | P-20260412-008 | Web React + PC Electron + 小程序HBuilderX + electron-store + IPC/cron/通知 |

## 当前状态

- **Current Status**: `in_dev`（小程序方案进行中）
- **Current PRD**: `docs/2026-04-12-ai-subscription-prd.md`
- **Current Tech**: `docs/P-20260412-008-tech-solution.md`
- **Web产物**: `npm run build` exit code 0，`dist/` 完整
- **PC产物**: `release/win-unpacked/AI订阅聚合.exe`（201MB）
- **小程序源码**: `workspace-dev/ai-subscription/miniapp/`（HBuilderX构建）
