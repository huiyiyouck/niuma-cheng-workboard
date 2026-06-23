# Web Agent Console 统一角色工作台架构规划

## 元信息
- 类型：Architecture
- 来源：Owner 2026-06-23 架构规划讨论
- 创建日期：2026-06-23
- 相关角色：Architect
- 相关迭代/任务：非迭代架构规划；不纳入 v0.1 只读看板范围

## 内容摘要

`niuma-cheng-workboard` 的长期方向不仅是只读项目状态看板，还可以演进为统一的 **Web Agent Console / 统一角色工作台**：

Owner 在 Web 页面中选择项目和角色，直接与对应 Agent 对话、发起开发或 Review。底层由 workboard 后端在正确项目目录中启动或复用 CLI Agent（Codex / Claude Code 等），自动注入角色启动语义，并把输出、执行状态和权限确认实时回显到网页。

一句话：

```text
把当前“手动 cd 到项目目录 + 打开 CLI + 输入你是某角色”的流程，收敛成 Web 上的“选项目 / 选角色 / 直接对话”。
```

## 目标形态

当前命令行流程：

```text
Owner 手动进入项目目录
→ 打开 Codex / Claude Code CLI
→ 输入“你是 PM / Developer / Architect”
→ CLI 按 AGENTS.md / CLAUDE.md 加载工作流
→ 对话、Review、开发、执行命令
```

目标 Web 流程：

```text
Owner 打开 workboard Web
→ 选择项目（xiaobao / ai / workboard / agent-workflow）
→ 选择角色（PM / Architect / Developer / Tester / DevOps）
→ 直接输入消息
→ workboard 后端在目标项目目录启动或复用 CLI Agent
→ 后端注入角色启动语义
→ Agent 输出实时显示在网页
→ 需要权限确认时，Owner 在网页上批准或拒绝
```

Web 层是统一入口，不替代团队工作流规则。角色切换仍然通过各项目 `AGENTS.md` / `CLAUDE.md` / `runtime.md` 生效。

## 架构分层

```text
Web 前端
  ├── 项目列表
  ├── 角色入口
  ├── 会话列表
  ├── 消息流 / 输出流
  └── 权限确认 UI

workboard 后端
  ├── ProjectResolver
  ├── RoleRouter
  ├── AgentSessionManager
  ├── AgentAdapter(codex / claude)
  ├── PermissionBroker
  ├── EventStream(SSE / WebSocket)
  └── ConversationStore

底层 CLI Agent
  ├── codex
  └── claude / Claude Code
```

### Web 前端

负责：

- 展示项目和角色入口。
- 展示“项目 + 角色”的会话列表和当前会话。
- 提供消息输入框。
- 实时显示 Agent 输出、工具执行状态、错误和最终结果。
- 显示权限确认卡片，例如执行命令、安装依赖、跨目录写入等。

### workboard 后端

负责：

- 根据项目 id 找到工作目录。
- 根据角色生成启动语义，例如“你是 Developer”。
- 启动、复用、停止 CLI Agent 进程。
- 把网页输入写入 Agent。
- 把 Agent 输出流推送到网页。
- 保存会话历史、状态、错误和确认记录。
- 执行 repo 级锁或角色级队列，避免多个 Agent 同时修改同一仓库。

### CLI Agent Adapter

不同 CLI 的启动、输入输出和恢复方式不同，必须封装 adapter：

```ts
type AgentProvider = "codex" | "claude";

type AgentSession = {
  id: string;
  projectId: string;
  role: string;
  provider: AgentProvider;
  cwd: string;
  status: "idle" | "running" | "waiting-approval" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};
```

Adapter 职责：

- 启动 CLI。
- 写入用户消息。
- 解析 stdout / stderr / PTY 输出。
- 识别权限请求。
- 支持取消和清理进程。
- 尽量支持会话恢复；若 CLI 不支持原生恢复，则由 workboard 保存 Web 层 transcript。

## 核心模块规划

| 模块 | 职责 |
|------|------|
| `ProjectResolver` | 读取 `projects.config.json`，解析项目路径和 kind |
| `RoleRouter` | 把 Web 选择的角色转换成工作流启动消息 |
| `AgentSessionManager` | 管理会话生命周期、状态、并发和进程句柄 |
| `AgentAdapter` | 适配 Codex / Claude Code CLI 的启动、输入、输出、取消 |
| `ConversationStore` | 持久化消息、输出、状态、错误和确认记录 |
| `PermissionBroker` | 把 CLI 权限请求转成 Web 可确认动作 |
| `RepoLockManager` | 避免同一仓库多 Agent 并发写入冲突 |
| `EventStream` | 用 SSE 或 WebSocket 向前端推送实时输出 |

## 数据与持久化

该能力超出 v0.1 “无数据库、只读聚合”的边界。后续需要引入持久化。

建议起步：

- SQLite：保存会话、消息、事件、权限确认、进程状态。
- 文件系统：可选保存原始 transcript 日志，便于排查。

核心表：

```text
agent_sessions
agent_messages
agent_events
agent_permission_requests
agent_process_runs
repo_locks
```

## 实时通信

推荐优先使用 SSE：

- Agent 输出是后端到前端的单向流，SSE 足够。
- 浏览器原生支持，复杂度低于 WebSocket。
- 用户输入仍走普通 `POST /api/agent-sessions/:id/messages`。

后续如果需要多人协同、双向实时编辑或复杂控制，再评估 WebSocket。

## API 草案

```http
GET /api/agent-capabilities
POST /api/agent-sessions
GET /api/agent-sessions
GET /api/agent-sessions/:id
POST /api/agent-sessions/:id/messages
GET /api/agent-sessions/:id/events
POST /api/agent-sessions/:id/cancel
POST /api/agent-permissions/:id/approve
POST /api/agent-permissions/:id/reject
```

`POST /api/agent-sessions` 示例：

```json
{
  "projectId": "xiaobao",
  "role": "PM",
  "provider": "codex"
}
```

后端启动语义示例：

```text
你是 PM
```

或在 adapter 层构造更完整启动消息：

```text
你是 PM。当前项目目录是 /root/Project/niuma-cheng-xiaobao。请按本项目 AGENTS.md 工作流启动。
```

具体启动文案以各 CLI 对上下文注入的能力为准。原则是：Web 不绕过工作流入口，只负责自动化进入入口。

## 安全边界

该能力本质上让 Web 后端具备启动本机 CLI 和执行命令的能力，必须按高风险能力设计。

最低安全要求：

- 默认只允许本机 Owner 访问；不暴露公网。
- Web 操作必须有访问控制。
- Agent 请求执行危险命令、安装依赖、跨目录写入、网络访问时，必须在 Web 上显式确认。
- 权限确认必须展示命令、工作目录、影响范围和风险提示。
- 同一仓库默认只能有一个写入型 Agent 会话运行。
- 会话启动前检查 Git 工作区状态，提示未提交变更。
- 不允许前端直接传任意 shell 命令给后端执行；只能通过 AgentAdapter 和 PermissionBroker。

## 并发与锁

推荐锁粒度：

- 仓库级写锁：同一 repo 同时只允许一个会修改文件的会话运行。
- 只读会话可并行，但必须标记为只读。
- Review / 实现等可能写文档或代码的角色默认申请写锁。
- 锁超时和释放要有清理机制，避免 CLI 崩溃后锁残留。

## 与 v0.1 的关系

v0.1 仍保持只读看板：

- 不启动 Agent。
- 不写回项目文件。
- 不引入数据库。
- 不做 Web 对话。

本规划作为后续架构方向，不改变 v0.1 当前设计和实现范围。

## 建议演进路线

| 阶段 | 能力 | 说明 |
|------|------|------|
| v0.1 | 只读工作看板 | 当前迭代范围 |
| v0.2 | 角色入口与会话索引 | Web 展示项目/角色入口、角色日志、历史会话占位，不启动 Agent |
| v0.3 | 单项目单角色 Web Agent 原型 | 先支持 workboard Developer 或 Architect，会话输出进 Web |
| v0.4 | 多项目多角色 | 加 repo 锁、权限确认、会话持久化 |
| v0.5 | 多 CLI Adapter | 支持 Codex / Claude Code adapter 抽象和切换 |

## 不适用场景

- 不用于替代 `agent-workflow` 的规则真源。
- 不用于绕过角色门禁、Review 门禁或权限确认。
- 不应在未完成访问控制和权限模型前暴露到公网。
- 不应在 v0.1 中临时塞入实现，避免破坏只读看板范围。

## 关键风险

| 风险 | 严重度 | 说明 |
|------|--------|------|
| Web 后端变成远程命令执行入口 | 高 | 必须有访问控制和权限确认 |
| 多 Agent 并发修改同一仓库 | 高 | 必须有 repo 级锁或队列 |
| CLI 输出协议不稳定 | 中 | 必须通过 AgentAdapter 隔离 |
| 页面刷新导致会话丢失 | 中 | 需要 ConversationStore 和事件流恢复 |
| 权限确认错绑会话 | 高 | PermissionBroker 必须绑定 session、cwd、命令和状态 |
| Agent 身份/角色上下文错位 | 中 | 会话必须绑定 projectId + role + cwd |

## 后续动作

- v0.1 完成后，Owner 可单独启动非迭代预研或 v0.2 PRD。
- 预研重点：
  - Codex / Claude Code CLI 是否适合长期进程或每轮启动。
  - 是否需要 `node-pty`。
  - SSE 是否足够承载输出流。
  - SQLite schema 和 repo 锁策略。
  - Web 权限确认交互原型。
