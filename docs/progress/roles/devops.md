# DevOps 角色日志

## 2026-07-20 — 会话摘要
- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.3 部署就绪检查 + 生产部署（Owner 授权「你是运维」触发）
- 涉及文档：`docs/progress/iterations/v0.3.md`（部署就绪检查表两行）、`docs/progress/INDEX.md`、`docs/knowledge/devops/workboard-test-deployment.md`（§8 订正 OPS-5 + 补迁移/error_page 纪律）；生产服务器 `zijie`
- 结论：**✅ 已部署生产（`b01fe25`），待 Owner 生产验收**。就绪检查全绿；备份闭环（代码 tar + `session_mappings` 6 行 + 整库 13M + nginx conf，存 `/opt/workboard-prod/backup/v0.3-20260719-154503`）；`git pull ad9b706..b01fe25` 快进 + 新前端依赖 install + build；`cp -a src/server/.` 递归（OPS-5 未踩）；`.env`/config 时间戳未变。
- 迁移实况：**触发点关键教训**——`applyMigrations` 只在 `/api/sessions` 族触发，`/api/health`/`/api/snapshot` **不触发**（首次误用 snapshot 触发失败，读码定位后改 sessions 成功）。`schema_migrations=1,2`、`manual_role` 建列、6 行迁移、`session_mappings` DROP；**chief-of-staff 悬垂值清理**（v0.3 删该枚举，方案A `UPDATE 1`→5 行，Owner 定）；DEV-M1 sync 后表不复活 ✅。
- 验证：US-5 迭代标签生产有值（v0.1×12/v0.2×7/v0.6×6=.git 可读实证）；resolved_role 分布健康；US-9 error_page 受控停后端实测 502→`50x.html` 兜底、`internal` 直接访问 404。
- 关联迭代：v0.3
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险：health `version` 仍 `0.2.0`（`package.json` 未 bump，纯标签，建议 Developer 后续 bump `0.3.0` + systemd unit 描述更新 v0.3）；公司网络对 IP/域名 80/443 有拦截历史，Owner 须从真实网络验收。
- 下一步入口：Owner 从真实网络验收 `https://115.191.43.79` + 域名；通过 → 迭代关闭检查。回滚预案见 `v0.3.md` 部署就绪检查表。
- 收尾状态：已收尾

## 2026-07-19 — 会话摘要
- 本次角色：DevOps（运维/部署工程师）
- 动作：实现阶段 R1~R5 Review（被指定第二 Review 方，冷启动独立会话，产出方不自审）
- 涉及文档：`docs/progress/iterations/v0.3.md`（追加「实现阶段 R1~R5 · DevOps Review」+ 门禁 Review 结果/阶段状态）、`docs/progress/INDEX.md`（当前状态/下一步/版本列表）；核对 `src/server/migrations.js`、`migrations/002_session_role_model.sql`、`src/server/db.js`（runSchemaDDL）、`src/server/parsers/iteration-history.js`、`frontend/public/50x.html`、`frontend/package.json`、`frontend/src/app/App.tsx`
- 结论：**✅ 通过**（部署侧五焦点逐项读码核实，可安全发布，无阻塞）。§6.0 迁移引擎已改整文件 `client.query`+外层事务、`splitSqlStatements` 已删 → `002` DROP 单事务原子；`runSchemaDDL` 已删 session_mappings 建表段（DROP 不复活）；`50x.html` 自包含、构建进 dist；新依赖 `react-markdown`+`remark-gfm` 前端侧、后端无新增。Architect 2026-07-19 已覆盖正确性/安全边界，本 Review 互补只审部署。
- 新发现 **OPS-5（中·发布流程）**：部署手册 §8 复制步骤 `cp -a src/server/*.js` 会**漏 `migrations/002.sql`** → 生产不跑 002 → `manual_role` 缺列 → `COALESCE` 查询 500。部署须 `cp -a src/server/.` 递归 + 订正手册。已把 8 项部署就绪检查清单预登记进 `v0.3.md`（pg_dump 闸口 / 生产库非 dev / 递归复制 / 前端 install+build / nginx error_page / config 真实克隆路径 / 部署后健康+sync 复查 / 回滚）。
- 关联迭代：v0.3
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险：OPS-1~5 均落部署就绪检查；生产 .git 可读性/nginx error_page/生产 .env 库/config 路径实证留部署阶段（本次为实现 Review，未 SSH 生产）。
- 下一步入口：两方实现 Review ✅ → 进部署就绪检查 → Owner 新开会话「你是 DevOps」执行生产部署（按清单）→ 生产复验 → Owner 验收。
- 收尾状态：已收尾

## 2026-07-18 — 会话摘要
- 本次角色：DevOps（运维/部署工程师）
- 动作：设计阶段 R1 Review（被指定第二 Review 方，冷启动独立会话）
- 涉及文档：`docs/progress/iterations/v0.3-design.md`（追加 R1·DevOps Review 记录 + Review 状态表）、`docs/progress/iterations/v0.3.md`（设计阶段门禁 Review 结果）、`docs/progress/INDEX.md`（当前状态/下一步/版本列表）；核对 `src/server/migrations.js`、`migrations/001_init.sql`、`src/server/index.js`、`projects.config.json`、`docs/knowledge/devops/workboard-test-deployment.md`、`2026-07-07-ops-ip8088-repoint-prod.md`
- 结论：**✅ 通过**（无阻塞高严重度问题）。三点范围逐项核实：① 生产 .git 可读性——降级路径健壮（不可读→标签 null 不崩），生产 `/root/Project/niuma-cheng-*` 真实克隆 root 可读，前提成立，部署就绪检查阶段正式复核；② `002` DROP 风险——DB 确为 PostgreSQL（`pg_dump` 回滚适用）、迁移事务原子（无半迁移态），补齐设计点名要的回滚策略；③ US-9 nginx 错误页——可实现、规格待部署阶段补。
- 问题：OPS-1（中·`002` 惰性自动应用无备份闸口，`pg_dump` 须定为 restart 前强制步骤）、OPS-2（中·生产自监控 .git 路径须指真实克隆非 `/opt/workboard-prod/app`）、OPS-3（低·US-9 错误页规格缺失 + 生产 nginx 疑缺 SPA fallback，落地前核实）、OPS-4（低·git dubious-ownership 备查）；均不阻塞定稿，落部署就绪检查/实现阶段。交叉印证 Developer DEV-M1「DROP 后 sync 复活空表」有部署可观测性，部署检查将加「迁移后 sync 复查表不存在」一条。
- 关联迭代：v0.3
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险：OPS-1~4 待部署就绪检查/实现阶段落；生产 .git 实测复核留部署就绪检查（本 R1 为设计审查，未 SSH 实测生产）。
- 下一步入口：Owner 新开会话「你是 Architect」判断是否进「修改中」订正 §6（DEV-M1），再定稿进实现阶段。
- 收尾状态：已收尾

## 2026-07-07 — 会话摘要（其四）
- 本次角色：DevOps（运维/部署工程师）
- 动作：Bugfix 生产重新部署（二次）— 对话查看器三层背景修正
- 涉及文档：`docs/progress/ad-hoc/2026-07-07-bugfix-conversation-view-background.md`；生产前端目录 `/var/www/workboard.huiyiyou.cloud`、生产应用目录 `/opt/workboard-prod/app/frontend/dist`
- 结论：✅ 完成。Owner 反馈上一轮部署后视觉变化不明显，明确需要“左右外侧背景 / 中央对话框背景 / 消息气泡颜色”三层区分。Developer 已提交 `66a57abc5853471350cb5e3734dc469b4cf655fd`，本次发布该 commit 的前端静态产物：`index-GHNacrce.js` / `index-DkTN59Sp.css`。生产 index 已确认引用新资产；`https://115.191.43.79/api/health` 返回 `0.2.0 / db ok / migrations ok`；`https://115.191.43.79/` 返回新前端产物；`http://115.191.43.79/` 301 到 HTTPS。本次仅静态前端变更，未重启后端。
- 关联迭代：v0.2（已关闭后的非迭代 Bugfix 发布）
- 关联非迭代工作：2026-07-07-bugfix-conversation-view-background
- 遗留问题/风险：仍需 Owner 从真实浏览器强制刷新后验收三层背景；若浏览器缓存旧 JS/CSS，可硬刷新或开无痕窗口确认。
- 下一步入口：Owner 验收 `https://115.191.43.79`。
- 收尾状态：已完成（记录待入库）

## 2026-07-07 — 会话摘要（其三）
- 本次角色：DevOps（运维/部署工程师）
- 动作：Bugfix 生产重新部署 — 对话查看器背景层级 + 手动同步刷新
- 涉及文档：`docs/progress/ad-hoc/2026-07-07-bugfix-conversation-view-background.md`、`docs/progress/INDEX.md`；生产目录 `/opt/workboard-prod/app`、前端目录 `/var/www/workboard.huiyiyou.cloud`
- 结论：✅ 完成。`HEAD` 与 `origin/main` 均为 `3d77d8ce155164956340c723a06ef7abcd193bd8`；仅文档存在未提交变更，运行时代码干净。前端构建通过并部署新产物 `index-BWMQooTp.js` / `index-tJaKjMQO.css`；同步相关 3 个后端测试通过；全量 `npm test` 78/80，失败项为已知真实数据耦合假失败。生产 API 重启后 active，健康检查 `0.2.0 / db ok / migrations ok`；`https://115.191.43.79/` 命中新前端，`POST /api/sync` 成功，`/api/snapshot` 显示 `syncStatus.status=synced`、`sessionCount=207`。
- 关联迭代：v0.2（已关闭后的非迭代 Bugfix 发布）
- 关联非迭代工作：2026-07-07-bugfix-conversation-view-background
- 遗留问题/风险：仍需 Owner 从真实网络验收 UI 背景层级和手动同步刷新体验；`npm test` 两个真实数据耦合失败继续归 Developer 待办。
- 下一步入口：Owner 验收 `https://115.191.43.79`。
- 收尾状态：已完成（记录已入库）

## 2026-07-07 — 会话摘要（其二）
- 本次角色：DevOps（运维/部署工程师）
- 动作：Ops Task — IP 直连生产 + v0.2 重新部署
- 涉及文档：`docs/progress/ad-hoc/2026-07-07-ops-ip8088-repoint-prod.md`、`docs/progress/INDEX.md`、`docs/knowledge/devops/workboard-test-deployment.md`；系统配置 nginx（workboard / workboard-test / test.huiyiyou.cloud）、生产目录 `/opt/workboard-prod/app`
- 结论：✅ 完成。按 Owner 分三次追加的最终意图，`https://115.191.43.79`（IP:443 无端口）直连生产 v0.2；IP:80 → 301 跳生产；停用 8088；IP:443/80 原先能摸到测试/小报测试的后门已堵（default_server 归生产 + 小报测试 IP:80 块改跳转），非生产一律仅域名访问；保留生产+测试两套环境；清理暴露公网的孤儿进程 `0.0.0.0:5174`。v0.2 幂等重建（main 未变），健康 `0.2.0 / db ok / migrations ok`。发现开发目录首次缺 `node_modules`（pg 缺失致 2 个测试假失败），`npm install` 修复。
- 关联迭代：v0.2（部署侧，非迭代 Ops Task）
- 关联非迭代工作：2026-07-07-ops-ip8088-repoint-prod
- 遗留问题/风险：**待 Owner 从公司网络实测 `https://115.191.43.79`**——历史约束是公司网络拦 80/443，若仍拦需立即回滚恢复 8088（回滚 diff 已备）；`coordination.test.js` 读真实仓断言漂移转 Developer；部署手册补根目录 `npm install`。
- 下一步入口：Owner 实测 IP:443；通过则收尾，失败则回滚 8088。
- 收尾状态：已完成（记录已入库）

## 2026-07-07 — 会话摘要
- 本次角色：DevOps（运维/部署工程师）
- 动作：实现 Review（R2-3 最终复核，DH-2 修复确认）
- 涉及文档：`docs/progress/iterations/v0.2.md`、`src/server/migrations.js`、`src/server/migrations/001_init.sql`、`.env.example`
- 结论：✅ 通过。DH-1（.env.example）、DH-2（版本化迁移机制）全部修复完成；迁移机制已部署到生产环境，健康检查返回 `{"status":"ok","db":"ok","migrations":"ok","version":"0.2.0"}`；`schema_migrations` 表已登记版本 1；测试 80/80 通过。
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：IRC-001、IRC-002、IRC-003
- 遗留问题/风险：无阻塞项；DM-3（git 同步脚本）归 DevOps 部署阶段；DH-2 已完成，从 v0.3 待办移除。
- 下一步入口：收尾归档完成 → Owner 确认 → 迭代关闭。
- 收尾状态：已完成

## 2026-07-06 — 会话摘要
- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.2 生产部署
- 涉及文档：`docs/progress/iterations/v0.2.md`、`docs/progress/INDEX.md`、`docs/knowledge/devops/workboard-test-deployment.md`、`.env.example`
- 结论：v0.2 生产环境部署完成。后端 systemd `workboard-api-prod`（v0.2，绑定 `127.0.0.1:5181`，enabled + active）；PostgreSQL 16 配置完成（`workboard` 数据库 + `postgres` 用户密码认证）；生产 `.env` 配置完成（PG_HOST=localhost, PG_PORT=5432）；前端 `/var/www/workboard.huiyiyou.cloud` 更新为 v0.2 构建产物；本机 API `/api/health` 返回 `{"status":"ok","db":"ok","version":"0.2.0"}`；本机 SNI HTTPS `https://workboard.huiyiyou.cloud/api/health` 返回 200；服务内存 105MB（会话同步正常）。
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：IRC-001（PostgreSQL 选型）、IRC-002（双数据源同步）、IRC-003（Codex 会话源兼容）
- 遗留问题/风险：需 Owner 从真实网络实测 `https://workboard.huiyiyou.cloud`；DM-3（git 同步脚本）待部署阶段落地；DH-2（版本化迁移机制）已登记 v0.3 待办。
- 下一步入口：Owner 实测生产环境；通过后执行 v0.2 迭代关闭检查。
- 收尾状态：未收尾

## 2026-07-06 — 会话摘要
- 本次角色：DevOps（运维/部署工程师）
- 动作：实现 Review（R2-2 复核）
- 涉及文档：`docs/progress/iterations/v0.2.md`、`.env.example`、`package.json`、`src/server/index.js`
- 结论：✅ 通过。DH-1（.env.example）、DM-4（版本号）、DM-5（健康端点）已修复；DH-2（迁移机制）经 Owner 拍板延后 v0.3（YAGNI）；DM-2（同步就绪门控）延后；DM-3（git 同步脚本）归 DevOps 部署阶段。部署就绪检查前置条件已满足。
- 关联迭代：v0.2
- 关联非迭代工作：无
- 关联 Change Note：IRC-001、IRC-002、IRC-003
- 遗留问题/风险：无阻塞项；DH-2 已登记 v0.3 待办；DM-3 将在部署阶段落地。
- 下一步入口：进入部署就绪检查阶段 → DevOps 执行部署检查清单 → Owner 验收 → 迭代关闭检查。
- 收尾状态：未收尾

## 2026-06-24 — 会话摘要
- 本次角色：DevOps（运维/部署工程师）
- 动作：部署
- 涉及文档：`docs/progress/iterations/v0.1.md`、`docs/progress/INDEX.md`、`docs/knowledge/devops/workboard-test-deployment.md`
- 结论：v0.1 生产环境已按 Owner 确认域名 `workboard.huiyiyou.cloud` 重新部署，并完成开发/生产隔离。错误的 `8089` / IP 入口和开发目录软链已撤回；后端 systemd `workboard-api-prod` 绑定 `127.0.0.1:5181` 并已 enabled + active，`WorkingDirectory=/opt/workboard-prod/app`；nginx 仅按域名监听 443；生产前端为 `/var/www/workboard.huiyiyou.cloud` 独立目录；生产后端代码、配置与 dist 均在 `/opt/workboard-prod/app`；本机 API 与本机 SNI HTTPS 入口均返回 200。
- 关联迭代：v0.1
- 关联非迭代工作：无
- 关联 Change Note：无
- 遗留问题/风险：需 Owner 配置 / 确认 `workboard.huiyiyou.cloud` DNS 指向本机后，从真实网络实测域名入口。
- 下一步入口：Owner 实测 `https://workboard.huiyiyou.cloud`；通过后执行 v0.1 迭代关闭检查。
- 收尾状态：已收尾
