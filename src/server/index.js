import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "./snapshot.js";
import { withClient } from "./db.js";
import { applyMigrations, getMigrationStatus } from "./migrations.js";
import { syncAllSessions, getSyncStatus, collectAllowedProjectIds } from "./sync/claude-sync.js";
import { parseVersionList } from "./parsers/project-index.js";
import { parseIterationRecord } from "./parsers/iteration-record.js";
import { loadConfig, validateConfig } from "./config.js";

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

function readJsonBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      if (!data) { resolve({}); return; }
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

export function createServer({ configPath = DEFAULT_CONFIG_PATH, distDir = DEFAULT_DIST_DIR } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const method = req.method;

    try {
      if (url.pathname === "/api/snapshot") {
        try {
          const snapshot = await buildSnapshot({ configPath });
          let syncStatus = null;
          try { syncStatus = await getSyncStatus(); }
          catch (err) { syncStatus = { status: "error", error: String(err?.message || err) }; }
          return sendJson(res, 200, { ...snapshot, syncStatus });
        } catch (err) {
          return sendJson(res, 500, { error: String(err?.message || err) });
        }
      }

      if (url.pathname === "/api/sessions" && method === "GET") {
        return await handleListSessions(res, url);
      }

      if (url.pathname === "/api/sessions/details" && method === "GET") {
        return await handleSessionDetails(res, url);
      }

      if (url.pathname === "/api/mappings" && method === "GET") {
        return await handleListMappings(res, url);
      }

      if (url.pathname === "/api/mappings" && method === "POST") {
        return await handleCreateMapping(req, res);
      }

      if (url.pathname === "/api/mappings" && method === "DELETE") {
        return await handleDeleteMapping(res, url);
      }

      if (url.pathname === "/api/timeline/versions" && method === "GET") {
        return await handleTimelineVersions(res, url, configPath);
      }

      if (url.pathname === "/api/timeline/detail" && method === "GET") {
        return await handleTimelineDetail(res, url, configPath);
      }

      if (url.pathname === "/api/sync" && method === "POST") {
        return await handleSync(req, res, url);
      }

      if (url.pathname === "/api/health" && method === "GET") {
        return await handleHealth(res);
      }

      if (url.pathname.startsWith("/api/")) {
        return sendJson(res, 404, { error: `未知 API: ${url.pathname}` });
      }
      return serveStatic(res, distDir, url.pathname);
    } catch (err) {
      return sendJson(res, 500, { error: String(err?.message || err) });
    }
  });
}

async function handleListSessions(res, url) {
  await applyMigrations();
  let projectId = url.searchParams.get("project_id");
  const status = url.searchParams.get("status") || "all";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;

  // claude_project_id 支持单值或数组（IRC-002：同一项目在本机与服务器各有会话目录）
  let projectDirIds = null;
  if (projectId) {
    try {
      const rawConfig = await loadConfig(DEFAULT_CONFIG_PATH);
      const project = rawConfig?.projects?.find((p) => p.id === projectId);
      if (project?.claude_project_id) {
        projectDirIds = [].concat(project.claude_project_id);
      } else if (projectId === "ecosystem-root" && rawConfig?.ecosystem?.claude_project_id) {
        projectDirIds = [].concat(rawConfig.ecosystem.claude_project_id);
      }
    } catch {}
  }

  const whereClauses = [];
  const params = [];
  let paramIdx = 1;

  if (projectDirIds) {
    whereClauses.push(`s.project_id = ANY($${paramIdx++})`);
    params.push(projectDirIds);
  } else if (projectId) {
    whereClauses.push(`s.project_id = $${paramIdx++}`);
    params.push(projectId);
  }

  if (status === "mapped") {
    whereClauses.push("m.id IS NOT NULL");
  } else if (status === "unmapped") {
    whereClauses.push("m.id IS NULL");
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  await withClient(async (client) => {
    const totalRes = await client.query(
      `SELECT COUNT(*)::int as cnt FROM claude_sessions s LEFT JOIN session_mappings m ON s.id = m.session_id ${whereSql}`,
      params
    );
    const total = totalRes.rows[0].cnt;

    const sessionsRes = await client.query(
      `SELECT s.*,
              m.id as mapping_id, m.role as mapped_role, m.project_id as mapped_project_id, m.note as mapping_note,
              lm.last_messages
       FROM claude_sessions s
       LEFT JOIN session_mappings m ON s.id = m.session_id
       LEFT JOIN LATERAL (
         SELECT (
           SELECT json_agg(json_build_object(
             'role', sub.role,
             'content', left(sub.content, 200),
             'created_at', sub.created_at::text
           ) ORDER BY sub.created_at DESC)
           FROM (
             SELECT role, content, created_at
             FROM claude_messages
             WHERE session_id = s.id
             ORDER BY created_at DESC
             LIMIT 2
           ) sub
         ) as last_messages
       ) lm ON true
       ${whereSql}
       ORDER BY s.last_message_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    sendJson(res, 200, {
      items: sessionsRes.rows,
      total,
      limit,
      offset,
    });
  });
}

async function handleSessionDetails(res, url) {
  const sessionId = url.searchParams.get("id");
  if (!sessionId) return sendJson(res, 400, { error: "id 参数缺失" });

  await applyMigrations();
  await withClient(async (client) => {
    const sessionRes = await client.query(
      `SELECT s.*, m.id as mapping_id, m.role as mapped_role, m.project_id as mapped_project_id, m.note as mapping_note
       FROM claude_sessions s
       LEFT JOIN session_mappings m ON s.id = m.session_id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      return sendJson(res, 404, { error: "会话不存在" });
    }

    const messagesRes = await client.query(
      `SELECT id, session_id, role, content, created_at, has_tool_use, tool_name, has_thinking
       FROM claude_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    sendJson(res, 200, {
      session: sessionRes.rows[0],
      messages: messagesRes.rows,
    });
  });
}

async function handleListMappings(res, url) {
  const projectId = url.searchParams.get("project_id");
  await applyMigrations();

  await withClient(async (client) => {
    let sql = `SELECT m.id, m.session_id, m.project_id, m.role, m.note, m.created_at, m.updated_at,
                      s.title as session_title, s.last_message_at, s.message_count
               FROM session_mappings m
               LEFT JOIN claude_sessions s ON m.session_id = s.id`;
    const params = [];

    if (projectId) {
      sql += " WHERE m.project_id = $1";
      params.push(projectId);
    }
    sql += " ORDER BY m.updated_at DESC";

    const result = await client.query(sql, params);
    sendJson(res, 200, { items: result.rows, total: result.rows.length });
  });
}

async function handleCreateMapping(req, res) {
  const body = await readJsonBody(req);
  const { session_id, project_id, role, note } = body;
  if (!session_id || !project_id || !role) {
    return sendJson(res, 400, { error: "session_id, project_id, role 必填" });
  }

  await applyMigrations();
  await withClient(async (client) => {
    const sessionRes = await client.query("SELECT id FROM claude_sessions WHERE id = $1", [session_id]);
    if (sessionRes.rows.length === 0) {
      return sendJson(res, 404, { error: "会话不存在" });
    }

    const now = new Date().toISOString();

    // 以 (project_id, role) 为业务唯一键：每个项目+角色只能映射一个会话。
    // 原子 upsert（ON CONFLICT），避免 SELECT-then-INSERT 并发下产生重复行（H-3）。
    const upsert = await client.query(
      `INSERT INTO session_mappings (session_id, project_id, role, note, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT (project_id, role) DO UPDATE SET
         session_id = EXCLUDED.session_id,
         note = EXCLUDED.note,
         updated_at = EXCLUDED.updated_at
       RETURNING *, (xmax = 0) AS inserted`,
      [session_id, project_id, role, note || null, now]
    );
    const row = upsert.rows[0];
    sendJson(res, row.inserted ? 201 : 200, row);
  });
}

async function handleDeleteMapping(res, url) {
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return sendJson(res, 400, { error: "session_id 参数缺失" });

  await applyMigrations();
  await withClient(async (client) => {
    const existing = await client.query("SELECT id FROM session_mappings WHERE session_id = $1", [sessionId]);
    if (existing.rows.length === 0) {
      return sendJson(res, 404, { error: "映射不存在" });
    }

    await client.query("DELETE FROM session_mappings WHERE session_id = $1", [sessionId]);
    sendJson(res, 200, { ok: true });
  });
}

async function handleTimelineVersions(res, url, configPath) {
  const projectId = url.searchParams.get("project_id");
  if (!projectId) return sendJson(res, 400, { error: "project_id 参数缺失" });

  const cfg = await loadConfig(configPath);
  const validated = validateConfig(cfg, { configPath });
  const project = validated.projects.find((p) => p.id === projectId);
  if (!project || !project.resolvedPath) return sendJson(res, 404, { error: "项目不存在" });

  const indexPath = path.join(project.resolvedPath, "docs", "progress", "INDEX.md");
  const md = await readFile(indexPath, "utf8");
  const { versions, errors } = parseVersionList(md, { sourcePath: indexPath });
  sendJson(res, 200, { versions, errors });
}

async function handleTimelineDetail(res, url, configPath) {
  const projectId = url.searchParams.get("project_id");
  const version = url.searchParams.get("version");
  if (!projectId || !version) return sendJson(res, 400, { error: "project_id 和 version 必填" });

  const cfg = await loadConfig(configPath);
  const validated = validateConfig(cfg, { configPath });
  const project = validated.projects.find((p) => p.id === projectId);
  if (!project || !project.resolvedPath) return sendJson(res, 404, { error: "项目不存在" });

  const recordPath = path.join(project.resolvedPath, "docs", "progress", "iterations", `${version}.md`);
  const md = await readFile(recordPath, "utf8");
  const result = parseIterationRecord(md, { sourcePath: recordPath, version });
  sendJson(res, 200, result);
}

// 健康检查（DM-5）：db 可达返回 200，不可达返回 503，供 systemd/nginx 存活探测与部署回滚判断。
async function handleHealth(res) {
  let version = "unknown";
  try {
    const pkg = JSON.parse(await readFile(path.join(PROJECT_ROOT, "package.json"), "utf8"));
    version = pkg.version ?? "unknown";
  } catch {}
  let db = "ok";
  let migrations = "ok";
  try {
    await withClient((client) => client.query("SELECT 1"));
    const status = await getMigrationStatus();
    if (status.pending > 0) {
      migrations = `${status.pending} pending`;
    }
  } catch (err) {
    db = "error";
    migrations = "error";
  }
  sendJson(res, db === "ok" ? 200 : 503, { status: db === "ok" ? "ok" : "degraded", db, migrations, version });
}

async function handleSync(req, res, url) {
  let body = {};
  try { body = await readJsonBody(req); } catch {}
  const force = body?.force === true || url.searchParams.get("force") === "1";
  let allowedProjectIds = null;
  try {
    allowedProjectIds = collectAllowedProjectIds(await loadConfig(DEFAULT_CONFIG_PATH));
  } catch {}
  const result = await syncAllSessions({ force, allowedProjectIds });
  sendJson(res, 200, result);
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
  if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
    return sendJson(res, 403, { error: "forbidden" });
  }
  try {
    const data = await readFile(filePath);
    return sendBuffer(res, 200, MIME[path.extname(filePath)] || "application/octet-stream", data);
  } catch {
    try {
      const data = await readFile(path.join(distDir, "index.html"));
      return sendBuffer(res, 200, MIME[".html"], data);
    } catch {
      return sendHtml(res, 200, firstRunPage());
    }
  }
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
  const host = process.env.HOST || "0.0.0.0";
  createServer().listen(port, host, () => {
    console.log(`项目管理工作台已启动: http://${host}:${port}`);
  });

  // 启动时后台触发一次全量会话同步（不阻塞服务启动；数据库不可达时只记录日志，不影响只读 API）
  loadConfig(DEFAULT_CONFIG_PATH)
    .then((cfg) => syncAllSessions({ allowedProjectIds: collectAllowedProjectIds(cfg) }))
    .then((r) => {
      console.log(`启动同步完成：${r.projectCount} 个项目目录，共 ${r.results.length} 个会话文件`);
    })
    .catch((err) => {
      console.error("启动同步失败（不影响服务运行，可稍后通过 POST /api/sync 手动重试）：", err?.message || err);
    });
}
