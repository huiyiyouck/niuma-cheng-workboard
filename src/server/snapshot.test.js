import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot } from "./snapshot.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../..");
const REAL_CONFIG = path.join(PROJECT_ROOT, "projects.config.json");

const NORMAL_INDEX = `# 进度索引
## 当前项目状态
- 当前迭代：v1.0
- 当前模式：标准迭代
- 当前阶段：实现阶段
- 阻塞项：等待评审
- 下一步入口：继续实现

## 跨任务待办
| 优先级 | 待办 | 归属角色 | 来源 | 状态 |
|--------|------|----------|------|------|
| P0 | 待办甲 | Developer | x | 待启动 |
| P1 | 待办乙 | PM | x | ✅ 已完成 |
`;

const COORD_REQUESTS = `## 需求池
| 需求 id | 提出方 | 内容 | 承接方 | 转入迭代 | 状态 | 沟通文档 |
|---------|--------|------|--------|----------|------|----------|
| REQ-9 | normal · Dev | 某需求 | wf · PM | v1 | 评估中 | - |

## 基线修正提案池
| BCR id | 提出方 | 摘要 | 影响范围 | 状态 |
|--------|--------|------|----------|------|
| BCR-9 | x | 某提案 | wf | 评估中 |
`;

const COORD_STATUS = `## 跨项目阻塞与谁等谁
### 1. 真实阻塞
- 状态：进行中
- 谁等谁：normal 等 wf
`;

let dir;
let configPath;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "snap-"));
  // 正常 business
  await mkdir(path.join(dir, "proj-normal/docs/progress"), { recursive: true });
  await writeFile(path.join(dir, "proj-normal/docs/progress/INDEX.md"), NORMAL_INDEX);
  // 缺 INDEX 的 business
  await mkdir(path.join(dir, "proj-noindex/docs/progress"), { recursive: true });
  // workflow-source
  await mkdir(path.join(dir, "proj-wf/docs/baseline"), { recursive: true });
  // coordination
  await mkdir(path.join(dir, "proj-coord"), { recursive: true });
  await writeFile(path.join(dir, "proj-coord/REQUESTS.md"), COORD_REQUESTS);
  await writeFile(path.join(dir, "proj-coord/STATUS.md"), COORD_STATUS);
  // read-error business：INDEX.md 是目录而非文件 → readFile 失败
  await mkdir(path.join(dir, "proj-readerr/docs/progress/INDEX.md"), { recursive: true });

  const config = {
    refresh: { interval_seconds: 60 },
    projects: [
      { id: "normal", name: "正常", path: "./proj-normal", kind: "business" },
      { id: "noindex", name: "缺索引", path: "./proj-noindex", kind: "business" },
      { id: "wf", name: "工作流", path: "./proj-wf", kind: "workflow-source" },
      { id: "coord", name: "协调", path: "./proj-coord", kind: "coordination" },
      { id: "readerr", name: "读错", path: "./proj-readerr", kind: "business" },
    ],
    coordination: { project_id: "coord" },
  };
  configPath = path.join(dir, "projects.config.json");
  await writeFile(configPath, JSON.stringify(config));
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

test("整批快照：局部失败不阻断，状态各自正确", async () => {
  const snap = await buildSnapshot({ configPath });

  // coordination 不进项目卡，其余 4 个进
  assert.equal(snap.projects.length, 4);
  assert.equal(snap.diagnostics.length, 5);

  const byId = Object.fromEntries(snap.projects.map((p) => [p.id, p]));
  assert.equal(byId.normal.status, "integrated");
  assert.equal(byId.normal.iteration, "v1.0");
  assert.equal(byId.normal.blocked, "等待评审");
  assert.equal(byId.noindex.status, "not-bootstrapped");
  assert.equal(byId.wf.status, "integrated");
  assert.ok(byId.wf.kindSummary); // workflow-source 摘要
  assert.equal(byId.readerr.status, "read-error");
  assert.ok(byId.readerr.errorSummary);
});

test("待办汇总：仅未完成项，带项目归属", async () => {
  const snap = await buildSnapshot({ configPath });
  assert.equal(snap.todos.length, 1);
  assert.equal(snap.todos[0].text, "待办甲");
  assert.equal(snap.todos[0].projectId, "normal");
  assert.equal(snap.summary.openTodos, 1);
});

test("crossProject 来自 coordination：需求/阻塞/BCR 计数", async () => {
  const snap = await buildSnapshot({ configPath });
  assert.equal(snap.crossProject.status, "ok");
  assert.equal(snap.crossProject.activeRequestCount, 1);
  assert.equal(snap.crossProject.blockerCount, 1);
  assert.equal(snap.crossProject.bcrCount, 1);
});

test("summary 统计：异常项目计入 abnormalProjects", async () => {
  const snap = await buildSnapshot({ configPath });
  assert.ok(snap.summary.abnormalProjects >= 1); // readerr
  assert.equal(snap.summary.blockedProjects, 1); // normal 有阻塞
});

test("真实 projects.config.json：不抛错且含 workboard 自身", async () => {
  const snap = await buildSnapshot({ configPath: REAL_CONFIG });
  assert.ok(Array.isArray(snap.projects));
  const self = snap.projects.find((p) => p.id === "workboard");
  assert.ok(self, "看板应自监控出现在 projects 中");
});
