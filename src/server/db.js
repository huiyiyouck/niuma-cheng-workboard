import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../..");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

let _pool = null;
let _envLoaded = false;

async function loadEnv() {
  if (_envLoaded) return;
  _envLoaded = true;
  try {
    const raw = await readFile(ENV_PATH, "utf8");
    for (const line of raw.split("\n")) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env 不存在，直接用环境变量
  }
}

export async function getPool() {
  if (_pool) return _pool;
  await loadEnv();
  _pool = new Pool({
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
    database: process.env.PG_DATABASE || "workboard",
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  return _pool;
}

export async function query(text, params) {
  const pool = await getPool();
  return pool.query(text, params);
}

export async function withClient(fn) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export async function ensureSchema() {
  await withClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS claude_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        title TEXT NOT NULL,
        first_message_at TEXT NOT NULL,
        last_message_at TEXT NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0,
        user_message_count INTEGER NOT NULL DEFAULT 0,
        assistant_message_count INTEGER NOT NULL DEFAULT 0,
        jsonl_path TEXT NOT NULL,
        file_mtime TEXT NOT NULL,
        last_byte_pos INTEGER NOT NULL DEFAULT 0,
        synced_at TEXT NOT NULL,
        detected_role TEXT,
        role_confidence REAL
      )
    `);
    await client.query("ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS detected_role TEXT");
    await client.query("ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS role_confidence REAL");
    await client.query("CREATE INDEX IF NOT EXISTS idx_claude_sessions_project_id ON claude_sessions(project_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_claude_sessions_last_message_at ON claude_sessions(last_message_at DESC)");

    await client.query(`
      CREATE TABLE IF NOT EXISTS claude_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES claude_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        has_tool_use SMALLINT NOT NULL DEFAULT 0,
        tool_name TEXT,
        has_thinking SMALLINT NOT NULL DEFAULT 0
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_claude_messages_session_id ON claude_messages(session_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_claude_messages_created_at ON claude_messages(created_at)");

    await client.query(`
      CREATE TABLE IF NOT EXISTS session_mappings (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE REFERENCES claude_sessions(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL,
        role TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS idx_session_mappings_project_id ON session_mappings(project_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_session_mappings_role ON session_mappings(role)");
  });
}
