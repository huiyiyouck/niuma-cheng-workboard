# ADR-0001: 会话角色归属存储模型（1:1 映射表 → manual_role 内联列）
- 日期: 2026-07-14
- 状态: 提议（随 v0.3-design.md R1 Review 采纳）
- 关联: v0.3 PRD M-1、v0.3-design.md §2 / §6 / §7

## 背景

v0.2 用独立表 `session_mappings` 承载「手动把某会话映射到某项目+角色」，为**严格 1:1**：`session_id UNIQUE` + `UNIQUE(project_id, role)`，写入用 `ON CONFLICT (project_id, role)` upsert。即「一个项目的一个角色只能绑一个会话」。

v0.3 需求（US-3/10/11）要求：
- **1:N**——一个角色可归属多个会话；
- 角色归类统一为 `manualRole ‖ detectedRole ‖ General`（手动纠正优先、自动识别其次、General 兜底）；
- `manualRole` 持久化（事实纠正），当前会话 `currentByRole` 前端临时（查看偏好）。

现状 `session_mappings` 的两个 UNIQUE 约束都与 1:N 目标冲突，且系统里已有第二套角色来源 `claude_sessions.detected_role`（自动识别）。PRD R1 中 Architect 与 Developer 独立 Review 均指出该歧义（M-1，中严重度），须在设计阶段定明存储载体。

## 决策

**路径 A：废弃 `session_mappings` 表，把手动角色归属内联为 `claude_sessions.manual_role` 单列。**

- `claude_sessions` 新增 `manual_role TEXT`（可空，NULL = 未手动纠正）。
- 归类：`resolved_role = coalesce(manual_role, nullif(detected_role,'Unknown'), 'General')`。
- 「角色 → 会话列表」= 按 `resolved_role` 分组查询 `claude_sessions`，天然 1:N。
- 项目维度由 `claude_sessions.project_id`（目录编码 id）+ config `claude_project_id` 映射承载，`manual_role` 只覆盖角色维。
- 打标签 = `UPDATE ... SET manual_role`；取消 = `SET manual_role = NULL`（回落 detected/General）。
- v0.2 存量 `session_mappings.role` 按 `session_id` 迁移进 `manual_role`（`project_id` 冗余丢弃）后 `DROP TABLE`，走 `002_session_role_model.sql`。

## 考虑的替代方案

| 方案 | 优点 | 缺点 | 为什么不选 |
|------|------|------|-----------|
| A. `manual_role` 内联列 + 废表（选中） | 单一归属来源、1:N 天然、归类一条 `coalesce`、无 JOIN、兼容 US-4 兜底 | `DROP TABLE` 不可逆（用迁移前备份 + 数据迁移覆盖） | — |
| B. 保留 `session_mappings`，去掉两 UNIQUE 放宽到 1:N，role 存手动覆盖 | 不 DROP 表、改动看似小 | 手动(mapping)与自动(detected_role)两套来源并存、归类须 JOIN 两表算 coalesce、`project_id` 冗余、"会话行承载归属"被割裂 | 长期复杂度高，与干净 1:N 模型相悖 |
| C. 新增独立 `manual_role` 表（session_id → role，1:1） | 与 detected 解耦 | 又多一张表 + JOIN，未消除 B 的双来源问题 | 无实际收益 |

## 后果

**正面**：
- 归类逻辑单点、SQL 与前端一致；1:N 无需任何联表；US-4 兜底（Unknown/NULL→General）由 `coalesce` 顺带完成，无需数据迁移。
- 后端「角色→会话列表」直接来自 `claude_sessions`，`/api/sessions` 成为统一读取入口，`/api/mappings` 三端点连同表一并废弃，接口面收敛。

**负面 / 风险**：
- `DROP TABLE session_mappings` 不可逆——迁移前须备份（DevOps 在部署就绪检查给回滚策略，如 `pg_dump` 该表）。
- 前端 `MappingDialog`/`SessionSelect` 的写路径与读「角色→会话」逻辑需改造（指向新的打标签端点 + 按 `resolved_role` 分组），由 Developer 实现。
