# DevOps 角色日志

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
