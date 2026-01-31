# Focus 部署指南

## 系统要求

- Docker 20.10+
- Docker Compose v2+
- 1GB+ 内存

## 快速部署

### 1. 拉取镜像并启动

```bash
# 创建项目目录
mkdir focus && cd focus

# 下载 docker-compose.yml
curl -O https://raw.githubusercontent.com/freekatz/Focus/main/docker-compose.yml

# 创建 .env 文件
cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
DEFAULT_PASSWORD=your-password
FRONTEND_URL=http://localhost:8080
CORS_ORIGINS=http://localhost:8080
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=your-api-key
EOF

# 启动
docker compose up -d
```

### 2. 访问

- 地址: http://localhost:8080
- 账号: `admin` / 你设置的密码

## 配置说明

### 环境变量

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `SECRET_KEY` | ✅ | JWT 密钥，用 `openssl rand -hex 32` 生成 |
| `DEFAULT_PASSWORD` | | 管理员密码，默认 `focus123` |
| `FRONTEND_URL` | | 前端地址，用于生成分享链接 |
| `CORS_ORIGINS` | | 允许的跨域来源，与 FRONTEND_URL 保持一致 |
| `AI_PROVIDER` | | `openai` 或 `openai_compatible` |
| `AI_MODEL` | | 模型名称，如 `gpt-4o-mini` |
| `AI_API_KEY` | ⚠️ | AI API 密钥，ArXiv 解读需要 |
| `AI_BASE_URL` | | 自定义 API 端点（OpenRouter 等） |

### AI 配置示例

**OpenAI:**
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-xxx
```

**OpenRouter:**
```env
AI_PROVIDER=openai_compatible
AI_MODEL=anthropic/claude-3-sonnet
AI_API_KEY=sk-or-xxx
AI_BASE_URL=https://openrouter.ai/api/v1
```

## 生产部署 (HTTPS + 域名)

使用 Caddy 自动管理 HTTPS 证书。

### 1. 安装 Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

### 2. 配置 Caddy

编辑 `/etc/caddy/Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

重启 Caddy:

```bash
systemctl restart caddy
```

### 3. 更新环境变量

```env
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
```

重启后端:

```bash
docker compose restart backend
```

### 4. DNS 配置

在域名服务商添加 A 记录，指向服务器公网 IP。

## 数据管理

### 备份

```bash
docker cp focus-backend:/app/data ./backup-$(date +%Y%m%d)
```

### 恢复

```bash
docker compose down
docker cp ./backup/focus.db focus-backend:/app/data/
docker compose up -d
```

## 常用命令

| 操作 | 命令 |
|------|------|
| 启动 | `docker compose up -d` |
| 停止 | `docker compose down` |
| 重启 | `docker compose restart` |
| 日志 | `docker compose logs -f` |
| 更新 | `docker compose pull && docker compose up -d` |
| 重置 | `docker compose down -v && docker compose up -d` |

## 故障排除

**容器启动失败:**
```bash
docker compose logs backend
```

**健康检查失败:**
```bash
curl http://localhost:8000/health
```

**AI 调用失败:**
- 检查 `AI_API_KEY` 是否正确
- 检查网络是否能访问 AI API
