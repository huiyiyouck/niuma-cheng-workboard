import { readFile, stat, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { withClient, ensureSchema } from "../db.js";
import { extractTitle, detectRole } from "./session-meta.js";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLAUDE_DIR = path.join(process.env.HOME || process.env.USERPROFILE || "", ".claude", "projects");
// 远程机器（如生产服务器）会话的本地镜像根目录（IRC-002：双数据源会话同步）
const REMOTE_MIRROR_ROOT = path.resolve(here, "../../..", "data", "remote-claude");

export function parseRemoteSources(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * 把远程机器的 ~/.claude/projects rsync 镜像到本地。
 * 单个远程失败不阻塞（保留上次镜像继续解析），结果随同步回执返回。
 */
async function mirrorRemoteSources(sources) {
  const results = [];
  for (const src of sources) {
    const dest = path.join(REMOTE_MIRROR_ROOT, src);
    try {
      await mkdir(dest, { recursive: true });
      await execFileAsync("rsync", ["-az", "--delete", `${src}:.claude/projects/`, `${dest}/`], { timeout: 120000 });
      results.push({ source: src, status: "ok", dir: dest });
    } catch (err) {
      results.push({ source: src, status: "error", error: String(err?.message || err), dir: dest });
    }
  }
  return results;
}

function hashId(str) {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}

function extractContentFromBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  const texts = [];
  for (const b of blocks) {
    if (b?.type === "text" && typeof b?.text === "string") {
      texts.push(b.text);
    } else if (b?.type === "tool_use" && b?.name) {
      // 提取关键参数让工具调用可读：Bash 显示 command，Read/Write/Edit 显示 file_path，其他显示 input 摘要
      const input = b?.input || {};
      let detail = "";
      if (b.name === "Bash" && typeof input.command === "string") {
        detail = input.command.split("\n")[0].slice(0, 120);
      } else if (["Read", "Write", "Edit", "Glob", "Grep"].includes(b.name) && typeof input.file_path === "string") {
        detail = input.file_path;
      } else if (["Read", "Write", "Edit"].includes(b.name) && typeof input.path === "string") {
        detail = input.path;
      } else if (b.name === "WebSearch" && typeof input.query === "string") {
        detail = input.query.slice(0, 100);
      } else if (b.name === "Task" && typeof input.description === "string") {
        detail = input.description;
      } else {
        // 其他工具显示 input JSON 摘要（限 100 字符）
        try {
          const json = JSON.stringify(input);
          detail = json.length > 100 ? json.slice(0, 100) + "..." : json;
        } catch {
          detail = "";
        }
      }
      texts.push(`[工具调用 ${b.name}] ${detail}`.trim());
    } else if (b?.type === "tool_result" && Array.isArray(b?.content)) {
      // tool_result 通常是工具返回结果，跳过（太长且对用户阅读流程没帮助）
      continue;
    } else if (b?.type === "thinking" && typeof b?.thinking === "string") {
      // thinking 内容一般也很长，跳过；只标记有思考
      continue;
    }
  }
  return texts.join("\n");
}

function hasToolUse(blocks) {
  if (!Array.isArray(blocks)) return false;
  return blocks.some((b) => b?.type === "tool_use");
}

function firstToolName(blocks) {
  if (!Array.isArray(blocks)) return null;
  const tool = blocks.find((b) => b?.type === "tool_use" && b?.name);
  return tool?.name ?? null;
}

function hasThinking(blocks) {
  if (!Array.isArray(blocks)) return false;
  return blocks.some((b) => b?.type === "thinking");
}

function parseMessage(obj, sessionId) {
  // Claude Code JSONL 格式：真正的消息在 obj.message 里
  // obj.type 是 "user" / "assistant"（也有 queue-operation/system 等非对话类型）
  // obj.message.role 是真实角色，obj.message.content 是内容（字符串或 block 数组）
  const msg = obj?.message;
  if (!msg || typeof msg !== "object") return null;

  const role = msg.role || obj?.type || "unknown";
  const ts = obj?.timestamp || obj?.created_at || msg.created_at || null;
  const rawContent = msg.content;

  // content 可能是字符串（user 消息常见）或 block 数组（assistant 消息）
  const normalizedBlocks = Array.isArray(rawContent)
    ? rawContent
    : typeof rawContent === "string"
      ? [{ type: "text", text: rawContent }]
      : [];

  const content = extractContentFromBlocks(normalizedBlocks);
  const msgId = `${sessionId}-${ts || Date.now()}-${role}-${obj?.uuid || ""}`;

  return {
    id: hashId(msgId),
    session_id: sessionId,
    role,
    content,
    created_at: ts ? new Date(ts).toISOString() : new Date().toISOString(),
    has_tool_use: hasToolUse(normalizedBlocks) ? 1 : 0,
    tool_name: firstToolName(normalizedBlocks),
    has_thinking: hasThinking(normalizedBlocks) ? 1 : 0,
  };
}

async function discoverProjects(claudeDir) {
  try {
    const entries = await readdir(claudeDir, { withFileTypes: true });
    const projects = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      const projectPath = path.join(claudeDir, entry.name);
      const metaPath = path.join(projectPath, ".project-metadata.json");
      let projectName = entry.name;
      try {
        const meta = JSON.parse(await readFile(metaPath, "utf8"));
        if (meta?.name) projectName = meta.name;
      } catch {}
      projects.push({ id: entry.name, name: projectName, path: projectPath });
    }
    return projects;
  } catch {
    return [];
  }
}

export async function discoverProjectsAcross(dirs) {
  const all = [];
  for (const dir of dirs) {
    all.push(...(await discoverProjects(dir)));
  }
  return all;
}

async function discoverJsonlFiles(projectPath) {
  try {
    const entries = await readdir(projectPath, { withFileTypes: true });
    const jsonlFiles = [];
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        const fullPath = path.join(projectPath, entry.name);
        const st = await stat(fullPath);
        jsonlFiles.push({ path: fullPath, name: entry.name, size: st.size, mtime: st.mtime.toISOString() });
      }
    }
    return jsonlFiles.sort((a, b) => b.size - a.size);
  } catch {
    return [];
  }
}

async function syncJsonlFile(client, project, jsonlFile, { force = false } = {}) {
  const sessionId = hashId(jsonlFile.path);
  const now = new Date().toISOString();

  const existing = await client.query(
    "SELECT last_byte_pos, file_mtime FROM claude_sessions WHERE id = $1",
    [sessionId]
  );

  let startPos = 0;
  let mode = "full";

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (force) {
      // 强制全量重建
      startPos = 0;
      mode = "rebuild";
      await client.query("DELETE FROM claude_messages WHERE session_id = $1", [sessionId]);
    } else if (row.file_mtime === jsonlFile.mtime) {
      return { sessionId, status: "unchanged" };
    } else if (jsonlFile.size >= row.last_byte_pos) {
      startPos = row.last_byte_pos;
      mode = "incremental";
    } else {
      startPos = 0;
      mode = "rebuild";
      await client.query("DELETE FROM claude_messages WHERE session_id = $1", [sessionId]);
    }
  }

  let data;
  try {
    data = await readFile(jsonlFile.path, "utf8");
  } catch {
    return { sessionId, status: "error", error: "file_read_failed" };
  }

  const sliceData = startPos > 0 ? data.slice(startPos) : data;
  const lines = sliceData.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    if (mode !== "full") {
      await client.query(
        "UPDATE claude_sessions SET file_mtime = $1, last_byte_pos = $2, synced_at = $3 WHERE id = $4",
        [jsonlFile.mtime, data.length, now, sessionId]
      );
    }
    return { sessionId, status: "unchanged" };
  }

  const messages = [];
  let customTitle = null;
  const userContents = [];
  let firstMsgAt = null;
  let lastMsgAt = null;
  let userCount = 0;
  let assistantCount = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (!obj) continue;
      if (obj?.type === "custom-title" && typeof obj?.customTitle === "string") {
        customTitle = obj.customTitle; // 一个会话可能多次改标题，取最后一条
      }
      if (obj?.type === "user" || obj?.type === "assistant") {
        const msg = parseMessage(obj, sessionId);
        if (!msg) continue;
        messages.push(msg);
        if (msg.role === "user") {
          userCount++;
          if (msg.content.trim() && userContents.length < 5) userContents.push(msg.content);
        }
        if (msg.role === "assistant") assistantCount++;
        if (!firstMsgAt || msg.created_at < firstMsgAt) firstMsgAt = msg.created_at;
        if (!lastMsgAt || msg.created_at > lastMsgAt) lastMsgAt = msg.created_at;
      }
    } catch {}
  }

  await client.query("BEGIN");

  try {
    if (mode === "full" || mode === "rebuild") {
      // rebuild 从头重解析全量文件，与 full 一样按绝对值 upsert（累加会重复计数）
      const title = extractTitle({ customTitle, firstUserContent: userContents[0] });
      const detected = detectRole(userContents);
      await client.query(`
        INSERT INTO claude_sessions
        (id, project_id, project_name, title, first_message_at, last_message_at,
         message_count, user_message_count, assistant_message_count,
         jsonl_path, file_mtime, last_byte_pos, synced_at, detected_role, role_confidence)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          project_id = EXCLUDED.project_id,
          project_name = EXCLUDED.project_name,
          title = EXCLUDED.title,
          first_message_at = EXCLUDED.first_message_at,
          last_message_at = EXCLUDED.last_message_at,
          message_count = EXCLUDED.message_count,
          user_message_count = EXCLUDED.user_message_count,
          assistant_message_count = EXCLUDED.assistant_message_count,
          jsonl_path = EXCLUDED.jsonl_path,
          file_mtime = EXCLUDED.file_mtime,
          last_byte_pos = EXCLUDED.last_byte_pos,
          synced_at = EXCLUDED.synced_at,
          detected_role = EXCLUDED.detected_role,
          role_confidence = EXCLUDED.role_confidence
      `, [
        sessionId, project.id, project.name, title,
        firstMsgAt || now, lastMsgAt || now,
        messages.length, userCount, assistantCount,
        jsonlFile.path, jsonlFile.mtime, data.length, now,
        detected.role, detected.confidence,
      ]);
    } else {
      const current = await client.query(
        "SELECT message_count, user_message_count, assistant_message_count, first_message_at FROM claude_sessions WHERE id = $1",
        [sessionId]
      );
      if (current.rows.length > 0) {
        const c = current.rows[0];
        const newFirst = (firstMsgAt && firstMsgAt < c.first_message_at) ? firstMsgAt : c.first_message_at;
        await client.query(`
          UPDATE claude_sessions SET
            last_message_at = $1,
            message_count = message_count + $2,
            user_message_count = user_message_count + $3,
            assistant_message_count = assistant_message_count + $4,
            file_mtime = $5,
            last_byte_pos = $6,
            synced_at = $7,
            first_message_at = $8
          WHERE id = $9
        `, [
          lastMsgAt || c.last_message_at,
          messages.length, userCount, assistantCount,
          jsonlFile.mtime, data.length, now,
          newFirst, sessionId,
        ]);
      }
    }

    for (const msg of messages) {
      await client.query(`
        INSERT INTO claude_messages (id, session_id, role, content, created_at, has_tool_use, tool_name, has_thinking)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        msg.id, msg.session_id, msg.role, msg.content, msg.created_at,
        msg.has_tool_use, msg.tool_name, msg.has_thinking,
      ]);
    }

    if (mode === "incremental") {
      // 增量片段拿不到会话开头：标题只在片段里出现新 custom-title 时更新；
      // 角色识别只在此前未识别出结果时，用库中前 5 条 user 消息补算
      if (customTitle) {
        await client.query("UPDATE claude_sessions SET title = $1 WHERE id = $2", [customTitle.trim(), sessionId]);
      }
      const cur = await client.query("SELECT detected_role FROM claude_sessions WHERE id = $1", [sessionId]);
      if (!cur.rows[0]?.detected_role || cur.rows[0].detected_role === "Unknown") {
        const firstUsers = await client.query(
          "SELECT content FROM claude_messages WHERE session_id = $1 AND role = 'user' AND btrim(content) <> '' ORDER BY created_at ASC LIMIT 5",
          [sessionId]
        );
        const d = detectRole(firstUsers.rows.map((r) => r.content));
        await client.query(
          "UPDATE claude_sessions SET detected_role = $1, role_confidence = $2 WHERE id = $3",
          [d.role, d.confidence, sessionId]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  return { sessionId, status: mode, messageCount: messages.length };
}

export async function syncAllSessions({ claudeDir = DEFAULT_CLAUDE_DIR, force = false } = {}) {
  await ensureSchema(); // 顺带加载 .env（CLAUDE_REMOTE_SOURCES）
  const remoteSources = await mirrorRemoteSources(parseRemoteSources(process.env.CLAUDE_REMOTE_SOURCES));
  // rsync 失败的远程也扫描其镜像目录（保留上次成功的数据；目录不存在时 discover 返回空）
  const projects = await discoverProjectsAcross([claudeDir, ...remoteSources.map((r) => r.dir)]);
  const results = [];
  const now = new Date().toISOString();

  await withClient(async (client) => {
    for (const project of projects) {
      const jsonlFiles = await discoverJsonlFiles(project.path);
      for (const file of jsonlFiles) {
        try {
          const r = await syncJsonlFile(client, project, file, { force });
          results.push({ projectId: project.id, projectName: project.name, ...r });
        } catch (err) {
          results.push({ projectId: project.id, projectName: project.name, status: "error", error: String(err?.message || err) });
        }
      }
    }
  });

  return {
    syncedAt: now,
    projectCount: projects.length,
    remoteSources,
    results,
  };
}

export async function getSyncStatus() {
  await ensureSchema();
  return withClient(async (client) => {
    const sessionRes = await client.query("SELECT COUNT(*)::int as cnt FROM claude_sessions");
    const messageRes = await client.query("SELECT COUNT(*)::int as cnt FROM claude_messages");
    const lastRes = await client.query("SELECT MAX(synced_at) as last FROM claude_sessions");
    return {
      status: sessionRes.rows[0].cnt > 0 ? "synced" : "not_synced",
      sessionCount: sessionRes.rows[0].cnt,
      messageCount: messageRes.rows[0].cnt,
      lastSyncedAt: lastRes.rows[0].last ?? null,
    };
  });
}

export { DEFAULT_CLAUDE_DIR };
