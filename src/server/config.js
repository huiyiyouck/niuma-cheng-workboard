import { readFile } from "node:fs/promises";
import path from "node:path";
import { makeError, SEVERITY } from "./errors.js";

export const PROJECT_KINDS = ["workflow-source", "business", "coordination", "workboard"];
const ID_PATTERN = /^[a-z0-9_-]+$/;

/**
 * 根配置加载失败（文件不可读 / JSON 语法错误）。
 * 设计契约：仅此类失败导致 /api/snapshot 返回 HTTP 500，前端显示整页读取异常。
 */
export class ConfigLoadError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ConfigLoadError";
    this.cause = cause;
  }
}

/**
 * 读取并解析 projects.config.json。只负责加载与 JSON 解析；
 * schema 校验（id 唯一、kind 枚举、路径解析等）由 validateConfig 负责。
 */
export async function loadConfig(configPath) {
  let raw;
  try {
    raw = await readFile(configPath, "utf8");
  } catch (err) {
    throw new ConfigLoadError(`无法读取配置文件: ${configPath}`, err);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new ConfigLoadError(`配置文件 JSON 解析失败: ${configPath}`, err);
  }
}

/**
 * refresh.interval_seconds 缺省 60；非数字或 < 5 回退 60。
 * （回退时是否给诊断 warning 由调用方决定。）
 */
export function normalizeInterval(value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 5) return 60;
  return value;
}

/**
 * 把配置中的 path 解析为绝对路径字符串（纯函数，不触碰文件系统）。
 * 解析顺序：${PROJECT_HOME} 展开 → 绝对路径原样 → 相对路径以配置目录为基准。
 * 是否真实存在（realpath / exists）由聚合阶段做诊断，不在此判断。
 *
 * @returns {{ path: string|null, error: {code,message}|null }}
 */
export function resolveProjectPath(rawPath, { configDir, env = process.env }) {
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return { path: null, error: { code: "config-error", message: "path 缺失或非字符串" } };
  }
  let p = rawPath;
  if (p.includes("${PROJECT_HOME}")) {
    const home = env.PROJECT_HOME;
    if (!home) {
      return {
        path: null,
        error: { code: "config-error", message: "path 含 ${PROJECT_HOME} 但环境变量未设置" },
      };
    }
    p = p.replaceAll("${PROJECT_HOME}", home);
  }
  if (path.isAbsolute(p)) return { path: p, error: null };
  return { path: path.resolve(configDir, p), error: null };
}

/**
 * 校验并规范化配置。
 *
 * 整批失败（抛 ConfigLoadError → HTTP 500）：根不是对象、projects 不是非空数组——
 * 此时无法生成任何项目快照。
 *
 * 配置级降级（不整批失败，仅该项目 / 区域标异常）：单项目 id 缺失或非法、id 重复、
 * kind 非枚举、path 缺失或 ${PROJECT_HOME} 未设置、coordination.project_id 指向无效——
 * 这些写入对应项目 errors 或返回 warning，其余项目正常渲染（AC-7.2）。
 *
 * @returns {{ projects: NormalizedProject[], refreshIntervalSeconds: number,
 *   refreshWarning: object|null, coordinationProjectId: string|null,
 *   coordinationWarning: object|null }}
 */
export function validateConfig(raw, { configPath, env = process.env }) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ConfigLoadError(`配置根必须是对象: ${configPath}`);
  }
  if (!Array.isArray(raw.projects) || raw.projects.length === 0) {
    throw new ConfigLoadError(`projects 必须是非空数组: ${configPath}`);
  }
  // v0.2 §6.1 迁移护栏：ecosystem.root_session_id 已废弃，存在则报错退出，强制手动删除
  if (raw.ecosystem && Object.prototype.hasOwnProperty.call(raw.ecosystem, "root_session_id")) {
    throw new ConfigLoadError(`ecosystem.root_session_id 已废弃（v0.2 §6.1），请从 ${configPath} 删除该字段`);
  }

  const configDir = path.dirname(configPath);
  const intervalRaw = raw?.refresh?.interval_seconds;
  const refreshIntervalSeconds = normalizeInterval(intervalRaw);
  const refreshWarning =
    intervalRaw !== undefined && refreshIntervalSeconds !== intervalRaw
      ? makeError({
          code: "config-warning",
          message: `refresh.interval_seconds=${intervalRaw} 非法，已回退 ${refreshIntervalSeconds}`,
          severity: SEVERITY.WARNING,
          sourcePath: configPath,
        })
      : null;

  const seenIds = new Set();
  const projects = raw.projects.map((p, idx) => {
    const errors = [];
    const rawId = typeof p?.id === "string" ? p.id : null;
    let id = rawId;
    if (!rawId || !ID_PATTERN.test(rawId)) {
      id = null;
      errors.push(
        makeError({
          code: "config-error",
          message: `项目[${idx}] id 缺失或非法（需匹配 [a-z0-9_-]+）`,
          sourcePath: configPath,
        }),
      );
    } else if (seenIds.has(rawId)) {
      errors.push(
        makeError({ code: "config-error", message: `项目 id 重复: ${rawId}`, sourcePath: configPath }),
      );
    } else {
      seenIds.add(rawId);
    }

    if (!PROJECT_KINDS.includes(p?.kind)) {
      errors.push(
        makeError({
          code: "config-error",
          message: `项目 ${rawId ?? idx} kind 非法: ${p?.kind}`,
          sourcePath: configPath,
        }),
      );
    }

    const { path: resolvedPath, error: pathErr } = resolveProjectPath(p?.path, { configDir, env });
    if (pathErr) {
      errors.push(makeError({ ...pathErr, sourcePath: configPath }));
    }

    return {
      id: id ?? `__invalid_${idx}__`,
      name: typeof p?.name === "string" ? p.name : (rawId ?? `项目${idx}`),
      rawPath: typeof p?.path === "string" ? p.path : null,
      kind: PROJECT_KINDS.includes(p?.kind) ? p.kind : null,
      enabled: p?.enabled !== false,
      url: typeof p?.url === "string" ? p.url : null,
      resolvedPath,
      errors,
    };
  });

  const coordProjects = projects.filter((p) => p.kind === "coordination");
  const explicitCoord = raw?.coordination?.project_id;
  let coordinationProjectId = coordProjects[0]?.id ?? null;
  let coordinationWarning = null;
  if (explicitCoord) {
    const match = projects.find((p) => p.id === explicitCoord && p.kind === "coordination");
    if (match) {
      coordinationProjectId = match.id;
    } else {
      coordinationWarning = makeError({
        code: "config-warning",
        message: `coordination.project_id=${explicitCoord} 未指向有效 coordination 项目，已回退首个`,
        severity: SEVERITY.WARNING,
        sourcePath: configPath,
      });
    }
  }

  return { projects, refreshIntervalSeconds, refreshWarning, coordinationProjectId, coordinationWarning };
}
