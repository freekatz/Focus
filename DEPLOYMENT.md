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

# 创建 .env
cat > .env << 'EOF'
SECRET_KEY=dev-secret-key-change-in-production
DEFAULT_PASSWORD=focus123
FRONTEND_URL=http://localhost:8080
CORS_ORIGINS=http://localhost:8080
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=your-api-key
EOF

# 启动
docker compose up -d
```

访问 http://localhost:8080，账号 `admin` / `focus123`

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
# 必须修改密码!
POSTGRES_PASSWORD=your-secure-password-here

# 可选配置 (使用默认值即可)
POSTGRES_USER=focus
POSTGRES_DB=focus
```

**生成安全密码**:
```bash
openssl rand -base64 32
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
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=your-api-key
EOF

# 生成 SECRET_KEY
sed -i "s/替换为随机字符串/$(openssl rand -hex 32)/" .env

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
