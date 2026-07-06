# 项目进度索引

> 本文件是项目级当前状态的唯一真源。启动时 Agent 读此文件即应能判断"现在卡在哪、下一步做什么"，不需要再去翻迭代记录。

## 当前项目状态

- 当前迭代：v0.2
- 当前模式：标准迭代
- 当前阶段：实现（R2 Review中——Developer 自审 + 自测完成，含验收多轮修复 + IRC-002/003）
- 阻塞项：无
- 下一步入口：Architect / DevOps 独立复核 + Owner 验收 → 通过后 DevOps 部署 → 迭代关闭

## 版本列表

> 首个迭代版本号建议为 `v0.1`，后续版本号由 PM 在 PRD 中决定。

| 版本 | 迭代记录 | PRD | UI | 设计文档 | Summary | 状态 |
|------|----------|-----|----|----------|---------|------|
| v0.1 | [v0.1.md](iterations/v0.1.md) | [v0.1-prd.md](iterations/v0.1-prd.md) | [v0.1-ui.md](iterations/v0.1-ui.md) | [v0.1-design.md](iterations/v0.1-design.md) | [v0.1-summary.md](iterations/v0.1-summary.md) | ✅ 已完成（上线 2026-06-24，收尾产物已入库） |
| v0.2 | [v0.2.md](iterations/v0.2.md) | [v0.2-prd.md](iterations/v0.2-prd.md) | [v0.2-ui.md](iterations/v0.2-ui.md) | [v0.2-design.md](iterations/v0.2-design.md) | 待创建 | 🔧 实现（R1 进行中，含 IRC-001 数据库变更） |

## 当前 Change Notes

| Change Note | 关联工作 | 状态 | 下一步 |
|-------------|----------|------|--------|
| [IRC-001](iterations/v0.2-design.md#实现阶段变更记录) 数据库选型变更 SQLite → PostgreSQL | v0.2 实现 | 已落地 | DevOps 部署时按新配置（.env + PostgreSQL workboard 库）落地；归档随 v0.2 收尾 |
| [IRC-002](iterations/v0.2-design.md#实现阶段变更记录) 会话同步双数据源（本机 + 服务器 rsync 镜像；claude_project_id 支持数组） | v0.2 实现 | 已落地 | DevOps 部署时服务器侧不设 CLAUDE_REMOTE_SOURCES；归档随 v0.2 收尾 |
| [IRC-003](iterations/v0.2-design.md#实现阶段变更记录) 会话源兼容 Codex（仅 Claude Code + Codex 两种，source 列 + Codex 徽章） | v0.2 实现 | 已落地 | 归档随 v0.2 收尾 |

## 当前非迭代工作

| 日期 | 模式 | 记录 | 状态 | 下一步 |
|------|------|------|------|--------|
| 2026-07-05 | 技术预研 / Spike | [多来源会话同步调研（Codex / Trae CN）](ad-hoc/2026-07-05-spike-multi-source-session-sync.md) | 已完成 | Owner 拍板 Codex 同步排期（v0.3 或并入 v0.2）；Trae CN 挂起 |
| 2026-07-04 | 产品定位 / Product Brief | v0.2 UI 方案草案（项目会话视图 + 角色卡片 + 映射配置） | 已定稿 | — |
| 2026-07-05 | 标准迭代 v0.2 | PRD 定稿（R2 Review 通过 + Owner 拍板全部待澄清问题） | 已定稿 | Architect 进入设计阶段 |
| 2026-06-17 | 立项 / Positioning | [跨项目 Agent 工作看板立项定位](ad-hoc/2026-06-17-workboard-positioning.md) / [Review 记录](ad-hoc/2026-06-17-workboard-positioning-review.md) | 已定稿，Owner Review 1-16 全部确认 | Developer 基于定稿方案实现第一版只读看板 |

## 最近收尾摘要

| 日期 | 角色 | 工作 | 结论 | 下一步入口 |
|------|------|------|------|------------|
| 2026-06-25 | Tester | v0.1 收尾核对 | 工作区干净；测试计划/报告、Tester 日志和生产部署收尾均已入库；已清理过期“待提交”遗留描述 | Owner 决定是否启动 v0.2 |
| 2026-06-24 | PM | v0.1 迭代关闭检查 + 归档 | ✅ 可关闭（已完成）— 6 阶段定稿、生产实测通过；已生成 [v0.1-summary.md](iterations/v0.1-summary.md)、更新迭代记录与 INDEX | Owner 决定下一步（提交遗留产物 / 启动 v0.2） |
| 2026-06-24 | DevOps | v0.1 生产部署与开发/生产隔离整改 | 已撤回错误的 8089/IP 入口和开发目录软链；生产按 `workboard.huiyiyou.cloud` 443 部署，前端 `/var/www/workboard.huiyiyou.cloud` 与后端 `/opt/workboard-prod/app` 均为独立生产目录；本机 SNI 自检 200 | Owner 配置 / 确认 `workboard.huiyiyou.cloud` DNS 指向本机后实测；通过后执行 v0.1 迭代关闭检查 |
| 2026-06-17 | General | 新项目立项准备 | 已将定稿定位文档移动到本项目 `docs/progress/ad-hoc/`，并从 `agent-workflow` 复制团队工作流入口、baseline、templates、knowledge/progress 骨架 | Owner 切到本目录，以 Developer 角色开工 |

## 跨任务待办

> 列入此表通常说明事项跨多个任务、归属角色明确但尚未启动；
> 若已有可独立的 ad-hoc 或基线修正提案，优先走对应流程。完成后从本表移除。
>
> **字段与写权限**：
> - **优先级**（P0/P1/P2）：登记时由提出方设定，归属角色可调整。
> - **待办**：一句话描述。
> - **归属角色**：登记时由提出方判定；写入后只能由归属角色本人变更（如转交）。
> - **来源**：任何角色的日志、ad-hoc、Incident、Review 结论、Owner 口述等；登记后不再改。
> - **状态**：只能由归属角色更新；其他角色发现状态过期可在会话里提醒，不可代改。
> - Owner 始终可以更新任何字段，作为兜底。
> - 收尾归档、迭代关闭检查等机制执行者可以登记新待办和更新项目级当前状态；不得代改归属其他角色的“归属角色 / 状态”字段，只能写入提醒或待确认。

| 优先级 | 待办 | 归属角色 | 来源 | 状态 |
|--------|------|----------|------|------|
| P2 | 会话「迭代标签」精量匹配：识别某会话属于哪个迭代下的哪个角色（如「v0.2 的 PM 会话」），与现有 `detected_role` 并列。**Developer 预研发现（2026-07-06，供 PRD 参考）**：① 靠会话开头提 vX.Y 不可行——仅 4/115（≈3%）在前 3 条消息提到、标题 0 次；② 全文任意处出现 vX.Y 的有 82/115（≈71%），33 个完全没提；③ 另一条路是时间窗匹配（会话时间范围落入迭代活跃窗），但需迭代起止日期，现有 INDEX 版本表/迭代记录里日期稀疏；④ 可复用现有角色自动识别。需 PRD 定义匹配信号、多级降级与展示形态 | PM | Owner 口述（2026-07-06，v0.2 验收中提出，明确不纳入 v0.2） | 待研究 |
| P2 | 菜单信息架构精简 5→3（Owner 已定方案 A，2026-07-06）：顶级菜单从「工作台/项目会话/部署/接入诊断/跨项目」收敛为 **「看板 / 项目会话 / 需求池」**。① **部署 + 接入诊断降级**——不再占顶级菜单，并入看板项目卡片详情抽屉的一个「接入/部署」tab（两者本质都是「每项目一行的技术健康信息」，且详情抽屉现已含接入详情 `DiagnosticDrawerContent`）；② 现「跨项目」菜单收敛为 **「需求池」**，BCR/沟通/谁等谁作为子 tab 保留；③ 看板与项目会话保留但**明确分工**——看板做横向概览+异常高亮，迭代/阶段等深入细节跳项目会话，不在两处重复维护时间轴展示；④ **生态根只读卡片钻取**（Owner 2026-07-06 追加）——项目会话视图里「公告板/框架真源」只读卡片点不进去，但 Owner 想看其「当前表现」。现状：公告板(coordination)详情**已存在于跨项目/需求池视图**（snapshot.crossProject：需求池/BCR/谁等谁/沟通），只缺卡片→详情的跳转入口；agent-workflow 详情数据薄（snapshot 仅 kindSummary 一句），要展示 baseline/版本/演进需**后端 workflow-source.js 扩展解析**。方案 A 落地时给两张只读卡片加点击钻取（公告板→需求池视图；框架真源→框架状态详情+补后端）。属 UI 信息架构重构，走 PM 定范围 → 设计 → 实现 | PM | Owner 口述（2026-07-06，v0.2 验收中提出，明确不纳入 v0.2，已定方案 A） | 待研究 |

## Bootstrap 记录
- 时间：2026-06-17
- 状态：已完成
- Git 状态：未单独初始化 / 待 Owner 决定 remote
- 下一步：以 Developer（开发工程师）角色开发 MVP
