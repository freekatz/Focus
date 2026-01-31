# Focus

RSS 信息源聚合与 AI 驱动的内容管理平台。

Focus 帮助你高效管理信息流，聚合多种 RSS 源，通过 AI 智能解读 ArXiv 论文，让知识获取更加轻松高效。

## 功能特性

### 信息聚合

- **RSS 订阅管理** - 支持博客、社区、论文、社交媒体、新闻播客等多种分类
- **订阅市场** - 浏览和订阅推荐的信息源
- **自动定时抓取** - 可配置的抓取间隔，支持单源独立刷新时间

### 文章管理

- **五种状态流转** - 未读 → 感兴趣/垃圾 → 收藏/归档
- **批量操作** - 批量标记、批量导出
- **全文搜索** - 支持标题、内容、AI 总结搜索
- **随机阅读** - 打乱文章顺序，发现意外之喜

### AI 智能

- **ArXiv 论文翻译** - 自动翻译英文摘要为中文
- **论文深度解读** - 基于 Q1-Q6 框架的两轮对话式解读
- **多 AI 提供商** - 支持 OpenAI、OpenRouter 等兼容接口

### 导出与分享

- **Zotero 集成** - 一键导出文章到 Zotero，自动匹配条目类型
- **个人 RSS Feed** - 生成你的收藏 RSS，可供其他阅读器订阅
- **分享链接** - 生成公开分享链接，支持设置过期时间

### 个性化

- **多主题配色** - 6 种预设主题 + 自定义 JSON 主题
- **明暗模式** - 浅色/深色/跟随系统
- **多语言** - 中文/English
- **字体选择** - Sans/Serif/Mono

## 技术栈

| 层级 | 技术                    | 说明     |
| ---- | ----------------------- | -------- |
| 前端 | React 19 + TypeScript   | 主框架   |
| 前端 | Tailwind CSS + DaisyUI  | 样式系统 |
| 前端 | Vite                    | 构建工具 |
| 后端 | FastAPI                 | Web 框架 |
| 后端 | SQLAlchemy 2.0          | ORM      |
| 后端 | SQLite / PostgreSQL     | 数据库   |
| 部署 | Docker + Docker Compose | 容器化   |
| 部署 | Nginx                   | 反向代理 |

## 快速开始

### 环境要求

- Docker 20.10+
- Docker Compose v2+

### 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/xxx/Focus.git
cd Focus

# 2. 运行部署脚本
./deploy.sh

# 3. 首次运行会创建 .env 文件，请编辑配置
# 必须配置: SECRET_KEY, AI_API_KEY

# 4. 再次运行部署
./deploy.sh
```

### 访问

- **前端**: http://localhost
- **后端 API**: http://localhost:8000
- **默认账号**: admin / focus123

> 详细部署说明请参考 [部署文档](./DEPLOYMENT.md)

## 文档

- [部署文档](./DEPLOYMENT.md) - 详细部署配置说明
- [使用指南](./USER_GUIDE.md) - 功能使用说明

## 项目结构

```
Focus/
├── backend/                # Python FastAPI 后端
│   ├── app/
│   │   ├── api/v1/        # API 路由
│   │   ├── models/        # 数据库模型
│   │   ├── schemas/       # Pydantic 模型
│   │   ├── services/      # 业务逻辑
│   │   └── tasks/         # 定时任务
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/              # React 前端
│   ├── src/
│   │   ├── api/          # API 调用
│   │   ├── components/   # 组件
│   │   ├── context/      # React Context
│   │   ├── views/        # 页面
│   │   └── types/        # TypeScript 类型
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml     # Docker 编排
├── deploy.sh             # 一键部署脚本
└── .env.example          # 环境变量示例
```

## 开源协议

MIT License
