# AI 订阅内容聚合 + 定时推送应用 PRD

> **文档版本**：v1.0
> **生成日期**：2026-04-12
> **提案编号**：P-20260412-008
> **状态**：prd_pending_confirmation

---

## 1. 产品定位与目标用户

### 1.1 产品定位

AI 订阅内容聚合 + 定时推送应用是一款面向普通用户的端侧内容聚合工具。通过接入 RSS 订阅源和开放 API，自动抓取内容并利用 AI 大模型生成摘要，定时推送到用户的通知栏或邮箱。

**核心价值主张**：
- **个性化订阅**：用户自主配置数据源，打造专属信息流
- **AI 智能摘要**：无需逐篇阅读，AI 生成内容精华
- **定时推送**：设定时间自动推送，充分利用碎片时间
- **隐私优先**：所有数据存储在用户本地，不上云

### 1.2 目标用户

| 用户类型 | 场景描述 |
|----------|----------|
| 资讯爱好者 | 订阅科技/财经/AI 热点，每天定时获取摘要 |
| 开发者 | 订阅 GitHub Trending、HackerNews，跟进技术动态 |
| 产品经理 | 订阅竞品动态、行业资讯，高效获取信息 |
| 学生/研究者 | 订阅学术博客、论文平台，追踪前沿进展 |

---

## 2. 功能范围

### 2.1 核心功能（ MVP）

- [x] 订阅源管理（预设 RSS + 自定义 RSS/API）
- [x] 定时内容抓取（30 分钟间隔，可配置）
- [x] AI 摘要生成（多模型适配器：MiniMax → 小米 → 智谱 → Claude → Gemini）
- [x] 系统通知栏推送
- [x] GitHub Trending 定时爬取
- [x] 本地数据存储（IndexedDB / 微信本地存储 / SQLite）
- [x] 多端独立开发、数据不互通

### 2.2 预设订阅源

- Hacker News
- TechCrunch
- MIT Technology Review
- VentureBeat AI
- GitHub Blog
- DeepMind Blog
- OpenAI Blog
- ArXiv CS.AI
- Dev.to
- CSS-Tricks
- The Verge
- Nature

---

## 3. 各端技术方案

| 平台 | 技术方案 | 状态 |
|------|----------|------|
| Web | React + Vite + TypeScript + Ant Design + IndexedDB | MVP 完成 |
| 小程序 | uni-app + Vue 3 + 微信本地 Storage | MVP 完成 |
| PC | Electron + React + SQLite + node-cron | MVP 完成 |
| Android | TBD（React Native） | 待开发 |

### 3.1 Web 端

**技术栈**：React 18 + Vite + TypeScript + Ant Design + IndexedDB

**AI 模型适配器**（`src/services/aiAdapter.ts`）：
- MiniMax M2.7：`https://api.minimax.chat/v1/chat/completions`
- 小米 MiLM：`https://api.xiaomimimo.com/v1/chat/completions`
- 智谱 GLM-4：`https://open.bigmodel.cn/api/paas/v4/chat/completions`
- Claude 3.5：`https://api.anthropic.com/v1/chat/completions`（ Anthropic 专用格式）
- Gemini 2.0：`https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`

**订阅源抓取**（`src/services/feedParser.ts`）：
- 所有第三方请求通过 `https://api.allorigins.win/raw?url=` CORS 代理
- 支持 RSS 2.0、Atom、JSON API 三种格式自动检测
- 抓取结果去重（按 item.id），最多保留 50 条

**调试工具**：
- Header 右侧 🐛 按钮打开 Drawer 日志面板
- Timeline 展示每次抓取：订阅源名、状态（pending/success/fail）、耗时、条数
- 表格每行名称列显示抓取状态 Badge

### 3.2 小程序端

**技术栈**：uni-app + Vue 3 + 微信本地 Storage

### 3.3 PC 端

**技术栈**：Electron + React + SQLite + node-cron

---

## 4. AI 模型

### 4.1 模型优先级

1. **MiniMax M2.7** — 默认优先
2. **小米 MiLM**
3. **智谱 GLM-4**
4. **Claude 3.5**
5. **Gemini 2.0**

### 4.2 API Key 管理

各模型独立配置 API Key，支持多模型 fallback——当前一个模型失败时自动尝试下一个。

---

## 5. 已知限制与已知问题

### 5.1 Web 端

- **CORS 限制**：第三方 RSS 必须通过 allorigins 代理抓取，响应延迟略有增加
- **浏览器通知**：需要用户授权，且浏览器须在后台运行
- **IndexedDB 存储**：数据限于同源浏览器，无法跨设备同步

### 5.2 小程序端

- 微信小程序不支持部分 Ant Design 组件，需降级或替换

### 5.3 PC 端

- Electron 打包体积较大（建议使用 electron-builder）
- SQLite 在 Windows/macOS/Linux 路径处理差异

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 添加预设订阅源后，点击"抓取"能获取内容（最多 3 分钟内完成）
- [ ] AI 摘要生成成功，返回 JSON 格式摘要 + 关键词
- [ ] 定时抓取按设定间隔执行，通知推送正常
- [ ] 多端数据各自独立，不互相覆盖

### 6.2 技术验收

- [ ] `npm run build` 成功，输出 dist/ 目录
- [ ] GitHub Pages 部署正常（https://yeluo45.github.io/ai-subscription/）
- [ ] 无 console.error（warnings 可接受）
- [ ] 单元测试覆盖率 > 60%（核心服务层）
