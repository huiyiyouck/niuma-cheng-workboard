/**
 * US-5 迭代归属重建（设计 §2.3 / §4.3）：
 * 从项目仓 `.git` 的 INDEX.md 提交历史重建「当前迭代」活跃区间，
 * 用会话时间（last_message_at）落区间得出「尽力而为」的迭代标签。
 * 对被监控项目仓只读（git log / git show），不触碰工作区、不写。
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const INDEX_REL = "docs/progress/INDEX.md";

/** 从 INDEX 全文抽「当前迭代」值；「无」/ 空 / 缺字段 → null。 */
export function parseCurrentIteration(text) {
  const m = /当前迭代[：:]\s*(.+)/.exec(text ?? "");
  if (!m) return null;
  const raw = m[1].trim();
  if (raw === "" || raw.startsWith("无")) return null;
  // 提取版本号 token（如「v0.2（进行中）」→ v0.2）；无 vX.Y 形态则取整段
  const v = /v\d+(?:\.\d+)*/i.exec(raw);
  return v ? v[0] : raw;
}

/**
 * 变化点切区间：entries 按时间升序 [{ time, iteration }]。
 * 返回 [{ version, startAt, endAt }]，最新区间 endAt = null（至今）。
 */
export function buildIntervals(entries) {
  const intervals = [];
  for (const e of entries ?? []) {
    const last = intervals[intervals.length - 1];
    if (last && last.version === e.iteration) continue; // 同值不切
    if (last) last.endAt = e.time;
    intervals.push({ version: e.iteration, startAt: e.time, endAt: null });
  }
  return intervals;
}

/** 会话时间落区间：[startAt, endAt)。落空 / 非法输入 → null。 */
export function matchIteration(intervals, isoTime) {
  const t = Date.parse(isoTime ?? "");
  if (Number.isNaN(t)) return null;
  for (const iv of intervals ?? []) {
    const start = Date.parse(iv.startAt);
    const end = iv.endAt === null ? Infinity : Date.parse(iv.endAt);
    if (t >= start && t < end) return iv.version;
  }
  return null;
}

/**
 * 读某项目仓 INDEX.md 的 git 历史 → 区间列表。
 * git 失败（非 git 仓 / 无 INDEX 历史 / 权限）→ 返回 []（§4.3 降级：标签全 null，不抛错）。
 */
export async function readIterationIntervals(repoPath) {
  let log;
  try {
    ({ stdout: log } = await execFileAsync(
      "git",
      ["-C", repoPath, "log", "--reverse", "--format=%H|%cI", "--", INDEX_REL],
      { timeout: 15000, maxBuffer: 1024 * 1024 },
    ));
  } catch {
    return [];
  }
  const commits = log
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [sha, time] = l.split("|");
      return { sha, time };
    })
    .filter((c) => c.sha && c.time);

  const entries = [];
  for (const c of commits) {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", repoPath, "show", `${c.sha}:${INDEX_REL}`],
        { timeout: 15000, maxBuffer: 4 * 1024 * 1024 },
      );
      entries.push({ time: c.time, iteration: parseCurrentIteration(stdout) });
    } catch {
      // 单 commit 读失败（如该版本无此文件）：跳过，不中断整条历史
    }
  }
  return buildIntervals(entries);
}

// ---------- 按仓缓存（设计 §4.3：key = repo + INDEX 最新 sha；TTL 内不重查 sha） ----------

const CACHE_TTL_MS = 30_000;
const _cache = new Map(); // repoPath → { checkedAt, headSha, intervals }

async function latestIndexSha(repoPath) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", repoPath, "log", "-1", "--format=%H", "--", INDEX_REL],
      { timeout: 10000 },
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/** 带缓存读区间；供 handler 每请求调用而不必每次重跑 git 历史。 */
export async function getIterationIntervals(repoPath) {
  const now = Date.now();
  const hit = _cache.get(repoPath);
  if (hit && now - hit.checkedAt < CACHE_TTL_MS) return hit.intervals;

  const headSha = await latestIndexSha(repoPath);
  if (hit && headSha && hit.headSha === headSha) {
    hit.checkedAt = now;
    return hit.intervals;
  }
  const intervals = headSha === null ? [] : await readIterationIntervals(repoPath);
  _cache.set(repoPath, { checkedAt: now, headSha, intervals });
  return intervals;
}

/** 测试/sync 后刷新用：清空缓存。 */
export function clearIterationCache() {
  _cache.clear();
}
