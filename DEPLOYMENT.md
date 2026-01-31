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
