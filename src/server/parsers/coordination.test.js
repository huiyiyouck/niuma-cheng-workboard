import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRequests, parseStatus, readCoordination, isBcrTerminal } from "./coordination.js";
import { makeProjectMatcher } from "./project-match.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../../..");
const REAL_COORD = path.resolve(PROJECT_ROOT, "..", "niuma-cheng-coordination");

test("parseRequests 解析需求池与 BCR 池（含归属匹配）", () => {
  const match = makeProjectMatcher([
    { id: "xiaobao", name: "牛马程小报" },
    { id: "ai", name: "AI" },
  ]);
  const text = `## 需求池

| 需求 id | 提出方 | 内容 | 承接方 | 转入迭代 | 状态 | 沟通文档 |
|---------|--------|------|--------|----------|------|----------|
| REQ-001 | xiaobao · Developer | 新闻 L1 处理 | ai · PM | ai v0.1 | 联调中 | [communications/REQ-001.md](communications/REQ-001.md) |

## 基线修正提案池

| BCR id | 提出方 | 摘要 | 影响范围 | 状态 |
|--------|--------|------|----------|------|
| BCR-001 | x | 某提案 | agent-workflow | 已回流下游 |
`;
  const { requests, bcrs } = parseRequests(text, { sourcePath: "REQUESTS.md", resolveProjectIds: match });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].id, "REQ-001");
  assert.deepEqual(requests[0].sourceProjectIds, ["xiaobao"]);
  assert.deepEqual(requests[0].targetProjectIds, ["ai"]);
  assert.equal(requests[0].communicationPath, "communications/REQ-001.md");
  assert.equal(bcrs.length, 1);
  assert.equal(bcrs[0].id, "BCR-001");
  assert.equal(isBcrTerminal(bcrs[0].status), true);
});

test("parseStatus 过滤三种非活跃阻塞（已完成 / 谁等谁无 / 仍生效但无阻塞）", () => {
  const text = `## 跨项目阻塞与谁等谁

### 1. 已完成项
- 状态：已完成（2026-06-21）
- 谁等谁：无。

### 2. 契约生效
- 状态：v1 生效中
- 谁等谁：无。两侧一致。

### 3. 真实阻塞
- 状态：进行中
- 谁等谁：A 等 B 给接口
- 下一步责任：B
`;
  const { blockers } = parseStatus(text, { sourcePath: "STATUS.md" });
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].title, "真实阻塞");
  assert.equal(blockers[0].nextOwner, "B");
});

test("readCoordination 读真实仓：活跃需求/阻塞/计数符合预期", async () => {
  const match = makeProjectMatcher([
    { id: "xiaobao", name: "牛马程小报" },
    { id: "ai", name: "AI 处理中枢" },
  ]);
  const result = await readCoordination(REAL_COORD, { resolveProjectIds: match });
  // 注：本用例读取真实 niuma-cheng-coordination 仓（跨项目共享真源，持续演进），
  // 断言需跟随该仓当前实际状态同步更新
  assert.equal(result.status, "ok");
  assert.equal(result.activeRequestCount, 2); // REQ-002 已承接 + REQ-003 已提报（REQ-001 已关闭不计入）
  assert.equal(result.blockerCount, 0); // 当前无活跃阻塞
  assert.equal(result.contractCount, 2);
  assert.equal(result.communicationCount, 2); // REQ-001 + REQ-002（排除 README）
  assert.equal(result.bcrCount, 11); // 2026-07-05 公告板新增 BCR-011
});

test("readCoordination 目录不存在 → status read-error", async () => {
  const result = await readCoordination("/no/such/coord");
  assert.equal(result.status, "read-error");
  assert.equal(result.contractCount, 0);
  assert.equal(result.communicationCount, 0);
});
