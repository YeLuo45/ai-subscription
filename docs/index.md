# P-20260412-008: AI 订阅内容聚合应用 — Documents

## 提案

| 版本 | 文件 | 更新日期 |
|------|------|---------|
| - | `proposal.md`（原始提案，含 P-20260412-007 优化记录） | 2026-04-18 |

## PRD

| 版本 | 文件 | 更新日期 | 说明 |
|------|------|---------|------|
| v1.0 | `prd.v1.md` | 2026-04-12 | 完整 PRD，四端定位明确 |
| v1.1 | `prd.v1.1.md` | 2026-04-18 | 补充 CORS 代理、调试工具、AI API URL 修正等技术细节 |

## Technical Solution

| 版本 | 文件 | 更新日期 | 说明 |
|------|------|---------|------|
| v1.0 | `technical-solution.v1.md` | 2026-04-12 | 架构设计，AI 模型适配器 |

## 项目结构

```
ai-subscription/
├── ai-subscription-web/      # Web 端（React + Vite + Ant Design + IndexedDB）
├── ai-subscription-miniapp/   # 微信小程序端（uni-app + Vue 3）
├── ai-subscription-pc/        # PC 桌面端（Electron + React + SQLite）
├── shared/                    # 共享代码（ai-model-adapter.ts, model-registry.ts）
├── docs/                      # 本项目文档
│   ├── index.md               # 本文件（文档索引）
│   ├── proposal.md            # 原始提案 + 主修复记录
│   ├── prd.v1.md              # PRD v1.0
│   ├── prd.v1.1.md            # PRD v1.1（补充技术细节）
│   ├── technical-solution.v1.md # 技术方案 v1.0
│   └── README.md              # 项目说明
└── README.md
```

## 部署状态

| 平台 | 访问地址 | 状态 |
|------|---------|------|
| Web (GitHub Pages) | https://yeluo45.github.io/ai-subscription/ | GitHub Actions 部署，master 分支触发 |
| 小程序 | - | 本地运行（uni-app dev:mp-weixin） |
| PC | - | 本地运行（electron） |

## 技术要点

### AI 模型 API 端点（已修正）

| 模型 | Provider Key | Base URL | 模型名 |
|------|-------------|----------|--------|
| MiniMax M2.7 | `minimax` | `https://api.minimax.chat/v1` | `MiniMax-M2.7` |
| 小米 MiLM | `xiaomi` | `https://api.xiaomimimo.com/v1` | `MiLM` |
| 智谱 GLM-4 | `zhipu` | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` |
| Claude 3.5 | `claude` | `https://api.anthropic.com/v1` | `claude-3-5-sonnet-20241022` |
| Gemini 2.0 | `gemini` | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.0-flash` |

### CORS 代理

Web 端所有第三方 RSS/Atom/JSON API 请求均通过 `https://api.allorigins.win/raw?url=` 代理，绕过 GitHub Pages 跨域限制。

### 抓取日志系统

- `FetchLogEntry` 接口：记录每次抓取的订阅源名、URL、状态（pending/success/fail）、耗时、条数、错误信息
- Header 右侧 🐛 按钮打开 Drawer 日志面板（Timeline 展示）
- 表格每行名称列显示抓取状态 Badge
