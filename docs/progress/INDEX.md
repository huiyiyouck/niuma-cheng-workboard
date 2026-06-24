# 项目进度索引

> 本文件是项目级当前状态的唯一真源。启动时 Agent 读此文件即应能判断"现在卡在哪、下一步做什么"，不需要再去翻迭代记录。

## 当前项目状态

- 当前迭代：无（v0.1 已关闭）
- 当前模式：未选择
- 当前阶段：v0.1 已关闭并上线（生产 `workboard.huiyiyou.cloud` 实测通过 / 测试环境 `115.191.43.79:8088`）；等待 Owner 决定下一步
- 阻塞项：无
- 下一步入口：Owner 决定下一步——提交 v0.1 遗留测试产物 / 启动 v0.2（管理能力演进）/ 其他；遗留与后续机会见 [v0.1-summary.md](iterations/v0.1-summary.md)

## 版本列表

> 首个迭代版本号建议为 `v0.1`，后续版本号由 PM 在 PRD 中决定。

| 版本 | 迭代记录 | PRD | UI | 设计文档 | Summary | 状态 |
|------|----------|-----|----|----------|---------|------|
| v0.1 | [v0.1.md](iterations/v0.1.md) | [v0.1-prd.md](iterations/v0.1-prd.md) | [v0.1-ui.md](iterations/v0.1-ui.md) | [v0.1-design.md](iterations/v0.1-design.md) | [v0.1-summary.md](iterations/v0.1-summary.md) | ✅ 已完成（上线 2026-06-24，遗留测试产物待提交） |

## 当前 Change Notes

| Change Note | 关联工作 | 状态 | 下一步 |
|-------------|----------|------|--------|

## 当前非迭代工作

| 日期 | 模式 | 记录 | 状态 | 下一步 |
|------|------|------|------|--------|
| 2026-06-17 | 立项 / Positioning | [跨项目 Agent 工作看板立项定位](ad-hoc/2026-06-17-workboard-positioning.md) / [Review 记录](ad-hoc/2026-06-17-workboard-positioning-review.md) | 已定稿，Owner Review 1-16 全部确认 | Developer 基于定稿方案实现第一版只读看板 |

## 最近收尾摘要

| 日期 | 角色 | 工作 | 结论 | 下一步入口 |
|------|------|------|------|------------|
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
| P0 | 实现第一版只读看板 MVP：配置读取、路径解析、接入诊断视图、项目总览、跨项目需求/状态读取、60s 轮询 | Developer | 2026-06-17 Owner 定稿 `niuma-cheng-workboard` 立项方案 | 关闭检查提醒：v0.1 已上线、MVP 达成；待 Developer / Owner 确认完成并移除本条 |

## Bootstrap 记录
- 时间：2026-06-17
- 状态：已完成
- Git 状态：未单独初始化 / 待 Owner 决定 remote
- 下一步：以 Developer（开发工程师）角色开发 MVP
