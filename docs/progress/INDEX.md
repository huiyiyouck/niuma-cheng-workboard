# 项目进度索引

> 本文件是项目级当前状态的唯一真源。启动时 Agent 读此文件即应能判断"现在卡在哪、下一步做什么"，不需要再去翻迭代记录。

## 当前项目状态

- 当前迭代：v0.3
- 当前模式：标准迭代
- 当前阶段：**✅ 已部署生产 + Owner 验收功能通过；但 Owner 提出展示问题待 Developer 修复 → 迭代暂不关闭** — v0.3 全 5 轮实现 + 两方 Review ✅ + 部署就绪检查 ✅ + 2026-07-20 生产部署完成（`b01fe25`）+ Owner 真实网络验收「验证完成，可以跑了/可以访问」
- 阻塞项：无（展示问题为优化项，非阻塞）
- 下一步入口：**Owner 找 Developer 修改若干展示问题**（Owner 转达具体项；预计走新一轮实现 fix 或 Change Note，类似 R5 的 Owner 反馈修复）→ Developer 修复自测 → DevOps 重部署 → 再执行迭代关闭检查。迭代关闭检查（2026-07-20 DevOps 执行）技术层 9 项全过判「技术可关闭」，但 Owner 决定暂不关闭。**遗留（非阻塞，带入下轮）**：① health `version` 仍 `0.2.0`（`package.json` 未 bump）建议 Developer 顺手 bump `0.3.0` + systemd unit 描述更新；② `npm test` 2 个既有真实数据耦合假失败已在待办。部署实况/回滚见 `v0.3.md` 部署就绪检查表（`002` 迁移应用 6 行 + chief-of-staff 悬垂值清理 + `session_mappings` DROP 不复活、US-5 迭代标签生产有值、US-9 error_page 实测兜底）

## 版本列表

> 首个迭代版本号建议为 `v0.1`，后续版本号由 PM 在 PRD 中决定。

| 版本 | 迭代记录 | PRD | UI | 设计文档 | Summary | 状态 |
|------|----------|-----|----|----------|---------|------|
| v0.1 | [v0.1.md](iterations/v0.1.md) | [v0.1-prd.md](iterations/v0.1-prd.md) | [v0.1-ui.md](iterations/v0.1-ui.md) | [v0.1-design.md](iterations/v0.1-design.md) | [v0.1-summary.md](iterations/v0.1-summary.md) | ✅ 已完成（上线 2026-06-24，收尾产物已入库） |
| v0.2 | [v0.2.md](iterations/v0.2.md) | [v0.2-prd.md](iterations/v0.2-prd.md) | [v0.2-ui.md](iterations/v0.2-ui.md) | [v0.2-design.md](iterations/v0.2-design.md) | [v0.2-summary.md](iterations/v0.2-summary.md) | ✅ 已完成（上线 2026-07-07，收尾归档完成） |
| v0.3 | [v0.3.md](iterations/v0.3.md) | [v0.3-prd.md](iterations/v0.3-prd.md) | 并入 PRD | [v0.3-design.md](iterations/v0.3-design.md) | — | 🔄 进行中（✅ 已部署生产 2026-07-20 `b01fe25` + 验收功能通过；Owner 提展示问题待 Developer 修复，暂不关闭） |

## 当前 Change Notes

> 活跃的 Change Note 放这里；已归档的移到对应迭代的 summary 里。

- 无活跃 Change Note（3 项 IRC 均已随 v0.2 收尾归档）

## 当前非迭代工作

| 日期 | 模式 | 记录 | 状态 | 下一步 |
|------|------|------|------|--------|
| 2026-07-07 | Ops Task / 运维 | [IP 直连生产 + v0.2 重新部署](ad-hoc/2026-07-07-ops-ip8088-repoint-prod.md) | ✅ 已完成 | Owner 从公司网络实测 `https://115.191.43.79`（IP:443）；若被拦访问不到则回滚恢复 8088 |
| 2026-07-07 | Bugfix / UI 显示 | [对话查看器背景层级修复](ad-hoc/2026-07-07-bugfix-conversation-view-background.md) | ✅ 已部署生产 | Owner 从真实网络验收 `https://115.191.43.79` 的对话背景层级与手动同步刷新体验 |
| 2026-07-05 | 技术预研 / Spike | [多来源会话同步调研（Codex / Trae CN）](ad-hoc/2026-07-05-spike-multi-source-session-sync.md) | 已完成 | Owner 拍板 Codex 同步排期（v0.3 或并入 v0.2）；Trae CN 挂起 |
| 2026-07-04 | 产品定位 / Product Brief | v0.2 UI 方案草案（项目会话视图 + 角色卡片 + 映射配置） | 已定稿 | — |
| 2026-07-06 | 标准迭代 v0.2 | 实现阶段 R2-2 + 部署就绪检查 + 收尾归档 | ✅ 已完成（上线 2026-07-07） | Owner 决定是否启动 v0.3 |
| 2026-07-07 | 标准迭代 v0.2 | 迭代关闭检查 + 收尾归档 | ✅ 关闭检查通过（Owner 验收已通过） | 收尾归档完成 → Owner 决定 v0.3 方向 |
| 2026-06-17 | 立项 / Positioning | [跨项目 Agent 工作看板立项定位](ad-hoc/2026-06-17-workboard-positioning.md) / [Review 记录](ad-hoc/2026-06-17-workboard-positioning-review.md) | 已定稿，Owner Review 1-16 全部确认 | Developer 基于定稿方案实现第一版只读看板 |

## 最近收尾摘要

| 日期 | 角色 | 工作 | 结论 | 下一步入口 |
|------|------|------|------|------------|
| 2026-07-07 | General（机制执行） | v0.2 迭代关闭检查 + 收尾归档 | ✅ 可关闭 — Owner 验收通过；9 项关闭检查全通过；已生成 v0.2-summary.md；3 项 IRC 已归档；coordination 元信息变更台账已登记；workboard名称/功能范围 2 行 | Owner 决定 v0.3 方向（对话输入/菜单精简/迭代标签等） |
| 2026-06-25 | Tester | v0.1 收尾核对 | 工作区干净；测试计划/报告、Tester 日志和生产部署收尾均已入库；已清理过期"待提交"遗留描述 | Owner 决定是否启动 v0.2 |
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
| P2 | 会话「迭代标签」精量匹配：识别某会话属于哪个迭代下的哪个角色（如「v0.2 的 PM 会话」），与现有 `detected_role` 并列。**Developer 预研发现（2026-07-06，供 PRD 参考）**：① 靠会话开头提 vX.Y 不可行——仅 4/115（≈3%）在前 3 条消息提到、标题 0 次；② 全文任意处出现 vX.Y 的有 82/115（≈71%），33 个完全没提；③ 另一条路是时间窗匹配（会话时间范围落入迭代活跃窗），但需迭代起止日期，现有 INDEX 版本表/迭代记录里日期稀疏；④ 可复用现有角色自动识别。需 PRD 定义匹配信号、多级降级与展示形态 | PM | Owner 口述（2026-07-06，v0.2 验收中提出，明确不纳入 v0.2） | ✅ 已完成（v0.3 US-5 迭代标签实现 `ae2a944`，生产有值） |
| P2 | **生态根「框架真源(agent-workflow)」卡片深度详情**（原「菜单 5→3」待办 ④ 子项的**剩余部分**）：菜单 5→3 主体（US-6 `13d31be`）+ 生态根卡片钻取**入口**（`a1685d8`，前端 App.tsx/EcosystemView）**已完成**；**唯剩** agent-workflow 卡片钻进去的详情仍薄——`workflow-source.js` 现仅浅层探测目录、拼一句 `kindSummary`。**PM 已定范围（2026-07-20）**：展示 定位 + ROADMAP 章节 + baseline/templates 清单（**删去不适用的「版本」维度**——agent-workflow 无版本号），只读；后端扩展 `workflow-source.js` 返回结构 + 前端详情面板。详见 `docs/progress/ad-hoc/2026-07-20-agent-workflow-card-detail-scope.md`。**不阻塞部署**。 | Developer（PM 定范围后转交） | Owner 口述（2026-07-06）· PM 定范围 2026-07-20 | 范围已定，待 Developer 实现 |

## Bootstrap 记录
- 时间：2026-06-17
- 状态：已完成
- Git 状态：未单独初始化 / 待 Owner 决定 remote
- 下一步：以 Developer（开发工程师）角色开发 MVP
