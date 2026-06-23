import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRoleLog, readRoleSummaries } from "./roles.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../../..");
const REAL_ROLES = path.join(PROJECT_ROOT, "docs", "progress", "roles");

const LOG = `# Developer 角色日志

## 2026-06-23 — 设计 R1 Review
- 本次角色：Developer
- 结论：完成 v0.1 设计文档 R1 Review，通过
- 下一步入口：Owner 切到 Tester Review
- 遗留问题/风险：需整理 React 依赖

## 2026-06-20 — 更早段落
- 结论：旧结论
`;

test("parseRoleLog 提取最近段落的结论与下一步", () => {
  const r = parseRoleLog(LOG);
  assert.match(r.recentAction, /完成 v0.1 设计文档/);
  assert.match(r.nextStep, /Tester/);
  assert.equal(r.recentAction.includes("旧结论"), false);
});

test("readRoleSummaries 读真实本项目 roles：含 Developer 且 status ok", async () => {
  const roles = await readRoleSummaries(REAL_ROLES);
  const dev = roles.find((r) => r.role === "Developer");
  assert.ok(dev, "应解析出 Developer 角色");
  assert.equal(dev.status, "ok");
  assert.ok(dev.recentAction && dev.recentAction.length > 0);
});

test("文件形态优先级：current > summary，archive/corrections 忽略", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "roles-"));
  try {
    await writeFile(path.join(dir, "developer-summary.md"), "## 2026-01-01\n- 结论：summary 版\n");
    await writeFile(path.join(dir, "developer-current.md"), "## 2026-06-01\n- 结论：current 版\n");
    await writeFile(path.join(dir, "developer-archive.md"), "## 2020\n- 结论：归档\n");
    await writeFile(path.join(dir, "pm-corrections.md"), "## 2020\n- 结论：纠错\n");
    const roles = await readRoleSummaries(dir);
    // 只应有 Developer（pm 仅有 corrections，被忽略）
    assert.equal(roles.length, 1);
    assert.equal(roles[0].role, "Developer");
    assert.equal(roles[0].recentAction, "current 版");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("roles 目录不存在 → 空数组", async () => {
  const roles = await readRoleSummaries("/no/such/roles");
  assert.deepEqual(roles, []);
});
