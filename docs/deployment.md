# Focus 部署指南

## 目录

- [环境要求](#环境要求)
- [快速部署](#快速部署)
- [详细配置](#详细配置)
- [Nginx 配置](#nginx-配置)
- [Systemd 服务](#systemd-服务)
- [Docker 部署](#docker-部署)
- [常见问题](#常见问题)

---

## 环境要求

### 后端
- Python 3.11+
- SQLite (默认) 或 PostgreSQL 15+

### 前端
- Node.js 18+
- npm 或 pnpm

### 生产环境
- Nginx (推荐作为反向代理)
- systemd (进程管理)

---

## 快速部署

### 1. 克隆项目

```bash
git clone <repository-url> /opt/focus
cd /opt/focus
```

### 2. 后端部署

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，修改必要配置
```

**必须修改的配置项：**

```bash
# .env
SECRET_KEY=<生成一个随机密钥>
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
ALLOWED_HOSTS=your-domain.com,localhost
DEFAULT_PASSWORD=<设置强密码>
```

生成随机密钥：
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. 前端构建

```bash
cd frontend

# 安装依赖
npm install

# 生产构建
npm run build
```

构建产物在 `frontend/dist` 目录。

### 4. 启动服务

```bash
# 后端
cd backend
source venv/bin/activate
python run.py

# 或使用 hypercorn 直接启动
hypercorn app.main:app --bind 0.0.0.0:8000
```

---

## 详细配置

### 后端环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `8000` | 监听端口 |
| `DEBUG` | `false` | 调试模式 |
| `FRONTEND_URL` | `http://localhost:5173` | 前端 URL (用于分享链接) |
| `CORS_ORIGINS` | `*` | CORS 允许来源，逗号分隔 |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | 允许的 Host，`*` 禁用检查 |
| `DATABASE_URL` | `sqlite+aiosqlite:///./focus.db` | 数据库连接 |
| `SECRET_KEY` | - | JWT 密钥 (生产必改) |
| `DEFAULT_USERNAME` | `admin` | 默认用户名 |
| `DEFAULT_PASSWORD` | `focus123` | 默认密码 (生产必改) |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `LOG_FILE` | `logs/focus.log` | 日志文件路径 |

### 前端环境变量

| 变量名 | 说明 |
|--------|------|
| `VITE_API_URL` | API 路径，生产环境使用 `/api/v1` |

### 数据库配置

**SQLite (默认，适合个人使用)：**
```
DATABASE_URL=sqlite+aiosqlite:///./focus.db
```

**PostgreSQL (推荐生产环境)：**
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/focus
```

---

## Nginx 配置

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 创建配置文件

```bash
# 创建站点配置
sudo nano /etc/nginx/sites-available/focus

# 或在 conf.d 目录（CentOS）
sudo nano /etc/nginx/conf.d/focus.conf
```

### 基础配置 (HTTP)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /opt/focus/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持 (如需要)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }

    # RSS Feed (公开访问)
    location /export/rss.xml {
        proxy_pass http://127.0.0.1:8000/export/rss.xml;
        proxy_set_header Host $host;
    }

    # API 文档 (可选，生产环境可禁用)
    location ~ ^/(docs|redoc|openapi.json)$ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

### HTTPS 配置 (推荐)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 前端静态文件
    location / {
        root /opt/focus/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }

    location /export/rss.xml {
        proxy_pass http://127.0.0.1:8000/export/rss.xml;
        proxy_set_header Host $host;
    }
}
```

### 申请 SSL 证书

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期 (certbot 自动配置)
sudo certbot renew --dry-run
```

### 启用站点并启动 Nginx

```bash
# 创建软链接启用站点（Ubuntu/Debian）
sudo ln -s /etc/nginx/sites-available/focus /etc/nginx/sites-enabled/

# 删除默认站点（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置语法
sudo nginx -t

# 启动/重启 Nginx
sudo systemctl start nginx    # 首次启动
sudo systemctl reload nginx   # 重新加载配置
sudo systemctl restart nginx  # 完全重启

# 开机自启
sudo systemctl enable nginx

# 查看状态
sudo systemctl status nginx
```

### 文件权限设置

Nginx 需要有权限访问前端静态文件目录。如果项目部署在 `/root` 目录下，需要特别处理权限：

**方案一：修改权限（快速但不推荐用于生产）**

```bash
# 如果项目在 /root 目录
chmod 755 /root
chmod -R 755 /root/Focus/frontend/dist
```

**方案二：移动到标准目录（推荐）**

```bash
# 移动项目到 /opt 或 /var/www
sudo mv /root/Focus /opt/focus

# 设置正确的所有者和权限
sudo chown -R www-data:www-data /opt/focus/frontend/dist
sudo chmod -R 755 /opt/focus/frontend/dist

# 后端目录权限（如果使用 www-data 用户运行）
sudo chown -R www-data:www-data /opt/focus/backend
```

**方案三：在 /root 下但使用 ACL（兼顾安全性）**

```bash
# 安装 ACL 工具
sudo apt install acl

# 给 www-data 用户访问权限
sudo setfacl -m u:www-data:rx /root
sudo setfacl -R -m u:www-data:rx /root/Focus/frontend/dist
```

### 常用 Nginx 命令

```bash
# 测试配置
sudo nginx -t

# 重新加载配置（不中断服务）
sudo systemctl reload nginx

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 查看访问日志
sudo tail -f /var/log/nginx/access.log

# 查看 Nginx 进程
ps aux | grep nginx
```

---

## Systemd 服务

### 后端服务

创建 `/etc/systemd/system/focus-backend.service`：

```ini
[Unit]
Description=Focus Backend API
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/focus/backend
Environment="PATH=/opt/focus/backend/venv/bin"
ExecStart=/opt/focus/backend/venv/bin/python run.py
Restart=always
RestartSec=5

# 日志
StandardOutput=journal
StandardError=journal

# 安全限制
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 启用服务

```bash
# 重载 systemd
systemctl daemon-reload

# 启动服务
systemctl start focus-backend

# 开机自启
systemctl enable focus-backend

# 查看状态
systemctl status focus-backend

# 查看日志
journalctl -u focus-backend -f
```

---

## Docker 部署

### Dockerfile - 后端

创建 `backend/Dockerfile`：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 创建日志目录
RUN mkdir -p logs

EXPOSE 8000

CMD ["python", "run.py"]
```

### Dockerfile - 前端

创建 `frontend/Dockerfile`：

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: focus-backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    volumes:
      - ./backend/data:/app/data
      - ./backend/logs:/app/logs
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    container_name: focus-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

  # 可选：PostgreSQL
  # postgres:
  #   image: postgres:15-alpine
  #   container_name: focus-postgres
  #   restart: unless-stopped
  #   environment:
  #     POSTGRES_DB: focus
  #     POSTGRES_USER: focus
  #     POSTGRES_PASSWORD: your-password
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data

# volumes:
#   postgres_data:
```

### Docker 部署命令

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 常见问题

### 1. CORS 错误

**症状：** 浏览器控制台显示 `Access-Control-Allow-Origin` 错误

**解决：**
1. 确认 `CORS_ORIGINS` 包含前端 URL（包括协议和端口）
2. 确认 URL 末尾没有斜杠
3. 使用 Nginx 反向代理时，前端和 API 在同一域名下可避免 CORS

```bash
# 正确
CORS_ORIGINS=https://focus.example.com

# 错误
CORS_ORIGINS=https://focus.example.com/
```

### 2. 400 Bad Request - Invalid Host

**症状：** 访问时返回 400 错误

**解决：** 检查 `ALLOWED_HOSTS` 配置
```bash
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
# 或禁用检查（不推荐）
ALLOWED_HOSTS=*
```

### 3. 502 Bad Gateway

**症状：** Nginx 返回 502 错误

**解决：**
1. 检查后端服务是否运行：`systemctl status focus-backend`
2. 检查后端端口是否正确：`curl http://127.0.0.1:8000/health`
3. 检查 Nginx 日志：`tail -f /var/log/nginx/error.log`

### 4. 500 Internal Server Error (Nginx)

**症状：** 访问前端页面返回 500 错误

**原因：** 通常是 Nginx 无法访问静态文件目录（权限问题）

**排查：**
```bash
# 查看 Nginx 错误日志
sudo tail -20 /var/log/nginx/error.log
```

如果看到 `Permission denied` 错误：
```
stat() "/root/Focus/frontend/dist/index.html" failed (13: Permission denied)
```

**解决：**
```bash
# 方案一：修改权限（如果项目在 /root 目录）
chmod 755 /root
chmod -R 755 /root/Focus/frontend/dist
sudo systemctl reload nginx

# 方案二：移动到标准目录（推荐）
sudo mv /root/Focus /opt/focus
sudo chown -R www-data:www-data /opt/focus/frontend/dist
# 然后修改 nginx 配置中的 root 路径
```

### 5. 静态资源 404

**症状：** 前端页面加载但样式/脚本缺失

**解决：**
1. 确认前端已构建：`ls frontend/dist`
2. 确认 Nginx root 路径正确
3. 检查文件权限：`chmod -R 755 frontend/dist`

### 6. 数据库迁移

SQLite 迁移到 PostgreSQL：

```bash
# 1. 导出数据
sqlite3 focus.db .dump > backup.sql

# 2. 修改 DATABASE_URL
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/focus

# 3. 重启服务，自动创建表结构
systemctl restart focus-backend

# 4. 手动导入数据（需要调整 SQL 语法）
```

### 7. 日志查看

```bash
# 后端日志
tail -f /opt/focus/backend/logs/focus.log

# systemd 日志
journalctl -u focus-backend -f

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 更新部署

```bash
cd /opt/focus

# 拉取更新
git pull

# 后端更新
cd backend
source venv/bin/activate
pip install -r requirements.txt
systemctl restart focus-backend

# 前端更新
cd ../frontend
npm install
npm run build
# Nginx 自动提供新的静态文件
```

---

## 备份策略

### 数据备份

```bash
# SQLite 备份
cp /opt/focus/backend/focus.db /backup/focus-$(date +%Y%m%d).db

# PostgreSQL 备份
pg_dump -U focus focus > /backup/focus-$(date +%Y%m%d).sql
```

### 自动备份 (cron)

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点备份
0 3 * * * cp /opt/focus/backend/focus.db /backup/focus-$(date +\%Y\%m\%d).db
```
