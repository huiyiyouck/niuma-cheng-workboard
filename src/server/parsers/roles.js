import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseListFields } from "./markdown-table.js";

const ROLE_DISPLAY = {
  pm: "PM",
  ui: "UI",
  architect: "Architect",
  developer: "Developer",
  tester: "Tester",
  devops: "DevOps",
  wm: "WM",
};
const DISPLAY_ORDER = ["PM", "UI", "Architect", "Developer", "Tester", "DevOps", "WM"];
// 文件形态优先级：current > summary > {role}.md；archive / corrections 不默认读取
const VARIANT_PRIORITY = { current: 3, summary: 2, plain: 1 };

/**
 * 解析单个角色日志文本，提取最近一个 `## YYYY-MM-DD` 段落的关键字段。
 * @returns {{ recentAction: string|null, nextStep: string|null, note: string|null }}
 */
export function parseRoleLog(text) {
  const lines = text.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) return { recentAction: null, nextStep: null, note: null };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const fields = parseListFields(lines.slice(start + 1, end).join("\n"));
  return {
    recentAction: fields["结论"] ?? null,
    nextStep: fields["下一步入口"] ?? null,
    note: fields["遗留问题/风险"] ?? null,
  };
}

/**
 * 读取项目 roles 目录，按角色聚合最近状态。
 * roles 目录不存在 / 不可读时返回空数组（由调用方决定是否记 warning）。
 * @returns {Promise<Array<{role,enabled,sourcePath,recentAction,nextStep,status}>>}
 */
export async function readRoleSummaries(rolesDir) {
  let files;
  try {
    files = await readdir(rolesDir);
  } catch {
    return [];
  }

  const groups = new Map(); // role -> { pri, file }
  for (const f of files) {
    const m = /^([a-z]+)(?:-(current|summary|archive|corrections))?\.md$/.exec(f);
    if (!m) continue;
    const role = m[1];
    const variant = m[2] ?? "plain";
    if (variant === "archive" || variant === "corrections") continue;
    const pri = VARIANT_PRIORITY[variant];
    const cur = groups.get(role);
    if (!cur || pri > cur.pri) groups.set(role, { pri, file: f });
  }

  const out = [];
  for (const [role, info] of groups) {
    const sourcePath = path.join(rolesDir, info.file);
    let recentAction = null;
    let nextStep = null;
    let status = "ok";
    try {
      const text = await readFile(sourcePath, "utf8");
      const parsed = parseRoleLog(text);
      recentAction = parsed.recentAction;
      nextStep = parsed.nextStep;
    } catch {
      status = "read-error";
    }
    out.push({
      role: ROLE_DISPLAY[role] ?? role,
      enabled: true,
      sourcePath,
      recentAction,
      nextStep,
      status,
    });
  }

  out.sort((a, b) => rank(a.role) - rank(b.role));
  return out;
}

function rank(role) {
  const i = DISPLAY_ORDER.indexOf(role);
  return i === -1 ? 99 : i;
}
