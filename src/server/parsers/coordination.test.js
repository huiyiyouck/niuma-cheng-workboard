import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
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

test("readCoordination 读真实仓：结构冒烟（不耦合演进数据）", async () => {
  const match = makeProjectMatcher([
    { id: "xiaobao", name: "牛马程小报" },
    { id: "ai", name: "AI 处理中枢" },
  ]);
  const result = await readCoordination(REAL_COORD, { resolveProjectIds: match });
  // 真实 coordination 仓持续演进，只断言可读与结构不变量；精确计数由下方 fixture 用例覆盖
  assert.equal(result.status, "ok");
  for (const k of ["activeRequestCount", "blockerCount", "contractCount", "communicationCount", "bcrCount"]) {
    assert.ok(Number.isInteger(result[k]) && result[k] >= 0, `${k} 应为非负整数`);
  }
});

test("readCoordination fixture 仓：活跃需求/阻塞/计数精确断言", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "coord-fixture-"));
  try {
    await writeFile(path.join(dir, "REQUESTS.md"), `## 需求池

| 需求 id | 提出方 | 内容 | 承接方 | 转入迭代 | 状态 | 沟通文档 |
|---------|--------|------|--------|----------|------|----------|
| REQ-001 | xiaobao · Developer | 甲 | ai · PM | ai v0.1 | 已关闭 | — |
| REQ-002 | xiaobao · Developer | 乙 | ai · PM | ai v0.2 | 已承接 | — |

## 基线修正提案池

| BCR id | 提出方 | 摘要 | 影响范围 | 状态 |
|--------|--------|------|----------|------|
| BCR-001 | x | 某提案 | agent-workflow | 已回流下游 |
| BCR-002 | y | 另一提案 | agent-workflow | 评估中 |
`);
    await writeFile(path.join(dir, "STATUS.md"), `## 跨项目阻塞与谁等谁

### 1. 已完成项
- 状态：已完成
- 谁等谁：无。

### 2. 真实阻塞
- 状态：进行中
- 谁等谁：A 等 B 给接口
- 下一步责任：B
`);
    await mkdir(path.join(dir, "contracts"));
    await writeFile(path.join(dir, "contracts", "c1.md"), "# 契约一");
    await mkdir(path.join(dir, "communications"));
    await writeFile(path.join(dir, "communications", "REQ-002-b.md"), "# REQ-002 沟通");
    await writeFile(path.join(dir, "communications", "README.md"), "# 说明");

    const match = makeProjectMatcher([
      { id: "xiaobao", name: "牛马程小报" },
      { id: "ai", name: "AI 处理中枢" },
    ]);
    const result = await readCoordination(dir, { resolveProjectIds: match });
    assert.equal(result.status, "ok");
    assert.equal(result.activeRequestCount, 1); // REQ-002（REQ-001 已关闭不计入）
    assert.equal(result.blockerCount, 1); // 「真实阻塞」；已完成项被过滤
    assert.equal(result.contractCount, 1);
    assert.equal(result.communicationCount, 1); // 排除 README
    assert.equal(result.bcrCount, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("readCoordination 目录不存在 → status read-error", async () => {
  const result = await readCoordination("/no/such/coord");
  assert.equal(result.status, "read-error");
  assert.equal(result.contractCount, 0);
  assert.equal(result.communicationCount, 0);
});
