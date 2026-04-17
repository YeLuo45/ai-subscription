# P-20260412-008: AI 订阅内容聚合 - Documents

## 提案

| 版本 | 文件 | 更新日期 |
|------|------|---------|
| - | `proposal.md`（原始提案） | 2026-04-12 |

## PRD

| 版本 | 文件 | 更新日期 | 说明 |
|------|------|---------|------|
| v1.0 | `2026-04-12-ai-subscription-prd.md` | 2026-04-12 | 完整 PRD，四端定位明确 |

## Technical Solution

| 版本 | 文件 | 更新日期 | 说明 |
|------|------|---------|------|
| v1.0 | `P-20260412-008-tech-solution.md` | 2026-04-12 | 架构设计，AI 模型适配器 |

## 项目结构

```
ai-subscription/
├── ai-subscription-web/     # Web 端（React + Vite + Ant Design）
├── ai-subscription-miniapp/ # 微信小程序端
├── ai-subscription-pc/      # PC 桌面端（Electron）
├── docs/                    # 本项目文档
├── shared/                  # 共享代码
└── README.md
```

## 部署状态

| 平台 | 访问地址 | 状态 |
|------|---------|------|
| Web (GitHub Pages) | https://yeluo45.github.io/ai-subscription/ | 已配置 GitHub Actions 部署 |
