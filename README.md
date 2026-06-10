# ☁️ 云批（`YunPi`）—— 云批智能图库

<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-2.7.6-brightgreen?logo=springboot" alt="Spring Boot">
  <img src="https://img.shields.io/badge/Java-11-ED8B00?logo=openjdk" alt="Java">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-~6-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql" alt="MySQL">
  <img src="https://img.shields.io/badge/Redis-7.0-DC382D?logo=redis" alt="Redis">
  <img src="https://img.shields.io/badge/WebSocket-实时协作-010101?logo=socket.io" alt="WebSocket">
  <img src="https://img.shields.io/badge/腾讯COS-对象存储-0052CC" alt="COS">
  <img src="https://img.shields.io/badge/阿里云AI-图像扩图-FF6A00" alt="阿里云AI">
</p>

> **云批** 是一个集图片管理、团队协作、AI 智能处理于一体的云端智能图库平台。无论你是设计师、摄影师、内容创作者还是普通用户，都能在这里轻松上传、管理、分享图片，并借助 AI 能力提升创作效率。

---

## 🎯 项目简介

**云批智能图库** 解决了传统图库工具「个人与团队割裂」「缺乏智能辅助」的核心痛点。它采用 **"个人空间 + 团队空间 + 公共素材库"** 三层架构，让用户既能拥有私密的个人图库，又能与团队成员无缝协作，还能在公共素材库中浏览、搜索、下载高质量的共享素材。

在AI时代，云批还集成了 **AI 图像扩图（`OutPainting`）**、**以图搜图**、**主色调搜索** 等智能功能，让图片管理不再只是"存和取"，而是"发现与创造"。

**本项目已经部署上线但是为了保护网站，需要的可以私信作者的邮箱给予网站地址。感谢理解**

---

## ✨ 核心功能

### 📸 图片全生命周期管理

| 能力 | 说明 |
|------|------|
| **多格式上传** | 支持 JPG / PNG / WebP 等多种格式，支持单张上传、URL 上传、批量抓取导入 |
| **拖拽上传** | 现代化拖拽交互，拖入即传，体验流畅 |
| **瀑布流浏览** | 纯 CSS Column 瀑布流布局，响应式适配，图片懒加载 + 主色调占位防抖 |
| **图片编辑** | 编辑图片名称、简介、分类、标签等元数据 |
| **自由裁剪** | 支持 8 方向拖拽手柄自由调整裁剪区域，精确到像素级 |
| **一键下载** | 从腾讯云 COS 直接下载原始高清图片 |
| **图片审核** | 管理员审核流程，保障公共素材库内容质量 |




---

### 🏠 个人空间与团队协作

云批提供两层协作模型，兼顾隐私与共享：

```
                    ┌─────────────────────────┐
                    │      云批 智能图库        │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
     ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
     │   私有空间     │   │   团队空间     │   │  公共素材库    │
     │  (个人独享)    │   │  (多人协作)    │   │  (全员共享)   │
     └──────────────┘   └──────────────┘   └──────────────┘
```

| 特性 | 私有空间 | 团队空间 |
|------|---------|----------|
| **可见性** | 仅自己 | 团队成员 |
| **角色系统** | — | 浏览者 / 编辑者 / 管理员 |
| **权限粒度** | 完全控制 | 按角色分配（查看/上传/编辑/删除/成员管理） |
| **容量分层** | 普通版 100张 / 专业版 1000张 / 旗舰版 10000张 |
| **实时协作** | — | ✅ WebSocket 多人在线编辑图片元数据 |

---

### 🤖 AI 智能能力

#### 🎨 AI 图像扩图（OutPainting）
借助阿里云 DashScope API，对图片边界进行智能扩展生成，让照片拥有更大的视野范围。

- 异步任务提交 + 轮询结果，不阻塞用户操作
- 支持在编辑器或素材库中一键发起扩图

#### 🔍 以图搜图
上传一张图片，从素材库中找到视觉上相似的图片。

- 前端 Canvas 提取缩略图特征
- 后端颜色相似度算法匹配
- 结果以瀑布流展示，体验流畅

#### 🌈 主色调搜索
用颜色找图片！选择目标色，云批会按照 CIELAB 色彩空间的欧几里得距离，为你匹配色调最接近的图片。

---

### ✏️ 实时协作编辑

成员编辑同一张图片时，其他在线成员会实时看到「谁正在编辑」的状态提示，避免编辑冲突。

- **WebSocket** 双向通信，毫秒级延迟
- **Disruptor 无锁环形队列** 处理高并发编辑事件
- **Redis Pub/Sub** 实现多节点消息广播
- **Redis 分布式锁** 保证同一时间仅一人可编辑

```
浏览器 A ──WebSocket──▶ 服务器 ◀──Redis Pub/Sub──▶ 浏览器 B
  │                        │
  ▼                        ▼
编辑操作 ──▶ Disruptor RingBuffer ──▶ 持久化到 MySQL
```

---

### 📊 空间数据分析

为空间管理员提供多维度的可视化数据看板：

| 分析维度 | 内容 |
|----------|------|
| **空间概览** | 图片总数、总容量、使用率 |
| **分类分布** | 按分类统计图片数量占比 |
| **标签排行** | 高频标签 TOP N |
| **大小分布** | 图片文件大小分布区间 |
| **用户贡献** | 成员上传数量排行 |
| **空间排行** | 全站空间容量/图片数排名 |

---

## 🛠️ 技术架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        前端 (React 19 + TypeScript)                │
│  Vite 8 │ React Router 7 │ Axios │ CSS Grid │ WebSocket          │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────┴───────────────────────────────────────┐
│                      后端 (Java 11 + Spring Boot 2.7.6)           │
│  ┌──────────┬──────────┬──────────┬──────────────────────────┐  │
│  │ Sa-Token │ MyBatis- │ Disruptor│ Spring WebSocket         │  │
│  │ 1.39.0   │ Plus     │ 3.4.2    │ 实时通信                  │  │
│  │ 认证权限  │ 3.5.15   │ 事件队列  │                          │  │
│  │          │ ORM 框架  │          │                          │  │
│  └──────────┴──────────┴──────────┴──────────────────────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────────────────────┐  │
│  │ Caffeine │  Redis   │ 阿里云AI  │  腾讯云 COS               │  │
│  │ 3.1.8    │ 缓存/锁/  │ DashScope│  5.6.227                  │  │
│  │ 本地缓存  │ Pub/Sub  │ 图像扩图  │  对象存储                  │  │
│  └──────────┴──────────┴──────────┴──────────────────────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────────────────────┐  │
│  │  Knife4j │  Hutool  │  Jsoup   │  Easy-Captcha            │  │
│  │  4.4.0   │  5.8.38  │  1.15.3  │  1.6.2                   │  │
│  │  API 文档 │  工具集   │  网页抓取  │  图形验证码               │  │
│  └──────────┴──────────┴──────────┴──────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Spring AOP │ Lombok                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────────┐
│                        数据存储层                                  │
│                 MySQL 8.0 (yu_picture)                            │
└──────────────────────────────────────────────────────────────────┘
```

### 🔧 技术选型详情

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Java** | 11 | 运行语言 |
| **Spring Boot** | 2.7.6 | 基础框架 |
| **MyBatis-Plus** | 3.5.15 | ORM 框架，简化 CRUD |
| **MySQL** | 8.0 | 关系型数据库 |
| **Redis** | 7.0 | 缓存 / 分布式 Session / 分布式锁 / Pub/Sub 消息广播 |
| **Sa-Token** | 1.39.0 | 轻量级认证授权框架，支持注解式权限校验 |
| **Spring WebSocket** | — | 实时双向通信 |
| **Disruptor** | 3.4.2 | 高性能无锁环形队列，处理并发编辑事件 |
| **Caffeine** | 3.1.8 | 高性能本地缓存 |
| **Knife4j** | 4.4.0 | Swagger / OpenAPI 接口文档自动生成 |
| **腾讯云 COS** | 5.6.227 | 对象存储，存放用户上传的图片 |
| **阿里云 DashScope** | — | AI 图像扩图（OutPainting） |
| **Hutool** | 5.8.38 | Java 工具类库（含 JWT、HTTP 请求等） |
| **Jsoup** | 1.15.3 | HTML 解析，批量抓取网页图片 |
| **Easy-Captcha** | 1.6.2 | 图形验证码生成与校验 |
| **Spring AOP** | — | 切面编程，权限拦截等 |
| **Lombok** | — | 简化 Java 代码，减少样板代码 |

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 19.2.4 | UI 框架 |
| **TypeScript** | ~6.0.2 | 类型安全 |
| **Vite** | 8.0.4 | 开发服务器 & 构建工具 |
| **React Router** | 7.14.0 | 前端路由管理 |
| **Axios** | 1.13.1 | HTTP 请求客户端 |
| **WebSocket API** | — | 实时协作编辑通信 |
| **CSS Grid / Flexbox** | — | 响应式瀑布流 & 网格布局 |

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 |
|------|------|
| JDK | 11+ |
| Maven | 3.6+ |
| Node.js | 18+ |
| MySQL | 8.0 |
| Redis | 7.0 |

### 1. 数据库初始化

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS yu_picture DEFAULT CHARACTER SET utf8mb4;

-- 导入表结构
-- 执行 sql/creat_table.sql 文件
```

### 2. 后端启动

```bash
# 克隆项目
git clone https://github.com/your-username/ruwei-picture-backend.git
cd ruwei-picture-backend

# 修改配置文件
# 编辑 src/main/resources/application-dev.yaml
#   - 数据库连接信息
#   - Redis 连接信息
#   - 腾讯云 COS 配置（SecretId/SecretKey/Bucket）
#   - 阿里云 DashScope API Key（可选，用于 AI 扩图）

# 编译并运行
mvn clean package -DskipTests
mvn spring-boot:run

# 服务启动后访问：
#   API 服务: http://localhost:8080/api
#   API 文档: http://localhost:8080/api/doc.html
```

### 3. 前端启动

```bash
cd ruweiyunpi-picture

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器访问 http://localhost:5173
```

### 4. 构建部署

```bash
# 前端构建
cd ruweiyunpi-picture && npm run build

# 后端打包
cd .. && mvn clean package -DskipTests

# 将 ruweiyunpi-picture/dist 目录内容部署到 Nginx
# 将 target/*.jar 部署到服务器运行
```

---

## 📖 使用示例

### 上传图片到个人空间

```bash
# 通过 API 上传（或在前端页面直接拖拽上传）
curl -X POST http://localhost:8080/api/picture/upload \
  -F "file=@my-photo.jpg" \
  -F "picName=我的照片" \
  -F "category=风景" \
  -F "tags=山川,日出" \
  -F "spaceId=123456"
```

### 以图搜图

在前端页面点击「以图搜图」按钮，上传一张图片，系统会自动从素材库中匹配视觉相似的图片返回。

### AI 扩图

1. 在图片详情页点击「AI 扩图」
2. 选择扩展方向和像素量
3. 提交任务，稍等片刻即可获得扩展后的图片

---

## 🤝 贡献者招募

云批是一个正在快速成长的开源项目，我们正在寻找志同道合的贡献者！

### 我们需要的贡献

| 方向 | 内容 |
|------|------|
| 🎨 **前端优化** | 优化组件性能、新增交互效果、完善移动端适配 |
| ⚙️ **后端增强** | 数据库查询优化、缓存策略改进、新功能开发 |
| 🤖 **AI 扩展** | 接入更多 AI 模型、完善智能搜索、图像识别分类 |
| 📝 **文档完善** | API 文档、部署指南、使用教程 |
| 🧪 **测试补全** | 单元测试、集成测试、E2E 测试 |
| 🐛 **Bug 修复** | 发现并修复现有问题 |

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 后端遵循阿里巴巴 Java 开发规范
- 前端使用 ESLint + Prettier 统一代码风格
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 📬 联系方式

- **GitHub Issues**: [提交问题或建议](https://github.com/gomi-size/ruwei-picture/issues)
- **邮箱**：3136124236@qq.com
- **项目作者**: [`ruwei`](https://github.com/gomi-size/ruwei-picture.git)

---

<p align="center">
  <sub>Built with ❤️ by the ruweiYunPi team | © 2026 - Present</sub>
</p>
