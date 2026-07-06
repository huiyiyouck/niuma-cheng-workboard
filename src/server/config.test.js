import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadConfig,
  validateConfig,
  resolveProjectPath,
  normalizeInterval,
  ConfigLoadError,
} from "./config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../..");
const REAL_CONFIG = path.join(PROJECT_ROOT, "projects.config.json");
const CONFIG_PATH = "/repo/projects.config.json"; // 仅用于 configDir/sourcePath 的虚拟基准

test("loadConfig 读取真实配置并解析为对象", async () => {
  const raw = await loadConfig(REAL_CONFIG);
  assert.ok(Array.isArray(raw.projects));
  assert.equal(raw.projects.length, 5);
});

test("loadConfig 根配置不可读抛 ConfigLoadError", async () => {
  await assert.rejects(() => loadConfig("/no/such/file.json"), ConfigLoadError);
});

test("validateConfig 正常配置：5 项目、无错误、coordination 定位正确", async () => {
  const raw = await loadConfig(REAL_CONFIG);
  const result = validateConfig(raw, { configPath: REAL_CONFIG });
  assert.equal(result.projects.length, 5);
  for (const p of result.projects) {
    assert.deepEqual(p.errors, [], `项目 ${p.id} 不应有配置错误`);
  }
  assert.equal(result.refreshIntervalSeconds, 60);
  assert.equal(result.coordinationProjectId, "coordination");
  const workboard = result.projects.find((p) => p.id === "workboard");
  assert.equal(workboard.resolvedPath, PROJECT_ROOT); // path "." 相对配置目录
});

test("validateConfig 整批失败：空 projects / 非数组 / 根非对象", () => {
  assert.throws(() => validateConfig({ projects: [] }, { configPath: CONFIG_PATH }), ConfigLoadError);
  assert.throws(() => validateConfig({ projects: "x" }, { configPath: CONFIG_PATH }), ConfigLoadError);
  assert.throws(() => validateConfig([], { configPath: CONFIG_PATH }), ConfigLoadError);
});

test("validateConfig 存在已废弃的 ecosystem.root_session_id → 报错退出（设计 §6.1 迁移护栏）", () => {
  const raw = { ecosystem: { name: "x", root_path: "..", root_session_id: null }, projects: [{ id: "a", name: "A", path: ".", kind: "workboard" }] };
  assert.throws(() => validateConfig(raw, { configPath: CONFIG_PATH }), ConfigLoadError);
  // 无该字段则正常
  const ok = { ecosystem: { name: "x", root_path: ".." }, projects: [{ id: "a", name: "A", path: ".", kind: "workboard" }] };
  assert.doesNotThrow(() => validateConfig(ok, { configPath: CONFIG_PATH }));
});

test("validateConfig 配置级降级：重复 id 仅标该项，不整批失败", () => {
  const raw = {
    projects: [
      { id: "a", name: "A", path: "./a", kind: "business" },
      { id: "a", name: "A2", path: "./a2", kind: "business" },
      { id: "b", name: "B", path: "./b", kind: "business" },
    ],
  };
  const result = validateConfig(raw, { configPath: CONFIG_PATH });
  assert.equal(result.projects.length, 3);
  assert.equal(result.projects[0].errors.length, 0);
  assert.match(result.projects[1].errors[0].message, /id 重复/);
  assert.equal(result.projects[2].errors.length, 0);
});

test("validateConfig 非法 kind 与缺失 id 标 config-error", () => {
  const raw = {
    projects: [
      { id: "ok", name: "OK", path: "./ok", kind: "business" },
      { name: "无 id", path: "./x", kind: "business" },
      { id: "bad-kind", name: "BK", path: "./y", kind: "nonsense" },
    ],
  };
  const result = validateConfig(raw, { configPath: CONFIG_PATH });
  assert.equal(result.projects[0].errors.length, 0);
  assert.match(result.projects[1].errors[0].message, /id 缺失或非法/);
  assert.match(result.projects[2].errors[0].message, /kind 非法/);
  assert.equal(result.projects[2].kind, null);
});

test("validateConfig enabled 缺省 true，可显式 false；url 可选", () => {
  const raw = {
    projects: [
      { id: "a", name: "A", path: "./a", kind: "business" },
      { id: "b", name: "B", path: "./b", kind: "business", enabled: false, url: "https://x" },
    ],
  };
  const result = validateConfig(raw, { configPath: CONFIG_PATH });
  assert.equal(result.projects[0].enabled, true);
  assert.equal(result.projects[0].url, null);
  assert.equal(result.projects[1].enabled, false);
  assert.equal(result.projects[1].url, "https://x");
});

test("validateConfig interval 非法回退 60 并给 refreshWarning", () => {
  const raw = {
    refresh: { interval_seconds: 3 },
    projects: [{ id: "a", name: "A", path: "./a", kind: "business" }],
  };
  const result = validateConfig(raw, { configPath: CONFIG_PATH });
  assert.equal(result.refreshIntervalSeconds, 60);
  assert.ok(result.refreshWarning);
  assert.equal(result.refreshWarning.severity, "warning");
});

test("validateConfig coordination.project_id 指向非 coordination → warning + 回退首个", () => {
  const raw = {
    coordination: { project_id: "biz" },
    projects: [
      { id: "biz", name: "Biz", path: "./biz", kind: "business" },
      { id: "coord", name: "Coord", path: "./coord", kind: "coordination" },
    ],
  };
  const result = validateConfig(raw, { configPath: CONFIG_PATH });
  assert.ok(result.coordinationWarning);
  assert.equal(result.coordinationProjectId, "coord");
});

test("normalizeInterval：缺省/非数字/过小回退 60，合法保留", () => {
  assert.equal(normalizeInterval(undefined), 60);
  assert.equal(normalizeInterval("60"), 60);
  assert.equal(normalizeInterval(3), 60);
  assert.equal(normalizeInterval(120), 120);
});

test("resolveProjectPath：绝对/相对/PROJECT_HOME/缺失", () => {
  const configDir = "/repo";
  assert.equal(resolveProjectPath("/abs/x", { configDir }).path, "/abs/x");
  assert.equal(resolveProjectPath("../sib", { configDir }).path, "/sib");
  assert.equal(
    resolveProjectPath("${PROJECT_HOME}/p", { configDir, env: { PROJECT_HOME: "/home/proj" } }).path,
    "/home/proj/p",
  );
  const missingHome = resolveProjectPath("${PROJECT_HOME}/p", { configDir, env: {} });
  assert.equal(missingHome.path, null);
  assert.match(missingHome.error.message, /PROJECT_HOME/);
  const noPath = resolveProjectPath(undefined, { configDir });
  assert.equal(noPath.path, null);
  assert.match(noPath.error.message, /path 缺失/);
});
