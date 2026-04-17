# AI Subscription Aggregator - AI订阅内容聚合应用

> 四端独立开发，数据各自存储，不互通

## 项目结构

```
ai-subscription/
├── web/          # Web端 (React + Vite + TypeScript + Ant Design)
├── miniapp/      # 微信小程序端 (uni-app + Vue 3)
├── pc/           # PC桌面端 (Electron + React)
└── README.md
```

## 技术栈

| 平台 | 技术方案 | 状态 |
|------|----------|------|
| Web | React + Vite + TypeScript + Ant Design + IndexedDB | MVP完成 |
| 小程序 | uni-app + Vue 3 + 微信本地存储 | MVP完成 |
| PC | Electron + React + SQLite + node-cron | MVP完成 |
| Android | TBD（React Native） | 待开发 |

## 核心功能

- ✅ 订阅源管理（预设RSS + 自定义RSS/API）
- ✅ 定时内容抓取
- ✅ AI摘要生成（多模型适配器：miniMax→小米→智谱→Claude→Gemini）
- ✅ 系统通知栏推送
- ✅ GitHub Trending 定时爬取
- ✅ 本地数据存储

## 预设订阅源

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

## AI模型优先级

1. **MiniMax M2.7** - 默认优先
2. **小米 MiLM**
3. **智谱 GLM-4**
4. **Claude 3.5**
5. **Gemini 2.0**

## 各端启动方式

### Web
```bash
cd web
npm install
npm run dev     # 开发: http://127.0.0.1:5173
npm run build   # 构建
```

### 小程序 (uni-app)
```bash
cd miniapp
npm install
npm run dev:mp-weixin   # 开发微信小程序
npm run build:mp-weixin # 构建微信小程序
```

### PC (Electron)
```bash
cd pc
npm install
npm run dev             # 开发模式
npm run electron:build  # 构建Windows安装包
```

## 数据存储

各端完全独立，数据不互通：
- Web: IndexedDB（浏览器沙盒）
- 小程序: 微信本地Storage
- PC: SQLite + electron-store

## 验证状态

- [ ] Web: `npm run build` 成功 + 核心功能可运行
- [ ] 小程序: uni-app 项目结构完整
- [ ] PC: Electron 项目结构完整
- [ ] Android: 待开发
