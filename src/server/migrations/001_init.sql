-- 001_init - 初始 schema（v0.2 会话同步 + PostgreSQL）
-- 注意：使用 IF NOT EXISTS / ADD COLUMN IF NOT EXISTS 确保对已有数据的兼容

-- claude_sessions: 会话元数据表
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
  role_confidence REAL,
  source TEXT NOT NULL DEFAULT 'claude-code'
);

-- claude_sessions 索引
CREATE INDEX IF NOT EXISTS idx_claude_sessions_project_id ON claude_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_claude_sessions_last_message_at ON claude_sessions(last_message_at DESC);

-- claude_messages: 消息内容表
CREATE TABLE IF NOT EXISTS claude_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES claude_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  has_tool_use SMALLINT NOT NULL DEFAULT 0,
  tool_name TEXT,
  has_thinking SMALLINT NOT NULL DEFAULT 0
);

-- claude_messages 索引
CREATE INDEX IF NOT EXISTS idx_claude_messages_session_id ON claude_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_claude_messages_created_at ON claude_messages(created_at);

-- session_mappings: 角色映射表
CREATE TABLE IF NOT EXISTS session_mappings (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES claude_sessions(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- session_mappings 唯一约束：每个项目的每个角色只能映射一个会话
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_mappings_project_id_role_key') THEN
    ALTER TABLE session_mappings ADD CONSTRAINT session_mappings_project_id_role_key UNIQUE (project_id, role);
  END IF;
END $$;

-- session_mappings 索引
CREATE INDEX IF NOT EXISTS idx_session_mappings_project_id ON session_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_session_mappings_role ON session_mappings(role);