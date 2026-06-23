import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readWorkflowSource } from "./workflow-source.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../../..");
const REAL_WORKFLOW = path.resolve(PROJECT_ROOT, "..", "agent-workflow");

test("读真实 agent-workflow：生成工作流真源摘要", async () => {
  const result = await readWorkflowSource(REAL_WORKFLOW);
  assert.ok(result.summary, "应有摘要");
  assert.equal(result.checks["docs/baseline"], true);
});

test("目录不存在 → summary 为 null", async () => {
  const result = await readWorkflowSource("/no/such/workflow");
  assert.equal(result.summary, null);
});
