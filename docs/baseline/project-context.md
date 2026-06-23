# 项目上下文

> 本文件是项目适配层，只写项目事实。不要把通用工作流规则写在这里。

## 项目一句话

`niuma-cheng-workboard`（展示名：**项目管理工作台**）是牛马程生态的**项目管理统一中枢**——Owner 一处统管所有项目。**第一版为只读形态**：聚合多个项目的团队工作流状态、接入诊断、跨项目需求、阻塞关系和协作进展；后续逐步长出待办管理、跨项目协作流转等主动管理能力。

> 愿景阶梯：只读看板（第一版）→ 管理工作台（待办可写/协作流转）→ 项目管理统一中枢（终极定位）。展示名用「项目管理工作台」；目录/仓库名 `niuma-cheng-workboard` 为技术标识，保留不变。

## 技术栈

- 运行时：Node.js
- 第一版前端：React 18 + Tailwind v4 + shadcn/ui（Vite 构建），与 `niuma-cheng-xiaobao` 统一（v0.1 UI 方案 R1 Owner 定，订正自原「静态 HTML / CSS / JavaScript」）
- 第一版后端：本地 Node HTTP 服务
- 第一版存储：无数据库，直接读取本地 Markdown 和配置文件

## 启动方式

本地启动（项目根目录）：

```bash
npm --prefix frontend install   # 首次：安装前端依赖（已 npm 化，不再用 pnpm）
npm run build                   # 构建前端到 frontend/dist
npm start                       # 启动本地 Node 只读服务，默认 :5174（PORT 可覆盖），服务 dist + GET /api/snapshot
```

未构建 `frontend/dist` 时 `npm start` 仍可启动，首页返回首启提示页引导先 `npm run build`。

开发模式：`npm run dev`（后端）配合 `npm --prefix frontend run dev`（Vite dev server）。

后端测试：`npm test`（Node 内置 `node --test`，无第三方测试框架）。

## 关键环境变量

- `PROJECT_HOME`：可选，用于解析跨目录项目路径；未设置时以 `projects.config.json` 所在目录解析相对路径。

## 业务边界

- 本项目做：
  - 读取 `projects.config.json` 中显式配置的项目。
  - 按项目 `kind` 执行接入校验和解析。
  - 展示项目总览、接入诊断视图、项目内角色状态、跨项目需求池和跨项目状态。
  - 只读读取各项目 `docs/progress/INDEX.md`、`docs/progress/roles/` 和 `niuma-cheng-coordination` 的跨项目真源文件。
- 本项目不做：
  - 不替代 `agent-workflow` 定义工作流规则。
  - 不替代 `niuma-cheng-coordination` 作为跨项目需求、状态、契约真源。
  - 第一版不编辑、不回写任何被监控项目文件。
  - 第一版不提供登录、数据库、复杂排期或 Jira 化项目管理。

## 项目特有约束

- 配置驱动：新项目必须先写入接入配置并通过接入规则校验，不能自动扫描目录接入。
- 只读优先：第一版页面不保存配置变更，不回写任何项目文件。
- 看板自监控：本项目也必须出现在自身项目配置中；Bootstrap 前显示未接入，Bootstrap 后按普通项目读取自身状态。
- `coordination` 不要求 `docs/progress/INDEX.md`，只展示协调仓库摘要和跨项目真源信息。

## 状态说明

本文件只记录项目事实，不记录当前阶段、当前迭代状态或 Review 状态。

- 项目级当前状态维护在 `docs/progress/INDEX.md`。
- 立项定位定稿文档维护在 `docs/progress/ad-hoc/2026-06-17-workboard-positioning.md`。
