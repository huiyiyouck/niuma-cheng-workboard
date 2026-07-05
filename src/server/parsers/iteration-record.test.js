import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIterationRecord } from "./iteration-record.js";

// 结构照 xiaobao v0.6.md 真实迭代记录：多轮门禁表，最新状态在最后一行
const MULTI_ROUND = `# v0.6 迭代记录

## 阶段门禁

### PRD 阶段
| 轮次 | 产出方动作 | 指定 Review 方 | Review 结果 | 阶段状态 |
|------|------------|------------------|-------------|----------|
| R1 | PM 初版 | Architect / Developer | Architect 需修改（11 条） | R1 完成，等待 PM 汇总产出 R2 |
| R2 | PM 汇总五方 R1 | Architect / Developer | 五方 ⚠️ 有条件通过 | 已定稿 |

### 设计阶段
| 轮次 | 产出方动作 | Review 结果 | 阶段状态 |
|------|------------|-------------|----------|
| R1 | Architect 初版 | Review中 | Review中 |
| R2 | Architect 修正 | 通过 | 已定稿 |

### 测试阶段
| 轮次 | 产出方动作 | Review 结果 | 阶段状态 |
|------|------------|-------------|----------|
| R1 | Developer 自测 | ✅ 验收通过（Owner 确认） | ✅ 已完成 |

### 部署就绪检查
| 轮次 | 产出方动作 | Review 结果 | 阶段状态 |
|------|------------|-------------|----------|
| R1 | DevOps 检查 | — | 待修正（证书未就绪） |
`;

test("多轮门禁表取最后一行的阶段状态（不是第一行）", () => {
  const r = parseIterationRecord(MULTI_ROUND, { version: "v0.6" });
  const prd = r.stages.find((s) => s.id === "prd");
  assert.equal(prd.status, "finalized");
});

test("Review 结果同样取最后一行", () => {
  const r = parseIterationRecord(MULTI_ROUND, { version: "v0.6" });
  const prd = r.stages.find((s) => s.id === "prd");
  assert.equal(prd.reviewResult, "五方 ⚠️ 有条件通过");
});

test("阶段状态映射覆盖设计 2.4 全部变体：✅ → finalized、待修正 → blocked", () => {
  const r = parseIterationRecord(MULTI_ROUND, { version: "v0.6" });
  const testing = r.stages.find((s) => s.id === "testing");
  assert.equal(testing.status, "finalized");
  const deploy = r.stages.find((s) => s.id === "deploy_check");
  assert.equal(deploy.status, "blocked");
});

test("单行表格行为不变", () => {
  const single = `## 阶段门禁

### PRD 阶段
| 轮次 | Review 结果 | 阶段状态 |
|------|-------------|----------|
| R1 | 待 Review | Review中 |
`;
  const r = parseIterationRecord(single, { version: "v0.2" });
  assert.equal(r.stages[0].status, "in_review");
});

test("已跳过阶段映射为 skipped（xiaobao v0.6 测试阶段形态）", () => {
  const md = `## 阶段门禁

### 测试阶段
| 轮次 | Review 结果 | 阶段状态 |
|------|-------------|----------|
| — | ✅ 验收通过（Owner 确认） | 已跳过（有条件关闭条件 A） |
`;
  const r = parseIterationRecord(md, { version: "v0.6" });
  assert.equal(r.stages[0].status, "skipped");
});

test("无「阶段状态」列时兜底「状态」列（xiaobao v0.6 部署就绪检查形态）", () => {
  const md = `## 阶段门禁

### 部署就绪检查
| 状态 | 目标环境 | 证据 | 阻塞项 |
|------|----------|------|--------|
| ✅ 部署通过 | test | 全通 | 无 |
| ✅ 部署通过 | 生产 | 全通 | 无 |
`;
  const r = parseIterationRecord(md, { version: "v0.6" });
  assert.equal(r.stages[0].status, "finalized");
});

test("表格只有表头无数据行时为 not_started（未开始阶段形态）", () => {
  const md = `## 阶段门禁

### 设计阶段
| 轮次 | 产出方动作 | Review 结果 | 阶段状态 |
|------|------------|-------------|----------|
`;
  const r = parseIterationRecord(md, { version: "v0.6.1" });
  assert.equal(r.stages[0].status, "not_started");
});

test("「XX通过」类状态映射为 finalized（xiaobao v0.5 / ai v0.1 部署就绪检查形态）", () => {
  const md = `## 阶段门禁

### 部署就绪检查
| 状态 | 目标环境 | 证据 | 阻塞项 |
|------|----------|------|--------|
| 部署阻塞(2026-06-06,已解除) | 本地 | ... | 已修复 |
| **前端部署通过**(2026-06-07) | nginx | 12 项 verify 全过 | 无 |
`;
  const r = parseIterationRecord(md, { version: "v0.5" });
  assert.equal(r.stages[0].status, "finalized");

  const md2 = `## 阶段门禁

### 部署就绪检查
| 状态 | 目标环境 | 证据 | 阻塞项 |
|------|----------|------|--------|
| news-l1 主链路就绪(端到端联调通过,部署就绪检查通过) | 测试环境 | /health 200 | 无阻塞项 |
`;
  const r2 = parseIterationRecord(md2, { version: "v0.1" });
  assert.equal(r2.stages[0].status, "finalized");
});

test("「不通过/未通过」不得误判为 finalized，映射为 blocked", () => {
  const md = `## 阶段门禁

### PRD 阶段
| 轮次 | Review 结果 | 阶段状态 |
|------|-------------|----------|
| R1 | Developer 不通过 | Review 不通过，待修订 |
`;
  const r = parseIterationRecord(md, { version: "v0.2" });
  assert.equal(r.stages[0].status, "blocked");
});

test("「已Review」映射为 in_review（xiaobao v0.2 实现阶段形态）", () => {
  const md = `## 阶段门禁

### 实现阶段
| 轮次 | PM | 架构师 | 阶段状态 |
|------|-----|--------|---------|
| R1 | ❌需修改 | ❌需修改 | 已Review |
`;
  const r = parseIterationRecord(md, { version: "v0.2" });
  assert.equal(r.stages[0].status, "in_review");
});

test("非标准标题降级为附加记录：standard=false、不计入统计、id 不与标准阶段撞车", () => {
  const md = `## 阶段门禁

### PRD 阶段
| 轮次 | Review 结果 | 阶段状态 |
|------|-------------|----------|
| R1 | 通过 | 已定稿 |

### PRD 讨论记录（R1 前）
讨论内容摘要。

### UI 增强方向（PM 原型产出，后续迭代纳入）
| 轮次 | PM | 阶段状态 |
|------|-----|---------|
| R1 | ✅已产出 | Review中 |
`;
  const r = parseIterationRecord(md, { version: "v0.2" });
  const prd = r.stages.find((s) => s.id === "prd");
  assert.equal(prd.standard, true);
  const extras = r.stages.filter((s) => !s.standard);
  assert.equal(extras.length, 2);
  assert.notEqual(extras[0].id, "prd");
  // 统计只算标准阶段：1/1 完成；currentStage 不指向附加记录
  assert.equal(r.summary.totalStages, 1);
  assert.equal(r.summary.completedCount, 1);
  assert.equal(r.currentStage, null);
});

test("完成计数按修正后的状态统计", () => {
  const r = parseIterationRecord(MULTI_ROUND, { version: "v0.6" });
  // PRD 已定稿 + 设计已定稿 + 测试 ✅ = 3 个完成
  assert.equal(r.summary.completedCount, 3);
  assert.equal(r.summary.blockedStage, "部署就绪检查");
});
