-- 002_session_role_model - M-1 会话角色归属存储模型
-- session_mappings（1:1 映射表）→ claude_sessions.manual_role（内联列，天然 1:N）
-- 依赖 §6.0 迁移引擎修复（整文件 client.query 交 PG 解析）方能在全新库可靠执行。
-- 纯字面量 SQL、不用参数占位符（simple query 约束，设计 §6.0）。

-- 1) 新增 manual_role 列（手动打标签 US-10 的角色覆盖；NULL = 未手动纠正）
ALTER TABLE claude_sessions ADD COLUMN IF NOT EXISTS manual_role TEXT;

-- 2) 迁移 v0.2 手动映射：session_mappings.role → claude_sessions.manual_role
--    幂等（manual_role IS NULL 才写）；project_id 冗余丢弃，角色维由 session 承载。
--    全新库：session_mappings 为空、迁移 0 行；存量库：迁移现有手动映射。
UPDATE claude_sessions s
   SET manual_role = m.role
  FROM session_mappings m
 WHERE s.id = m.session_id
   AND s.manual_role IS NULL;

-- 3) 废弃 1:1 映射表（数据已在步骤 2 迁移进 manual_role）。
--    DROP 不可逆——生产迁移前须 pg_dump session_mappings 兜底（OPS-1，部署就绪检查）。
DROP TABLE IF EXISTS session_mappings;
