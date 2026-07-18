import { withClient } from "./db.js";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(here, "migrations");

let _migrationsApplied = null;

export async function applyMigrations() {
  if (_migrationsApplied) return _migrationsApplied;
  _migrationsApplied = runMigrations().catch((err) => {
    _migrationsApplied = null;
    throw err;
  });
  return _migrationsApplied;
}

async function runMigrations() {
  await ensureMigrationTable();
  const executedVersions = await getExecutedVersions();
  const migrationFiles = await listMigrationFiles();
  
  for (const file of migrationFiles) {
    const version = parseInt(file.name.split("_")[0], 10);
    if (executedVersions.has(version)) {
      continue;
    }
    await executeMigration(version, file.path);
  }
  
  return true;
}

async function ensureMigrationTable() {
  await withClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);
  });
}

async function getExecutedVersions() {
  try {
    const result = await withClient(async (client) => {
      return client.query("SELECT version FROM schema_migrations");
    });
    return new Set(result.rows.map((r) => r.version));
  } catch {
    return new Set();
  }
}

async function listMigrationFiles() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => ({
      name: e.name,
      path: path.join(MIGRATIONS_DIR, e.name),
    }))
    .sort((a, b) => {
      const va = parseInt(a.name.split("_")[0], 10);
      const vb = parseInt(b.name.split("_")[0], 10);
      return va - vb;
    });
  return files;
}

async function executeMigration(version, filePath) {
  const fs = await import("node:fs/promises");
  const sql = await fs.readFile(filePath, "utf8");
  
  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      // 整个 .sql 文件作为单条 simple query 交 PostgreSQL 服务端解析（正确处理
      // dollar-quoted 块 / 注释 / 字符串——唯一权威 SQL 解析器；设计 §6.0）。
      // 迁移文件须为纯字面量、不用参数占位符（simple query 多语句不支持 $1/$2）。
      if (sql.trim()) {
        await client.query(sql);
      }
      await client.query(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)",
        [version, path.basename(filePath), new Date().toISOString()]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}

export async function getMigrationStatus() {
  await ensureMigrationTable();
  const result = await withClient(async (client) => {
    return client.query("SELECT version, name, applied_at FROM schema_migrations ORDER BY version");
  });
  const migrationFiles = await listMigrationFiles();
  return {
    applied: result.rows,
    pending: migrationFiles.length - result.rows.length,
    total: migrationFiles.length,
  };
}