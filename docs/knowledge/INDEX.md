# 团队知识库索引

> 本索引用于快速定位项目级知识。Agent 启动时只读索引，不全文读取知识库。

## Product（产品）

## UI（界面）

- [workboard 原型图设计上下文](ui/prototype-design-context.md)：claude.ai/design 原型图的生成依据 + 验证对照——协作机制（PM 设计 / Owner 决策 / design agent 执行）+ 沙盒约定 + 各组件设计规格 + 交互决策 + 现状台账。设计 token 见 `ui/design-system.md`。

## Architecture（架构）

- [Web Agent Console 统一角色工作台架构规划](architecture/web-agent-console-roadmap.md)：长期方向，把项目/角色 CLI Agent 会话统一到 workboard Web 中管理；不纳入 v0.1 只读看板范围。

## Engineering（工程）

- [Claude Code 会话数据存储结构](engineering/claude-code-session-storage.md)：本地 JSONL 文件格式、目录编码规则、content 提取规则、增量同步策略、角色自动识别规则（v0.2 Spike-001 验证结论）

## Testing（测试）

## DevOps（运维/部署）

- [workboard 测试环境部署手册](devops/workboard-test-deployment.md)：systemd + nginx + 通配符证书部署步骤；**关键约束**：公司上网行为管理拦 80/443，测试环境走非标端口 HTTPS（8088）。

## Decisions（决策）

- [ADR-0001 会话角色归属存储模型](decisions/ADR-0001-session-role-storage-model.md)：v0.3 M-1——废弃 v0.2 `session_mappings`（1:1）表，改 `claude_sessions.manual_role` 内联列 + `coalesce(manual_role, nullif(detected_role,'Unknown'),'General')` 归类，天然 1:N 并兼容 US-4 兜底。本项目首个 ADR。

## Opportunities（机会池）

## Retrospectives（复盘）
