# Focus 部署指南

## 系统要求

- Docker 20.10+
- Docker Compose v2+
- 1GB+ 内存

---

## 快速部署 (HTTP)

适合本地测试，几分钟即可完成。

```bash
# 创建目录
mkdir focus && cd focus

# 下载 docker-compose.yml
curl -O https://raw.githubusercontent.com/freekatz/Focus/main/docker-compose.yml

# 创建 .env (PostgreSQL 默认配置)
cat > .env << 'EOF'
SECRET_KEY=dev-secret-key-change-in-production
DEFAULT_PASSWORD=focus123

# PostgreSQL 配置
POSTGRES_DB=focus
POSTGRES_USER=focus
POSTGRES_PASSWORD=focus-change-me
DATABASE_URL=postgresql+asyncpg://focus:focus-change-me@postgres:5432/focus

# 前端配置
FRONTEND_URL=http://localhost:8080
CORS_ORIGINS=http://localhost:8080

# AI 配置
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=your-api-key
EOF

# 启动
docker compose up -d
```

访问 http://localhost:8080，账号 `admin` / `focus123`

**注意**: 如需使用 SQLite 而非 PostgreSQL，在 `.env` 中添加:
```bash
DATABASE_URL=sqlite+aiosqlite:///./data/focus.db
```

---

## 数据库配置

Focus 支持两种数据库后端:

### PostgreSQL (默认，生产推荐)

**优势**:
- 更好的并发性能 (RSS 采集 + API 请求)
- 标准化的备份恢复工具
- 适合长期运行的生产环境
- 更强的数据完整性保障

**配置** (在 `.env` 中):
```bash
# PostgreSQL 凭据
POSTGRES_USER=focus
POSTGRES_DB=focus
POSTGRES_PASSWORD=your-secure-password-here

# ⚠️ CRITICAL: DATABASE_URL 中的密码必须与 POSTGRES_PASSWORD 一致
DATABASE_URL=postgresql+asyncpg://focus:your-secure-password-here@postgres:5432/focus
```

**生成安全密码**:
```bash
# 生成密码
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

# 在 .env 中使用
echo "POSTGRES_PASSWORD=$DB_PASSWORD"
echo "DATABASE_URL=postgresql+asyncpg://focus:$DB_PASSWORD@postgres:5432/focus"
```

### SQLite (轻量选择)

**适用场景**:
- 个人开发测试
- 资源受限环境
- 单用户低负载部署

**配置** (在 `.env` 中):
```bash
DATABASE_URL=sqlite+aiosqlite:///./data/focus.db
```

---

## 数据库管理

### 备份 PostgreSQL

```bash
# 备份到文件
docker exec focus-postgres pg_dump -U focus -d focus > backup-$(date +%Y%m%d).sql

# 验证备份
head -n 20 backup-20260201.sql
```

### 恢复 PostgreSQL

```bash
# 从备份恢复
cat backup-20260201.sql | docker exec -i focus-postgres psql -U focus -d focus

# 或使用 Docker volume 备份 (文件级)
docker run --rm \
  -v focus-postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-data-backup.tar.gz -C /data .
```

### 备份 SQLite

```bash
# 复制数据库文件
docker cp focus-backend:/app/data/focus.db ./backup/focus-$(date +%Y%m%d).db
```

### 数据库迁移 (SQLite → PostgreSQL)

**方法一: 重新开始 (推荐)**

适合个人 RSS 阅读器，数据可重新采集:

1. 导出重要数据 (星标文章、RSS 源列表)
2. 切换到 PostgreSQL (`DATABASE_URL` 配置)
3. 重启服务: `docker compose down && docker compose up -d`
4. 重新添加 RSS 源

**方法二: 数据迁移 (高级)**

使用 pgloader 工具:
```bash
docker run --rm -it \
  -v $(pwd)/backup:/data \
  dimitri/pgloader:latest \
  pgloader /data/focus.db \
  postgresql://focus:password@host.docker.internal:5432/focus
```

**注意**: 迁移前请务必备份数据!

### 数据库监控

**检查连接状态**:
```bash
docker exec focus-postgres psql -U focus -d focus -c \
  "SELECT count(*) as connections FROM pg_stat_activity WHERE datname = 'focus';"
```

**查看数据库大小**:
```bash
docker exec focus-postgres psql -U focus -d focus -c \
  "SELECT pg_size_pretty(pg_database_size('focus'));"
```

**查看表大小**:
```bash
docker exec focus-postgres psql -U focus -d focus -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## 生产部署 (HTTPS + 域名)

### 1. 准备服务器

确保：
- 已安装 Docker 和 Docker Compose
- 域名已解析到服务器 IP（A 记录）
- 80 和 443 端口已开放

### 2. 安装 Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

### 3. 部署 Focus

```bash
mkdir -p /opt/focus && cd /opt/focus

# 下载 docker-compose.yml
curl -O https://raw.githubusercontent.com/freekatz/Focus/main/docker-compose.yml

# 创建 .env（替换 your-domain.com 和 your-api-key）
cat > .env << 'EOF'
SECRET_KEY=替换为随机字符串
DEFAULT_PASSWORD=替换为你的密码

# PostgreSQL 配置
POSTGRES_DB=focus
POSTGRES_USER=focus
POSTGRES_PASSWORD=替换为数据库密码
DATABASE_URL=postgresql+asyncpg://focus:替换为数据库密码@postgres:5432/focus

# 前端配置
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# AI 配置
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=your-api-key
EOF

# 生成密钥
SECRET_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

sed -i "s|替换为随机字符串|$SECRET_KEY|" .env
sed -i "s|替换为数据库密码|$DB_PASSWORD|g" .env

# 启动
docker compose up -d
```

### 4. 配置 Caddy

编辑 `/etc/caddy/Caddyfile`（替换 your-domain.com）：

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

重启 Caddy：

```bash
systemctl restart caddy
```

Caddy 会自动申请和续期 HTTPS 证书。

### 5. 验证

访问 `https://your-domain.com`，使用你设置的密码登录。

---

## 配置说明

| 变量 | 说明 |
|------|------|
| `SECRET_KEY` | JWT 密钥，用 `openssl rand -hex 32` 生成 |
| `DEFAULT_PASSWORD` | 管理员密码 |
| `FRONTEND_URL` | 前端地址，用于生成分享链接 |
| `CORS_ORIGINS` | 允许的跨域来源，与 FRONTEND_URL 一致 |
| `ALLOWED_HOSTS` | 允许访问的域名，必须包含你的域名 |
| `AI_PROVIDER` | `openai` 或 `openai_compatible` |
| `AI_MODEL` | 模型名称 |
| `AI_API_KEY` | AI API 密钥 |
| `AI_BASE_URL` | 自定义 API 端点（OpenRouter 等） |

### AI 配置示例

**OpenRouter:**
```env
AI_PROVIDER=openai_compatible
AI_MODEL=anthropic/claude-3-sonnet
AI_API_KEY=sk-or-xxx
AI_BASE_URL=https://openrouter.ai/api/v1
```

---

## 常用命令

| 操作 | 命令 |
|------|------|
| 启动 | `docker compose up -d` |
| 停止 | `docker compose down` |
| 日志 | `docker compose logs -f` |
| 更新 | `docker compose pull && docker compose up -d` |
| 备份 | `docker cp focus-backend:/app/data ./backup` |

---

## 故障排查

### Backend 容器不健康 (Unhealthy)

**症状**: `docker compose ps` 显示 backend 为 unhealthy，frontend 无法启动

**常见原因 1: PostgreSQL 密码配置错误**

错误信息: `password authentication failed for user`

**根本原因**: `.env` 文件中缺少 `DATABASE_URL` 配置，导致 backend 使用默认密码连接，但与 PostgreSQL 实际密码不匹配。

**解决方案**: 在 `.env` 文件中**显式设置 DATABASE_URL**，确保密码与 `POSTGRES_PASSWORD` 一致:

```bash
# 在 .env 中添加完整配置
POSTGRES_DB=focus
POSTGRES_USER=focus
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql+asyncpg://focus:your-secure-password@postgres:5432/focus
```

**⚠️ 关键**: `DATABASE_URL` 中的密码必须与 `POSTGRES_PASSWORD` 完全一致！

**验证步骤**:
```bash
# 1. 停止所有服务
docker compose down

# 2. 检查 .env 文件（确保有 DATABASE_URL）
cat .env | grep -E "(POSTGRES|DATABASE_URL)"

# 3. 重新启动
docker compose up -d

# 4. 查看日志
docker compose logs backend --tail=50
```

**常见原因 2: PostgreSQL 未就绪**

**解决方案**: 等待 PostgreSQL 完全启动（约 10-15 秒）

```bash
# 检查 PostgreSQL 状态
docker compose logs postgres | grep "ready to accept"

# 手动验证连接
docker exec focus-postgres pg_isready -U focus -d focus
```

**常见原因 3: 端口冲突**

**解决方案**: 检查端口 5432, 8000, 8080 是否被占用

```bash
# Linux/Mac
lsof -i :8000
lsof -i :8080
lsof -i :5432

# 修改 docker-compose.yml 中的端口映射
ports:
  - "18000:8000"  # 使用其他端口
```

### 切换数据库后端

**从 PostgreSQL 切换到 SQLite**:

```bash
# 1. 在 .env 中添加
DATABASE_URL=sqlite+aiosqlite:///./data/focus.db

# 2. 重启
docker compose restart backend
```

**从 SQLite 切换到 PostgreSQL**:

```bash
# 1. 从 .env 中移除 DATABASE_URL（或注释掉）
# DATABASE_URL=sqlite+aiosqlite:///./data/focus.db

# 2. 确保 PostgreSQL 配置存在
POSTGRES_DB=focus
POSTGRES_USER=focus
POSTGRES_PASSWORD=your-password

# 3. 重启所有服务
docker compose down
docker compose up -d
```

### 数据库连接测试

**手动测试 PostgreSQL 连接**:

```bash
# 方法 1: 使用 psql
docker exec -it focus-postgres psql -U focus -d focus -c "SELECT 1;"

# 方法 2: 从 backend 容器测试
docker exec -it focus-backend python -c "
import asyncio
from sqlalchemy import text
from app.database import engine

async def test():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT version()'))
        print(result.scalar())

asyncio.run(test())
"
```

### 查看详细日志

```bash
# 所有服务日志
docker compose logs -f

# 特定服务日志
docker compose logs -f postgres
docker compose logs -f backend
docker compose logs -f frontend

# 最近 100 行日志
docker compose logs --tail=100 backend
```

### 完全重置

**警告**: 这将删除所有数据!

```bash
# 1. 停止并删除容器
docker compose down

# 2. 删除所有卷（包括数据库数据）
docker volume rm focus-postgres-data focus-data focus-logs

# 3. 重新启动
docker compose up -d
```
