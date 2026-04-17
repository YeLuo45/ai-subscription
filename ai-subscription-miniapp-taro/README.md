# AI 订阅内容聚合 - 微信小程序端（Taro）

**提案编号**: P-20260412-008  
**技术栈**: Taro 4.2.0 + React 18 + TypeScript  
**平台**: 微信小程序

## 功能概览

| 功能 | 状态 |
|------|------|
| 首页/摘要列表 | ✅ |
| 订阅源管理（增删改/预设6个） | ✅ |
| 设置页（AI模型/优先级/推送） | ✅ |
| 内容详情页（WebView原文/AI摘要） | ✅ |
| AI 摘要生成（多模型 Adapter） | ✅ |
| 本地存储（Taro.getStorageSync） | ✅ |
| 预设 RSS 源 | ✅ |

## 预设订阅源

- 知乎日报 (`https://www.zhihu.com/rss`)
- 少数派 (`https://sspai.com/feed`)
- 36氪 (`https://36kr.com/feed`)
- Hacker News (`https://news.ycombinator.com/rss`)
- V2EX (`https://www.v2ex.com/index.xml`)
- 爱发电（默认关闭）

## 目录结构

```
ai-subscription-miniapp-taro/
├── src/
│   ├── app.ts               # 应用入口
│   ├── app.config.ts        # 路由配置 + TabBar
│   ├── app.scss             # 全局样式
│   ├── pages/
│   │   ├── index/           # 首页（AI摘要列表）
│   │   ├── subscriptions/   # 订阅源管理
│   │   ├── settings/        # 设置页
│   │   └── detail/          # 内容详情
│   ├── services/
│   │   ├── ai-model-adapter.ts  # 多模型 AI 适配器（Taro版）
│   │   ├── storage.ts           # 本地存储服务
│   │   └── rss.ts               # RSS 抓取服务
│   └── types/
│       └── index.ts             # 类型定义 + 预设常量
├── config/
│   ├── index.ts             # Taro 主配置
│   ├── dev.ts               # 开发配置
│   └── prod.ts              # 生产配置
├── babel.config.js
├── tsconfig.json
└── package.json
```

## 安装和构建

```bash
# 安装依赖
npm install --legacy-peer-deps

# 构建微信小程序
npm run build:weapp

# 开发模式（热更新）
npm run dev:weapp
```

构建产物输出到 `dist/weapp/`，用微信开发者工具打开该目录即可。

## 使用步骤

1. `npm install --legacy-peer-deps`
2. `npm run build:weapp`
3. 用微信开发者工具导入 `dist/weapp` 目录
4. 在设置页面配置 AI 模型 API Key
5. 在首页点击"刷新"抓取内容
6. 点击内容卡片生成 AI 摘要

## AI 模型配置

支持 5 个模型（优先级可调）：

| 模型 | Provider | 接口类型 |
|------|----------|----------|
| MiniMax M2.7 | minimax | OpenAI 兼容 |
| 小米 MiLM | xiaomi | OpenAI 兼容 |
| 智谱 GLM-4 | zhipu | OpenAI 兼容 |
| Claude | claude | Anthropic API |
| Gemini | gemini | Google API |

## 注意事项

- 微信小程序需要在开发者后台配置合法域名（RSS 源域名 + AI API 域名）
- 若开发时遇到域名限制，可在开发者工具中勾选「不校验合法域名」
- AI 摘要功能需要至少配置一个模型的 API Key
- RSS 内容通过正则解析 XML，复杂格式可能需要调整

## PRD 映射

| PRD 需求 | 实现位置 |
|----------|----------|
| 订阅源管理 | `pages/subscriptions` + `services/storage.ts` |
| 定时内容抓取 | `services/rss.ts` + `pages/index` 手动触发 |
| AI 摘要生成 | `services/ai-model-adapter.ts` |
| 多模型 Adapter | `services/ai-model-adapter.ts`（复用 shared 逻辑） |
| 推送设置 | `pages/settings`（配置入口，实际推送需小程序订阅消息） |
| 内容详情 | `pages/detail` |

## 已知问题与待办

- [ ] TabBar 图标文件（`assets/icons/`）需手动提供，否则 TabBar 图标显示默认
- [ ] 定时后台抓取受微信小程序限制，当前为手动刷新模式
- [ ] 系统通知推送需要微信「订阅消息」API 配合后端服务
- [ ] RSS XML 解析为简单正则实现，复杂格式建议用后端代理
