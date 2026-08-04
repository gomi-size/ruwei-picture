# 云批智能图库 Docker 部署流程

本文是一步一步的操作手册。整套 Docker 配置已经放在仓库里，你只需要按下面的顺序执行。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `Dockerfile` | 后端镜像：Maven 构建 + JRE 11 运行 |
| `docker-compose.yml` | 编排 MySQL 8 / Redis 7 / RabbitMQ / 后端 / 前端 |
| `src/main/resources/application-docker.yml` | Docker 环境配置模板，敏感项全部走环境变量 |
| `ruweiyunpi-picture-frontend/Dockerfile` | 前端镜像：Node 22 构建 + Nginx 托管 |
| `ruweiyunpi-picture-frontend/nginx.conf` | Nginx 静态资源、`/api` 反向代理、WebSocket 转发 |
| `.env.example` | 环境变量模板，复制为 `.env` 后填写 |
| `DEPLOY.md` | 本文档 |

---

## 第 1 步：检查环境

在项目根目录打开 PowerShell，确认 Docker 可用：

```powershell
docker --version
docker compose version
```

需要 Docker 20+ 和 Docker Compose v2+。接着检查默认端口是否被占用：

```powershell
Get-NetTCPConnection -LocalPort 3306,6379,5672,15672,8080,8081 -ErrorAction SilentlyContinue
```

默认端口说明：

| 端口 | 服务 |
| --- | --- |
| 3306 | MySQL |
| 6379 | Redis |
| 5672 / 15672 | RabbitMQ（业务端口 / 管理台） |
| 8080 | 后端 |
| 8081 | 前端 |

如果端口被占用，在第 3 步修改 `.env` 里的端口变量。

## 第 2 步：确认当前目录

确保当前目录是仓库根目录，且能看到 `docker-compose.yml`：

```powershell
Get-ChildItem Dockerfile docker-compose.yml .env.example
```

## 第 3 步：创建环境变量文件

```powershell
Copy-Item .env.example .env
```

`docker-compose.yml` 会从 `.env` 读取配置。`.env` 已经被加入 `.gitignore`，不会提交到仓库。

## 第 4 步：填写 `.env`

用编辑器打开 `.env`，逐项填写：

1. `MYSQL_ROOT_PASSWORD`：MySQL root 密码，生产环境必须改成强密码。
2. `MYSQL_DATABASE`：保持 `ruwei_picture`，与数据库初始化脚本一致。
3. `MYSQL_USER` / `MYSQL_PASSWORD`：后端连接数据库使用的账号密码。
4. `REDIS_PASSWORD`：Redis 密码。
5. `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS`：RabbitMQ 账号密码。
6. `RABBITMQ_DEFAULT_VHOST`：保持 `ruweipicture`，后端配置里也是这个名字。
7. `BACKEND_PORT` / `FRONTEND_PORT`：对外暴露的端口，默认 `8080` / `8081`。
8. `COS_CLIENT_HOST` / `COS_CLIENT_SECRET_ID` / `COS_CLIENT_SECRET_KEY` / `COS_CLIENT_REGION` / `COS_CLIENT_BUCKET`：腾讯云 COS 配置，必填。可以直接沿用本地 `src/main/resources/application-local.yml` 里已有的值。不填时服务能启动，但图片上传和下载不可用。
9. `ALIYUN_AI_APIKEY`：阿里云 DashScope API Key，可选。不填时 AI 扩图不可用。

## 第 5 步：校验配置

```powershell
docker compose config
```

能正常输出各服务的完整配置，说明 compose 文件没有语法问题。重点检查：

- `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` 已填入。
- `SPRING_REDIS_PASSWORD`、`SPRING_RABBITMQ_*` 与 `.env` 一致。
- `COS_CLIENT_*` 没有显示为占位符。

## 第 6 步：构建并启动

```powershell
docker compose up -d --build
```

执行内容：

1. 拉取 `mysql:8.0`、`redis:7-alpine`、`rabbitmq:3-management`、`maven`、`node`、`nginx` 基础镜像。
2. 构建后端镜像：Maven 执行 `mvn clean package -DskipTests`。
3. 构建前端镜像：执行 `npm ci` 和 `npm run build`。
4. 按顺序启动 MySQL、Redis、RabbitMQ，等它们健康后再启动后端，最后启动前端。

首次执行需要下载依赖，耗时较长，耐心等待。

## 第 7 步：查看启动状态

```powershell
docker compose ps
```

预期状态：

- `ruwei-mysql`：`healthy`
- `ruwei-redis`：`healthy`
- `ruwei-rabbitmq`：`healthy`
- `ruwei-backend`：`Up`
- `ruwei-frontend`：`Up`

查看后端日志，确认启动成功：

```powershell
docker compose logs -f backend
```

看到类似 `Started YuPictureBackendApplication` 的日志即启动成功。后端启动前会等待数据库、Redis、RabbitMQ 健康检查通过，整体约 30-60 秒。

## 第 8 步：验证部署

前端页面：

```powershell
Start-Process "http://localhost:8081"
```

后端接口文档：

```powershell
Start-Process "http://localhost:8080/api/doc.html"
```

RabbitMQ 管理台（账号密码来自 `.env`）：

```powershell
Start-Process "http://localhost:15672"
```

检查数据库表是否初始化成功：

```powershell
docker compose exec mysql mysql -u ruwei_picture -pruwei_picture123456 -e "SHOW TABLES;" ruwei_picture
```

检查 Redis 连通性：

```powershell
docker compose exec redis sh -c 'redis-cli -a "$REDIS_PASSWORD" ping'
```

返回 `PONG` 即正常。

WebSocket 协作编辑：打开前端页面，进入任意图片的编辑页，地址为 `/api/ws/picture/edit`。Nginx 已经配置了 `Upgrade` 转发，浏览器不会直接连接后端端口。

## 第 9 步：日常运维

查看所有容器状态：

```powershell
docker compose ps
```

查看某个服务日志：

```powershell
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f frontend
```

重启后端：

```powershell
docker compose restart backend
```

停止并删除容器（保留数据卷）：

```powershell
docker compose down
```

停止并删除容器和数据（清空 MySQL / Redis / RabbitMQ 数据）：

```powershell
docker compose down -v
```

## 第 10 步：更新代码后重新部署

```powershell
docker compose up -d --build
```

Compose 会只重建发生变化的镜像，数据卷保持不变。如果只改了前端或后端，也可以分别构建：

```powershell
docker compose build frontend
docker compose up -d frontend

docker compose build backend
docker compose up -d backend
```

## 第 11 步：生产环境建议

1. 修改 `.env` 中 MySQL、Redis、RabbitMQ 的默认密码。
2. 把 `FRONTEND_PORT` 改为 `80`。
3. 在 Nginx 配置中启用 HTTPS，把 443 端口映射出来。
4. 不要提交 `.env`，密钥通过环境变量注入。
5. 定期备份 `mysql_data`、`redis_data`、`rabbitmq_data` 三个数据卷。

## 常见问题

Q：拉取基础镜像超时或失败

A：检查网络能否访问 Docker Hub，或给 Docker 配置镜像加速器，然后重试。

Q：端口被占用

A：修改 `.env` 中对应端口变量，例如 `MYSQL_PORT=3307`、`FRONTEND_PORT=8082`，再重新执行 `docker compose up -d`。

Q：`ruwei-backend` 一直重启

A：执行 `docker compose logs -f backend` 查看原因，通常是 MySQL、Redis、RabbitMQ 连接信息与 `.env` 不一致，或 COS 配置未填导致启动时创建客户端失败。

Q：MySQL 表没有初始化

A：初始化脚本只在数据卷为空时执行一次。如果之前已经启动过，需要先 `docker compose down -v` 清掉旧数据卷，再 `docker compose up -d`。

Q：图片上传或下载报错

A：检查 `.env` 中 `COS_CLIENT_*` 五项是否填写正确，确认后执行 `docker compose up -d` 让后端重新读取。

Q：AI 扩图不可用

A：确认 `.env` 中 `ALIYUN_AI_APIKEY` 已填写且有效。

Q：WebSocket 协作连不上

A：确认通过前端域名访问（默认 `http://localhost:8081`），不要绕过 Nginx 直连后端 8080；检查 `nginx.conf` 中 `/api/ws/` 的 `Upgrade` / `Connection` 配置未被改动。
