# workboard 测试环境部署手册

> 适用：`niuma-cheng-workboard` v0.1 只读看板测试环境，部署在阿里云 `115.191.43.79`。
> 目的：服务器重装或迁移时可照此重建；记录关键约束避免重复踩坑。

## 1. 架构

```
公司网络 ──→ https://115.191.43.79:8088 (nginx, 非标端口绕过上网行为管理)
                    │
                    ├─ /            → nginx serve 前端 dist（静态）
                    └─ /api/        → 反代 127.0.0.1:5180
                                          │
                                  systemd: workboard-api-test.service
                                  (node 仅绑本地, Restart=always, 开机自启)
```

- 前端：`npm run build` 产物 `frontend/dist`，nginx 直接 serve（前端持久化）。
- 后端：本地 Node 只读聚合服务，systemd 守护（后端持久化）。
- 前后端解耦：node 只绑 `127.0.0.1:5180` 不暴露公网，由 nginx 反代。

## 2. ⚠️ 关键网络约束（必读）

Owner 从**公司网络（吉利研究院统一上网行为管理策略）**访问时：

- **80 / 443 标准端口**对"未分类网站"做连接层过滤 → 域名、IP、hosts 全部被拦（看到就掐，非 DNS 拦截，无法用 hosts 绕过）。
- **非标端口放行** → `8088` HTTPS 实测可正常访问。

**测试环境结论**：供公司内访问的测试环境走**非标端口 HTTPS**（如 8088），不要指望 80/443 或域名。

**生产环境准则**：

- 测试环境可由 Developer 按手册部署；生产环境必须由 DevOps 部署。
- 生产域名、端口和公网入口策略必须由 Owner 明确给出；未确认前不得擅自用 IP、不得擅自新增公网端口。
- 生产前端必须发布到独立生产目录（如 `/var/www/workboard.huiyiyou.cloud`），不得软链到开发仓库的 `frontend/dist`。
- 生产后端必须从独立发布目录启动（如 `/opt/workboard-prod/app`），不得从开发仓库 `/root/Project/niuma-cheng-workboard` 启动。
- 开发完成后先部署 / 更新测试环境并验证；测试通过后，DevOps 再把确认版本发布到生产独立目录。开发仓库后续修改不得自动影响生产。

## 3. 后端 systemd

`/etc/systemd/system/workboard-api-test.service`：

```ini
[Unit]
Description=Workboard API Test (niuma-cheng-workboard v0.1 只读看板, :5180)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/Project/niuma-cheng-workboard
Environment=PORT=5180
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node src/server/index.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/workboard-test.log
StandardError=append:/var/log/workboard-test.log

[Install]
WantedBy=multi-user.target
```

启用：`systemctl daemon-reload && systemctl enable --now workboard-api-test.service`

## 4. 前端

```bash
cd /root/Project/niuma-cheng-workboard
npm --prefix frontend install      # 首次
npm run build                      # → frontend/dist
ln -sfn /root/Project/niuma-cheng-workboard/frontend/dist /var/www/workboard-test.huiyiyou.cloud
```

更新前端：重新 `npm run build` 即可（symlink 自动指向新产物，无需动 nginx）。

## 5. nginx

`/etc/nginx/sites-available/workboard-test.huiyiyou.cloud`（软链到 sites-enabled）。核心 server 块同时监听 443（备用，公司访问不了）与 **8088（实际入口）**，用通配符证书：

```nginx
server {
    listen 443 ssl default_server;
    listen 8088 ssl;                          # ← 公司网络实际入口
    server_name workboard-test.huiyiyou.cloud 115.191.43.79 _;

    ssl_certificate /etc/letsencrypt/live/huiyiyou.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/huiyiyou.cloud/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/workboard-test.huiyiyou.cloud;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5180;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location ^~ /assets/ { try_files $uri =404; add_header Cache-Control "public, max-age=31536000, immutable" always; }
    location = /index.html { try_files /index.html =404; add_header Cache-Control "no-cache, no-store, must-revalidate" always; }
    location / { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache, no-store, must-revalidate" always; }
}
server {                                       # 域名 80 → 443（公司访问不了，仅完整性）
    listen 80;
    server_name workboard-test.huiyiyou.cloud;
    return 301 https://$host$request_uri;
}
```

生效：`nginx -t && systemctl reload nginx`

**阿里云安全组**：需放行入方向 TCP `8088`（已配）。换端口时同步放行。

## 6. 通配符证书（`*.huiyiyou.cloud`）

DNS 托管阿里云，通配符必须 DNS-01 验证，用 `certbot-dns-aliyun` 插件自动化：

```bash
pip3 install certbot-dns-aliyun --break-system-packages
# 凭证 /etc/letsencrypt/aliyun.ini (chmod 600)：
#   dns_aliyun_access_key = <RAM 子账号 AccessKey ID>
#   dns_aliyun_access_key_secret = <Secret>
certbot certonly --authenticator dns-aliyun \
  --dns-aliyun-credentials /etc/letsencrypt/aliyun.ini \
  -d "*.huiyiyou.cloud" -d "huiyiyou.cloud" \
  --agree-tos -m huiyiyouheck@gmail.com -n
```

- 证书路径 `/etc/letsencrypt/live/huiyiyou.cloud/`，90 天有效，`certbot.timer` 自动续期（凭证就绪即可）。
- AccessKey 用专门 RAM 子账号，只授 `AliyunDNSFullAccess`；勿用主账号 Key。
- IP 直连证书名不匹配会有浏览器警告（点继续），无法避免（IP 不能签证书）。

## 7. 访问与验证

- 入口：`https://115.191.43.79:8088`（证书警告点继续）
- 本机自检：`curl -sk https://127.0.0.1:8088/api/snapshot`（应 200）
- 服务状态：`systemctl status workboard-api-test`、`journalctl -u workboard-api-test` 或 `/var/log/workboard-test.log`

## 8. 生产部署记录

> **2026-07-07 更新（当前生产入口方案，优先级高于下方历史）**：Owner 要求 IP 直连（无端口）访问生产、IP 只指生产、其余仅域名。当前布局：
> - 生产站点 `workboard.huiyiyou.cloud` 持有 `listen 443 ssl default_server` + `server_name ... 115.191.43.79` → `https://115.191.43.79`（IP:443）直达生产 v0.2（反代 5181）。
> - IP:80 default（`test.huiyiyou.cloud` 文件内）改为 `return 301 https://$host$request_uri`；生产站点已删除 `listen 8088`；`workboard-test` 让出 443 default、仅域名可达。
> - ⚠️ 与 §2 网络约束存在张力：公司网络曾拦 80/443，本方案须 Owner 从公司网络实测 `https://115.191.43.79`，被拦则回滚恢复 8088（回滚 diff 见 ad-hoc）。
> - 开发目录首次部署前须 `npm install`（根目录后端依赖 `pg` 等，v0.2 引入）；复制后端用 `cp -a src/server/.` 递归（含 `migrations/`、`sync/`）。
> - 详见 `docs/progress/ad-hoc/2026-07-07-ops-ip8088-repoint-prod.md`。

生产环境已于 2026-06-24 按 Owner 确认域名重新部署；此前误用 `8089` 和开发目录软链的配置已撤回。

- 入口：`https://workboard.huiyiyou.cloud`
- nginx 站点：`/etc/nginx/sites-available/workboard.huiyiyou.cloud` → `sites-enabled`
- 前端根目录：`/var/www/workboard.huiyiyou.cloud`（独立生产目录，复制 `frontend/dist` 产物，不使用软链）
- 后端发布目录：`/opt/workboard-prod/app`（独立生产目录，复制后端源码、生产配置和前端 dist 产物，不从开发仓库启动）
- 后端服务：`workboard-api-prod.service`
- 后端监听：`127.0.0.1:5181`
- 日志：`/var/log/workboard-prod.log`
- 验证：`nginx -t` 通过；`systemctl status workboard-api-prod` active；systemd `WorkingDirectory=/opt/workboard-prod/app`；`http://127.0.0.1:5181/api/snapshot` 200；本机 SNI 自检 `curl --resolve workboard.huiyiyou.cloud:443:127.0.0.1 https://workboard.huiyiyou.cloud/api/snapshot` 200；`/var/www/workboard.huiyiyou.cloud` 为真实目录；`8089` 已不再监听。

生产 systemd：

```ini
[Unit]
Description=Workboard API Prod (niuma-cheng-workboard v0.1 readonly dashboard, :5181)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/workboard-prod/app
Environment=PORT=5181
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node src/server/index.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/workboard-prod.log
StandardError=append:/var/log/workboard-prod.log

[Install]
WantedBy=multi-user.target
```

生产 nginx 核心配置：

```nginx
server {
    listen 443 ssl;
    server_name workboard.huiyiyou.cloud;

    ssl_certificate /etc/letsencrypt/live/huiyiyou.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/huiyiyou.cloud/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/workboard.huiyiyou.cloud;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5181;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

生产发布步骤：

```bash
cd /root/Project/niuma-cheng-workboard
git pull --ff-only origin main
npm --prefix frontend install   # 前端依赖有增删时必跑（如 v0.3 新增 react-markdown/remark-gfm）
npm run build

# ⚠️ 后端必须递归复制（cp -a src/server/.），不要用 `cp -a src/server/*.js`——
#    通配符只匹配 .js，会漏 migrations/*.sql（如 002_session_role_model.sql），
#    导致生产不跑迁移、缺列/查询 500（OPS-5，2026-07-20 v0.3 部署确认）。
cp -a package.json /opt/workboard-prod/app/package.json
cp -a src/server/. /opt/workboard-prod/app/src/server/          # 递归：含 migrations/ sync/ parsers/
rm -rf /opt/workboard-prod/app/frontend/dist
cp -a frontend/dist /opt/workboard-prod/app/frontend/
cp -a frontend/dist/. /var/www/workboard.huiyiyou.cloud/         # 含 50x.html
systemctl restart workboard-api-prod.service
nginx -t && systemctl reload nginx
```

**含数据库迁移的发布（如 v0.3 的 `002` DROP session_mappings）额外纪律**：

- **迁移是惰性自动应用**：`applyMigrations` 只在 `/api/sessions` 族数据端点首次请求时触发（`/api/health`、`/api/snapshot` **不触发**）。`systemctl restart` 后须 `curl http://127.0.0.1:5181/api/sessions?limit=1` 主动触发，再验 `curl /api/health` 达 `migrations:ok`。
- **含 DROP/不可逆迁移，restart 前强制备份**：`pg_dump -t <表> <库>` + 整库 `pg_dump`（惰性自动应用无人工闸口，一重启第一笔流量就 DROP）。
- **迁移后验 DDL 清理**：跑一次 `curl -X POST /api/sync`，再查 `SELECT to_regclass('<被DROP表>')` 应为 NULL（防 `runSchemaDDL` 复活空表，DEV-M1）。

生产 `projects.config.json` 放在 `/opt/workboard-prod/app/projects.config.json`，项目数据路径使用绝对路径（各项目须指真实 git 克隆 `/root/Project/niuma-cheng-*`，含 workboard 自身——勿指部署目标 `/opt/workboard-prod/app`，那是 `cp -a` 非 git 目录，会致 US-5 迭代标签恒 null，OPS-2）。不要直接复用开发仓库里的相对路径配置。

**nginx `error_page`（US-9，v0.3 起）**：生产站点 server 块含 `error_page 500 502 503 504 /50x.html;` + `location = /50x.html { internal; }`，后端 502/503/504 时兜出自包含静态页 `50x.html`（随 `frontend/dist` 部署到 web root）。

## 9. 生产部署注意（移交运维）

- 测试环境是只读看板、无数据库、无写回，生产服务可同构后端守护方式，但公网入口必须按 Owner 明确的域名/端口策略配置。
- 生产不要复用测试的访问入口策略；域名未定、端口未确认时不得部署公网入口。
- 生产不要从开发仓库启动后端，也不要把生产前端软链到开发构建目录。
- 若生产机域名可达，优先用域名 443 + 通配符证书；只有 Owner 明确要求非标端口时才新增公网端口。
- `npm start` 在 `frontend/dist` 不存在时会返回首启提示页引导先 `npm run build`。
