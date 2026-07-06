import { findSection, parseFirstTable, parseListFields } from "./markdown-table.js";
import { makeError, SEVERITY } from "../errors.js";

const DONE_MARKERS = ["已完成", "已关闭", "已归档", "✅"];

export function isTodoDone(status) {
  if (!status) return false;
  const s = status.trim();
  if (s.includes("未完成")) return false;
  if (DONE_MARKERS.some((m) => s.includes(m))) return true;
  return s.includes("完成");
}

function normalizeBlocked(value) {
  if (!value) return null;
  const v = value.trim();
  if (v === "" || v === "无") return null;
  return v;
}

const STATUS_MAP = {
  "进行中": "in_progress",
  "已完成": "completed",
  "已关闭": "completed",
  "已归档": "archived",
  "未开始": "not_started",
  "规划中": "planned",
  "已暂停": "paused",
  "阻塞": "blocked",
};

function normalizeStatus(text) {
  if (!text) return "unknown";
  const t = text.trim();
  for (const [key, val] of Object.entries(STATUS_MAP)) {
    if (t.includes(key)) return val;
  }
  return "unknown";
}

// 语义版本比较：vX.Y[.Z...] 拆成数字段逐段比较（非数字段按 0），保证 v0.6.1 排在 v0.6 后、v0.10 排在 v0.9 后。
function compareVersions(a, b) {
  const key = (v) => String(v).trim().replace(/^v/i, "").split(".").map((x) => {
    const n = parseInt(x, 10);
    return Number.isNaN(n) ? 0 : n;
  });
  const ka = key(a), kb = key(b);
  const len = Math.max(ka.length, kb.length);
  for (let i = 0; i < len; i++) {
    const d = (ka[i] ?? 0) - (kb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function parseVersionList(markdown, { sourcePath = null } = {}) {
  const errors = [];
  const section = findSection(markdown, "## 版本列表");
  if (!section) {
    return { versions: [], errors: [
      makeError({ code: "parse-warning", message: "未找到「## 版本列表」区域", severity: SEVERITY.WARNING, sourcePath }),
    ]};
  }
  const table = parseFirstTable(section);
  if (!table) {
    return { versions: [], errors: [
      makeError({ code: "parse-warning", message: "版本列表区域无表格", severity: SEVERITY.WARNING, sourcePath }),
    ]};
  }
  const hasVersion = table.headers.includes("版本");
  const hasStatus = table.headers.includes("状态");
  if (!hasVersion) {
    return { versions: [], errors: [
      makeError({ code: "read-error", message: "版本列表缺少「版本」列", severity: SEVERITY.ERROR, sourcePath }),
    ]};
  }
  const versions = table.rows.map((r) => ({
    version: r["版本"]?.trim() ?? "",
    title: r["主题"]?.trim() ?? r["名称"]?.trim() ?? r["标题"]?.trim() ?? "",
    status: hasStatus ? normalizeStatus(r["状态"]) : "unknown",
    releaseDate: r["发布时间"]?.trim() || r["发布日期"]?.trim() || null,
  })).filter((v) => v.version);
  // 各项目 INDEX.md 版本表书写顺序不统一（xiaobao 正序 / ai 倒序），此处按语义版本号统一升序，
  // 保证时间轴等消费者拿到一致的正序（v0.1 → v0.6.1 → v0.10）。
  versions.sort((a, b) => compareVersions(a.version, b.version));
  return { versions, errors };
}

export function parseProjectIndex(markdown, { sourcePath = null } = {}) {
  const errors = [];

  // 当前项目状态：列表字段
  const statusSection = findSection(markdown, "## 当前项目状态");
  const fields = statusSection ? parseListFields(statusSection) : {};
  if (!statusSection) {
    errors.push(
      makeError({
        code: "parse-warning",
        message: "未找到「## 当前项目状态」区域",
        severity: SEVERITY.WARNING,
        sourcePath,
      }),
    );
  }

  // 跨任务待办：标题区域内第一张表
  const todoSection = findSection(markdown, "## 跨任务待办");
  let todos = [];
  if (todoSection) {
    const table = parseFirstTable(todoSection);
    if (table) {
      if (!table.headers.includes("状态")) {
        // 解析不到状态列：不猜测完成态，降级为 read-error，不汇总待办
        errors.push(
          makeError({
            code: "read-error",
            message: "跨任务待办表缺少「状态」列，无法判定完成态",
            severity: SEVERITY.ERROR,
            sourcePath,
            rawExcerpt: todoSection.slice(0, 300),
          }),
        );
      } else {
        todos = table.rows
          .map((r) => ({
            priority: pickPriority(r["优先级"]),
            text: r["待办"] ?? r["待办事项"] ?? "",
            role: r["归属角色"] ?? null,
            status: r["状态"] ?? "",
          }))
          .filter((t) => !isTodoDone(t.status));
      }
    }
    // 有标题无表格：视为空待办，不报错（设计 6.3）
  }
  // 完全无「跨任务待办」标题：空待办，不报错

  return {
    iteration: emptyToNull(fields["当前迭代"]),
    mode: emptyToNull(fields["当前模式"]),
    phase: emptyToNull(fields["当前阶段"]),
    blocked: normalizeBlocked(fields["阻塞项"]),
    nextStep: emptyToNull(fields["下一步入口"]),
    todos,
    errors,
  };
}

function pickPriority(value) {
  const v = (value ?? "").trim().toUpperCase();
  return ["P0", "P1", "P2"].includes(v) ? v : null;
}

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const v = value.trim();
  return v === "" ? null : v;
}
