import { findSection, parseFirstTable } from "./markdown-table.js";
import { makeError, SEVERITY } from "../errors.js";

// 按插入顺序做 includes 匹配：否定词（不通过/未通过）必须排在「通过」之前，防止误判
const STAGE_STATUS_MAP = {
  "已跳过": "skipped",
  "跳过": "skipped",
  "已定稿": "finalized",
  "✅": "finalized",
  "已完成": "completed",
  "不通过": "blocked",
  "未通过": "blocked",
  "待修正": "blocked",
  "阻塞": "blocked",
  "通过": "finalized",
  "待 Review": "in_review",
  "待Review": "in_review",
  "Review中": "in_review",
  "Review 中": "in_review",
  "已Review": "in_review",
  "进行中": "in_progress",
  "🔵": "in_progress",
  "未开始": "not_started",
  "待启动": "not_started",
};

const STAGE_NAME_NORMALIZE = {
  "PRD": "prd",
  "设计": "design",
  "实现": "implementation",
  "测试": "testing",
  "部署就绪检查": "deploy_check",
  "迭代关闭": "iteration_close",
  "收尾": "wrap_up",
  "UI 方案": "ui_design",
  "UI设计": "ui_design",
  "需求评审": "prd_review",
};

// 当前标准阶段名（去掉「阶段」后缀后精确匹配）；不在此集合的三级标题降级为附加记录。
// UI 方案（BCR-004 并入 PRD）、测试（BCR-006 并入 Developer 自测）已非独立标准阶段，
// 老迭代记录里仍有的这些小节按附加记录展示，不计入标准流水线进度（Owner 2026-07-06 拍板）。
const STANDARD_STAGE_NAMES = new Set([
  "PRD", "设计", "实现",
  "部署就绪检查", "部署", "迭代关闭", "关闭", "收尾", "收尾归档", "需求评审",
]);

function isStandardStage(rawName) {
  if (!rawName) return false;
  return STANDARD_STAGE_NAMES.has(rawName.trim().replace(/阶段$/, "").trim());
}

function normalizeStageStatus(text) {
  if (!text) return "unknown";
  const t = text.trim();
  for (const [key, val] of Object.entries(STAGE_STATUS_MAP)) {
    if (t.includes(key)) return val;
  }
  return "unknown";
}

function normalizeStageName(rawName) {
  if (!rawName) return "unknown";
  const n = rawName.trim().replace(/阶段$/, "");
  for (const [key, val] of Object.entries(STAGE_NAME_NORMALIZE)) {
    if (n.includes(key)) return val;
  }
  return n.toLowerCase().replace(/\s+/g, "_");
}

function extractSummary(stageSection) {
  if (!stageSection) return null;
  const lines = stageSection.split(/\r?\n/);
  const textLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("|")) continue;
    if (trimmed.startsWith("#")) continue;
    textLines.push(trimmed);
    if (textLines.length >= 5) break;
  }
  return textLines.join(" ") || null;
}

export function parseIterationRecord(markdown, { sourcePath = null, version = null } = {}) {
  const errors = [];

  const gateSection = findSection(markdown, "## 阶段门禁");
  if (!gateSection) {
    return {
      version,
      stages: [],
      summary: null,
      errors: [
        makeError({ code: "parse-warning", message: "未找到「## 阶段门禁」区域", severity: SEVERITY.WARNING, sourcePath }),
      ],
    };
  }

  const stageHeadings = [];
  const lines = gateSection.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^###\s+(.*)$/.exec(lines[i]);
    if (m) {
      stageHeadings.push({ name: m[1].trim(), startLine: i });
    }
  }

  const stages = [];
  for (let i = 0; i < stageHeadings.length; i++) {
    const { name, startLine } = stageHeadings[i];
    const endLine = i + 1 < stageHeadings.length ? stageHeadings[i + 1].startLine : lines.length;
    const stageSection = lines.slice(startLine + 1, endLine).join("\n");

    const table = parseFirstTable(stageSection);
    let status = "unknown";
    let reviewResult = null;

    if (table) {
      // 多轮门禁表按轮次追加（R1/R2/...），当前状态在最后一行
      const lastRow = table.rows[table.rows.length - 1];
      if (!lastRow) {
        // 只有表头无数据行 = 阶段尚未启动
        status = "not_started";
      } else {
        // 部分阶段（如部署就绪检查）表格用「状态」列而非「阶段状态」列
        const statusCell = lastRow["阶段状态"] ?? lastRow["状态"];
        if (statusCell !== undefined) {
          status = normalizeStageStatus(statusCell);
        }
        const reviewCell = lastRow["Review 结果"];
        if (reviewCell !== undefined) {
          reviewResult = reviewCell.trim();
        }
      }
    }

    const standard = isStandardStage(name);
    // 附加记录不走 includes 归一化（防止「PRD 讨论记录」撞标准阶段 id prd），直接用原文 slug
    const stageKey = standard ? normalizeStageName(name) : name.trim().toLowerCase().replace(/\s+/g, "_");
    stages.push({
      id: stageKey,
      name,
      standard,
      status,
      reviewResult,
      summary: extractSummary(stageSection),
    });
  }

  const standardStages = stages.filter((s) => s.standard);
  const currentStage = standardStages.find((s) => s.status === "in_progress" || s.status === "in_review")
    ?? standardStages.find((s) => s.status === "blocked")
    ?? null;

  const summary = buildRecordSummary(markdown, version, stages);

  return { version, stages, currentStage, summary, errors };
}

function buildRecordSummary(markdown, version, stages) {
  // 统计只算标准阶段，附加记录不计入进度
  const standardStages = stages.filter((s) => s.standard);
  const completed = standardStages.filter((s) => s.status === "finalized" || s.status === "completed").length;
  const total = standardStages.length;
  const isClosed = standardStages.some((s) => s.id === "iteration_close" && (s.status === "finalized" || s.status === "completed"));
  const blocked = standardStages.find((s) => s.status === "blocked")?.name ?? null;

  return {
    version,
    completedCount: completed,
    totalStages: total,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    isClosed,
    blockedStage: blocked,
  };
}
