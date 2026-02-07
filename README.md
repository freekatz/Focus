# Focus

RSS 信息源聚合与 AI 驱动的内容管理平台。

Focus 帮助你高效管理信息流，聚合多种 RSS 源，通过 AI 智能解读 ArXiv 论文，让知识获取更加轻松高效。

## 功能特性

- **RSS 订阅** - 支持博客、社区、论文、社交媒体等多种分类
- **文章管理** - 五种状态流转，批量操作，全文搜索
- **ArXiv 解读** - 自动翻译摘要，Q1-Q6 框架深度解读
- **Zotero 导出** - 一键导出到 Zotero
- **个性化** - 多主题、明暗模式、中英文

详见 [使用说明](./USER_GUIDE.md)

## 快速开始

详见 [部署文档](./DEPLOYMENT.md)

## 技术栈

| 层级 | 技术                                 |
| ---- | ------------------------------------ |
| 前端 | React 19 + TypeScript + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy + SQLite        |
| 部署 | Docker + Caddy                       |

## 项目结构

```
Focus/
├── backend/           # FastAPI 后端
│   ├── app/
│   │   ├── api/       # API 路由
│   │   ├── models/    # 数据模型
│   │   ├── services/  # 业务逻辑
│   │   └── tasks/     # 定时任务
│   └── requirements.txt
├── frontend/          # React 前端
│   ├── src/
│   │   ├── api/       # API 调用
│   │   ├── components/
│   │   ├── views/
│   │   └── types/
│   └── nginx.conf
└── docker-compose.yml
```

## 开源协议

MIT License
