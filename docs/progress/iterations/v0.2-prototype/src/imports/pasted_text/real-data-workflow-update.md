> 用途：把原型 `App.tsx` 里的虚构 mock（智能客服平台 / Scrum / 产品负责人…）替换为牛马程生态**真实数据 + 真实工作流语义**，并补齐缺失字段。配合 `v0.1-ui.md`（UI 方案）使用。
> 数据采集自各项目 `docs/progress/INDEX.md`、`projects.config.json` 和 `coordination` 真源（2026-06-23）。

## 0. 给 Figma AI 的修改总指令

> 这是一个**只读监督看板**，监控的是「接入了团队工作流（agent-workflow）的项目」，不是通用 SaaS 项目管理。请据此修改：
> 1. 用 §1 的 5 个真实项目替换 `PROJECTS`；模式只用「标准迭代/非迭代/未选择」，**不要 Scrum/Kanban**；角色用工作流角色 **PM/UI/Architect/Developer/Tester/DevOps/WM**，不是"产品负责人/SRE"。
> 2. 迭代号是 `v0.6`/`v0.1` 这种，不是 `2024-Q2-S3`。
> 3. 跨项目视图新增 **BCR 基线修正提案** 维度（§5.2，原型没有）。
> 4. 字号基准 14→**16px**、字体族统一（§9）。
> 5. 接入诊断表补 **解析路径 / 解析器 / 最近读取时间** 列（§8）。
> 6. 需求池补 **状态过滤 + 查看全部** 折叠（立项要求）。

## 1. 真实项目清单（替换 `PROJECTS`）

| id | name | kind | status | 迭代 | 模式 | 阶段 | 阻塞 | url |
|----|------|------|--------|------|------|------|------|-----|
| `workflow` | 团队工作流 | `workflow-source` | integrated | —（无迭代字段） | — | 工作流真源（P8 BCR 自举中） | 无 | 无 |
| `xiaobao` | 牛马程小报 | `business` | integrated | **v0.6** | 标准迭代 | 实现阶段·联调精修（Developer 侧已收口） | 生产/测试部署去软链接化待 DevOps | **https://news.huiyiyou.cloud** |
| `ai` | AI 处理中枢 | `business` | integrated | 无 | 未选择 | 已承接 REQ-001，待启动 v0.1（各节点仍 stub） | 无 | 无 |
| `coordination` | 跨项目协调仓库 | `coordination` | integrated | —（不要求 INDEX） | — | 协调仓摘要（见 §4） | 无 | 无 |
| `workboard` | 跨项目 Agent 工作看板 | `workboard` | integrated | **v0.1**（UI/原型先行） | 标准迭代 | v0.1 UI 方案已定稿，功能 PRD 待回填 | 无 | 无 |

**下一步（nextStep）真实值：**
- `xiaobao`：Owner 报具体 bug → Developer 修复 / 切 DevOps 规整生产部署去软链
- `ai`：PM 创建 `v0.1-prd.md` 启动标准迭代，把 REQ-001 由 stub 转真实
- `workboard`：Owner 出原型图 → PM 回填 v0.1 功能 PRD
- `workflow` / `coordination`：无迭代型 nextStep

## 2. 枚举（真实语义）

- **kind**：`workflow-source` | `business` | `coordination` | `workboard`
- **status**：`integrated`（已接入）| `not-bootstrapped`（未接入团队工作流）| `config-error`（配置异常）| `read-error`（读取异常）| `disabled`（已禁用）
- **mode**：`标准迭代` | `非迭代` | `未选择`（删掉 Scrum/Kanban/持续交付）
- **role**：`PM` `UI` `Architect` `Developer` `Tester` `DevOps` `WM`（工作流固定角色，按项目实际启用展示）

## 3. 按 kind 的字段降级（重要）

| kind | 迭代/模式/阶段 | 角色看板 | 备注 |
|------|----------------|----------|------|
| `business` / `workboard` | ✅ 有 | ✅ 有 | 读自身 INDEX.md |
| `workflow-source` | ❌ 无（不要显示空迭代，改显示"工作流真源"摘要：baseline/templates/ROADMAP，P8 BCR 自举中） | ❌ 无 | 不因缺迭代判异常 |
| `coordination` | ❌ 无 | ❌ 无 | 改显示 §4 协调仓摘要 |

> 关键：`workflow-source` 和 `coordination` **没有迭代/模式/阶段**，卡片不要画成"—/—/—"的空项目，要换成各自的摘要内容，否则会被误读为异常。

## 4. coordination 摘要（固定计数口径，真实值）

- 活跃跨项目需求：**1**（REQ-001 联调中）
- 跨项目阻塞：**0**
- 契约数：**1**（`contracts/news-l1.md`）
- 沟通文档数：**1**（`communications/REQ-001-news-l1.md`）

## 5. 跨项目视图数据

### 5.1 需求池（替换 `CROSS_PROJECT_ITEMS`）

| id | 标题 | 提出方 | 承接方 | 转入迭代 | 状态 |
|----|------|--------|--------|----------|------|
| REQ-001 | 新闻 L1 处理：四维原始评分 + 五类标签 + 摘要 + 翻译 + 按需工具调用 | xiaobao · Developer | ai · PM(ck) | ai v0.1（待启动） | 联调中 |

> 需求状态枚举：已提报 / 评估中 / 已承接 / 开发中 / **联调中** / 已关闭。默认只显示未关闭，补「查看全部」。

### 5.2 BCR 基线修正提案池（⚠️ 原型完全没有这个维度，建议在跨项目里加一个 Tab）

| id | 摘要 | target | 状态 |
|----|------|--------|------|
| BCR-001 | 基线修正提案改走 coordination 管理 | agent-workflow | 已回流下游 |
| BCR-002 | communications 命名轴（按需求一份） | agent-workflow | 已回流下游 |

> BCR 是针对 `agent-workflow` 真源的基线修正，独立状态机：已提报→评估中→已采纳→已落地真源→回流中→已回流下游。和普通需求分开展示。

### 5.3 谁等谁（替换 `BLOCKING_ITEMS`）

**当前实际为空** —— ai 接入已完成、news-l1 契约两侧一致，无活跃跨项目阻塞。
→ 这正好用来展示**空态**："当前无阻塞依赖"。（别用原型那 3 条虚构阻塞）

### 5.4 沟通（替换 `COMM_ITEMS`）

| 关联需求 | 参与项目 | 摘要 |
|----------|----------|------|
| REQ-001-news-l1 | xiaobao ↔ ai | news-l1 v1 契约定稿，端到端单条已通过，3–5 条小批量观察中 |

## 6. 角色看板数据（真实，模型要改）

> 原型角色卡是 `{name:"产品负责人", assignee:"product-agent"}`——错。真实模型应是 `{role, 最近动作, 下一步}`，assignee 在一人公司都是 Owner(ck) 扮演，不必显示。

- **xiaobao**（启用 7 角色，最近状态样例）：
  - PM：v0.6 设计 R2 定稿裁定，进实现阶段
  - UI：v0.6 UI 方案 R2 已定稿
  - Architect：v0.6 设计文档翻牌定稿
  - Developer：前端联调精修，已收口
  - Tester：v0.6 设计 R2 复审，有条件通过
  - DevOps：待规整生产部署去软链
  - WM：初始化 coordination 骨架
- **ai**：仅 PM（已承接 REQ-001，待启动 v0.1）
- **workboard**：PM / Architect / Developer（v0.1 UI 方案 R1 已通过）
- **workflow / coordination**：无角色看板

## 7. 部署页数据（真实）

- 只有 **xiaobao** 有线上地址：`https://news.huiyiyou.cloud`（另有测试环境 test.huiyiyou.cloud / IP 115.191.43.79）
- 其余 4 个项目**无 url** → 灰显「未配置线上地址」
- 实现时需在 `projects.config.json` 给项目加 `url` 字段（当前配置里还没有）

## 8. 接入诊断表要补的列（立项 §6.6）

原型表只有：ID/项目名/类型/接入状态/文件检查/错误摘要。**补三列**：

| 补充列 | 真实值/规则 |
|--------|-------------|
| 解析路径 | config `path` 解析后的绝对路径，如 `../niuma-cheng-xiaobao` → `/root/Project/niuma-cheng-xiaobao` |
| 解析器 | 按 kind 推导：`businessParser` / `coordinationParser` / `workflowSourceParser` / `workboardParser` |
| 最近读取时间 | 运行时值，原型可占位"12s 前 / 刚刚" |

> 真实 config 路径：workflow=`../agent-workflow`、xiaobao=`../niuma-cheng-xiaobao`、ai=`../niuma-cheng-ai`、coordination=`../niuma-cheng-coordination`、workboard=`.`（全部 enabled）。

## 9. 字号 / 字体规范（跟小报统一）

- **base 14px → 16px**（原型偏小的根因；小报真源 `theme.css` 基准是 16px）
- 字阶：正文/按钮/输入/标签 16｜h3 18｜h2 20｜h1 24，**字重最多 500（无 bold）**，行高 1.5
- 正文不低于 14px，**避免 10/11px 当正文**（原型大量用，过小）；10px 仅限角标类极次要信息
- 字体族：原型写死 `Inter`，小报用系统 sans → **二选一统一**（建议跟小报一致，去掉 Inter）