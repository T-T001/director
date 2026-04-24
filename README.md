# director

`director` 是对 `waoowaoo` 的一次全新独立重写，采用 **React + Vite 前端** 和 **FastAPI 后端** 的前后端分离方案。

## 当前启动版范围

当前这一版实现的是 Phase 0 + Phase 1 的最小可运行闭环：
- JWT 登录认证 + refresh cookie
- 项目 CRUD
- 剧集 CRUD
- workspace 聚合接口
- 最小前端壳页面
- 为后续 task / run 扩展预留的数据表和接口骨架

## 后端核心业务重构状态（详细）

> 以下状态基于当前 `backend/app` 与 Alembic 迁移文件的实际代码。

### 一、已完成重构并可用的核心业务

#### 1) 认证域（Auth）
已完成并可直接联调：
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

当前能力：
- 用户名密码登录、签发 access token + refresh token
- refresh token 持久化入库并支持轮转
- refresh token 放 Cookie（服务端设置/清除）
- logout 时可撤销 refresh token

对应代码：
- `backend/app/api/routes/auth.py`
- `backend/app/services/auth_service.py`
- `backend/app/core/security.py`
- `backend/app/db/models/user.py`

#### 2) 项目域（Project）
已完成并可直接联调：
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `PATCH /api/projects/{project_id}`
- `DELETE /api/projects/{project_id}`
- `GET /api/projects/{project_id}/workspace`

当前能力：
- 项目完整 CRUD
- 自动挂载 project settings（创建项目时初始化）
- workspace 聚合读取（项目 + settings + episodes + 活动任务摘要）

对应代码：
- `backend/app/api/routes/projects.py`
- `backend/app/services/project_service.py`
- `backend/app/db/models/project.py`

#### 3) 剧集域（Episode）
已完成并可直接联调：
- `GET /api/projects/{project_id}/episodes`
- `POST /api/projects/{project_id}/episodes`
- `GET /api/episodes/{episode_id}`
- `PATCH /api/episodes/{episode_id}`
- `DELETE /api/episodes/{episode_id}`

当前能力：
- 剧集完整 CRUD
- 同项目下 `episode_number` 自动递增
- 鉴权后按用户项目范围访问

对应代码：
- `backend/app/api/routes/episodes.py`
- `backend/app/services/episode_service.py`
- `backend/app/db/models/episode.py`

#### 4) 设置域（Settings）
已完成并可直接联调：
- `GET /api/settings`
- `PATCH /api/settings`

当前能力：
- 用户级偏好读取与更新
- 首次访问自动创建用户偏好记录
- 支持模型参数与风格参数持久化

对应代码：
- `backend/app/api/routes/settings.py`
- `backend/app/services/settings_service.py`
- `backend/app/db/models/user.py`（`UserPreference`）

#### 5) 基础工程能力（可用）
已完成：
- 全局异常结构统一（`success/error` 响应形态）
- CORS 与本地开发端口白名单
- MinIO bucket 启动时自动确保存在
- 一键开发启动（建库 -> 迁移 -> seed -> 启动服务）

对应代码：
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/storage.py`
- `backend/app/scripts/dev.py`
- `backend/app/scripts/seed.py`

#### 6) 数据库基础模型与首版迁移
已完成首版 schema：
- users / refresh_tokens / user_preferences
- projects / project_settings / episodes
- media_objects
- tasks / task_events
- workflow_runs / workflow_steps / workflow_events

对应代码：
- `backend/alembic/versions/20260411_000001_init.py`
- `backend/app/db/models/*.py`

---

### 二、正在重构（已有骨架或半完成）的核心业务

> 这一类表示：已经有数据模型或接口占位，但业务闭环尚未完成。

#### 1) Task / Run 域（半完成）
当前已有：
- 数据模型完整（tasks、task_events、workflow_runs、workflow_steps、workflow_events）
- run 事件读取接口：`GET /api/runs/{run_id}/events`
- run 可见性校验服务

当前缺口：
- 任务提交主入口（`POST /api/tasks`）
- 任务列表/详情接口（项目级 tasks API）
- run 的 cancel / retry-step 等控制接口
- 统一 task/run 生命周期写入服务

对应代码：
- 已有：`backend/app/api/routes/runs.py`、`backend/app/services/run_service.py`、`backend/app/db/models/task.py`、`backend/app/db/models/run.py`
- 待补：`tasks` 路由与 service 完整实现

#### 2) 项目级 SSE 实时流（占位中）
当前已有：
- 路由占位：`GET /api/sse/projects/{project_id}`
- 鉴权与项目归属校验已接入

当前状态：
- 仍为 stub（返回 `enabled: False`），尚未推送真实事件流

对应代码：
- `backend/app/api/routes/sse.py`

#### 3) Workspace 的“任务驱动”聚合能力（在途）
当前已有：
- workspace 接口已返回 `latest_active_tasks` 摘要

当前缺口：
- 任务状态推进机制尚未接入（worker/workflow 未完成）
- 目前主要用于兼容前端结构，不是完整异步编排闭环

对应代码：
- `backend/app/services/project_service.py`

---

### 三、尚未重构完成（核心业务缺失）的模块

以下是方案中定义但当前后端还未完整落地的核心业务：

#### 1) Storyboard 工作流链路
未完成：
- `POST /api/episodes/{episode_id}/story-to-script`
- `POST /api/episodes/{episode_id}/script-to-storyboard`
- 分镜 CRUD（storyboards/panels 资源）

#### 2) 资产域（Asset）
未完成：
- 项目资产管理（角色/场景/道具）
- 全局资产库（global assets）
- 资产生成/修改/渲染选择接口

#### 3) Voice / Video / Editor 域
未完成：
- 配音生成与绑定
- panel 级视频生成与 lip-sync
- editor 渲染任务接口

#### 4) Files 域
未完成：
- 统一上传接口（文件入库 + media object 绑定）
- 签名 URL / 文件分发能力

#### 5) 异步执行体系（Worker / Workflow）
未完成：
- Dramatiq worker 与队列消费
- workflow 编排层（text/image/video/voice）
- 任务事件发布与 run step 事件落库的统一链路

#### 6) Provider Gateway / Integration 层
未完成：
- 统一 provider gateway（模型选择、路由、降级策略）
- 外部 AI/媒体平台适配层

#### 7) 测试体系（核心业务覆盖不足）
当前仅有基础测试（health / CORS / mapper）：
- `backend/tests/test_health.py`

尚缺：
- auth/project/episode/settings 的接口行为测试
- task/run/workflow 的集成测试
- SSE 与长任务链路回归测试

---

### 四、后端重构进度结论（当前版本）

- **已完成并可上线联调的主线**：Auth + Project + Episode + Settings + Workspace 基础聚合
- **正在重构中的主线**：Task/Run/SSE（目前属于“有模型+部分接口”的半完成状态）
- **尚未完成的关键主线**：Storyboard、Asset、Voice、Video、Editor、Files、Worker、Provider Gateway 与完整测试体系

这也是当前版本在 README 中标注为「Phase 0 + Phase 1 最小闭环」的原因。
## 基础设施复用说明

`director` 直接复用 `waoowaoo` 已经提供的 MySQL / Redis / MinIO 服务。

本地默认端口：
- MySQL：`localhost:13306`
- Redis：`localhost:16379`
- MinIO API：`localhost:19000`

所以请先启动 `waoowaoo` 的基础设施，再运行 `director`。

## 后端本地开发启动

第一次安装依赖：

```bash
cd E:/PyCharm/director/backend
uv sync
```

之后后端可以直接一条命令启动（默认开启热重载）：

```bash
cd E:/PyCharm/director/backend
uv run director-dev
```

这个命令会自动完成：
- 检查并创建 `director` 数据库（MySQL 场景）
- 执行 Alembic 迁移
- seed 默认管理员账号
- 以热重载模式启动 FastAPI（默认 `http://localhost:18000`）

如果你不用 `uv`，也可以直接运行：

```bash
cd E:/PyCharm/director/backend
python -m app.scripts.dev
```

如需关闭后端热重载：

```bash
cd E:/PyCharm/director/backend
python -m app.scripts.dev --no-reload
```

## 前端本地开发启动

前端使用 Vite，默认就是热更新（HMR）：

```bash
cd E:/PyCharm/director/frontend
npm install
npm run dev
```

如果你需要显式监听局域网地址：

```bash
cd E:/PyCharm/director/frontend
npm run dev:host
```

## Docker Compose 启动

项目根目录下的 compose 只负责启动：
- `backend`
- `frontend`

它们会连接到宿主机上由 `waoowaoo` 提供的 MySQL / Redis / MinIO，而不是再重复启动一套新的基础设施。

---

## 核心业务重构进度（前后端分离）

> 更新时间：2026-04-13  
> 统计口径：以 `waoowaoo` 项目 `v0.3.0 -> 当前 main + 工作区未提交改动` 为基线。  
> “覆盖率”= 模块内已改动文件数 / 模块文件总数（这是重构触达率，不是测试覆盖率）。

### 前端核心业务功能界面（UI）

#### 已完成重构（覆盖较高）

1. 首页快速开始与创建项目入口（100%）
- 目录：`src/app/[locale]/home`
- 状态：入口流程、项目创建、跳转链路已收口，可作为稳定入口界面。

2. NovelPromotion-脚本视图界面（66.7%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/script-view`
- 状态：脚本到资产联动与展示逻辑已完成大部分重构，结构清晰度明显提升。

3. 共享资产组件（63.6%）
- 目录：`src/components/shared/assets`
- 状态：创建/选择/编辑等共通组件已明显抽象化，复用性提升。

4. LLM 控制台界面（50.0%）
- 目录：`src/components/llm-console`
- 状态：流式展示与调试回放相关界面已基本稳定。

#### 正在重构（覆盖中低）

1. NovelPromotion-资产舞台界面（48.5%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/assets`
- 现状：已进入结构拆分阶段，跨卡片状态与路由状态仍在收口。

2. 公共选择器与配置弹窗（42.9%）
- 目录：`src/components/selectors`, `src/components/ui/config-modals`
- 现状：已有统一抽象，但部分组件仍存在业务耦合。

3. NovelPromotion-工作台壳层（26.3%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion`
- 现状：工作台编排层已重构一部分，子功能合并仍在推进。

4. NovelPromotion-智能导入界面（16.7%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import`
- 现状：状态流转已开始整理，尚未整体收口。

5. NovelPromotion-分镜界面（15.9%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/storyboard`
- 现状：处于持续 WIP，hooks 和页面主入口仍在重构演进中。

6. AssetHub-页面与组件（15.8%）
- 目录：`src/app/[locale]/workspace/asset-hub`
- 现状：可用但结构未定型，组件层级与数据流还在标准化。

7. 用户配置中心界面（5.9%）
- 目录：`src/app/[locale]/profile/components/api-config*`
- 现状：已启动重构，但仍处于早期阶段。

#### 尚未重构（覆盖 0%）

1. NovelPromotion-视频界面（0%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/video*`

2. NovelPromotion-提示词界面（0%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/prompts-stage`

3. NovelPromotion-配音界面（0%）
- 目录：`src/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/voice*`

**前端总体：`59 / 260 = 22.7%`**

---

### 后端核心业务功能（API / Service / Worker）

#### 已完成重构（覆盖较高）

1. TaskOps（75.0%）
- 范围：`src/app/api/tasks/*`, `src/app/api/task-target-states/*`
- 状态：任务路由参数、校验与响应逻辑已明显统一。

2. AssetHub（51.1%）
- 范围：`src/app/api/asset-hub/*`, `src/app/api/assets/*`, `src/lib/assets/*`
- 状态：资产业务服务层重构较深，接口结构趋稳。

3. ProjectWorkspace（50.0%）
- 范围：`src/app/api/projects/*`, `src/lib/workspace/*`
- 状态：项目工作台后端主流程已重构一半以上。

4. SystemOps（50.0%）
- 范围：`src/app/api/admin/*`, `src/app/api/system/*`
- 状态：运维系统类接口结构较稳定。

#### 正在重构（覆盖中低）

1. RuntimeWorkflow（45.2%）
- 范围：`src/app/api/runs/*`, `src/lib/run-runtime/*`, `src/lib/task/*`, `src/lib/workers/*`
- 现状：运行时编排、任务流与 worker 协作仍在持续收口。

2. StorageMedia（36.4%）
- 范围：`src/app/api/storage/*`, `src/app/api/files/*`, `src/lib/storage/*`, `src/lib/media/*`
- 现状：签名、存储、媒体处理链路正在统一。

3. SharedPlatform（29.0%）
- 范围：`src/lib/query/*`, `src/lib/home/*`, `src/lib/errors/*`, `src/lib/logging/*` 等
- 现状：公共基础能力正按子模块逐步收口。

4. OtherCore（28.6%）
- 范围：其他核心基础文件
- 现状：零散基础能力随主线模块同步收口。

5. NovelPromotion（20.0%）
- 范围：`src/app/api/novel-promotion/*`, `src/lib/novel-promotion/*`
- 现状：主业务已启动重构，但尚未完成系统收敛。

6. AIInfraGen（14.9%）
- 范围：`src/lib/llm/*`, `src/lib/model-gateway/*`, `src/lib/providers/*`, `src/lib/generators/*`
- 现状：模型网关与生成基建仍在早期重构阶段。

#### 尚未重构（覆盖 0%）

1. UserBilling（0%）
- 范围：`src/app/api/user/*`, `src/lib/user-api/*`, `src/lib/billing/*`

2. Auth（0%）
- 范围：`src/app/api/auth/*`

**后端总体：`151 / 538 = 28.1%`**

---

### 推进策略（与当前执行一致）

1. 先把“正在重构（覆盖中低）”模块按顺序一个模块一个模块做完。  
2. 再进入“尚未重构（0%）”模块。  
3. 前端和后端分开推进、分开汇报，避免信息混在一起。