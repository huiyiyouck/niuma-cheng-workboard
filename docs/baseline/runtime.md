# 运行时加载路由

## 目标

本文件只在从 General（通用助手）切换到工作流角色或执行工作流流程后读取。它负责决定工作流加载后“现在该读什么”，不承载完整流程细节。

保持 General 时不要读取本文件，也不要加载团队基线、工作流角色手册或进度记录。

原则：

```text
先判定任务，再加载规则；只读当前需要的文件。
```

## 工作流默认只读

加载工作流后默认只读取：

1. 当前助手入口文件（Codex 为 `AGENTS.md`，Claude Code 为 `CLAUDE.md`）
2. `docs/baseline/runtime.md`
3. `docs/baseline/project-context.md`，如存在（由 PM 在首次 PRD 时创建）
4. `docs/progress/INDEX.md`，如存在
5. 当前工作流角色手册：`docs/baseline/role-{role}.md`，仅当用户已指定工作流角色。
6. 当前角色日志摘要：优先读取 `{role}-current.md` 和 `{role}-summary.md`；如果尚未分层，只读取 `docs/progress/roles/{role}.md` 最近 10 条或文件头部摘要，不全文读取。`{role}-corrections.md` 只在本次任务涉及该角色常见错误、Review 失败或用户要求复盘时读取。

如果用户已加载工作流但没有指定工作流角色，先问用户要以哪个角色或工作类型继续，不要为了猜角色去加载所有角色手册。General 不作为工作流角色进入本路由。

## 工作流入口顺序

加载工作流后，必须按以下顺序分流：

1. 初始化：如果缺少 `INDEX.md`，先建议 Bootstrap；Bootstrap 不启动标准迭代。
2. 工作类型：判断是非迭代自主任务，还是标准迭代。
3. 角色运行：非迭代任务可以由相关角色直接处理；标准迭代只能由 PM（产品经理）创建 PRD 后正式启动。

如果用户以 Architect（架构师）、Developer（开发工程师）、Tester（测试工程师）、DevOps（运维/部署工程师）或 UI（界面设计师）身份要求“启动迭代”，当前角色只能提出迭代建议和风险说明，不能创建标准迭代；应询问用户是否切换到 PM（产品经理）创建 PRD。

## 工作流不默认读取

启动时不要默认读取：

- `docs/baseline/multi-agent-workflow.md`
- `docs/baseline/work-modes.md`
- `docs/baseline/context-policy.md`
- `docs/baseline/mechanisms.md`
- `docs/baseline/knowledge-base.md`
- `docs/baseline/subagents/`
- 所有模板文件
- 所有历史迭代全文
- 所有角色日志全文
- 所有角色纠错记录
- 整个知识库全文

这些文件只在触发条件满足时按需读取。

## 加载顺序

### 1. 判断项目是否初始化

如果缺少 `docs/progress/INDEX.md`：

1. 不要自动创建文件。
2. 向用户说明缺少进度索引，建议执行 Bootstrap 初始化流程。
3. 只有当用户明确说”执行 Bootstrap 初始化流程”或确认现在执行时，才读取 `docs/baseline/mechanisms.md` 和 `docs/baseline/bootstrap.md`。
4. 再按 Bootstrap 流程创建目录和索引。

如果已经加载工作流但项目尚未初始化，而用户只是问候、闲聊或询问状态，只能提示初始化建议，不能替用户启动 Bootstrap。

Bootstrap 只初始化团队工作台（目录结构 + 进度索引），不自动启动标准迭代，不创建项目上下文和角色日志。Bootstrap 完成后，如果用户没有选择工作流角色或工作类型，Agent 回到 General，不创建迭代记录、不创建 ad-hoc 记录。

未初始化项目时，只能给用户以下选项：

1. 执行 Bootstrap 初始化流程。
2. 暂不初始化，继续闲聊或结束本次会话。

不允许把”直接进入 PM（产品经理）、Developer（开发工程师）或任一常规角色工作”作为可选项。

### 2. 判断工作模式

根据用户请求和 `docs/progress/INDEX.md` 判断模式：

如果 `docs/progress/INDEX.md` 显示 Bootstrap 已完成，但 `当前迭代` 是 `v0.1`、`当前模式` 是 `标准迭代`、且没有用户明确启动标准迭代的记录，应视为旧版 Bootstrap 遗留状态。先纠正为“当前迭代：无 / 当前模式：未选择 / 当前阶段：工作台已初始化，尚未进入角色工作”，不要顺着旧状态进入 PM 或 PRD。

| 用户意图 | 工作模式 | 额外读取 |
|----------|----------|----------|
| 做版本、迭代、完整功能落地 | 标准迭代 | `multi-agent-workflow.md`、`docs/progress/INDEX.md` 当前迭代入口、当前 `vX.Y.md` 的相关阶段摘要；若当前不是 PM，先询问是否切换到 PM 创建 PRD |
| Bug、线上问题、临时修复 | 非迭代 Bugfix / Incident | `work-modes.md`、相关 ad-hoc 记录 |
| 产品想法、UI 草案、技术预研、运维任务 | 非迭代方案/预研/任务 | `work-modes.md`、相关 ad-hoc 记录 |
| 今天收尾、下班、先停一下 | 收尾归档 | `mechanisms.md`；达到归档阈值时再读 `context-policy.md` |
| 迭代是否结束、准备关闭版本 | 迭代关闭检查 | `mechanisms.md`、当前迭代记录、必要 summary |
| 修改团队规则、新增/删除角色 | 基线修正 | `role-wm.md`、相关 baseline 文件 |
| 查询沉淀经验、写入长期知识 | 知识库工作 | `knowledge-base.md`、`docs/knowledge/INDEX.md` |

如果无法判断是否进入迭代，先问用户，不要同时加载标准迭代和非迭代规则。用户只是指定某个角色工作，不代表进入标准迭代；除非用户明确要求功能落地、版本推进或完整开发，否则按非迭代自主任务处理或先询问。

### 3. 读取当前产出物

只读取当前任务相关的文件：

- 标准迭代：当前 `vX.Y.md` 和本阶段产出物。
- Review：被 Review 的文档、Review 计划中指定的相关结论。
- 非迭代：当前 ad-hoc 记录。
- Change Note：当前 Change Note 和它引用的定稿文档摘要。
- 知识库：先读 `docs/knowledge/INDEX.md`，再读具体条目。

读取当前 `vX.Y.md` 时先定位当前阶段和 Review 状态；只在需要判断跨阶段影响时读取相邻阶段摘要。不要因为目录存在就全文扫描。

### 4. 模板按创建时读取

只有在需要新建文档时才读取对应模板：

- 创建 PRD：`docs/templates/prd.md`
- 创建 UI 方案：`docs/templates/ui-spec.md`
- 创建设计文档：`docs/templates/design.md`
- 创建测试计划/报告：对应测试模板
- 创建 Change Note：`docs/templates/change-note.md`
- 工作流角色会话收尾：按 `context-policy.md` 收尾流程更新角色日志和相关记录。General 不执行该流程。
- 迭代归档摘要：`docs/templates/iteration-summary.md`
- Bootstrap 创建进度索引：`docs/templates/progress-index.md`

不创建文档时，不读取模板。

## 质量底线

- 中文对话和中文记录是默认规则。
- 人类用户是项目 Owner（负责人）和实际项目经理，Agent 不虚拟常驻项目经理角色。
- 未初始化项目必须先得到用户确认，才能执行 Bootstrap 并写入文件。
- Bootstrap、角色切换和非迭代任务都不等于启动标准迭代。
- 标准迭代只能从 PM（产品经理）创建 PRD 开始；其他角色只能提出迭代建议，不能直接创建迭代。
- 当前阶段未定稿前，不进入下一阶段；非迭代工作除外。
- 标准迭代产出采用动态 Review，默认至少 2 个相关 Review 方；少于 2 个需用户确认。
- 已定稿内容不能静默修改；轻量变更走 Change Note，重大变更回到对应阶段。
- 动态状态真源：项目级当前状态写在 `docs/progress/INDEX.md`；迭代阶段细节写在 `docs/progress/iterations/vX.Y.md`；`project-context.md` 只写项目事实。
- 工作流角色会话结束必须至少更新对应角色日志；General 不写角色日志。状态变化影响项目入口时，同步更新 `docs/progress/INDEX.md`。
- 团队知识沉淀到 `docs/knowledge/`，但启动时只读索引和相关条目，不全文加载知识库。
- 只做当前角色允许做的事。
- 禁止 force push；禁止跳过 hooks；禁止覆盖未归属修改。
- 受保护路径（项目业务源码 / 部署配置 / `docs/baseline/` / `docs/templates/` / 助手入口文件等，由 Architect 在 ADR 中明确）的文件删除必须走架构师 Review 门禁，详见 `conventions.md` §受保护路径删除 Review 门禁。
- 发现需要新增或修改基线规则时，先提案，经用户确认后再改。
