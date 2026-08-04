# 云批智能图库 Linux 部署流程（一步一步）

本文假设你有一台全新的 Linux 服务器，从安装 Docker 开始，到完成部署和验证。适用于 Ubuntu 22.04 / 24.04 等 Debian 系系统，需要 root 权限或 sudo。

> 本文只讲部署操作，不修改任何项目代码。

---

## 第 1 步：准备服务器

1. 确认系统版本：

   ```bash
   cat /etc/os-release
   ```

2. 确认能访问外网，因为要拉取 Docker 镜像、Maven 和 npm 依赖。

3. 建议配置：2 核 4G 起步，磁盘 20G+。

## 第 2 步：安装 Docker 和 Docker Compose

依次执行：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

添加 Docker 官方源：

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

安装 Docker 及 Compose 插件：

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

确认安装成功：

```bash
docker --version
docker compose version
```

让当前用户免 sudo 使用 Docker（重新登录后生效）：

```bash
sudo usermod -aG docker $USER
```

重新登录服务器，或执行 `newgrp docker` 后继续。

## 第 3 步：把项目放到服务器

推荐用 git 拉取：

```bash
cd /opt
sudo git clone https://github.com/gomi-size/ruwei-picture.git
sudo chown -R $USER:$USER /opt/ruwei-picture
cd /opt/ruwei-picture
```

如果仓库目录名不同，进入实际目录即可，关键是能看到 `docker-compose.yml`：

```bash
ls -la Dockerfile docker-compose.yml .env.example
```

备选方式：从本地 Windows 打包上传。在 Windows 的 PowerShell 中执行：

```powershell
scp -r E:\GitHupProject\picture\ruwei-picture-backend user@服务器IP:/opt/ruwei-picture
```

注意不要上传 `node_modules`、`target`、`.git` 等大目录，推荐先 commit 再 git clone。

## 第 4 步：创建环境变量文件

```bash
cp .env.example .env
```

## 第 5 步：填写 `.env`

编辑文件：

```bash
nano .env
```

或使用 `vim .env`。逐项填写：

1. `MYSQL_ROOT_PASSWORD`：MySQL root 密码。
2. `MYSQL_DATABASE`：保持 `ruwei_picture`。
3. `MYSQL_USER` / `MYSQL_PASSWORD`：后端连接数据库的账号密码。
4. `REDIS_PASSWORD`：Redis 密码。
5. `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS`：RabbitMQ 账号密码。
6. `RABBITMQ_DEFAULT_VHOST`：保持 `ruweipicture`。
7. `BACKEND_PORT`：后端端口，默认 `8080`，一般不用改。
8. `FRONTEND_PORT`：前端对外端口，默认 `8081`。如果想让用户直接访问 80 端口，改成 `80`。
9. `COS_CLIENT_HOST` / `COS_CLIENT_SECRET_ID` / `COS_CLIENT_SECRET_KEY` / `COS_CLIENT_REGION` / `COS_CLIENT_BUCKET`：腾讯云 COS 配置，必填。因为 `application-local.yml` 被 gitignore，不会随 git 上传，所以这里必须手动填写。
10. `ALIYUN_AI_APIKEY`：阿里云 DashScope API Key，可选。

保存并退出（nano 是 `Ctrl+O`、`Enter`、`Ctrl+X`）。

## 第 6 步：校验配置

```bash
docker compose config
```

正常输出各服务配置即通过。重点确认 `SPRING_DATASOURCE_PASSWORD`、`SPRING_REDIS_PASSWORD`、`SPRING_RABBITMQ_*`、`COS_CLIENT_*` 没有占位符。

## 第 7 步：构建并启动

```bash
docker compose up -d --build
```

执行内容：

1. 拉取 MySQL、Redis、RabbitMQ、Maven、Node、Nginx 基础镜像。
2. 后端镜像执行 Maven 打包。
3. 前端镜像执行 npm 安装和构建。
4. 先启动 MySQL、Redis、RabbitMQ，健康检查通过后再启动后端，最后启动前端。

首次执行会下载大量依赖，可能耗时 5-15 分钟。

## 第 8 步：查看启动状态

```bash
docker compose ps
```

预期状态：

```text
ruwei-mysql      healthy
ruwei-redis      healthy
ruwei-rabbitmq   healthy
ruwei-backend    Up
ruwei-frontend   Up
```

查看后端日志，确认启动成功：

```bash
docker compose logs -f backend
```

看到 `Started YuPictureBackendApplication` 即成功。

## 第 9 步：验证访问

服务器本机先自测：

```bash
curl -I http://localhost:8081
```

浏览器访问（把 `服务器IP` 换成你的公网 IP，端口按 `.env` 中的 `FRONTEND_PORT`）：

- 前端页面：`http://服务器IP:8081`
- 后端接口文档：`http://服务器IP:8080/api/doc.html`
- RabbitMQ 管理台：`http://服务器IP:15672`

如果访问不通，检查防火墙和安全组：

```bash
sudo ufw status
```

放行端口（按实际端口调整）：

```bash
sudo ufw allow 8081/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 15672/tcp
```

云服务器还要在控制台的安全组里放行相同端口。

## 第 10 步：开机自启

Docker 服务已通过 `systemctl enable --now docker` 开机自启；容器都配置了 `restart: unless-stopped`，服务器重启后会自动恢复。

## 第 11 步：生产环境建议

1. 把 `.env` 中所有默认密码改成强密码。
2. 把 `FRONTEND_PORT` 改为 `80`，让用户直接访问 `http://服务器IP`。
3. 使用域名和 HTTPS：在 Nginx 配置中加 443 监听和证书，并把 443 映射出来。
4. 只对公网开放 80/443，MySQL、Redis、RabbitMQ、后端 8080 只允许内网访问。
5. 定期备份 `mysql_data`、`redis_data`、`rabbitmq_data` 三个数据卷。
6. `.env` 包含密钥，不要提交到 git，也不要在聊天中公开。

## 常见问题

Q：`docker compose` 报 Permission denied

A：当前用户没有加入 docker 组，执行 `sudo usermod -aG docker $USER` 后重新登录。

Q：拉取镜像很慢或超时

A：给 Docker 配置镜像加速器：编辑 `/etc/docker/daemon.json` 添加 `registry-mirrors`，重启 Docker 后重试。

Q：浏览器访问不通

A：先在服务器执行 `curl -I http://localhost:8081`，通的话检查云安全组和 `ufw` 防火墙。

Q：`ruwei-backend` 一直重启

A：`docker compose logs -f backend` 看日志，通常是数据库、Redis、RabbitMQ 密码与 `.env` 不一致，或 COS 配置没填。

Q：MySQL 表没有初始化

A：初始化脚本只在数据卷为空时执行一次。执行 `docker compose down -v` 清掉旧数据卷后重新 `docker compose up -d`。

Q：WebSocket 协作连不上

A：通过前端地址访问（默认 `http://服务器IP:8081`），不要直连后端 8080；检查 Nginx 的 `/api/ws/` 转发配置。

Q：更新代码后怎么重新部署

A：在服务器项目目录执行 `git pull`，然后 `docker compose up -d --build`，数据卷会保留。
