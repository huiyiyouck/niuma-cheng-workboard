import { findSection, parseFirstTable, parseListFields } from "./markdown-table.js";
import { makeError, SEVERITY } from "../errors.js";

/**
 * 完成态判定（设计 2.2）。状态文本包含完成标记视为完成，从待办汇总中剔除。
 * 注意先排除「未完成」，避免「完成」子串误命中。
 */
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

/**
 * 解析 business / workboard 项目的 INDEX.md。
 *
 * @returns {{
 *   iteration: string|null, mode: string|null, phase: string|null,
 *   blocked: string|null, nextStep: string|null,
 *   todos: Array<{priority,text,role,status}>,
 *   errors: object[]
 * }}
 */
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
