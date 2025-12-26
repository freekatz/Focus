# Focus

[English](README.md) | 中文

一款现代化、极简风格的 RSS 阅读器，集成 AI 智能洞察功能。采用卡片式滑动交互，带来沉浸式阅读体验。

## 功能特性

- **卡片式阅读** - 类似 Tinder 的滑动界面，快速筛选文章
- **AI 洞察** - 支持多种 AI 服务商，自动生成文章摘要和关键要点
- **RSS 订阅** - 订阅您喜爱的内容源，自动获取更新
- **智能收藏库** - 通过收藏、归档和回收站整理保存的文章
- **个人 RSS 源** - 将保存的文章导出为 RSS/Atom 订阅源
- **Zotero 集成** - 一键导出文章到 Zotero 文献库
- **深色模式** - 精美的明暗主题切换
- **响应式设计** - 完美适配桌面端和移动端

## 技术栈

**前端：**
- React 19 + TypeScript
- Tailwind CSS
- Vite

**后端：**
- FastAPI (Python)
- SQLAlchemy (异步) + SQLite/PostgreSQL
- LangChain (多服务商 AI 支持)

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
- (可选) AI API 密钥 (OpenAI、Anthropic、Google 或 Ollama)

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/katz/focus.git
   cd focus
   ```

2. **配置后端**
   ```bash
   cd backend
   cp .env.example .env
   # 编辑 .env 文件进行配置

   pip install -r requirements.txt
   python run.py
   ```

3. **配置前端**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **访问应用**
   - 前端界面：http://localhost:5173
   - 后端 API：http://localhost:8000
   - API 文档：http://localhost:8000/docs

### 默认登录信息

- 用户名：`admin`
- 密码：`focus123`

## 配置说明

`backend/.env` 中的主要环境变量：

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | SQLite |
| `SECRET_KEY` | JWT 密钥 | 生产环境请修改！ |
| `AI_PROVIDER` | AI 服务商 (openai/anthropic/google/ollama) | openai |
| `AI_MODEL` | 模型名称 | gpt-4o-mini |
| `AI_API_KEY` | AI 服务商 API 密钥 | - |
| `RSS_FETCH_INTERVAL` | 自动获取间隔（分钟） | 30 |

完整配置项请参阅 [.env.example](backend/.env.example)。

## 部署

生产环境部署说明请参阅 [docs/deployment.md](docs/deployment.md)。

## 许可证

[MIT 许可证](LICENSE) - 版权所有 (c) 2025 Katz
