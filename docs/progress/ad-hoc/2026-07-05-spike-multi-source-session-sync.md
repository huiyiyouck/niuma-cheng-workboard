# Spike：多来源会话同步调研（Codex / Trae CN）

- 日期：2026-07-05
- 模式：非迭代 · 技术预研（Spike）
- 角色：Developer（开发工程师）
- 触发：Owner 在 v0.2 验收中提出——会话同步实际有三个来源（Claude Code / Codex / Trae CN），要求调研另外两个的接入可行性
- 结论：**Codex 完全可行（建议实施）；Trae CN 当前不可行（正文加密，建议暂缓）**

## 一、Codex —— 可行 ✅

### 存储实况（双机核实）

- 路径：`~/.codex/sessions/YYYY/MM/DD/rollout-<时间戳>-<uuid>.jsonl`
- 数量：Mac 39 个 / 服务器（zijie）44 个
- 格式：JSONL，行类型：
  - `session_meta`：`payload.id`（会话 uuid）、`payload.cwd`（**真实项目路径**）、`payload.timestamp`、`originator`（Codex Desktop / CLI）
  - `response_item`：`payload.type` = `message`（role: user / assistant / developer）| `reasoning` | `function_call` | `function_call_output`
  - `event_msg` / `turn_context`：轮次元信息，可跳过
- 实测某会话消息分布：message/user 4、message/assistant 5、reasoning 7、function_call 47、function_call_output 47

### 与现有模型的映射

| Codex | workboard 现有模型 |
|-------|--------------------|
| `message` user/assistant（content 数组 input_text/output_text） | `claude_messages.role/content` |
| `message` developer（系统注入） | 过滤不入库（同 claude 的 system） |
| `reasoning` | `has_thinking` |
| `function_call`（name/arguments） | `has_tool_use` / `tool_name` / 工具调用行 |
| `session_meta.payload.cwd` | 项目归属：**真实路径匹配**（不同于 claude 的目录名编码，需按路径→配置项目映射） |

### 实施要点（预估中等工作量）

1. `claude_sessions` 表加 `source` 列（`claude` / `codex`，默认 claude，向后兼容）
2. 同步引擎抽 source 适配器：现有 JSONL 解析为 claude 适配器，新增 codex 适配器（递归扫日期目录）
3. 项目归属：codex 用 `cwd` 前缀匹配 `projects.config.json` 各项目 `path`（解析为绝对路径比对）
4. 远程镜像复用 IRC-002 rsync 机制，追加 `~/.codex/sessions` 目录
5. 前端会话列表加来源标签；角色识别（session-meta.js）逻辑可直接复用（首条 user 消息同样是「你是 XX」句式）

## 二、Trae CN —— 当前不可行 ❌

### 存储实况

- 会话正文：`~/Library/Application Support/Trae/ModularData/ai-agent/database.db`（24MB）
  - **加密存储**：无 SQLite 文件头、全随机字节（大概率 SQLCipher 或自定义加密，密钥推测在系统钥匙串）
  - `sqlite3` 直接打开报 `file is not a database`
- 可读的外围数据（都没有消息正文）：
  - `~/.trae/session_work_dirs/<会话id>/*.mount_config`：会话 id ↔ 项目路径映射
  - workspaceStorage `state.vscdb`：仅会话 id → 模式的关系映射（几十字节）
  - `snapshot/`：文件快照；`sandbox/*.json`：权限配置

### 判断

- 逆向解密不可取：脆弱（版本升级即坏）、有合规疑虑，不适合作为长期数据管道
- 可拿到「会话存在性 + 项目归属」但拿不到内容，展示价值太低
- **建议**：标记「暂不支持」，跟踪 Trae 后续是否提供导出功能 / 开放 API；先做 Codex

### 补充核查：TRAE Work CN（= TRAE SOLO CN 应用，2026-07-05 Owner 提供会话 ID 后复查）

- Owner 提供复合 ID：`设备ID:用户哈希_会话ID×3:TRAE Work CN.0.1.29(时间戳)`，其中会话 ID 为 MongoDB ObjectId 风格，`6a48c7de139447da16e994e3` 实存在本机 `TRAE SOLO CN/ModularData/ai-agent/snapshot/`
- 本机装有三个 Trae 系应用：`Trae.app` / `TRAE SOLO.app` / `TRAE SOLO CN.app`，数据结构同构
- TRAE SOLO CN 彻查结果：主库 `database.db`（58MB）同样加密；IndexedDB / Local Storage 搜三个会话 ID 零命中（无明文缓存）；snapshot 是工作区文件的 git 快照（不含对话）；sandbox 是权限配置
- 结论不变：**知道会话 ID 不解决正文加密问题**。ObjectId 形态说明会话同存字节云端，可行正路：① 产品内导出功能（若有，出导入器承接导出文件）② 等官方开放 API；不逆向、不模拟私有 API

## 三、建议的推进方式

- Codex 同步作为独立需求排期（v0.2 收尾后 v0.3 承接，或 Owner 拍板并入 v0.2 加一条 IRC）——涉及 schema 变更（source 列）+ 新解析器 + 前端标签，不是顺手改
- Trae CN 挂起，登记为已知边界
- Owner 拍板结果：待定
