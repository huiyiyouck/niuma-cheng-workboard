# Claude Code 会话数据存储结构

> 来源：v0.2 Spike-001 技术预研（2026-07-05），验证了 Claude Code 会话数据可通过本地 JSONL 文件直接读取。

## 存储位置

- **根目录**：`~/.claude/`（macOS/Linux）
- **项目会话目录**：`~/.claude/projects/`

## 目录结构

```
~/.claude/
├── projects/
│   ├── -<编码后项目路径>/
│   │   ├── <sessionId>.jsonl
│   │   └── <sessionId>.jsonl
│   └── -<另一个项目路径>/
│       └── ...
├── tasks/          # UUID 命名的任务目录（内容少，可忽略）
├── session-env/    # UUID 子目录（多为空）
└── history.jsonl   # 用户消息全局历史（仅用户消息，无回复）
```

## 项目路径编码规则

项目绝对路径的 `/` 替换为 `-`，整体前缀加 `-`。

- 示例：`/Users/ck/Project/niuma-cheng` → `-Users-ck-Project-niuma-cheng`
- 根路径示例：`/root/Project/...` → `-root-Project-...`

## JSONL 文件格式

每个会话一个 `.jsonl` 文件，每行是一个 JSON 对象，按 `type` 字段区分：

| type | 说明 | 关键字段 |
|------|------|----------|
| `user` | 用户消息 | `message.content`（字符串或 block 数组）、`timestamp`、`uuid`、`cwd`、`gitBranch` |
| `assistant` | 助手消息 | `message.content`（block 数组：text/thinking/tool_use）、`message.model`、`stop_reason` |
| `custom-title` | 会话自定义标题 | `customTitle`（可能不存在） |
| `system` / `attachment` / `queue-operation` / `mode` / `last-prompt` | 系统事件 | 跳过，不入库 |

## content 提取规则

### user 消息

- 字符串：直接存储
- 数组：拼接所有 `type === "text"` 的 block，`\n` 分隔

### assistant 消息

- **只拼接 `type === "text"` 的 block**
- `thinking` block：不入库（内部推理，对话视图不展示）
- `tool_use` block：提取 `name` → `tool_name`，`input` JSON 序列化 → `tool_input`
- 一条 assistant 消息可能有多个 tool_use block：v0.2 简化只取第一个

## 角色自动识别

仅作辅助标签，最终映射以用户手动配置为准。

1. **精确匹配**（置信度 1.0）：首条 user 消息匹配 `你是\s*(PM|Architect|Developer|DevOps|General|产品经理|架构师|开发工程师|运维部署工程师|通用助手)`
2. **关键词加权**（置信度 0.5~0.9）：扫描前 5 条 user 消息，按关键词命中数加权评分
3. **无法识别**：`Unknown`，置信度 0

## 增量同步策略

| 场景 | 检测方式 | 处理策略 |
|------|----------|----------|
| 正常追加 | `file_mtime` 变 + `file_size >= last_byte_pos` | 从 `last_byte_pos` 继续读取 |
| 文件未变 | `file_mtime` 未变 | 跳过 |
| 文件截断 | `file_size < last_byte_pos` | 全量重读（删除旧消息，从 0 重新解析） |
| 覆盖写 | `file_mtime` 变 + `file_size == last_byte_pos` | 全量重读 |
| 新文件 | 目录扫描新发现 | 全量解析入库 |

## 验证数据（Spike-001，本机 2026-07-05）

- 项目目录数：9 个
- 总会话数：34 个
- 有完整对话的会话：32 个
- 总用户消息：3,976 条
- 总助手消息：8,080 条

## 相关文件

- 设计文档：`docs/progress/iterations/v0.2-design.md` §4.3 JSONL 解析与 content 提取规则
- 实现代码：`src/server/parsers/claude-jsonl.js`、`src/server/sync/claude-sync.js`
- Spike 记录：`docs/progress/ad-hoc/2026-07-05-spike-claude-code-session-data.md`
