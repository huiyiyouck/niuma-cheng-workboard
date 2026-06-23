import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { findSection, parseFirstTable, parseListFields } from "./markdown-table.js";
import { makeError, SEVERITY } from "../errors.js";

// 需求终态 / BCR 终态（设计 4.6）
const REQUEST_CLOSED = ["已关闭"];
const BCR_TERMINAL = ["已回流下游", "已拒绝", "转 v2 候选"];

/**
 * 解析 REQUESTS.md：需求池 → CrossProjectRequest[]，基线修正提案池 → BcrItem[]。
 */
export function parseRequests(text, { sourcePath = null, resolveProjectIds = () => [] } = {}) {
  const errors = [];

  const reqSection = findSection(text, "## 需求池");
  const reqTable = reqSection ? parseFirstTable(reqSection) : null;
  const requests = (reqTable?.rows ?? []).map((r) => {
    const sourceLabel = emptyToNull(r["提出方"]);
    const targetLabel = emptyToNull(r["承接方"]);
    return {
      id: stripLink(r["需求 id"] ?? r["需求id"] ?? ""),
      title: r["内容"] ?? "",
      sourceLabel,
      targetLabel,
      sourceProjectIds: resolveProjectIds(sourceLabel),
      targetProjectIds: resolveProjectIds(targetLabel),
      targetIteration: emptyToNull(r["转入迭代"]),
      status: r["状态"] ?? "",
      communicationPath: extractLinkPath(r["沟通文档"]),
    };
  });
  if (reqSection && !reqTable) {
    errors.push(
      makeError({
        code: "read-error",
        message: "「## 需求池」区域未解析到表格",
        severity: SEVERITY.ERROR,
        sourcePath,
        rawExcerpt: reqSection.slice(0, 300),
      }),
    );
  }

  const bcrSection = findSection(text, "## 基线修正提案池");
  const bcrTable = bcrSection ? parseFirstTable(bcrSection) : null;
  const bcrs = (bcrTable?.rows ?? []).map((r) => ({
    id: stripLink(r["BCR id"] ?? ""),
    summary: r["摘要"] ?? "",
    target: emptyToNull(r["影响范围"]),
    status: r["状态"] ?? "",
    sourcePath,
  }));

  return { requests, bcrs, errors };
}

/**
 * 解析 STATUS.md「## 跨项目阻塞与谁等谁」下的 ### 小节为活跃阻塞。
 * 含「谁等谁：无」或「状态：已完成」的条目视为非活跃，不计入。
 */
export function parseStatus(text, { sourcePath = null } = {}) {
  const errors = [];
  const section = findSection(text, "## 跨项目阻塞与谁等谁");
  if (!section) return { blockers: [], errors };

  const blockers = [];
  for (const sub of splitSubsections(section, 3)) {
    const f = parseListFields(sub.body);
    const status = f["状态"] ?? "";
    const waitingOn = emptyToNull(f["谁等谁"]);
    const inactive = (waitingOn && waitingOn.includes("无")) || status.includes("已完成");
    if (inactive) continue;
    blockers.push({
      title: sub.title,
      status,
      waitingOn,
      nextOwner: emptyToNull(f["下一步责任"]),
      sourcePath,
    });
  }
  return { blockers, errors };
}

/**
 * 读取整个 coordination 仓，聚合为 CrossProjectSummary 数据。
 */
export async function readCoordination(coordDir, { resolveProjectIds = () => [] } = {}) {
  const errors = [];
  const requestsPath = path.join(coordDir, "REQUESTS.md");
  const statusPath = path.join(coordDir, "STATUS.md");

  let requests = [];
  let bcrs = [];
  let requestsFailed = false;
  try {
    const text = await readFile(requestsPath, "utf8");
    const parsed = parseRequests(text, { sourcePath: requestsPath, resolveProjectIds });
    requests = parsed.requests;
    bcrs = parsed.bcrs;
    errors.push(...parsed.errors);
  } catch {
    requestsFailed = true;
    errors.push(makeError({ code: "read-error", message: "REQUESTS.md 不可读", sourcePath: requestsPath }));
  }

  let blockers = [];
  let statusFailed = false;
  try {
    const text = await readFile(statusPath, "utf8");
    const parsed = parseStatus(text, { sourcePath: statusPath });
    blockers = parsed.blockers;
    errors.push(...parsed.errors);
  } catch {
    statusFailed = true;
    errors.push(makeError({ code: "read-error", message: "STATUS.md 不可读", sourcePath: statusPath }));
  }

  const contractCount = await countMarkdown(path.join(coordDir, "contracts"));
  const { count: communicationCount, items: communications } = await readCommunications(
    path.join(coordDir, "communications"),
  );

  const activeRequests = requests.filter((r) => !hasAny(r.status, REQUEST_CLOSED));
  const status = requestsFailed && statusFailed ? "read-error" : "ok";

  return {
    status,
    activeRequestCount: activeRequests.length,
    blockerCount: blockers.length,
    contractCount,
    communicationCount,
    bcrCount: bcrs.length,
    highlightRequests: activeRequests,
    blockers,
    requests,
    bcrs,
    communications,
    errors,
  };
}

export function isBcrTerminal(status) {
  return hasAny(status, BCR_TERMINAL);
}

// ---------- helpers ----------

async function countMarkdown(dir) {
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.endsWith(".md") && f !== "README.md").length;
  } catch {
    return 0;
  }
}

async function readCommunications(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return { count: 0, items: [] };
  }
  const mdFiles = files.filter((f) => f.endsWith(".md") && f !== "README.md");
  const items = [];
  for (const f of mdFiles) {
    const sourcePath = path.join(dir, f);
    let text = "";
    try {
      text = await readFile(sourcePath, "utf8");
    } catch {
      /* 单文件读失败：摘要留空，不阻断 */
    }
    items.push({
      id: f.replace(/\.md$/, ""),
      reqId: extractReqId(f, text),
      projects: parseParticipants(text),
      summary: firstHeading(text),
      sourcePath,
    });
  }
  return { count: mdFiles.length, items };
}

function splitSubsections(text, level) {
  const lines = text.split(/\r?\n/);
  const subs = [];
  let cur = null;
  for (const line of lines) {
    const hm = /^(#+)\s+(.*)$/.exec(line);
    if (hm && hm[1].length === level) {
      if (cur) subs.push(cur);
      cur = { title: hm[2].trim().replace(/^\d+\.\s*/, ""), body: "" };
    } else if (cur) {
      cur.body += line + "\n";
    }
  }
  if (cur) subs.push(cur);
  return subs;
}

function parseParticipants(text) {
  const m = /^-\s*参与项目[：:]\s*(.*)$/m.exec(text);
  if (!m) return [];
  const ids = [];
  const re = /`([^`]+)`/g;
  let mm;
  while ((mm = re.exec(m[1]))) ids.push(mm[1]);
  return ids;
}

function extractReqId(fileName, text) {
  const m = /REQ-\d+/.exec(fileName) || /REQ-\d+/.exec(text || "");
  return m ? m[0] : null;
}

function firstHeading(text) {
  const m = /^#\s+(.*)$/m.exec(text || "");
  return m ? m[1].trim() : null;
}

function extractLinkPath(cell) {
  if (!cell) return null;
  const m = /\]\(([^)]+)\)/.exec(cell);
  return m ? m[1] : null;
}

function stripLink(cell) {
  const m = /\[([^\]]+)\]\([^)]+\)/.exec(cell);
  return (m ? m[1] : cell).trim();
}

function hasAny(text, markers) {
  return markers.some((m) => (text ?? "").includes(m));
}

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  return v === "" ? null : v;
}
