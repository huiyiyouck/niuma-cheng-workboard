# Developer 角色日志

## 2026-07-18 — v0.3 设计阶段 R1 Developer Review
- 本次角色：Developer（开发工程师）
- 动作：被指定为设计阶段 R1 Review 方（独立冷启动会话）
- 涉及产出：`v0.3-design.md`（文末追加 Developer R1 Review）、`v0.3.md`（门禁表 + Review 记录）、`INDEX.md`（当前阶段/版本表）
- 结论：**✅ 通过**（存储模型/API 契约/.git 解析/前端状态模型均可落地，无阻塞项）。
- 独立读代码核实：① M-1 路径 A（`manual_role` 落列 + `coalesce` 归类 + `session_mappings` 废弃 + 002 迁移）决策认同；② `detected_role` 入库确为字符串 `'Unknown'`（`claude-sync.js:397`），设计 `nullif(detected_role,'Unknown')` 兼容假设成立；③ 全新库迁移链健壮（`001_init.sql:45` 建表 → 002 UPDATE→DROP，版本顺序保证）；④ API 契约照现有硬匹配路由（`index.js:90-122`）可无歧义新增/改造，废弃/改造目标 handler 位置属实。
- **核心发现 DEV-M1（中，不阻塞）**：设计 §6 对 schema 初始化机制认知偏差——`ensureSchema`→`runSchemaDDL`（`db.js:81`，内联建三张表）**不在 HTTP/启动读路径**（`index.js` 只调 `applyMigrations`），只被 `claude-sync.js:438/497` 在 **sync 时**调。设计说「删 runSchemaDDL 段否则每次启动重建」触发点错（应为「每次 sync」，照重启验证会测漏），且未点破 migrations(001) 与 runSchemaDDL 是两套重复 schema 真源。建议实现前订正 §6；最小闭环=删 `runSchemaDDL` session_mappings 段（`db.js:125-145`）+ 与 002 同轮次落；可选根治=claude-sync 改走 applyMigrations 退役内联 DDL。
- 另 DEV-L1（低·US-5 每 commit 一次 `git show` 子进程首次偏慢，可 `git log -p` 优化）、DEV-L2（低·`/api/communications/detail` 出参 `sourcePath` 绝对路径不宜透前端）。
- 关联迭代：v0.3（设计阶段 R1）
- 下一步入口：DevOps R1 Review；两方通过后由 Architect 判断是否进「修改中」订正 §6（DEV-M1），再定稿进实现阶段。实现阶段自留：DEV-M1 的 runSchemaDDL 清理须与 002 同轮次；前端切打标签端点时跑 `/api/mappings` 引用 grep（跨轮契约同步纪律）。
- 收尾状态：已完成（Review 履职，未产代码）

## 2026-07-14 — v0.3 PRD 阶段 R1 Developer Review
- 本次角色：Developer（开发工程师）
- 动作：被指定为 PRD 阶段 R1 Review 方（独立冷启动会话，非产出方切角色自审）
- 涉及产出：`docs/progress/iterations/v0.3-prd.md`（文末追加 Developer R1 Review）、`v0.3.md`（门禁表 + Review 记录）、`INDEX.md`（当前阶段/版本表）
- 结论：**✅ 通过**（可实现性整体成立，无阻塞项）。独立读代码核实 10 个工程成本维度均可落地。
- 核实要点（真代码）：① `ConversationView`（`EcosystemView.tsx:1173`）现为全屏 `fixed inset-0` 弹窗，A 组抽屉重构属中等前端工作量、可复用 `Drawer`/`IterationTimeline`/`StageDrawer`/`SessionSelect`/`MappingDialog`；② `NAV_ITEMS` 确为 5 项（US-6 的 5→3 基数属实）；③ **附议 M-1**——`session_mappings` 严格 1:1（`session_id UNIQUE`+`UNIQUE(project_id,role)`）、`claude_sessions` 无 `manual_role` 列，是我落手实现的直接阻碍；④ **附议 L-1/L-2**——`codex-parser.js` 完整非 stub、`source` 列 v0.2 已存在、`readCommunications` 已 `readFile` 全文（仅丢弃只留 `firstHeading`），US-8/US-12 后端成本高估属实；⑤ `detectRole`（`session-meta.js:41,68`）现返回 `Unknown`，US-4 兜底 General 改动极小。
- 独立提出（超出 Architect 已提）：D-1（低·§7 实现指引宜补「A 组=改造 v0.2 现有内联组件、非从 design 从零翻译」）、D-2（低·验收可验证性——US-4 基线「~7.5%」在 PRD 无出处/口径，验收无法对照，建议 PM 标明）。
- 设计阶段接力提示：US-5 git 读取封装/时间窗匹配为 B 组后端大头；US-8 全文透出宜 by-id 接口避免 snapshot 膨胀；US-6 须理清 `App.tsx`/`EcosystemView.tsx` 两套并存视图归位；US-7 `overflow-hidden` 浮层需 portal。
- 关联迭代：v0.3（PRD 阶段 R1）
- 下一步入口：Owner 切到 PM，判断是否进「修改中」订正表述（M-1 设计阶段定；D-1/D-2/L-1/L-2 顺手订正），再定稿进设计阶段。
- 收尾状态：已完成（Review 履职，未产代码）

## 2026-07-07 — 对话查看器背景层级修复
- 本次角色：Developer（开发工程师）
- 动作：Bugfix / UI 显示问题
- 涉及产出：`frontend/src/app/components/EcosystemView.tsx`、`frontend/src/app/useProjectSession.ts`、`frontend/src/app/snapshot.ts`、`src/server/sync/claude-sync.js`、`docs/progress/ad-hoc/2026-07-07-bugfix-conversation-view-background.md`
- 结论：已修复两项体验/同步问题。① 项目会话“查看对话”界面背景与周围白色页面缺少层级：对话查看器外层和消息滚动区改为浅灰画布，顶部/底部栏保留白底，消息气泡增加边框/阴影。② “同步会话”实际后端能写库，但前端不会刷新已打开的会话列表/详情：`triggerSync()` 成功后广播 `workboard:sessions-synced`，会话列表、详情、映射列表监听后自动 refetch；同步结果提示只把 full/rebuild/incremental 算更新，并显示失败文件数。同步时顺带给历史脏会话的空 `last_message_at` 增量更新增加兜底。
- 验证：`npm --prefix frontend run build` 通过；`node --test src/server/sync/claude-sync.test.js src/server/sync/codex-parser.test.js src/server/sync/session-meta.test.js` 通过；本地 5174 服务 + Playwright mock 会话详情检查通过，控制台错误 0，对话查看器背景为 `rgb(243, 245, 248)`。全量 `npm test` 未全绿，失败为既有真实数据耦合（coordination 活跃需求计数 1≠2；本项目真实 INDEX 待办数 3≠2），非本次改动引入。
- 关联迭代：无
- 关联非迭代工作：2026-07-07-bugfix-conversation-view-background
- 关联 Change Note：无
- 下一步入口：Owner 本地/生产验收；如确认需要上线，由 DevOps 重新构建部署。
- 收尾状态：已完成

## 2026-07-05 — v0.2 R1 验收第四批：隧道断连误报排查 + Codex 会话源支持（IRC-003）
- 本次角色：Developer（开发工程师）
- 动作：故障排查 ×1 + 实现阶段变更 ×1
- 结论：「无匹配会话」是本地 SSH 隧道断连导致（数据未丢，重建隧道即恢复）；前端补数据库连接失败的显式错误提示；按 Owner 要求新增 Codex 会话源（只兼容 Claude Code + Codex 两种，不做通用适配层）
- 故障①：上一会话进程退出把 `ssh -L 15432` 隧道带掉 → 后端连不上 PostgreSQL → 会话列表接口 500 → 前端静默显示「无匹配会话」误导 Owner。已重建隧道（加 ServerAliveInterval 保活）；SessionSelect 现在区分「加载失败（附原因+提示检查隧道）」与「真无会话」。**遗留建议**：本地隧道可用 autossh/launchd 保活，属开发环境配置，待 Owner 决定
- 变更②（IRC-003，详见 v0.2-design.md 实现阶段变更记录）：
  - Codex 会话 `~/.codex/sessions/**/rollout-*.jsonl`（Mac 39 + 服务器 44）入库；`session_meta.cwd` 转项目目录名与 Claude Code 同构，配置零改动
  - 新增 `codex-parser.js`（TDD 4 用例）+ `claude_sessions.source` 列 + 前端 Codex 徽章
  - 补齐 config：ai/coordination 项目补 Mac 侧 `claude_project_id` 目录（此前只有服务器目录，Mac 上的 Codex/Claude 会话过滤不到）
  - 顺带修：coordination 脆弱测试期望值跟随真源更新（BCR 10→11，按测试自身注释约定）
- 故障③（同步期锁竞争）：`ensureSchema` 每请求重跑 DDL（含新增的 `ALTER TABLE ADD COLUMN source`），与同步大事务抢 `ACCESS EXCLUSIVE` 锁，导致全量同步进行时所有 HTTP 请求超时（snapshot/sessions 全 000）。修：`ensureSchema` 改为进程内只跑一次（缓存 promise，失败不缓存），DDL 不再随请求反复触发。验证：同步进行中 snapshot 稳定 200 亚秒响应
- 变更④（配置驱动过滤，Owner 明确「只有对应项目下面的对话才入库」）：早期实现把机器上所有目录全入库（Downloads/知识库/无关项目都进来了），违背项目「配置驱动、不自动扫描接入」原则。修：新增 `collectAllowedProjectIds`（从 config 展平 ecosystem + 各项目 claude_project_id 白名单）；Claude 侧发现阶段按目录过滤，Codex 侧按 cwd 转出 id 过滤，同步顺带 `DELETE <> ALL` 清理历史误入库。实测 194→116（清 78 个白名单外会话，残留 0）
- 变更④补正（Owner 二次强调「只加载当前项目目录」）：逐项目核对发现 xiaobao 白名单多塞了 `-root-Project-niuma-cheng-xiaobao-server`（服务器后端独立部署目录，非 xiaobao 项目目录，是我先前手工猜测塞的），已去掉并清理该目录 1 条会话。修正后每个项目严格只匹配「本机项目目录 + 服务器同名项目目录」两个，无衍生/无关目录
- 隧道保活：本地 `ssh -L 15432` 反复被进程退出带断，改用 `setsid nohup ssh ... ServerAliveInterval=20 ExitOnForwardFailure=yes`（独立进程组，不随会话/服务 kill 带走）
- 验证：测试 75/75 通过；5 项目逐目录核对——workflow/xiaobao/ai/coordination/workboard 各只加载本机+服务器同名项目目录，Claude+Codex 混合，白名单外零残留
- 关联迭代：v0.2
- 关联 Change Note：IRC-003
- 下一步入口：Owner 继续验收 → 修完进 Review
- 收尾状态：未收尾

## 2026-07-05 — v0.2 实现阶段 R1 完成 + Owner 验收 Bug 修复全量
- 本次角色：Developer（开发工程师）
- 动作：实现（v0.2 R1 全量）+ Bugfix（Owner 验收多轮修复）
- 设计文档：`docs/progress/iterations/v0.2-design.md`
- base_commit：e240db0
- 结论：完成 v0.2 迭代全部核心功能实现，包含后端 PostgreSQL 迁移、Claude Code 会话同步引擎、9 个 API 路由、前端项目会话视图/对话查看器/双层时间轴/映射配置；Owner 验收过程中发现的 Bug 已全部修复，包括配置异常、消息对齐、工具调用展示、会话范围、参谋长席位持久化、角色自动识别、阶段状态解析、双数据源同步等。
- 核心实现：
  - **数据库迁移（IRC-001）**：SQLite → PostgreSQL 16，`pg` 连接池，`.env` 配置管理，SSH 隧道本地开发
  - **后端解析器**：`project-index.js` 版本列表解析扩展、`iteration-record.js` 阶段门禁解析器（支持标准/非标准阶段、状态词表兼容）
  - **会话同步引擎**：`claude-sync.js` JSONL 解析 + PostgreSQL upsert、增量/全量/rebuild 三种模式、工具调用消息详情提取
  - **会话元数据**：`session-meta.js` 标题三级降级提取 + 角色自动识别（精确匹配 + 关键词打平）
  - **双数据源同步（IRC-002）**：`CLAUDE_REMOTE_SOURCES` 配置 + rsync 远程镜像 + `claude_project_id` 数组支持
  - **9 个 API 路由**：sessions 列表/详情、mappings 创建/删除/查询、timeline 版本列表/阶段详情、sync 触发、snapshot 扩展
  - **前端组件**：EcosystemView（生态根 + 参谋长席位 + SyncBar）、SubProjectView（角色卡片 + 双层时间轴）、MappingDialog（三步弹窗/子项目直接选会话）、ConversationView（消息气泡 + 工具调用标签）、StageDrawer（阶段门禁详情 + 跳对话）
- Bug 修复清单（Owner 验收全量）：
  1. 配置异常「非法的 WorkerKind」——`projects.config.json` kind 值与枚举不匹配，修正为 workflow-source/business/coordination/workboard
  2. 消息对齐方向错误——用户消息改右侧（蓝色）、Agent 消息改左侧（灰色）
  3. 工具调用消息无详情——`extractContentFromBlocks` 按工具类型提取关键参数（Bash 命令/Read 文件路径/WebSearch 查询词等），紫色 TOOL 标签展示
  4. 会话范围错误（跨项目显示）——添加 `claude_project_id` 映射，后端 API 按项目过滤
  5. 参谋长席位配置不生效——复用 `session_mappings` 表，`project_id='ecosystem-root'` + `role='chief-of-staff'` 持久化
  6. 前端引用错误——`onSessionClick` 未透传、`MessagesSquare` 图标未导入
  7. 角色前置识别缺失——`detected_role`/`role_confidence` 字段 + 同步时识别逻辑，前端改用后端识别结果
  8. 标题提取错误——`conversation_title` 字段不存在，改为 custom-title 事件 → 首条 user 消息前 50 字 → 「未命名会话」
  9. 详情接口参数名不匹配——`session_id` → `id`
  10. rebuild 重复计数——改为与 full 相同的绝对值 upsert
  11. 阶段状态解析错误——取门禁表最后一行（最新轮次）+ 状态映射补全 +「状态」列兜底 + 空表→not_started
  12. 非标准阶段误显示——`STANDARD_STAGE_NAMES` 精确匹配判定 `standard` 字段，非标准降级为灰色附加记录
  13. 时间轴前端未接入——补全 `IterationTimeline` + `StageDrawer`/`StageRow` + 阶段→角色映射
  14. 会话同步无触发点——服务启动时后台触发一次 + 顶部 SyncBar 手动触发
- 验证：后端测试 69/69 通过；force 重同步 35 会话全部 rebuild 成功；前端功能走查通过
- 关联迭代：v0.2
- 关联 Change Note：IRC-001（数据库选型变更）、IRC-002（双数据源同步）
- 下一步入口：Owner 继续验收 → 通过后进入 Review 阶段
- 收尾状态：未收尾

## 2026-07-05 — BCR 前端展示错位修复 + 多来源会话同步 Spike
- 本次角色：Developer（开发工程师）
- 动作：Bugfix ×1 + 技术预研 ×1（Owner 验收提出）
- 结论：跨项目视图 BCR 卡片错位已修复；Codex 会话同步可行（建议排期实施）、Trae CN 正文加密暂不可行（建议挂起）
- Bug：BCR 卡片右侧「目标」列 `flex-shrink-0` 不限宽，长影响范围把左列挤成零宽（摘要一字一行竖排、徽章重叠）→ 限宽 200px + 两行截断；顺带修复终态过滤——「已回流下游（终态）」带后缀导致精确匹配失效，全部终态 BCR 误入「进行中」，改包含匹配（含已拒绝）
- Spike：见 [2026-07-05-spike-multi-source-session-sync.md](../ad-hoc/2026-07-05-spike-multi-source-session-sync.md)——Codex `~/.codex/sessions` JSONL（Mac 39 / 服务器 44 个）格式已解明，映射方案与实施要点齐备；Trae CN 正文在 24MB 加密库（非明文 SQLite）无法读取，仅外围元数据可读
- 关联迭代：v0.2（Bug）；Spike 为非迭代预研
- 下一步入口：Owner 拍板 Codex 同步排期（v0.3 或并入 v0.2）；Trae 挂起
- 收尾状态：未收尾

## 2026-07-05 — 提报 BCR-011：迭代记录阶段状态标准词表 + 门禁表结构约定
- 本次角色：Developer（开发工程师）
- 动作：基线修正提案提报（跨项目协作，白名单内 BCR 登记）
- 结论：Owner 点出根因——阶段状态不统一是工作流框架层缺标准词表，非看板解析问题；已按 BCR 流程提报 coordination 基线修正提案池（BCR-011，commit `f44398a`），建议 `iteration.md` 模板定义封闭状态枚举 + 门禁区只放标准阶段三级标题
- 边界处理：coordination 工作区有 xiaobao PM 在途 REQ-003 未提交改动，用补丁精确暂存只提交 BCR-011 一行，未混入他人工作
- 历史记录处理：不回改（审计留痕）；workboard 读取侧已完成历史写法兼容，统一约束只面向今后
- 关联迭代：v0.2（触发自时间轴验收）
- 下一步入口：Owner + 参谋长评估 BCR-011
- 收尾状态：未收尾

## 2026-07-05 — v0.2 R1 验收 Bug 修复第三批：状态词表补全 + 非标准阶段降级附加记录
- 本次角色：Developer（开发工程师）
- 动作：Bugfix（Owner 验收发现 xiaobao v0.5 / ai v0.1 部署就绪检查「未知」、xiaobao v0.2 关闭迭代仍挂「Review 中」）
- 结论：状态映射补全「通过/不通过/已Review」等历史写法；非标准三级标题（如「UI 增强方向」「PRD 讨论记录」）按 Owner 拍板降级为「附加记录」——不显示状态徽章、不计入阶段进度、id 不与标准阶段撞车
- 根因：
  1. 各项目历史迭代记录的状态用词不统一（「**前端部署通过**」「端到端联调通过」「已Review」），词表未覆盖；「不通过/未通过」需在「通过」之前防误判
  2. 设计 §2.4「未知阶段兜底照常展示」规则把停放性质的记录当阶段渲染，已关闭迭代挂 Review 中误导（Owner 拍板改为附加记录降级，偏离设计兜底规则一处，随 Review 提请 Architect 知悉）
- 修复：`iteration-record.js` 词表补全 + `STANDARD_STAGE_NAMES` 精确匹配判定 `standard` 字段 + 统计/currentStage 只算标准阶段；前端 StageRow 附加记录灰色标签
- 验证：测试 69/69（本批新增 4 用例）；实测 xiaobao v0.5 六阶段全「已定稿」、ai v0.1 全「已定稿」、xiaobao v0.2 进度 3/3 且「UI 增强方向」显示灰色附加记录
- 全生态标题普查：阶段门禁下仅 7 种标准形态 + 2 个非标准记录，判定集合可控
- 关联迭代：v0.2
- 下一步入口：Owner 继续验收 → 修完进 Review
- 收尾状态：未收尾

## 2026-07-05 — v0.2 R1 验收 Bug 修复第二批：阶段状态解析 + 双数据源同步（IRC-002）
- 本次角色：Developer（开发工程师）
- 动作：Bugfix ×1 + 实现阶段变更 ×1（Owner 本机验收发现）
- 结论：迭代时间轴阶段状态解析修正（取门禁表最后一行 + 补全状态映射）；会话同步扩展为双数据源（本机 + 服务器 rsync 镜像，IRC-002）
- Bug①阶段状态解析：
  - 根因：解析器取门禁表**第一行**（旧轮次 R1）而非最后一行（最新轮次）；状态映射缺「✅/待修正/已跳过」；「部署就绪检查」表用「状态」列而非「阶段状态」列；空表（只有表头）应为未开始
  - 修复：`iteration-record.js` 取最后一行 + 映射补全（含 skipped 枚举）+「状态」列兜底 + 空表→not_started；前端补 in_progress/skipped 样式标签
  - 验证：新增 8 个解析器测试（此前该解析器无测试）；xiaobao v0.6 六阶段全部正确（已定稿/已跳过）、v0.6.1 PRD Review 中其余未开始、workboard v0.2 实现进行中
- 变更②双数据源同步（IRC-002，详见 v0.2-design.md 实现阶段变更记录）：
  - Owner 明确会话须从服务器 + 本地 Mac 两处入库；服务器实测有 74 个会话文件（含参谋长 -root-Project）
  - `.env` 配 `CLAUDE_REMOTE_SOURCES=zijie`，同步前 rsync 镜像远程 `~/.claude/projects/` 到 `data/remote-claude/`；`claude_project_id` 支持数组（双机目录名不同）；配置补齐全部项目双机映射
  - 验证：测试 65/65 通过；镜像拉取成功，远程会话已入库
- 关联迭代：v0.2
- 关联 Change Note：IRC-002
- 下一步入口：Owner 继续验收 → 修完进 Review
- 收尾状态：未收尾

## 2026-07-05 — v0.2 R1 自测 Bug 修复：会话角色前置识别缺失
- 本次角色：Developer（开发工程师）
- 动作：Bugfix（Owner 本机验收发现，实现阶段内修复）
- 结论：会话角色前置识别（设计 §4.4）已按 TDD 补实现并全量重同步验证通过；连带修复标题提取、详情接口参数名、rebuild 重复计数三个问题
- 现象：xiaobao PM 角色映射到的会话打开后是 DevOps 会话（「你是运维」），会话 ID 对不上；参谋长席位卡片误报「(会话已删除)」
- 根因（系统化排查确认）：
  1. **角色自动识别（设计 §4.4，Owner 拍板 v0.2 必做）后端未实现**——`claude_sessions` 无 `detected_role`/`role_confidence` 字段、同步时无识别逻辑；前端用标题猜角色，而标题又是坏的，永远匹配不上
  2. **标题提取不符设计 §4.3**——读了 JSONL 中不存在的 `conversation_title` 字段，fallback 成 UUID 文件名；应为 custom-title 事件 → 首条 user 消息前 50 字 → 「未命名会话」
  3. **连带**：参谋长卡片请求 `/api/sessions/details?session_id=`，后端只认 `?id=` → 永远 404 误报「会话已删除」
  4. **连带**：rebuild 模式沿用增量累加计数，force 重同步会重复累计 message_count（1206 条实为 402 条）
- 修复（TDD：先写 10 个用例转红，再实现转绿）：
  - 新增 `src/server/sync/session-meta.js`（extractTitle + detectRole，精确匹配含「你是开发/运维/产品/架构」短别名，关键词打平不硬猜返回 Unknown）+ 同名测试
  - `db.js` schema 加 `detected_role`/`role_confidence`（ALTER 兼容存量表）
  - `claude-sync.js` 同步时做前置处理；rebuild 改为与 full 相同的绝对值 upsert；增量模式仅在出现新 custom-title/此前未识别时补算
  - 前端 `EcosystemView` 改用后端 `detected_role`（删除孤儿函数 inferRoleFromTitle/ROLE_KEYWORDS）；修 `?session_id=` → `?id=`
- 验证：后端测试 55/55 通过；force 重同步 35 会话全部 rebuild 成功、UUID 标题清零；Owner 在预览中用修好的列表重新映射 PM → 「小报/产品」成功，参谋长卡片恢复正常
- 备注：R2-1（设计 §4.6 旧描述）核实已在 R1 实现期间修正，无遗留
- 关联迭代：v0.2
- 下一步入口：Owner 继续验收提 bug → 修完进 Review
- 收尾状态：未收尾

## 2026-07-05 — v0.2 实现阶段 R1 补全（时间轴钻取 + 会话同步触发）
- 本次角色：Developer（开发工程师）
- 动作：实现（补全 R1 遗漏项）
- 结论：已补全时间轴钻取、会话同步触发两处遗漏；Owner 授权连接生态根目录后，`npm test` 45/45 全部通过
- 触发方：Owner（"继续补全剩余实现，之后一起看 bug"）
- 补全前状态核查发现的 3 个遗漏（对照 `v0.2-design.md` 与实际代码）：
  1. 「双层时间轴」（US-9~13 核心功能）后端已具备（`iteration-record.js` 解析器 + `/api/timeline/versions` + `/api/timeline/detail`），但前端 `SubProjectView` 只有占位 div，完全未接入
  2. `triggerSync()` 已在 `useProjectSession.ts` 定义但全项目无任何调用点，且服务启动流程不做首次同步 —— 全新环境下 `claude_sessions` 表会一直为空，只读页面永远无会话数据
  3. 阶段钻取对话（US-14）无实现：阶段与责任角色的映射关系在前后端都不存在
- 本轮补全内容：
  - `frontend/src/app/snapshot.ts`：新增 `TimelineVersion` / `TimelineStage` 及两个响应类型
  - `frontend/src/app/useProjectSession.ts`：新增 `useTimelineVersions` / `useTimelineDetail` hook
  - `frontend/src/app/components/EcosystemView.tsx`：新增 `IterationTimeline`（版本总览轴）+ `StageDrawer`/`StageRow`（阶段门禁详情，含 `STAGE_ROLE_MAP` 阶段→角色映射，支持点击已映射阶段直接跳对话）；替换 `SubProjectView` 内占位 div；新增 `SyncBar`（手动触发 `POST /api/sync` 并展示结果，挂在生态根视图顶部）
  - `src/server/index.js`：服务启动时后台触发一次 `syncAllSessions()`（fire-and-forget，数据库不可达只记日志不阻塞启动/不影响只读 API）
- 已知简化未做（记录以免误判为疏漏）：30 秒定时增量同步（设计 §4.2）未实现，当前只有「启动时一次」+「手动按钮」两种触发方式；`react-markdown` 渲染未接入，对话仍是纯文本展示
- 自测：初次 `npm test` 45 个用例 41 通过，4 个失败排查后分两类：
  1. `roles.test.js`（读本项目真实 `docs/progress/roles/`）：最新一条 Developer 日志段落缺「结论」字段，`parseRoleLog` 只认 `- 结论：` 这一 key，导致 `recentAction` 解析为空 —— 已给最新日志段补上「结论」字段
  2. `project-index.test.js`（读本项目真实 INDEX.md）+ `coordination.test.js`（读 `niuma-cheng-coordination` 真实仓）：断言写死在 v0.1 时期/BCR 只有 2 条时的旧状态，随迭代推进和 coordination 仓演进（当前 v0.2、BCR 已到 10 条）已经过期 —— 按当前真实内容同步更新断言
  3. `coordination.test.js` + `workflow-source.test.js` 另需要 `agent-workflow`、`niuma-cheng-coordination` 两个兄弟仓库；Owner 授权连接生态根目录 `niuma-cheng` 后可读到，问题解除
- 最终：`npm test` 45/45 全部通过
- 前端构建：本次会话的 Linux 沙箱内 `frontend/node_modules` 是从 Owner Mac 直接挂载的 macOS 原生二进制（rollup/esbuild 均为 darwin-arm64），沙箱内无法执行 `npm run build` 验证（`Exec format error`），只能靠代码走查确认；请 Owner 在本机跑一次 `npm --prefix frontend run build` 或 `npm run dev` 确认无编译错误
- 关联迭代：v0.2
- 关联 Change Note：无
- 下一步入口：Owner 本机验证构建 + 过一遍新的时间轴/同步交互 → 与 Owner 一起排查本机发现的 bug，进入本轮修复
- 收尾状态：未收尾

## 2026-07-05 — IRC-001 数据库选型变更 SQLite → PostgreSQL
- 本次角色：Developer（开发工程师）
- 动作：实现阶段变更（Change Note IRC-001）
- 触发方：Owner（服务器已安装 PostgreSQL 16，不应另装 SQLite）
- 变更内容：
  - 驱动：`better-sqlite3`（同步 API）→ `pg`（异步连接池）
  - 存储：`data/workboard.db`（本地文件）→ PostgreSQL `workboard` 库（服务器端）
  - 连接配置：新建 `.env` 文件管理 `PG_HOST/PG_PORT/PG_USER/PG_PASSWORD/PG_DATABASE`（已加入 .gitignore）
  - 本地开发：SSH 隧道 `localhost:15432` → 服务器 5432
  - 服务器部署：直连 `localhost:5432`（.env 改 PG_PORT 即可）
- 影响文件：`src/server/db.js`（重写）、`src/server/sync/claude-sync.js`（重写）、`src/server/index.js`（重写 API handler）、`package.json`（换依赖）、`.gitignore`（加 .env 和 data/）、`.env`（新建）
- 数据库初始化：已在服务器 PostgreSQL 创建 `workboard` 库 + 3 张表（claude_sessions / claude_messages / session_mappings）+ 索引
- 自测结果：同步 34 个会话、12024 条消息成功入库；`/api/sessions` 和 `/api/snapshot` 返回正常
- 关联迭代：v0.2
- 关联 Change Note：IRC-001
- 受影响角色：Developer（已完成代码适配）、DevOps（部署时需按新配置落地）
- 下一步入口：DevOps 部署时按 PostgreSQL 配置；归档随 v0.2 收尾
- 收尾状态：未收尾

## 2026-07-05 — v0.2 实现阶段 R1（进行中）
- 本次角色：Developer（开发工程师）
- 动作：实现（v0.2 R1）
- 设计文档：`docs/progress/iterations/v0.2-design.md`
- base_commit：e240db0
- 实现范围：
  - 后端：PostgreSQL 连接池初始化（db.js + .env + ensureSchema）【IRC-001 变更后】
  - 后端：project-index 版本列表解析扩展 + iteration-record 阶段门禁解析器
  - 后端：Claude Code 会话同步引擎（claude-sync.js + JSONL 解析，PostgreSQL 版）
  - 后端：9 个 API 路由（sessions 2 + mappings 3 + timeline 2 + sync 1 + snapshot 扩展）
  - 后端：config 扩展（level/ecosystem 校验）+ snapshot 扩展（lastSyncedAt/syncStatus）
  - 前端：App.tsx 项目会话视图入口 + useProjectSession hook + 类型扩展
  - 前端：EcosystemView + SubProjectView + MappingDialog
  - 前端：ConversationView + TimelineBar + StageDrawer
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：IRC-001（数据库选型变更 SQLite → PostgreSQL）
- 下一步入口：完成实现 → 自测 → Owner 验收
- 收尾状态：未收尾

## 2026-07-05 — v0.2 设计文档 R2 复审
- 本次角色：Developer（开发工程师）
- 动作：Review（设计文档 R2 复审）
- 涉及文档：`docs/progress/iterations/v0.2-design.md`、`docs/progress/iterations/v0.2.md`、`docs/progress/INDEX.md`
- 结论：**通过**。Architect 已修正 R1 补充复审的全部高严重度和中严重度问题：DR-1 时间轴解析策略三重不匹配 ✅、DR-2 阶段状态映射缺失 ✅、DR-4 阶段映射表不完整 ✅、DR-3/P-2 缺同步触发接口 ✅、P-1 缺取消映射接口 ✅。发现 1 个中低严重度文档一致性问题（§4.6 流程描述仍是旧的「Review 状态」），实现阶段顺手修正即可，不阻塞通过。
- 文档一致性遗留：R2-1 §4.6 第 5b 步仍为旧描述（中低）
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：无
- 下一步入口：Developer 进入实现阶段（按设计文档 §1 目录扩展结构落地）
- 收尾状态：未收尾

## 2026-07-05 — v0.2 设计文档 R1 Review（补充复审）
- 本次角色：Developer（开发工程师）
- 动作：Review（设计文档 R1 补充复审）
- 涉及文档：`docs/progress/iterations/v0.2-design.md`、`docs/progress/iterations/v0.2.md`、`docs/progress/INDEX.md`
- 结论：**不通过**。原 R1 Developer Review 结论为通过，但独立复审发现 1 个高严重度阻塞——迭代时间轴第二层解析策略（§2.4）与实际迭代记录文件结构三重不匹配：①二级标题名不匹配（「阶段门禁」vs「Review 状态」）；②阶段名位置不匹配（三级标题 vs 假设在表格中）；③表格结构不统一（不同阶段列数不同）。按设计文档实现会导致 US-9~13 时间轴功能完全无法工作。
- 阻塞项：DR-1 时间轴解析策略三重不匹配（高）
- 中严重度问题：DR-2 阶段状态映射规则缺失、DR-3 同意 PM P-2 刷新缺同步触发接口、DR-4 阶段映射表不完整
- 已给出 DR-1 修正建议（5 点解析策略修正方案）
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：无
- 下一步入口：Architect 修正 §2.4 解析策略 → Developer R2 复审 → 通过后进入实现阶段
- 收尾状态：未收尾

## 2026-07-05 — v0.2 PRD R2 复审
- 本次角色：Developer（开发工程师）
- 动作：Review（R2 复审）
- 涉及文档：`docs/progress/iterations/v0.2-prd.md`、`docs/progress/INDEX.md`
- 结论：**通过**。R1 的两项阻塞项均已解除——Spike-001 验证 Claude Code 会话数据读取完全可行（JSONL 格式，~/.claude/projects/，34 个会话、3976 条用户消息），§6.4 定义了产出内容摘要三级降级策略。新增的 §6.3 会话缓存设计、§6.5 生产数据源同步、US-15/16/17 均工程可行。PRD 可进入设计阶段。
- 设计阶段需细化的问题（非阻塞）：claude_messages.content 提取规则、last_byte_pos 边界处理、SQLite 驱动选型、后端 API 规范、Markdown 渲染方案、前端状态管理范围、角色自动识别工程价值评估
- 文档质量问题（建议 PM 清理）：§7 重复条目、§5 过时「需调研」标注
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：无
- 下一步入口：Architect 进行 R2 复审 → 通过后 Owner 确认 PRD 定稿 → 进入设计阶段
- 收尾状态：未收尾

## 2026-07-05 — v0.2 PRD R1 Review（结论修订）
- 本次角色：Developer（开发工程师）
- 动作：Review（结论修订）
- 涉及文档：`docs/progress/iterations/v0.2-prd.md`、`docs/progress/INDEX.md`
- 结论：**将原「通过带高风险」修订为「不通过」**。原判断错误——把「技术可行性待验证」当成了「可以通过、设计阶段再处理」，但实际上 Claude Code 会话数据读取是两大核心功能的数据基石，在确认可行或有明确降级方案之前，PRD 不能算定稿，进入设计阶段会反复返工。修正后：2 项阻塞（Claude Code 会话读取未验证、产出内容摘要提取规则未定义），其余为设计阶段需明确的非阻塞问题。
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险（阻塞项）：
  1. Claude Code 会话列表/对话内容读取方式未验证（高，核心阻塞）
  2. 迭代时间轴产出内容摘要提取规则未定义（中高，设计阶段前置）
- 非阻塞但设计阶段须明确：SQLite 选型、后端 API 规范、Markdown 渲染方案、前端状态管理范围、三步弹窗交互状态
- 下一步入口：先做 Claude Code 会话读取技术预研 + 与 PM 对齐摘要最低形态 → 解决阻塞项后启动 R2 Review
- 收尾状态：未收尾

## 2026-06-24 — 测试环境部署（运维任务，Owner 授权）
- 本次角色：Developer（测试环境部署经 Owner 授权兼做；生产部署仍归运维）
- 动作：部署 + 收尾
- 涉及产出：`/etc/systemd/system/workboard-api-test.service`、`/etc/nginx/sites-available/workboard-test.huiyiyou.cloud`、通配符证书 `*.huiyiyou.cloud`（certbot-dns-aliyun）、`src/server/index.js`（HOST 支持，commit `3df4809`）、`docs/knowledge/devops/workboard-test-deployment.md`、进度文档收尾
- 结论：完成 workboard v0.1 测试环境部署并验证通过。后端 systemd 持久化 + 开机自启（绑 127.0.0.1:5180），前端 nginx serve dist，通配符证书自动续期。**关键约束**：公司（吉利研究院）上网行为管理拦 80/443 的未分类网站，改走**非标端口 8088 HTTPS**，Owner 公司网络实测 `https://115.191.43.79:8088` 可访问。部署手册已沉淀知识库。
- 关联迭代：v0.1
- 关联非迭代工作：测试环境部署
- 关联 Change Note：无
- 遗留问题/风险：阿里云 AccessKey 曾在对话明文出现，待 Owner 轮换（轮换后更新 `/etc/letsencrypt/aliyun.ini`）；生产部署待运维；`npm install` 2 个 high 漏洞（recharts 链路）与 3 个 drawer-skeleton 死代码仍待后续清理。
- 下一步入口：Owner 跟测试沟通手动验收 → 通过后运维部署生产。
- 收尾状态：已收尾

## 2026-06-23 — 实现阶段 R1
- 本次角色：Developer（开发工程师）
- 动作：实现
- 涉及产出：`package.json`、`src/server/`（index/config/errors/snapshot + parsers：markdown-table/project-index/roles/coordination/workflow-source/project-match）及各 `*.test.js`；`frontend/`（package.json npm 化、`src/app/snapshot.ts` 数据层、`App.tsx` 接入真实数据）；`docs/progress/iterations/v0.1.md`、`docs/progress/INDEX.md`
- 结论：完成 v0.1 只读看板 MVP 实现 R1。后端本地 Node 聚合服务（`/api/snapshot` 按 kind 解析 + 项目级/区域级错误隔离 + 根配置不可读才 500）；前端接入 `useSnapshot`（按 `refreshIntervalSeconds` 轮询、Drawer 用 id 保持、loading/error 态、部署页 url 灰显、coordination 不进卡网格）。`npm test` 45/45 通过；前端 `vite build` 通过；Playwright 端到端工作台/接入诊断/跨项目/部署四视图均真实数据渲染、零控制台错误。已落实设计 R1 Review 三项中风险：首启提示页、`SnapshotError` 字段固定（code/message/severity/sourcePath/rawExcerpt）、解析器 fixture 取真实文件 + 非法配置「整批失败 vs 配置级降级」边界各有断言。
- 关联迭代：v0.1
- 关联非迭代工作：无
- 关联 Change Note：无
- 提交：实现 R1 已 commit `b5b18d9`（base `2016cee`）；经 Owner 确认 Review 方为 Tester 为主 + Developer 自检（已完成）。
- 遗留问题/风险：`npm install` 报 2 个 high 漏洞（recharts 链路），后续评估；三个 drawer-skeleton 函数因取消假 loading 成为暂未调用的死代码，待清理。
- 下一步入口：Owner 切到 Tester 角色进入测试阶段验收。
- 收尾状态：未收尾

## 2026-06-23 — 设计 R1 Review
- 本次角色：Developer（开发工程师）
- 动作：Review
- 涉及文档：`docs/progress/iterations/v0.1-design.md`、`docs/progress/iterations/v0.1.md`、`docs/progress/INDEX.md`
- 结论：完成 v0.1 设计文档 R1 Developer Review，结论为通过，带中风险进入实现阶段处理；设计阶段仍待 Tester Review。
- 关联迭代：v0.1
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险：实现阶段需明确首次启动体验，真实 Markdown fixture 覆盖解析器测试，并整理 `frontend` 的 React / ReactDOM 运行依赖。
- 下一步入口：Owner 切到 Tester 角色 Review `docs/progress/iterations/v0.1-design.md`；Tester 通过后进入实现阶段。
- 收尾状态：未收尾

## 2026-06-23 — PRD R1 Review
- 本次角色：Developer（开发工程师）
- 动作：Review
- 涉及文档：`docs/progress/iterations/v0.1-prd.md`、`docs/progress/iterations/v0.1.md`、`docs/progress/INDEX.md`
- 结论：完成 v0.1 PRD R1 Developer Review，结论为通过，带中风险后置到设计 / 实现阶段处理；PRD 已同步为已定稿。
- 关联迭代：v0.1
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险：需在设计 / 实现阶段明确根目录启动方式、后端 API、`projects.config.json` schema、Markdown 解析失败契约，以及前端 React 运行依赖整理。
- 下一步入口：切到 Architect 角色创建 v0.1 设计文档，明确后端 API、配置 schema、Markdown 解析契约、轮询与错误隔离。
- 收尾状态：未收尾

## 2026-06-23 — 会话摘要
- 本次角色：Developer（开发工程师）
- 动作：Review
- 涉及文档：`docs/progress/iterations/v0.1-ui.md`、`docs/progress/iterations/v0.1.md`、`docs/progress/INDEX.md`
- 结论：完成 v0.1 UI 方案 R1 Developer Review，结论为通过；遗留中风险需在设计/实现阶段处理。
- 关联迭代：v0.1
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险：项目当前背景记录第一版前端为静态 HTML/CSS/JavaScript，但 UI 方案采用 shadcn/Radix/Tailwind 组件体系；实现前需明确是切换 React/shadcn 脚手架，还是仅按 shadcn 视觉用静态实现。
- 下一步入口：Owner 出原型图；随后 PM 回填 `v0.1-prd.md`，再进入设计阶段明确数据模型、状态枚举、轮询策略和前端技术栈。
- 收尾状态：未收尾
