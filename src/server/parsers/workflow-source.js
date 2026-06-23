import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * 解析 workflow-source 项目（设计 4.3）。
 * 不要求 INDEX.md：目录存在即接入；若有 docs/ROADMAP.md / docs/baseline / docs/templates，
 * 生成「工作流真源」摘要。不展示角色看板。
 *
 * @returns {Promise<{ summary: string|null, checks: Record<string,boolean> }>}
 */
export async function readWorkflowSource(projectDir) {
  const probes = ["docs/ROADMAP.md", "docs/baseline", "docs/templates"];
  const checks = {};
  for (const rel of probes) {
    checks[rel] = await pathExists(path.join(projectDir, rel));
  }

  let summary = null;
  if (checks["docs/ROADMAP.md"]) {
    try {
      const text = await readFile(path.join(projectDir, "docs/ROADMAP.md"), "utf8");
      summary = firstHeading(text);
    } catch {
      /* ROADMAP 读失败：回退到目录探测摘要 */
    }
  }
  if (!summary) {
    const parts = [];
    if (checks["docs/baseline"]) parts.push("baseline");
    if (checks["docs/templates"]) parts.push("templates");
    summary = parts.length ? `工作流真源（含 ${parts.join(" / ")}）` : null;
  }

  return { summary, checks };
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function firstHeading(text) {
  const m = /^#\s+(.*)$/m.exec(text || "");
  return m ? m[1].trim() : null;
}
