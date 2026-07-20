import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readWorkflowSource } from "./workflow-source.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../../..");
const REAL_WORKFLOW = path.resolve(PROJECT_ROOT, "..", "agent-workflow");

test("读真实 agent-workflow：生成工作流真源摘要 + 深度详情结构", async () => {
  const result = await readWorkflowSource(REAL_WORKFLOW);
  assert.ok(result.summary, "应有摘要");
  assert.equal(result.checks["docs/baseline"], true);
  // 深度详情（PM 2026-07-20 定范围）：结构冒烟，不耦合真源演进数据
  assert.ok(result.detail.positioning && result.detail.positioning.length > 0, "应有定位首段");
  assert.ok(result.detail.roadmap.length > 0, "应有 ROADMAP 章节");
  assert.ok(result.detail.baseline.roles.length > 0, "应有角色手册清单");
  assert.ok(result.detail.baseline.others.length > 0, "应有机制/流程清单");
  assert.ok(result.detail.templates.length > 0, "应有模板清单");
});

test("目录不存在 → summary 为 null 且 detail 各块留空", async () => {
  const result = await readWorkflowSource("/no/such/workflow");
  assert.equal(result.summary, null);
  assert.equal(result.detail.positioning, null);
  assert.deepEqual(result.detail.roadmap, []);
  assert.deepEqual(result.detail.baseline, { roles: [], others: [] });
  assert.deepEqual(result.detail.templates, []);
});

test("fixture 真源：定位首段 / ROADMAP 章节 / baseline 分组 / templates 清单", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "workflow-fixture-"));
  try {
    await writeFile(path.join(dir, "README.md"), `# 一人公司 AI 工作流

面向一人公司的多角色开发团队工作流真源。

## 其他章节
略。
`);
    await mkdir(path.join(dir, "docs"));
    await writeFile(path.join(dir, "docs", "ROADMAP.md"), `# 演进路线

## 已完成
- 甲

## 进行中
- 乙

### 细项
- 丙
`);
    await mkdir(path.join(dir, "docs", "baseline"));
    await writeFile(path.join(dir, "docs", "baseline", "role-pm.md"), "# PM 手册");
    await writeFile(path.join(dir, "docs", "baseline", "role-developer.md"), "# Developer 手册");
    await writeFile(path.join(dir, "docs", "baseline", "mechanisms.md"), "# 机制");
    await mkdir(path.join(dir, "docs", "templates"));
    await writeFile(path.join(dir, "docs", "templates", "prd-template.md"), "# PRD 模板");

    const result = await readWorkflowSource(dir);
    assert.equal(result.detail.positioning, "面向一人公司的多角色开发团队工作流真源。");
    assert.deepEqual(result.detail.roadmap, [
      { level: 1, text: "演进路线" },
      { level: 2, text: "已完成" },
      { level: 2, text: "进行中" },
      { level: 3, text: "细项" },
    ]);
    assert.deepEqual(result.detail.baseline.roles, ["role-developer.md", "role-pm.md"]);
    assert.deepEqual(result.detail.baseline.others, ["mechanisms.md"]);
    assert.deepEqual(result.detail.templates, ["prd-template.md"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
