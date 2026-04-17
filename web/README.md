# AI Subscription Aggregator - Web端

> AI订阅内容聚合 + 定时推送应用 Web端

## 技术栈

- React 19 + TypeScript
- Vite 8
- Ant Design 5
- IndexedDB (本地存储)
- Web Notification API

## 功能特性

- ✅ 订阅源管理（预设RSS + 自定义RSS/API）
- ✅ 定时内容抓取（每30分钟自动刷新）
- ✅ AI摘要生成（多模型适配器）
- ✅ 系统通知栏推送
- ✅ 本地数据存储（IndexedDB）
- ✅ GitHub Trending 抓取

## 启动方式

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

## 访问地址

开发模式: http://127.0.0.1:5173

## 预设订阅源

- Hacker News
- TechCrunch
- MIT Technology Review
- VentureBeat AI
- GitHub Blog
- Dev.to
- DeepMind Blog
- OpenAI Blog
- ArXiv CS.AI
- 等...

## AI模型优先级

1. MiniMax M2.7
2. 小米 MiLM
3. 智谱 GLM-4
4. Claude 3.5
5. Gemini 2.0

## 注意事项

- Web端数据存储在浏览器IndexedDB中，四端各自独立
- 定时抓取依赖页面保持打开状态
- 通知功能需要用户授权浏览器通知权限
- AI摘要需要配置API Key才可使用
