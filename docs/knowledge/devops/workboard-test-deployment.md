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

**结论**：该生态任何系统供公司内访问，都走**非标端口 HTTPS**（8088/8089…）。多系统可各占一个非标端口同时在线，无需停启轮换。不要指望 80/443 或域名。

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

## 8. 生产部署注意（移交运维）

- 测试环境是只读看板、无数据库、无写回，部署简单；生产同构即可，建议换独立端口（如 8089）。
- 生产不要复用测试的 `projects.config.json`（路径指向本机各项目），按生产机实际项目路径调整。
- 若生产机域名可达，可直接用域名 443 + 通配符证书（无需非标端口）；受同样上网行为管理约束时沿用非标端口方案。
- `npm start` 在 `frontend/dist` 不存在时会返回首启提示页引导先 `npm run build`。
