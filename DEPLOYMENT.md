# Focus 部署指南

本文档详细说明 Focus 的部署配置过程。

## 目录

- [系统要求](#系统要求)
- [快速部署](#快速部署)
- [配置说明](#配置说明)
- [生产环境部署](#生产环境部署)
- [数据管理](#数据管理)
- [故障排除](#故障排除)
- [更新升级](#更新升级)

## 系统要求

### 硬件要求
- **最低内存**: 1GB RAM
- **推荐磁盘**: 10GB+ 可用空间
- **网络**: 需要访问外部 RSS 源和 AI API

### 软件要求
- Docker 20.10+
- Docker Compose v2+

### 支持平台
- Linux (推荐)
- macOS
- Windows (WSL2)

## 快速部署

### 1. 获取项目

```bash
git clone https://github.com/xxx/Focus.git
cd Focus
```

### 2. 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. 首次配置

首次运行时，脚本会自动创建 `.env` 文件并提示配置。

**必须配置的项目：**

```bash
# 1. JWT 密钥 (安全必需)
# 使用以下命令生成:
openssl rand -hex 32

# 2. AI API Key (ArXiv 解读功能需要)
AI_API_KEY=your-api-key
```

编辑 `.env` 文件后，再次运行部署脚本：

```bash
./deploy.sh
```

### 4. 验证部署

- 访问 http://localhost
- 使用默认账号登录：
  - 用户名: `admin`
  - 密码: `focus123`

## 配置说明

### 环境变量完整列表

| 变量 | 必填 | 默认值 | 说明 |
|------|:----:|--------|------|
| `SECRET_KEY` | ✅ | - | JWT 签名密钥，生产环境必须修改 |
| `DEFAULT_PASSWORD` | | focus123 | 默认管理员密码 |
| `FRONTEND_URL` | | http://localhost | 前端 URL，用于分享链接生成 |
| `CORS_ORIGINS` | | http://localhost | CORS 允许的源 |
| `AI_PROVIDER` | | openai | AI 提供商 (openai / openai_compatible) |
| `AI_MODEL` | | gpt-4o-mini | AI 模型名称 |
| `AI_API_KEY` | ⚠️ | - | AI API 密钥 (ArXiv 功能需要) |
| `AI_BASE_URL` | | - | 自定义 API 端点 |
| `ZOTERO_LIBRARY_ID` | | - | Zotero 库 ID |
| `ZOTERO_API_KEY` | | - | Zotero API 密钥 |
| `DATABASE_URL` | | SQLite | 数据库连接字符串 |

### AI 配置示例

#### OpenAI

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

#### OpenRouter

```env
AI_PROVIDER=openai_compatible
AI_MODEL=anthropic/claude-3-sonnet
AI_API_KEY=sk-or-xxxxxxxxxxxxxxxx
AI_BASE_URL=https://openrouter.ai/api/v1
```

#### 其他兼容接口

```env
AI_PROVIDER=openai_compatible
AI_MODEL=your-model-name
AI_API_KEY=your-api-key
AI_BASE_URL=https://your-api-endpoint/v1
```

### Zotero 配置

1. **获取 API Key**
   - 访问 https://www.zotero.org/settings/keys
   - 创建新的 API Key，勾选读写权限

2. **获取 Library ID**
   - 个人库：访问 https://www.zotero.org/settings/keys ，页面显示 "Your userID for use in API calls is XXXXXX"
   - 群组库：群组页面 URL 中的数字

3. **配置环境变量**

```env
ZOTERO_LIBRARY_ID=123456
ZOTERO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

## 生产环境部署

### HTTPS 配置

推荐使用 Nginx 反向代理 + Let's Encrypt 证书。

#### 1. 修改端口映射

编辑 `docker-compose.yml`，将前端端口改为非 80 端口（如 8080）：

```yaml
frontend:
  ports:
    - "8080:80"
```

#### 2. 配置 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. 更新环境变量

```env
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
```

### PostgreSQL 配置

生产环境建议使用 PostgreSQL 替代 SQLite。

#### 1. 添加 PostgreSQL 服务

在 `docker-compose.yml` 中添加：

```yaml
services:
  db:
    image: postgres:15-alpine
    container_name: focus-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=focus
      - POSTGRES_PASSWORD=your-secure-password
      - POSTGRES_DB=focus
    volumes:
      - focus-db:/var/lib/postgresql/data

  backend:
    # ... 其他配置 ...
    depends_on:
      - db

volumes:
  focus-db:
    name: focus-db
```

#### 2. 配置数据库连接

```env
DATABASE_URL=postgresql+asyncpg://focus:your-secure-password@db:5432/focus
```

### 性能优化

#### RSS 抓取间隔

默认每天 08:00 和 20:00 自动抓取。可在用户设置中调整。

#### 数据保留策略

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 未标记保留天数 | 30 天 | 未读文章的保留时间 |
| 垃圾箱保留天数 | 15 天 | 丢弃文章的保留时间 |
| 自动归档天数 | 90 天 | 感兴趣/收藏文章归档时间 |

## 数据管理

### 数据卷说明

| 卷名 | 路径 | 说明 |
|------|------|------|
| focus-data | /app/data | 数据库文件 (SQLite) |
| focus-logs | /app/logs | 日志文件 |

### 备份

```bash
# 备份数据目录
docker cp focus-backend:/app/data ./backup-$(date +%Y%m%d)

# 备份日志
docker cp focus-backend:/app/logs ./logs-backup-$(date +%Y%m%d)
```

### 恢复

```bash
# 停止服务
docker compose down

# 恢复数据
docker cp ./backup-20240101/focus.db focus-backend:/app/data/

# 重启服务
docker compose up -d
```

### 数据迁移 (SQLite → PostgreSQL)

```bash
# 1. 导出 SQLite 数据
sqlite3 focus.db .dump > dump.sql

# 2. 转换 SQL 语法 (手动调整或使用工具)

# 3. 导入 PostgreSQL
psql -h localhost -U focus -d focus < dump_pg.sql
```

## 故障排除

### 常见问题

#### 端口冲突

如果 80 或 8000 端口被占用：

```yaml
# docker-compose.yml
frontend:
  ports:
    - "8080:80"  # 改为其他端口

backend:
  ports:
    - "8001:8000"  # 改为其他端口
```

#### 容器启动失败

```bash
# 查看详细日志
docker compose logs backend
docker compose logs frontend

# 重新构建
docker compose build --no-cache
docker compose up -d
```

#### AI 调用失败

1. 检查 API Key 是否正确
2. 检查网络是否能访问 AI API
3. 查看后端日志：`docker compose logs backend | grep -i ai`

#### 健康检查失败

```bash
# 手动检查后端健康状态
curl http://localhost:8000/health

# 查看容器状态
docker compose ps
```

### 日志查看

```bash
# 实时查看所有日志
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 只看前端日志
docker compose logs -f frontend

# 查看最近 100 行
docker compose logs --tail 100 backend
```

### 重置数据

```bash
# 停止并删除容器和数据卷
docker compose down -v

# 重新部署
./deploy.sh
```

## 更新升级

### 常规更新

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build
```

### 更新后检查

```bash
# 查看容器状态
docker compose ps

# 查看日志确认无错误
docker compose logs --tail 50
```

### 回滚

```bash
# 回滚到指定版本
git checkout v1.0.0

# 重新构建
docker compose up -d --build
```

## 常用命令速查

| 操作 | 命令 |
|------|------|
| 启动服务 | `docker compose up -d` |
| 停止服务 | `docker compose down` |
| 重启服务 | `docker compose restart` |
| 查看状态 | `docker compose ps` |
| 查看日志 | `docker compose logs -f` |
| 重新构建 | `docker compose up -d --build` |
| 清理重建 | `docker compose down -v && ./deploy.sh` |
