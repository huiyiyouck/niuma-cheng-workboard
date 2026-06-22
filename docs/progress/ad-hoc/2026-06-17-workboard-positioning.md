# niuma-cheng-workboard 立项定位草案

> 状态：已定稿（Owner Review 1-16 全部确认）  
> 日期：2026-06-17  
> 目标：定义「统一格式化项目 Agent 工作看板 / 跨项目工作看板」的项目边界、数据来源、第一版范围和后续演进方向。

## 1. 背景

当前 `~/Project` 下已有多个相互独立的项目：

| 项目 | 当前定位 |
|------|----------|
| `claude-workflow` | 团队工作流源头项目，维护 PM / UI / Architect / Developer / Tester / DevOps / WM 等角色规则、模板和基线机制 |
| `niuma-cheng-xiaobao` | 新闻聚合平台业务项目，已接入团队工作流 |
| `niuma-cheng-ai` | AI 处理中枢 / Agent Hub，后续也会接入团队工作流 |
| `niuma-cheng-coordination` | 跨项目协调仓库，保存跨项目需求池、状态、契约、决策和项目间沟通 |

后续每个业务项目都会逐步引入 `claude-workflow` 团队工作流。工作流本身若有问题，先在 `claude-workflow` 项目中讨论、修正、更新，再同步到各业务项目。

现有问题是：各项目都有自己的进度索引、角色日志、待办和阻塞项，但 Owner 缺少一个统一入口查看整体监督、节奏、阻塞和跨项目协作状态。

因此需要单独立项一个跨项目只读看板项目：`niuma-cheng-workboard`。

看板必须是配置驱动的：Owner 只维护项目接入配置，看板按配置中的项目路径、项目类型和解析规则读取对应项目，不在代码里硬编码具体项目名、固定目录或固定项目数量。

项目接入必须遵守统一接入规则。后续新增项目只有满足接入规则并写入接入配置后，才进入看板监控范围；看板应提供接入诊断视图，用于查看项目路径、项目类型、解析规则、接入状态和读取异常。

## 2. 项目定位

`niuma-cheng-workboard` 是牛马程生态的跨项目 Agent 工作看板。

它读取各项目的团队工作流文档和 `niuma-cheng-coordination` 跨项目真源，为 Owner 提供统一的项目状态、需求流转、阻塞关系、项目内 Agent 角色状态、跨项目联调进展和整体节奏视图。

一句话定义：

```text
niuma-cheng-workboard 是一个只读聚合型监督看板，用于把多个已接入团队工作流的项目状态格式化、可视化地展示给 Owner。
```

## 3. 核心边界

### 3.1 看板不是新的 Agent 团队

Agent 角色看板必须按项目归属展示。

例如：

```text
xiaobao
  - PM（如已启用）
  - UI（如已启用）
  - Architect（如已启用）
  - Developer（如已启用）
  - Tester（如已启用）
  - DevOps（如已启用）
  - WM（如已启用）

ai
  - 读取项目实际存在的角色日志
  - 未 Bootstrap 时展示「未接入」

workboard
  - Bootstrap 前展示「看板自身未接入」
  - Bootstrap 后读取项目实际存在的角色日志
```

看板不维护一套全局独立 Agent 角色，也不替代各项目内部的角色日志。

### 3.2 `claude-workflow` 是工作流源头

`claude-workflow` 负责维护团队工作流的规则、角色手册、模板和基线机制。

看板只读取各项目已经同步后的工作流状态，不直接定义或修改工作流规则。

工作流规则如需调整：

1. 先在 `claude-workflow` 项目中讨论、Review、修改。
2. 定稿后同步到各业务项目。
3. 看板读取各项目同步后的实际状态。

### 3.3 `niuma-cheng-coordination` 是跨项目真源

跨项目需求、契约、谁等谁、跨项目沟通和跨项目决策继续以 `niuma-cheng-coordination` 为真源。

看板只读取并展示：

- `PROJECTS.md`
- `REQUESTS.md`
- `STATUS.md`
- `CHANGELOG.md`
- `contracts/`
- `communications/`
- `decisions/`

看板不替代 `niuma-cheng-coordination`。

### 3.4 看板项目自身也要被监控

`niuma-cheng-workboard` 本身也是一个普通项目。

它后续也需要接入 `claude-workflow`，拥有自己的：

- `docs/progress/INDEX.md`
- `docs/progress/iterations/`
- `docs/progress/roles/`
- `docs/progress/ad-hoc/`
- `docs/knowledge/`

因此看板项目既是观察者，也是被观察对象。

在看板视图中，`niuma-cheng-workboard` 应与 `xiaobao`、`ai` 等项目一样出现在项目总览中。

看板自监控只在 Bootstrap 完成后完整生效。初始阶段如果 `niuma-cheng-workboard` 尚未存在 `docs/progress/INDEX.md`，则显示为「看板自身未接入团队工作流」。看板自身的团队工作流接入由 Owner 单独推进，避免把看板启动依赖于看板自身状态，形成循环依赖。

## 4. 第一版目标

第一版目标：只读、聚合、可视化，不回写。

### 4.1 必须支持

1. 项目总览
   - 项目名称
   - 项目路径
   - 项目类型
   - 是否接入团队工作流
   - 当前迭代
   - 当前模式
   - 当前阶段
   - 阻塞项
   - 下一步行动
   - 入口链接

`coordination` 类型项目也出现在项目总览中，但不要求具备 `docs/progress/INDEX.md`。它的总览卡片展示协调仓库身份、最近更新摘要、活跃跨项目需求数、跨项目阻塞数、契约数量和沟通文档数量。

`coordination` 摘要计数口径固定为：

- 活跃跨项目需求数：`REQUESTS.md` 中未关闭状态的需求行数。
- 跨项目阻塞数：`STATUS.md`「跨项目阻塞与谁等谁」中的有效阻塞条目；无阻塞记 0。
- 契约数量：`contracts/*.md` 文件数。
- 沟通文档数量：`communications/*.md` 文件数。

2. 每项目 Agent 角色看板
   - 按项目分组展示角色
   - 显示角色日志入口
   - 显示最近摘要或当前状态
   - 未接入团队工作流的项目标记为「未 Bootstrap / 未接入」

3. 跨项目需求池
   - 读取 `niuma-cheng-coordination/REQUESTS.md`
   - 默认展示 open / in-progress 且涉及当前活跃项目的需求
   - 展示需求 id、提出方、内容、承接方、转入迭代、状态、沟通文档
   - 已关闭、低优先级或历史需求折叠到「查看全部」入口

4. 跨项目状态
   - 读取 `niuma-cheng-coordination/STATUS.md`
   - 展示跨项目依赖关系
   - 展示跨项目阻塞项
   - 展示谁等谁
   - 展示下一步责任
   - 展示跨项目契约执行状态：优先展示 `STATUS.md` 中的契约摘要，并链接到 `contracts/` 下的契约真源；第一版不要求深度解析契约全文

项目总览展示项目自身状态，来源是各项目 `docs/progress/INDEX.md`；跨项目状态展示项目之间的依赖、阻塞、契约和协作关系，来源是 `niuma-cheng-coordination`。跨项目区域不重复展开单个项目内部阻塞。

5. 跨项目联调和沟通
   - 读取 `communications/`
   - 展示参与项目、关联需求、待跟进事项

6. 看板项目自监控
   - `niuma-cheng-workboard` 必须写入项目配置
   - 初始阶段如未 Bootstrap，展示为「未接入团队工作流」
   - 后续 Bootstrap 后自动读取其 `docs/progress/INDEX.md`

7. 配置驱动接入
   - Owner 通过 `projects.config.json` 或后续等价配置文件声明项目
   - 看板只解析配置中启用的项目
   - 新项目接入不需要改代码
   - 项目路径支持相对路径、绝对路径和环境变量展开
   - 项目类型决定解析与展示策略
   - 项目必须通过接入规则校验后才标记为「已接入」

8. 接入诊断视图
   - 展示所有配置项目
   - 展示项目路径解析结果
   - 展示项目类型 `kind`
   - 展示是否存在必需文件
   - 展示当前解析器
   - 展示接入状态：已接入 / 未 Bootstrap / 配置异常 / 读取异常 / 已禁用
   - 展示最近读取时间和错误摘要
   - 第一版不锁死为独立页面，可以是总览页内的诊断区块或表格

### 4.2 暂不支持

第一版不做：

- 不在页面上直接编辑 Markdown
- 不回写任何项目文件
- 不做登录权限系统
- 不做数据库
- 不替代 Git / GitHub
- 不替代 `niuma-cheng-coordination`
- 不自动修改 `claude-workflow` 或业务项目基线
- 不做复杂甘特图、资源排期或 Jira 化项目管理
- 第一版不在页面上保存配置变更；接入配置先由 Owner 修改配置文件，看板页面只做监控和校验展示

## 5. 推荐技术方案

第一版建议采用本地轻量方案：

```text
niuma-cheng-workboard
├── README.md
├── package.json
├── projects.config.json
├── src/
│   ├── server.js
│   ├── parsers/
│   └── adapters/
└── public/
    ├── index.html
    ├── app.js
    └── styles.css
```

技术栈：

- Node.js 本地服务
- 原生 HTML / CSS / JS 或轻量 Vite 前端
- Markdown 文件读取
- 第一版不引入数据库
- 前端默认每 60 秒拉取最新数据，未来可扩展为文件监听或 WebSocket 推送

项目路径规则：

- 支持相对路径：基于 `projects.config.json` 所在目录解析。
- 支持绝对路径：用于接入不在同一父目录下的外部项目。
- 支持环境变量：优先使用 `PROJECT_HOME` 作为项目根目录，例如 `${PROJECT_HOME}/niuma-cheng-xiaobao`。
- 若未设置 `PROJECT_HOME`，相对路径仍应可正常工作。
- 推荐本机默认配置使用相对路径；跨目录或部署到固定工作区时再使用 `${PROJECT_HOME}`。

项目配置示例：

```json
{
  "refresh": {
    "interval_seconds": 60
  },
  "projects": [
    {
      "id": "workflow",
      "name": "团队工作流",
      "path": "../claude-workflow",
      "kind": "workflow-source"
    },
    {
      "id": "xiaobao",
      "name": "牛马程小报",
      "path": "../niuma-cheng-xiaobao",
      "kind": "business"
    },
    {
      "id": "ai",
      "name": "AI 处理中枢",
      "path": "../niuma-cheng-ai",
      "kind": "business"
    },
    {
      "id": "coordination",
      "name": "跨项目协调仓库",
      "path": "../niuma-cheng-coordination",
      "kind": "coordination"
    },
    {
      "id": "workboard",
      "name": "跨项目 Agent 工作看板",
      "path": ".",
      "kind": "workboard"
    }
  ],
  "coordination": {
    "project_id": "coordination"
  }
}
```

`coordination.project_id` 表示从 `projects` 数组中按 `id` 引用跨项目协调仓库，避免在配置中重复维护协调仓库路径。

外部项目也可使用绝对路径或环境变量：

```json
{
  "id": "external",
  "name": "外部协作项目",
  "path": "${PROJECT_HOME}/external-project",
  "kind": "business"
}
```

项目类型定义：

| kind | 含义 | 第一版展示策略 |
|------|------|----------------|
| `business` | 业务项目，例如新闻平台、AI 中枢 | 读取 `docs/progress/INDEX.md`、角色日志、迭代、待办；展示项目总览和项目内角色看板 |
| `workflow-source` | 团队工作流源头项目，例如 `claude-workflow` | 优先展示工作流基线状态、模板和最近变更；如果自身也有 `docs/progress/INDEX.md`，可按普通项目补充展示，但不强制要求具备完整业务角色看板 |
| `coordination` | 跨项目协调仓库 | 读取 `PROJECTS.md`、`REQUESTS.md`、`STATUS.md`、`contracts/`、`communications/`、`decisions/`；总览中展示协调仓库摘要，不要求具备 `docs/progress/INDEX.md`，不作为普通业务项目展示角色看板 |
| `workboard` | 看板项目自身 | Bootstrap 前展示「未接入团队工作流」；Bootstrap 后按普通项目读取自身进度与角色状态 |

后续如需接入外部项目，可以增加新的 `kind` 或为项目配置显式 `parser` 字段，但第一版先以 `kind` 控制行为。

## 6. 项目接入规则

项目接入不是简单路径扫描。看板只监控配置文件中显式声明、且通过接入规则校验的项目。

### 6.1 接入配置字段

每个项目至少需要声明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 项目唯一标识，只能使用小写字母、数字、短横线或下划线；跨项目需求匹配优先使用该字段 |
| `name` | 是 | 页面展示名称 |
| `path` | 是 | 项目路径，支持相对路径、绝对路径和环境变量 |
| `kind` | 是 | 项目类型，决定解析和展示策略 |
| `enabled` | 否 | 是否启用监控，默认 `true` |
| `parser` | 否 | 显式指定解析器；第一版可不配置，默认由 `kind` 推导 |
| `tags` | 否 | 项目标签，例如 `business`、`infra`、`external` |
| `owner_note` | 否 | Owner 对项目的备注 |

示例：

```json
{
  "id": "new-product",
  "name": "新业务项目",
  "path": "../new-product",
  "kind": "business",
  "enabled": true,
  "tags": ["business"],
  "owner_note": "接入后按团队工作流推进"
}
```

### 6.2 路径解析规则

路径解析顺序：

1. 展开环境变量，例如 `${PROJECT_HOME}`。
2. 如果是绝对路径，直接使用。
3. 如果是相对路径，基于 `projects.config.json` 所在目录解析。
4. 规范化路径，消除 `.` 和 `..`。
5. 校验路径是否存在、是否是目录、是否可读。

路径校验失败时，该项目状态为：

```text
配置异常
```

或：

```text
读取异常
```

具体取决于错误来源。路径字符串非法、环境变量缺失、路径不存在属于配置异常；路径存在但文件读取失败属于读取异常。

### 6.3 kind 接入要求

不同 `kind` 的最低接入要求不同：

| kind | 最低接入要求 | 已接入判定 |
|------|--------------|------------|
| `business` | 项目目录存在；推荐存在 `README.md`；Bootstrap 后应存在 `docs/progress/INDEX.md` | 存在 `docs/progress/INDEX.md` 时为已接入团队工作流；缺失时显示未 Bootstrap |
| `workflow-source` | 项目目录存在；应存在 `docs/baseline/` 或工作流相关说明文件 | 路径和工作流资料可读即可进入看板；不强制要求 `INDEX.md` |
| `coordination` | 项目目录存在；应存在 `PROJECTS.md`、`REQUESTS.md`、`STATUS.md` 中至少一个 | 协调仓库核心文件可读即可进入看板；不强制要求 `INDEX.md` |
| `workboard` | 项目目录存在 | Bootstrap 前显示未接入；Bootstrap 后按自身 `INDEX.md` 进入完整监控 |

### 6.4 接入状态

看板统一使用以下接入状态：

| 状态 | 含义 |
|------|------|
| `已接入` | 配置有效，路径可读，且满足该 `kind` 的最低接入要求 |
| `未 Bootstrap` | 项目路径可读，但业务项目或看板项目尚未存在 `docs/progress/INDEX.md` |
| `配置异常` | 配置字段缺失、`id` 重复、`kind` 不支持、环境变量缺失或路径不存在 |
| `读取异常` | 路径存在但必需文件不可读、Markdown 解析失败或权限不足 |
| `已禁用` | `enabled: false`，配置保留但不进入常规监控 |

统一展示文案：

- 内部状态统一使用 `未 Bootstrap`。
- 面向 Owner 的展示文案可写为「未接入团队工作流」。
- `coordination` 和 `workflow-source` 不因缺少 `docs/progress/INDEX.md` 进入 `未 Bootstrap`，按 `kind` 最低接入要求判断。

### 6.5 新项目接入流程

后续新增项目按以下流程接入：

1. 在项目本身完成基本仓库初始化。
2. 如该项目需要团队工作流，按 `claude-workflow` 规则执行 Bootstrap。
3. 在 `niuma-cheng-workboard/projects.config.json` 中新增项目配置。
4. 打开看板的接入诊断视图。
5. 确认路径解析结果正确。
6. 确认 `kind`、解析器和最低接入要求通过。
7. 如果显示「未 Bootstrap」，由 Owner 决定是否先完成团队工作流接入。
8. 状态为「已接入」后，该项目进入项目总览、角色看板和相关跨项目需求匹配。

### 6.6 接入诊断视图

第一版必须提供接入诊断视图，作为 Owner 管理接入范围和排查接入问题的入口。实现形态不锁死为独立页面，可以是总览页内的诊断区块或表格，复用同一份配置解析结果。

页面展示：

| 字段 | 说明 |
|------|------|
| 项目 id | 配置中的 `id` |
| 项目名称 | 配置中的 `name` |
| kind | 项目类型 |
| 配置路径 | 原始 `path` |
| 解析路径 | 环境变量展开和相对路径解析后的绝对路径 |
| enabled | 是否启用 |
| 接入状态 | 已接入 / 未 Bootstrap / 配置异常 / 读取异常 / 已禁用 |
| 解析器 | 当前使用的解析器 |
| 必需文件检查 | 按 `kind` 展示文件存在与可读情况 |
| 最近读取时间 | 最近一次成功或失败读取时间 |
| 错误摘要 | 配置或读取失败原因 |
| 入口链接 | 项目根目录、`INDEX.md`、coordination 核心文件等自动生成链接 |

第一版接入诊断视图只读，不直接保存配置。后续可以扩展为页面编辑配置，但必须另行 Review，因为一旦页面能写配置，就涉及配置文件写入、路径安全和误操作回滚。

## 7. 数据读取规则

### 7.1 项目级状态

优先读取：

```text
{project}/docs/progress/INDEX.md
```

提取字段：

- 当前迭代
- 当前模式
- 当前阶段
- 阻塞项
- 下一步行动
- 当前非迭代工作
- 最近收尾摘要
- 跨任务待办
- 角色日志入口

`下一步行动` 直接从 `INDEX.md` 的当前项目状态中提取。`入口链接` 由看板根据项目类型和当前状态自动生成，例如指向项目根目录、`docs/progress/INDEX.md`、当前迭代文档、角色日志目录或 coordination 的 `REQUESTS.md` / `STATUS.md`；不要求 `INDEX.md` 单独提供 UI 导航链接。

当前迭代文档链接生成规则：先从 `INDEX.md` 解析当前迭代号，再尝试拼接 `docs/progress/iterations/{version}.md`。如果无法解析当前迭代号、目标文件不存在或路径不可读，则降级为 `docs/progress/` 目录入口，不得因此报错中断页面渲染。

第一版为本地只读服务，入口链接优先使用服务内路由或可点击的本地文件路径；具体形态由实现阶段按运行方式确定，但必须保证链接失败时有可见降级提示。

上述 `INDEX.md` 规则主要适用于 `business` 和 Bootstrap 后的 `workboard` 项目。`workflow-source`、`coordination` 按第 6.3 节的 `kind` 最低接入要求判断，不因缺少 `docs/progress/INDEX.md` 被标记为未 Bootstrap。

如果 `business` 或 `workboard` 项目不存在 `docs/progress/INDEX.md`，则标记为：

```text
未接入团队工作流 / 未 Bootstrap
```

如果项目路径不存在、文件缺失或解析失败，单个项目数据读取失败不应阻断整体看板渲染。看板应在对应项目卡片上标记：

```text
读取异常
```

并展示错误摘要，例如：

- 路径不存在
- 缺少 `docs/progress/INDEX.md`
- Markdown 表格解析失败
- 权限不足

如本地存在最后一次成功读取的快照，可以继续展示快照并标记「数据可能过期」。第一版如暂不实现快照，也必须保证其他项目正常渲染。

### 7.2 项目内角色状态

读取：

```text
{project}/docs/progress/roles/
```

按项目展示角色，不做全局角色池。

角色状态的归属关系必须是：

```text
项目 -> 角色 -> 状态 / 日志 / 下一步
```

不能展示成：

```text
角色 -> 项目
```

原因：团队工作流是复制到每个项目内运行的，每个项目有自己的角色上下文和进度真源。

角色集合以项目实际接入工作流后的文件为准，不假设每个项目必然启用完整角色集合。页面可展示标准角色槽位，但必须区分「暂无日志 / 未启用 / 读取异常」。

### 7.3 跨项目状态

读取：

```text
niuma-cheng-coordination/STATUS.md
niuma-cheng-coordination/REQUESTS.md
niuma-cheng-coordination/communications/*.md
```

这些信息展示在跨项目区域，不写回业务项目。

跨项目需求默认过滤规则：

- 默认显示状态为已提报、评估中、已承接、开发中、联调中等未关闭需求。
- 默认隐藏已关闭需求。
- 默认优先显示涉及当前配置中启用项目的需求。
- 页面保留「查看全部」入口，允许展开历史需求。
- 第一版按 `承接方` 字段识别配置项目 `id` 判断「涉及当前项目」。
- 因 `REQUESTS.md` 当前 `承接方` 是自由文本（例如 `ai（承接人待 Bootstrap 后补登 PM/Architect）`），看板不能使用 `承接方 === id` 的简单等值匹配，应按 token / 词边界识别项目 `id`，避免 `ai` 这类短 id 被普通单词误命中。
- 未匹配配置项目 `id` 的跨项目需求归入「其他需求」折叠区。
- 后续可扩展为同时匹配提出方、沟通文档参与项目和需求正文中的项目标识。
- 长期推荐在 `coordination` 侧增加结构化 `承接方 id` 字段，或约定 `承接方` 单元格以纯项目 `id` 开头、自由说明进入备注，以减少看板解析歧义。该数据规则应先在 `claude-workflow` / `niuma-cheng-coordination` 中定稿，再由看板读取。

## 8. 后续结构化建议

为了让看板更稳定，后续可以给关键 Markdown 文件增加 YAML frontmatter。

示例：

```yaml
---
project_id: xiaobao
current_iteration: v0.6
current_mode: 标准迭代
current_phase: 实现阶段联调精修
blocked: true
next_entry: Owner 报具体 bug
updated_at: 2026-06-17
---
```

正文继续保持人类可读，看板优先读取结构化块。

第一版解析策略：如果存在 frontmatter，优先读取 frontmatter；如果不存在，则回退解析现有 Markdown 标题、列表和表格。这样在结构化块尚未同步到各项目之前，看板仍能读取当前工作流文档。

该改造应先在 `claude-workflow` 中定规则，再同步到各项目。

## 9. 立项判断

本项目适合单独立项。

理由：

1. 它是跨项目监督工具，不属于任何单一业务项目。
2. 它不应该污染 `claude-workflow` 这个工作流源头项目。
3. 它不应该放进 `xiaobao` 或 `ai`，否则会把业务项目和管理工具耦合。
4. 它天然需要读取多个项目和协调仓库。
5. 它自身后续也会接入团队工作流，成为被监控项目之一。

建议项目名：

```text
niuma-cheng-workboard
```

建议第一版开发目标：

```text
实现一个本地可运行的只读看板，聚合配置文件中启用的所有项目状态，并按项目展示 Agent 角色状态与跨项目需求/阻塞信息。当前示例配置覆盖 workflow、xiaobao、ai、coordination、workboard。
```

第一版必须把配置驱动作为核心能力：Owner 只要在配置中增加项目，填写 `id`、`name`、`path`、`kind`，看板就应按对应规则解析和展示；如果项目尚未接入团队工作流，则显示「未接入」而不是报错中断。

同时，第一版必须提供接入诊断视图。Owner 新增项目配置后，应能在页面上看到路径解析、最低接入要求、文件检查、解析器和接入状态，从而确认该项目是否已经进入看板监控。

## 10. Review 问题

需要 Owner Review 的关键问题：

| 序号 | 问题 | Owner Review 状态 |
|------|------|-------------------|
| 1 | 项目名是否确定为 `niuma-cheng-workboard`？ | ✅ 已确认 |
| 2 | 第一版是否确认只读，不做页面编辑和回写？ | ✅ 已确认 |
| 3 | 是否确认看板项目自身也纳入监控？ | ✅ 已确认 |
| 4 | 是否确认 Agent 角色看板按项目分组，而不是做全局角色池？ | ✅ 已确认 |
| 5 | 是否确认 `claude-workflow` 继续作为工作流源头，所有工作流规则调整先在该项目定稿？ | ✅ 已确认 |
| 6 | 第一版是否接受本地轻量 Node 服务，不先引入数据库和登录系统？ | ✅ 已确认 |
| 7 | 是否接受项目路径支持相对路径、绝对路径和 `PROJECT_HOME` 环境变量？ | ✅ 已确认 |
| 8 | 是否接受单项目读取失败时降级显示「读取异常」，不阻断整体看板？ | ✅ 已确认 |
| 9 | 是否接受跨项目需求池默认只显示未关闭 / 进行中需求，并提供「查看全部」入口？ | ✅ 已确认 |
| 10 | 是否接受前端第一版每 60 秒轮询刷新数据？ | ✅ 已确认 |
| 11 | 是否确认 `coordination` 项目在总览中不要求 `INDEX.md`，仅展示协调仓库摘要？ | ✅ 已确认 |
| 12 | 是否确认第一版跨项目需求匹配采用 `承接方` 字段识别配置项目 `id` 的规则？ | ✅ 已确认（Owner 第 9 条回复已明确确认；实现口径为 token / 词边界识别，不做简单等值匹配） |
| 13 | 是否确认「入口链接」由看板自动生成，无需 `INDEX.md` 单独提供？ | ✅ 已确认 |
| 14 | 是否确认新增项目必须先写入接入配置并通过接入规则校验，才能进入看板监控？ | ✅ 已确认 |
| 15 | 是否确认第一版必须提供「接入诊断视图」，展示路径解析、文件检查、解析器、接入状态和错误摘要？ | ✅ 已确认 |
| 16 | 是否确认第一版接入诊断视图只读，不直接在页面保存配置变更？ | ✅ 已确认 |

## 11. Owner Review 记录

### 2026-06-17 · 第一轮确认

Owner 已确认以下内容：

- 项目名确定为 `niuma-cheng-workboard`，仓库名、目录名和文档内引用均使用此名称。
- 第一版严格只读，不提供任何编辑功能，不对任何被监控项目的文件做回写操作。
- `niuma-cheng-workboard` 自身列入项目配置，在看板视图中与其他项目并列展示；初始阶段展示为「看板自身未接入团队工作流」，后续接入工作流后按普通项目规则读取自身进度和角色状态。
- 角色看板严格按项目分组展示，归属关系为「项目 → 角色 → 状态 / 日志 / 下一步」，不做全局角色池。
- `claude-workflow` 是工作流规则的唯一源头。规则调整流程为：`claude-workflow` 内讨论定稿 → 同步到各业务项目 → 看板读取各项目同步后的实际状态。
- 第一版采用本地 Node.js 服务 + 静态前端，不引入数据库，不实现登录权限系统，保持轻量。
- 项目路径支持相对路径、绝对路径和 `${PROJECT_HOME}` 环境变量展开；推荐本机默认使用相对路径，`${PROJECT_HOME}` 作为可选增强。
- 单个项目读取失败时，该项目卡片降级显示「读取异常」及错误摘要，不影响其他项目正常渲染；第一版不强制要求快照机制。
- 跨项目需求池默认只展示未关闭需求，已关闭需求默认隐藏；第一版采用从 `承接方` 字段中按 token / 词边界识别配置项目 `id` 的方式判断是否涉及当前活跃项目；页面保留「查看全部」入口。
- 前端默认每 60 秒自动拉取最新数据，轮询间隔通过 `projects.config.json` 中 `refresh.interval_seconds` 配置；文件监听或 WebSocket 推送不纳入第一版范围。

### 2026-06-17 · 第二轮确认

Owner 确认 `niuma-cheng-workboard-positioning.review.md` 中第 11、13、14、15、16 项评估结论均为 Owner 确认项：

- `coordination` 项目在总览中不要求 `INDEX.md`，仅展示协调仓库摘要，并采用固定摘要计数口径。
- 「入口链接」由看板自动生成，无需 `INDEX.md` 单独提供；当前迭代链接生成失败时降级到 `docs/progress/`。
- 新增项目必须先写入接入配置并通过接入规则校验，才能进入看板监控；不自动扫描目录。
- 第一版必须提供「接入诊断视图」，但实现形态不锁死为独立页面，可以是总览页内的诊断区块或表格。
- 第一版接入诊断视图只读，不直接在页面保存配置变更。
