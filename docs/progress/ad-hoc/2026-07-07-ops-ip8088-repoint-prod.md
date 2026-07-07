# Ops Task · IP 直连生产 + v0.2 重新部署（2026-07-07）

- 模式：Ops Task / 运维任务
- 执行角色：DevOps
- 状态：✅ 已完成（待 Owner 从公司网络实测确认 IP:443 可达）
- 关联：v0.2 生产（`workboard.huiyiyou.cloud` / `127.0.0.1:5181`）

## 任务（Owner 分三次追加，最终意图）

1. 拉取最新代码，重新部署生产。
2. 我的 IP 访问改指生产地址，之前的删除掉。
3. IP 只能有一个是生产的，其它都不能用该 IP 访问，只能域名访问。
4. 不要非标端口（8088），直接用 IP 地址访问。

→ **最终目标**：`https://115.191.43.79`（IP:443，无端口）直连生产 v0.2；IP 上不再暴露任何非生产内容；测试等一律仅域名访问；停用 8088。

## 现状盘点（动手前）

- 生产 `workboard-api-prod`（v0.2，`127.0.0.1:5181`）正常，但生产 nginx 原先只监听 443、`server_name` 仅域名，公司网络访问不了。
- `https://115.191.43.79:8088` 当时指向**测试环境 v0.1**（`workboard-test` → 反代 5180）。
- **IP:443** 落到 443 的 `default_server`＝`workboard-test`（v0.1）→ IP 能看到测试。
- **IP:80** 有 `listen 80 default_server; server_name 115.191.43.79;`（在 `test.huiyiyou.cloud` 文件，小报测试临时块）→ IP:80 能看到小报测试前端。
- **孤儿 node 进程**（非 systemd，PPID=1），cwd `/opt/workboard-prod/app`，监听 `0.0.0.0:5174` 暴露公网，历史手动 `npm start` 遗留。
- `git`：`main` = `cd26580`，已最新，无新提交 →「重新部署」为幂等重建。

## 发现并处理的环境问题

- 开发目录**首次无 `node_modules`**（从未 `npm install`），`pg`（v0.2 新依赖）缺失 → `npm test` 中 `index.test.js` / `claude-sync.test.js` import `db.js` 找不到 `pg` 整文件失败。`npm install`（14 包）后恢复。**非代码回归。**
- 部署手册第 4 节只写 `npm --prefix frontend install`，漏了根目录后端 `npm install` → 文档缺口，已登记待办。

## 动作与命令摘要

### A. 重新部署生产 v0.2

```bash
npm install                       # 补齐后端依赖（pg 等）
npm test                          # 80 tests / 79 pass / 1 fail（见遗留，非阻塞）
npm run build                     # → frontend/dist（index-Bme-eYzf.js）
cp -a src/server/. /opt/workboard-prod/app/src/server/   # 递归，含 migrations/ sync/
cp -a package.json /opt/workboard-prod/app/package.json
rm -rf /opt/workboard-prod/app/frontend/dist
cp -a frontend/dist /opt/workboard-prod/app/frontend/
cp -a frontend/dist/. /var/www/workboard.huiyiyou.cloud/
systemctl restart workboard-api-prod.service
```

> 未触碰生产专属文件：`.env`、`projects.config.json`、`node_modules`（时间戳核对未变）。
> 手册旧复制步骤 `cp src/server/*.js` 不递归会漏 v0.2 的 `migrations/`、`sync/`，改用 `cp -a src/server/.`。

### B. nginx —— IP 直连生产、堵掉所有非生产 IP 入口

生产站点 `workboard.huiyiyou.cloud`（接管 443 default，去掉 8088）：

```diff
-   listen 443 ssl;
-   listen 8088 ssl default_server;
+   listen 443 ssl default_server;
    server_name workboard.huiyiyou.cloud 115.191.43.79;
```

测试站点 `workboard-test.huiyiyou.cloud`（让出 443 default，仅域名）：

```diff
-   listen 443 ssl default_server;
+   listen 443 ssl;
-   server_name workboard-test.huiyiyou.cloud _;
+   server_name workboard-test.huiyiyou.cloud;
```

小报测试文件 `test.huiyiyou.cloud` 里的 IP:80 default 块（原 serve 小报测试前端）→ 改为 IP:80 跳转 HTTPS：

```nginx
server {
    listen 80 default_server;
    server_name 115.191.43.79;
    return 301 https://$host$request_uri;
}
```

```bash
nginx -t && systemctl reload nginx
```

### C. 清理孤儿公网进程

```bash
kill 3576789        # 0.0.0.0:5174 游离 node，非 systemd，kill 后不被拉起
```

## 验证证据（配置稳定后复测；首次因 reload 优雅重载旧 worker 有时序假象，已排除）

| 入口 | 结果 |
|------|------|
| `https://115.191.43.79/api/health`（IP:443） | `{"status":"ok","db":"ok","migrations":"ok","version":"0.2.0"}` |
| `https://115.191.43.79/`（IP:443 首页产物） | `index-Bme-eYzf.js`＝本次构建（生产） |
| `http://115.191.43.79/`（IP:80） | `301 → https://115.191.43.79/` |
| `https://115.191.43.79:8088`（8088） | 连接拒绝（curl exit=7，已停用） |
| 域名 `workboard.huiyiyou.cloud` | 生产 `0.2.0` |
| 域名 `news.huiyiyou.cloud`（生产小报） | HTTP 200，未受影响 |
| 域名 `test`/`workboard-test` | HTTP 200，各自 SNI 命中 |
| `nginx -t` | successful，无 warning |
| 两套环境 | prod active（5181） + test active（5180），均保留 |
| 端口全景 | 443 / 80 / 5181 / 5180；无 8088、无 5174 |

## ⚠️ 关键风险 / 待 Owner 确认

- **公司网络约束**：部署知识记载，吉利研究院上网行为管理曾拦截 80/443 标准端口的 IP/域名访问，当初正因此才用非标端口 8088。本次按 Owner 明确要求改为 IP:443 直连并停用 8088。**Owner 必须从公司网络实测 `https://115.191.43.79`**；若仍被拦访问不到，DevOps 立即按 B 节 diff 反向回滚，恢复 8088。
- 阿里云安全组 8088 放行规则可保留（无害），或 Owner 要求时清理。

## 遗留 / 后续

- **[Developer]** `src/server/parsers/coordination.test.js:62`「读真实仓」断言 `activeRequestCount=2`，真实 `niuma-cheng-coordination` 仓已变为 1（有需求关闭）→ 测试耦合跨项目真实数据漂移，非 workboard 代码缺陷。建议改 fixture 驱动或跟随更新断言。
- **[DevOps/文档]** 部署手册补「根目录首次需 `npm install`（后端依赖 pg）」；§8 生产部署记录更新为 IP:443 直连方案。
- **测试环境无公网入口**：8088 停用后测试仅 `workboard-test.huiyiyou.cloud` 域名可达（公司网络访问不了）。如需公司网络访问测试环境，再单独申请放行端口。

## 回滚

- 配置备份（本会话）：`scratchpad/ops-backup-20260707-192840/`（首轮）、`scratchpad/ops-backup2-194957/`（IP:443 方案前）。
- 持久回滚依据：B 节 diff 反向应用。快速恢复 8088：生产站点改回 `listen 443 ssl;` + `listen 8088 ssl default_server;`，workboard-test 恢复 `listen 443 ssl default_server; server_name ... _;`，`nginx -t && reload`。
- 代码回滚：`main` 未变，无需回滚。

## 说明（Review / 边界）

Ops Task 默认不套标准迭代 Review。本次涉及部署配置（nginx，含跨服务的 443/80 全局 default 归属、小报测试文件 IP:80 块）改动，Owner 在场逐步授权；每步改前备份、改后 `nginx -t` + 健康检查 + 全域名交叉验证，可回滚。删除对象仅系统内孤儿进程（非 git、非受保护路径）；未删除任何 systemd unit / nginx 站点 / 前端目录（Owner 要求保留两套环境）。跨服务改动（news 的 `test.huiyiyou.cloud` IP:80 块）已在此记录明示。
