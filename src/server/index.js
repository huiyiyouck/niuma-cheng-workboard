import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "./snapshot.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../..");
const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, "projects.config.json");
const DEFAULT_DIST_DIR = path.join(PROJECT_ROOT, "frontend", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

/**
 * 创建只读看板 HTTP 服务。
 * - GET /api/snapshot：现场生成整批快照
 * - 其他路径：服务 frontend/dist 静态资源，未命中回退 index.html（SPA）
 * - dist 不存在：返回首启提示页，引导执行 npm run build
 */
export function createServer({ configPath = DEFAULT_CONFIG_PATH, distDir = DEFAULT_DIST_DIR } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/snapshot") {
      try {
        const snapshot = await buildSnapshot({ configPath });
        return sendJson(res, 200, snapshot);
      } catch (err) {
        // 根配置不可读 / JSON 错误：整页读取异常
        return sendJson(res, 500, { error: String(err?.message || err) });
      }
    }
    if (url.pathname.startsWith("/api/")) {
      return sendJson(res, 404, { error: `未知 API: ${url.pathname}` });
    }
    return serveStatic(res, distDir, url.pathname);
  });
}

async function serveStatic(res, distDir, pathname) {
  let distExists = true;
  try {
    await stat(distDir);
  } catch {
    distExists = false;
  }
  if (!distExists) {
    return sendHtml(res, 200, firstRunPage());
  }

  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.join(distDir, rel);
  // 防目录穿越：解析后必须仍在 distDir 内
  if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
    return sendJson(res, 403, { error: "forbidden" });
  }
  try {
    const data = await readFile(filePath);
    return sendBuffer(res, 200, MIME[path.extname(filePath)] || "application/octet-stream", data);
  } catch {
    // SPA 回退到 index.html
    try {
      const data = await readFile(path.join(distDir, "index.html"));
      return sendBuffer(res, 200, MIME[".html"], data);
    } catch {
      return sendHtml(res, 200, firstRunPage());
    }
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": MIME[".json"] });
  res.end(body);
}

function sendHtml(res, status, html) {
  res.writeHead(status, { "content-type": MIME[".html"] });
  res.end(html);
}

function sendBuffer(res, status, contentType, data) {
  res.writeHead(status, { "content-type": contentType });
  res.end(data);
}

function firstRunPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>项目管理工作台</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:80px auto;padding:0 24px;color:#1f2937;line-height:1.7}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
<h1>项目管理工作台</h1>
<p>后端服务已启动，但尚未找到前端构建产物 <code>frontend/dist</code>。</p>
<p>请先构建前端：</p>
<pre><code>npm run build</code></pre>
<p>构建完成后刷新本页即可。后端只读 API 已可用：<a href="/api/snapshot">/api/snapshot</a>。</p>
</body>
</html>`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT) || 5174;
  createServer().listen(port, () => {
    console.log(`项目管理工作台已启动: http://localhost:${port}`);
  });
}
