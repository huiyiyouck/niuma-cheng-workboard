import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { loadConfig, validateConfig } from "./config.js";
import { makeError, SEVERITY } from "./errors.js";
import { parseProjectIndex } from "./parsers/project-index.js";
import { readRoleSummaries } from "./parsers/roles.js";
import { readCoordination } from "./parsers/coordination.js";
import { readWorkflowSource } from "./parsers/workflow-source.js";
import { makeProjectMatcher } from "./parsers/project-match.js";

const PARSER_NAME = {
  business: "businessParser",
  workboard: "workboardParser",
  coordination: "coordinationParser",
  "workflow-source": "workflowSourceParser",
};

// 各 kind 的文件检查清单
const FILE_SPECS = {
  business: [
    { rel: "docs/progress/INDEX.md", required: true, label: "进度索引" },
    { rel: "docs/progress/roles", required: false, label: "角色日志目录" },
  ],
  workboard: [
    { rel: "docs/progress/INDEX.md", required: true, label: "进度索引" },
    { rel: "docs/progress/roles", required: false, label: "角色日志目录" },
  ],
  coordination: [
    { rel: "REQUESTS.md", required: true, label: "需求池" },
    { rel: "STATUS.md", required: true, label: "跨项目状态" },
    { rel: "contracts", required: false, label: "契约目录" },
    { rel: "communications", required: false, label: "沟通目录" },
  ],
  "workflow-source": [
    { rel: "docs/baseline", required: false, label: "基线目录" },
    { rel: "docs/templates", required: false, label: "模板目录" },
    { rel: "docs/ROADMAP.md", required: false, label: "路线图" },
  ],
};

/**
 * 生成整批看板快照。每次请求现场读取（v0.1 无持久缓存）。
 * 根配置不可读 / JSON 错误 / projects 非数组 → 抛错（index.js 兜底 500）。
 * 单项目 / coordination 区域失败被隔离，不阻断整批（AC-1.2 / AC-7.2 / AC-8.2）。
 */
export async function buildSnapshot({ configPath, env = process.env }) {
  const raw = await loadConfig(configPath);
  const cfg = validateConfig(raw, { configPath, env });
  const matcher = makeProjectMatcher(cfg.projects.map((p) => ({ id: p.id, name: p.name })));

  const diagnostics = [];
  const projects = [];
  const todos = [];
  let crossProject = emptyCrossProject(cfg.coordinationProjectId ? "ok" : "not-configured");

  for (const p of cfg.projects) {
    const { summary, diag, coordinationDir } = await processProject(p, matcher);
    diagnostics.push(diag);

    if (p.kind === "coordination") {
      if (coordinationDir && p.id === cfg.coordinationProjectId) {
        crossProject = await readCoordination(coordinationDir, { resolveProjectIds: matcher });
      }
      continue; // coordination 不进项目卡网格
    }

    if (summary) {
      projects.push(summary);
      todos.push(...summary.todos);
    }
  }

  const summary = {
    activeProjects: projects.filter((p) => p.status === "integrated").length,
    blockedProjects: projects.filter((p) => p.blocked).length,
    abnormalProjects: projects.filter((p) => p.status === "config-error" || p.status === "read-error")
      .length,
    openTodos: todos.length,
  };

  const errors = [];
  if (cfg.refreshWarning) errors.push(cfg.refreshWarning);
  if (cfg.coordinationWarning) errors.push(cfg.coordinationWarning);

  return {
    generatedAt: new Date().toISOString(),
    refreshIntervalSeconds: cfg.refreshIntervalSeconds,
    summary,
    projects,
    diagnostics,
    crossProject,
    todos,
    errors,
  };
}

/**
 * 处理单个配置项目，产出 ProjectSummary（coordination 为 null）与 ProjectDiagnostics。
 */
async function processProject(p, matcher) {
  const errors = [...p.errors];
  const diagBase = {
    id: p.id,
    name: p.name,
    kind: p.kind,
    enabled: p.enabled,
    configPath: p.rawPath,
    resolvedPath: p.resolvedPath,
    parser: PARSER_NAME[p.kind] ?? null,
    fileChecks: [],
    lastReadAt: null,
    errors,
  };

  // 已禁用
  if (!p.enabled) {
    return { summary: nonCoordSummary(p, "disabled", {}, errors), diag: { ...diagBase, status: "disabled" } };
  }
  // 配置层错误（重复 id / 非法 kind / path 缺失等）
  if (p.errors.some((e) => e.code === "config-error") || !p.resolvedPath) {
    return {
      summary: nonCoordSummary(p, "config-error", {}, errors),
      diag: { ...diagBase, status: "config-error" },
    };
  }
  // 路径真实存在性
  let real;
  try {
    real = await realpath(p.resolvedPath);
  } catch {
    errors.push(makeError({ code: "config-error", message: `解析路径不存在: ${p.resolvedPath}`, sourcePath: p.resolvedPath }));
    return {
      summary: nonCoordSummary(p, "config-error", {}, errors),
      diag: { ...diagBase, status: "config-error" },
    };
  }
  diagBase.resolvedPath = real;

  const fileChecks = await checkFiles(real, FILE_SPECS[p.kind] ?? []);
  diagBase.fileChecks = fileChecks;
  diagBase.lastReadAt = new Date().toISOString();

  if (p.kind === "coordination") {
    const requiredMissing = fileChecks.some((c) => c.required && !c.exists);
    const status = requiredMissing ? "read-error" : "integrated";
    if (requiredMissing) {
      errors.push(makeError({ code: "read-error", message: "coordination 缺少必需文件 REQUESTS.md / STATUS.md", sourcePath: real }));
    }
    return { summary: null, diag: { ...diagBase, status }, coordinationDir: requiredMissing ? null : real };
  }

  if (p.kind === "workflow-source") {
    const { summary: kindSummary, detail: workflowDetail } = await readWorkflowSource(real);
    return {
      summary: nonCoordSummary(p, "integrated", { kindSummary, workflowDetail }, errors),
      diag: { ...diagBase, status: "integrated" },
    };
  }

  // business / workboard
  const indexCheck = fileChecks.find((c) => c.rel === "docs/progress/INDEX.md");
  if (!indexCheck?.exists) {
    return { summary: nonCoordSummary(p, "not-bootstrapped", {}, errors), diag: { ...diagBase, status: "not-bootstrapped" } };
  }
  let parsed;
  try {
    const md = await readFile(path.join(real, "docs/progress/INDEX.md"), "utf8");
    parsed = parseProjectIndex(md, { sourcePath: path.join(real, "docs/progress/INDEX.md") });
  } catch {
    errors.push(makeError({ code: "read-error", message: "INDEX.md 读取失败", sourcePath: real }));
    return { summary: nonCoordSummary(p, "read-error", {}, errors), diag: { ...diagBase, status: "read-error" } };
  }
  errors.push(...parsed.errors);

  const roles = await readRoleSummaries(path.join(real, "docs/progress/roles"));
  const fullTodos = parsed.todos.map((t, i) => ({
    id: `${p.id}-todo-${i}`,
    priority: t.priority,
    text: t.text,
    projectId: p.id,
    projectName: p.name,
    role: t.role,
    status: t.status,
    sourcePath: path.join(real, "docs/progress/INDEX.md"),
  }));

  const status = parsed.errors.some((e) => e.code === "read-error") ? "read-error" : "integrated";
  return {
    summary: nonCoordSummary(
      p,
      status,
      {
        iteration: parsed.iteration,
        mode: parsed.mode,
        phase: parsed.phase,
        blocked: parsed.blocked,
        nextStep: parsed.nextStep,
        roles,
        todos: fullTodos,
      },
      errors,
    ),
    diag: { ...diagBase, status },
  };
}

function nonCoordSummary(p, status, data, errors) {
  const errorEntry = errors.find((e) => e.severity === SEVERITY.ERROR);
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    status,
    iteration: data.iteration ?? null,
    mode: data.mode ?? null,
    phase: data.phase ?? null,
    blocked: data.blocked ?? null,
    nextStep: data.nextStep ?? null,
    kindSummary: data.kindSummary ?? null,
    workflowDetail: data.workflowDetail ?? null,
    url: p.url,
    roles: data.roles ?? [],
    todos: data.todos ?? [],
    errorSummary: errorEntry ? errorEntry.message : null,
  };
}

async function checkFiles(baseDir, specs) {
  const checks = [];
  for (const spec of specs) {
    const full = path.join(baseDir, spec.rel);
    let exists = false;
    try {
      await stat(full);
      exists = true;
    } catch {
      exists = false;
    }
    checks.push({ path: spec.rel, rel: spec.rel, required: spec.required, exists, readable: exists, label: spec.label });
  }
  return checks;
}

function emptyCrossProject(status) {
  return {
    status,
    activeRequestCount: 0,
    blockerCount: 0,
    contractCount: 0,
    communicationCount: 0,
    bcrCount: 0,
    highlightRequests: [],
    blockers: [],
    requests: [],
    bcrs: [],
    communications: [],
    errors: [],
  };
}
