import { readFile, stat, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * 解析 workflow-source 项目（设计 4.3 + PM 2026-07-20 深度详情范围）。
 * 不要求 INDEX.md：目录存在即接入；若有 docs/ROADMAP.md / docs/baseline / docs/templates，
 * 生成「工作流真源」摘要。不展示角色看板。
 * 深度详情（全只读，缺失留空不报错）：
 *  - positioning：README.md 首段（第一个非标题段落）
 *  - roadmap：ROADMAP.md 各级标题 [{ level, text }]（路线图骨架）
 *  - baseline：docs/baseline/*.md 清单，按前缀分组 { roles: role-*.md, others: 其余 }
 *  - templates：docs/templates/*.md 清单
 *
 * @returns {Promise<{ summary: string|null, checks: Record<string,boolean>, detail: {
 *   positioning: string|null, roadmap: Array<{level:number,text:string}>,
 *   baseline: { roles: string[], others: string[] }, templates: string[] } }>}
 */
export async function readWorkflowSource(projectDir) {
  const probes = ["docs/ROADMAP.md", "docs/baseline", "docs/templates"];
  const checks = {};
  for (const rel of probes) {
    checks[rel] = await pathExists(path.join(projectDir, rel));
  }

  let summary = null;
  let roadmap = [];
  if (checks["docs/ROADMAP.md"]) {
    try {
      const text = await readFile(path.join(projectDir, "docs/ROADMAP.md"), "utf8");
      summary = firstHeading(text);
      roadmap = parseHeadings(text);
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

  const positioning = await readFirstParagraph(path.join(projectDir, "README.md"));
  const baselineFiles = await listMarkdown(path.join(projectDir, "docs/baseline"));
  const templates = await listMarkdown(path.join(projectDir, "docs/templates"));
  const baseline = {
    roles: baselineFiles.filter((f) => f.startsWith("role-")),
    others: baselineFiles.filter((f) => !f.startsWith("role-")),
  };

  return { summary, checks, detail: { positioning, roadmap, baseline, templates } };
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

/** 各级标题骨架（跳过代码块内的 #） */
function parseHeadings(text) {
  const out = [];
  let inFence = false;
  for (const line of (text || "").split("\n")) {
    if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2].trim() });
  }
  return out;
}

/** 首个非标题、非空段落（定位一句话）；文件缺失/读失败 → null */
async function readFirstParagraph(filePath) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    return null;
  }
  for (const block of text.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || t.startsWith("#") || t.startsWith(">") || t.startsWith("```")) continue;
    return t.replace(/\s*\n\s*/g, " ");
  }
  return null;
}

/** 目录下 .md 文件名清单（排序）；目录缺失 → [] */
async function listMarkdown(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}
