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

### 1.3 多端定位

| 平台 | 定位 | 技术方案 |
|------|------|----------|
| **Web** | 浏览器端，随时访问 | React/Vite，单页应用 |
| **微信小程序** | 微信内轻量访问 | 微信小程序原生开发 |
| **PC** | Windows 桌面端，功能最全 | Electron + React |
| **安卓** | 手机端，实时推送 | React Native 或 Taro |

> **多端关系**：四端各自独立，数据不互通。每端维护独立的本地存储和订阅配置。

---

## 2. 核心功能定义

### 2.1 订阅源管理（P0）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| SF-01 | 订阅源列表：展示所有已添加的订阅源（名称/URL/类型/状态） | P0 |
| SF-02 | 添加订阅源：支持 RSS 链接和 REST API 地址 | P0 |
| SF-03 | 编辑订阅源：修改名称/URL/抓取频率/AI摘要开关 | P0 |
| SF-04 | 删除订阅源：确认提示，避免误删 | P0 |
| SF-05 | 订阅源分类：支持按类别（科技/财经/AI/自定义）分组 | P1 |
| SF-06 | 批量导入/导出：OPML 格式或 JSON 批量导入导出 | P1 |
| SF-07 | 抓取预览：添加订阅源时预览最近 5 条内容 | P1 |
| SF-08 | 自定义 API：支持 Header 认证/POST 参数配置 | P2 |

**订阅源类型说明**：

| 类型 | 抓取方式 | 示例 |
|------|----------|------|
| RSS | 定时请求 XML，解析 Item | GitHub Blog、知乎专栏 |
| Atom | 定时请求 XML，解析 Entry | Medium、个人博客 |
| JSON API | REST GET，带可选认证 Header | GitHub API、新闻 API |
| HTML Scraping | 解析 HTML，提取目标元素（备选） | 无 RSS 的网站 |

### 2.2 AI 摘要生成（P0）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| AS-01 | 单篇摘要：对单篇文章生成 200-500 字摘要 | P0 |
| AS-02 | 多篇汇总：对同一订阅源当日所有更新生成汇总摘要 | P0 |
| AS-03 | 关键词提取：从内容中提取 5 个关键词 + 3 个金句 | P1 |
| AS-04 | 摘要长度可配置：短（100字）/ 中（300字）/ 长（500字） | P1 |
| AS-05 | 摘要语言匹配：自动识别内容语言，摘要保持同语言 | P2 |
| AS-06 | 摘要历史：保存每次摘要结果，可回溯查看 | P2 |

**支持的 AI 模型**：

| 模型 | 提供商 | 说明 |
|------|--------|------|
| GLM-4.5/4.6/4.7 | 智谱 | Boss 已配置 |
| MiniMax M2.7 | MiniMax | Boss 已配置 |
| Doubao | 字节豆包 | 用户自配 |
| Claude | Anthropic | 用户自配 |
| MiLM | 小米 | 用户自配 |

### 2.3 定时推送（P0）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| TP-01 | 推送时间设置：每日定时（精确到分钟） + 立即推送按钮 | P0 |
| TP-02 | 推送频率：每小时/每日/每周 自定义 | P0 |
| TP-03 | 推送内容选项：仅标题 / 标题+摘要 / 标题+全文摘要 | P0 |
| TP-04 | 推送渠道：通知栏推送 + 邮件推送（二选一或组合） | P0 |
| TP-05 | 推送历史：记录每次推送的内容/时间/成功状态 | P0 |
| TP-06 | 免打扰时段：设置不推送的时间段（如深夜 23:00-08:00） | P1 |
| TP-07 | 推送限额：每日最大推送条数，避免信息过载 | P2 |

### 2.4 通知栏推送（P0）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| NP-01 | 系统通知：调用系统通知 API（Electron/安卓/RN） | P0 |
| NP-02 | 点击跳转：点击通知后打开对应内容详情页 | P0 |
| NP-03 | 通知分组：同一订阅源的通知归为一组 | P1 |
| NP-04 | 通知声音：可选开启/关闭 | P1 |

### 2.5 邮件推送（P0）

| 功能 | 描述 | 优先级 |
|------|------|--------|
| EP-01 | 邮件配置：SMTP 服务器/端口/账号/密码/发件人 | P0 |
| EP-02 | 邮件模板：标题 + HTML 正文，支持富文本 | P0 |
| EP-03 | 发送测试：配置完成后发送测试邮件验证 | P0 |
| EP-04 | 附件支持：将原文以附件形式发送 | P2 |

---

## 3. 推送机制设计

### 3.1 技术可行性分析

#### 通知栏推送

| 平台 | 实现方式 | 难度 |
|------|----------|------|
| **PC (Electron)** | Electron Notification API | ⭐ 低 |
| **安卓** | React Native PushNotification / 极光推送 | ⭐⭐ 中 |
| **微信小程序** | 模板消息（需用户触发）/ 订阅消息 | ⭐⭐⭐ 高（受微信限制） |
| **Web** | Web Push API（需用户授权）| ⭐⭐ 中 |

**结论**：PC 和安卓实现最简单；小程序和 Web 受平台限制，建议以邮件为主、通知栏为辅。

#### 邮件推送

| 实现方式 | 优点 | 缺点 |
|----------|------|------|
| **自建 SMTP** | 完全可控，无需第三方 | 需要用户配置 SMTP，需防垃圾邮件 |
| **SendGrid/Mailgun** | 可靠，防黑名单 | 需注册第三方账号，有免费额度限制 |
| **企业邮箱（QQ/网易）** | 用户熟悉 | 需授权码，有发送限制 |

**推荐方案**：MVP 以自建 SMTP 为主，预设 QQ/163/企业邮箱快速配置模板。

### 3.2 推送触发流程

```
定时器触发（每X分钟）
  ├── 检查是否在免打扰时段 → 是则跳过
  ├── 遍历所有启用的订阅源
  │     ├── 抓取最新内容
  │     ├── 检查是否有新内容 → 无则跳过
  │     ├── 调用 AI 模型生成摘要
  │     └── 推送内容加入队列
  ├── 合并同一订阅源的多个更新
  ├── 生成最终推送内容
  ├── 发送系统通知（如启用）
  └── 发送邮件（如启用）
```

---

## 4. 多端架构差异

### 4.1 各端技术方案

#### PC 端（Electron + React）

```
┌──────────────────────────────────────┐
│       AI Subscription PC App         │
├──────────────────────────────────────┤
│  Renderer: React + Ant Design        │
│  ├── 订阅源管理页面                   │
│  ├── AI 摘要配置页面                  │
│  ├── 推送设置页面                     │
│  └── 邮件配置页面                    │
├──────────────────────────────────────┤
│  Main Process: Node.js                │
│  ├── RSS/API 抓取引擎                │
│  ├── 本地存储（SQLite/JSON）          │
│  ├── AI API 调用（OpenAI兼容接口）    │
│  ├── 定时任务调度（node-cron）        │
│  ├── 系统通知（Electron Notification） │
│  └── 邮件发送（nodemailer）           │
└──────────────────────────────────────┘
```

**技术栈**：
- 前端：Electron + React + TypeScript + Ant Design
- 后端：Node.js（主进程）
- 存储：SQLite（用户数据）+ JSON（订阅配置）
- 打包：electron-builder → .exe 安装包

#### Web 端（React SPA）

**技术栈**：React + Vite + TypeScript + Ant Design

**约束**：
- 无后台定时任务，需依赖 Service Worker 或 Web Workers
- Web Push 需要 HTTPS + Service Worker
- 本地存储使用 IndexedDB（用户数据）和 localStorage（配置）

#### 微信小程序

**技术栈**：微信小程序原生开发 + 云开发（可选）

**约束**：
- 无法后台运行，定时推送依赖微信订阅消息（需用户主动订阅）
- AI 调用必须通过开发者服务器中转
- 内容抓取需在开发者服务器完成（域名白名单）

#### 安卓端（React Native）

**技术栈**：React Native + TypeScript + Android Native Modules

**优势**：
- 后台 Service 可实现真正的定时推送
- 系统通知栏推送体验最佳
- 本地存储使用 SQLite 或 MMKV

### 4.2 多端数据同步

> 各端完全独立，数据不互通。用户需分别在每端配置订阅源。

如未来需要同步，可考虑：
- 导出/导入 JSON 配置文件
- 可选云端同步（加密后存储）

---

## 5. AI 模型配置与管理

### 5.1 模型配置项

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 模型名称 | 显示名称 | GLM-4.5 |
| API Provider | 提供商 | Zhipu / OpenAI Compatible |
| API Base URL | 接口地址 | https://open.bigmodel.cn/api/paas/v4 |
| API Key | 认证密钥 | sk-xxxx |
| Model Name | 模型名 | glm-4.5 |
| Temperature | 摘要质量控制 | 0.3（低随机性） |
| Max Tokens | 最大输出 | 1000 |

### 5.2 模型配置管理

| 功能 | 描述 | 优先级 |
|------|------|--------|
| MC-01 | 模型列表：展示所有已配置模型，可切换默认模型 | P0 |
| MC-02 | 添加模型：填写上述配置项，保存并验证连接 | P0 |
| MC-03 | 编辑模型：修改配置，验证通过后保存 | P0 |
| MC-04 | 删除模型：确认提示，默认模型不可删除 | P0 |
| MC-05 | 连接测试：保存前调用 API 验证密钥和模型可用性 | P0 |
| MC-06 | 模型消耗统计：记录每次调用的 Token 消耗 | P1 |

### 5.3 预设模型快速配置

预设置模型配置模板：

| 模型 | API Base URL |
|------|-------------|
| 智谱 GLM-4 | https://open.bigmodel.cn/api/paas/v4 |
| MiniMax | https://api.minimax.chat/v |
| 豆包 | https://ark.cn-beijing.volces.com/api/v3 |
| Claude | https://api.anthropic.com/v1 |
| 小米 | https://account.platform.minimax.io/...

---

## 6. 用户数据本地存储设计

### 6.1 存储架构

| 数据类型 | 存储位置 | 格式 |
|----------|----------|------|
| 用户配置（订阅源/推送设置/模型配置） | 应用数据目录 | JSON 或 SQLite |
| AI 摘要历史 | 应用数据目录 | SQLite |
| 推送历史 | 应用数据目录 | SQLite |
| 邮件 SMTP 配置 | 应用数据目录 | JSON（密钥加密存储） |
| 日志文件 | 应用数据目录 | JSON Lines |

**存储路径**：
- PC：`%APPDATA%/AISubscription/`
- Web：IndexedDB（浏览器沙盒）
- 安卓：`/data/data/com.aisubscription.app/`
- 小程序：微信云开发或本地 Storage

### 6.2 数据库 Schema（SQLite）

```sql
-- 订阅源表
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- 'rss' | 'atom' | 'api'
  category TEXT DEFAULT 'uncategorized',
  enabled INTEGER DEFAULT 1,
  ai_summary_enabled INTEGER DEFAULT 1,
  fetch_interval_minutes INTEGER DEFAULT 60,
  created_at TEXT,
  updated_at TEXT
);

-- AI 模型配置表
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  api_key TEXT, -- 加密存储
  model_name TEXT NOT NULL,
  temperature REAL DEFAULT 0.3,
  max_tokens INTEGER DEFAULT 1000,
  is_default INTEGER DEFAULT 0,
  created_at TEXT
);

-- 推送历史表
CREATE TABLE push_history (
  id TEXT PRIMARY KEY,
  subscription_id TEXT,
  title TEXT,
  summary TEXT,
  push_channel TEXT, -- 'notification' | 'email' | 'both'
  pushed_at TEXT,
  status TEXT, -- 'success' | 'failure'
  error_message TEXT
);

-- 摘要历史表
CREATE TABLE summary_history (
  id TEXT PRIMARY KEY,
  subscription_id TEXT,
  content_title TEXT,
  summary TEXT,
  keywords TEXT, -- JSON array
  token_used INTEGER,
  model_id TEXT,
  created_at TEXT
);
```

### 6.3 敏感数据加密

- API Key、邮箱密码使用 **AES-256** 加密存储
- 密钥管理：
  - PC：Windows DPAPI 绑定当前用户会话
  - 安卓：Android Keystore
  - Web/小程序：不支持加密，提示用户谨慎

---

## 7. MVP 范围定义（第一版）

### 7.1 MVP 平台选择

**第一版只做 PC（Windows）**，聚焦核心场景验证。

### 7.2 MVP 功能清单

#### P0（必须上线）

| 模块 | 功能 | 说明 |
|------|------|------|
| 订阅源 | RSS 订阅源添加/编辑/删除 | 核心场景 |
| 订阅源 | 定时抓取（每30分钟） | 依赖定时器 |
| AI 摘要 | 单篇摘要生成（GLM-4） | 核心价值 |
| AI 摘要 | 模型配置 + 切换 | 多模型支持 |
| 定时推送 | 每日定时推送（通知栏） | 核心场景 |
| 定时推送 | 邮件推送（SMTP 配置） | 核心场景 |
| 本地存储 | 订阅源配置持久化 | 数据不丢失 |
| 系统通知 | Electron Notification | 推送通道 |

#### P1（下期迭代）

| 模块 | 功能 |
|------|------|
| 订阅源 | OPML 批量导入/导出 |
| 订阅源 | 订阅源分类管理 |
| AI 摘要 | 摘要长度可配置 |
| AI 摘要 | 多篇汇总摘要 |
| 推送 | 免打扰时段设置 |
| Web | Web 端实现 |
| 安卓 | React Native 实现 |

#### P2（后续规划）

| 模块 | 功能 |
|------|------|
| 微信小程序 | 小程序实现 |
| 订阅源 | 自定义 API（Header 认证）|
| AI 摘要 | 摘要历史记录 |
| 邮件 | HTML 邮件模板 |
| 多端 | 数据同步（可选）|

### 7.3 MVP 验收标准

- [ ] 用户可添加 RSS 订阅源并成功抓取内容
- [ ] AI 可对单篇文章生成 200-500 字摘要
- [ ] 用户可配置至少一个 AI 模型并成功调用
- [ ] 定时推送可在设定时间触发
- [ ] 系统通知栏可正常展示推送内容
- [ ] 邮件可正常发送（配置 SMTP 后）
- [ ] 所有配置在重启后不丢失
- [ ] 构建出可运行的 .exe 安装包

### 7.4 技术约束

- **前端**：Electron + React + TypeScript + Ant Design
- **后端**：Node.js（主进程），无独立服务器
- **存储**：SQLite（用户数据）+ JSON 文件
- **AI 调用**：REST API（OpenAI 兼容接口）
- **打包**：electron-builder → .exe
- **目标用户**：Boss 叶志敏（个人自用）

### 7.5 工作量估算

| 模块 | 预估工时 |
|------|----------|
| 项目框架搭建 | 4h |
| 订阅源管理 | 8h |
| AI 摘要模块 | 6h |
| 模型配置 | 4h |
| 定时任务调度 | 4h |
| 系统通知 | 2h |
| 邮件推送 | 6h |
| 本地存储 | 4h |
| UI 优化 | 4h |
| 构建打包 | 2h |
| **总计** | **44h（约 6 个工作日）** |

---

## 8. 竞品分析

### 8.1 现有竞品

| 产品 | 优点 | 缺点 |
|------|------|------|
| Notion AI | 订阅源集成好 | 非专注内容摘要 |
| Cubox | 收藏+AI摘要 | 非定时推送 |
| Reeder | RSS 阅读体验好 | 无 AI 摘要 |
| Matter | 设计精美 | 无自托管 |
| 微读 | 中文内容支持好 | 非 AI 摘要 |

### 8.2 本产品差异化

1. **本地优先**：所有数据存储在用户设备，隐私可控
2. **多模型支持**：用户可选智谱/MiniMax/Claude/豆包，不绑定单一提供商
3. **定时推送**：真正实现"设定时间自动推送"，不是"随时查看"
4. **四端独立**：每端功能完整，用户按需选择

---

## 9. 风险与开放问题

| # | 问题 | 状态 | 备注 |
|---|------|------|------|
| R1 | 邮件推送频率限制：QQ/163 等免费邮箱有日发送上限 | Open | 建议使用企业邮箱或 SendGrid |
| R2 | AI API 费用：大量订阅源+高频率抓取可能产生较高 API 费用 | Open | 建议设置每日最大抓取次数 |
| R3 | RSS 源被墙：部分订阅源在国内可能无法访问 | Open | 提供代理配置选项（未来） |
| R4 | 小程序推送限制：微信对模板消息有严格限制 | Open | MVP 暂不做小程序 |
| R5 | AI 摘要质量：不同模型摘要效果差异大 | Open | 提供摘要长度和风格配置 |
