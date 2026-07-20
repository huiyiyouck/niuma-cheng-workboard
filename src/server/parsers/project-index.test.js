import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseProjectIndex, isTodoDone, parseVersionList } from "./project-index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../../..");
const REAL_INDEX = path.join(PROJECT_ROOT, "docs", "progress", "INDEX.md");

test("parseVersionList：版本按语义号升序，不受表格书写顺序影响（ai 倒序表格 → 正序）", () => {
  const md = `## 版本列表
| 版本 | 状态 |
|------|------|
| v0.2 | 进行中 |
| v0.1 | 已关闭 |
`;
  const r = parseVersionList(md);
  assert.deepEqual(r.versions.map((v) => v.version), ["v0.1", "v0.2"]);
});

test("parseVersionList：语义排序正确处理多段/多位版本号（v0.6.1 在 v0.6 后、v0.10 在 v0.9 后）", () => {
  const md = `## 版本列表
| 版本 | 状态 |
|------|------|
| v0.10 | 规划中 |
| v0.6.1 | 进行中 |
| v0.6 | 已完成 |
| v0.9 | 已完成 |
| v0.2 | 已完成 |
`;
  const r = parseVersionList(md);
  assert.deepEqual(r.versions.map((v) => v.version), ["v0.2", "v0.6", "v0.6.1", "v0.9", "v0.10"]);
});

test("isTodoDone：完成标记命中，未完成不误判", () => {
  assert.equal(isTodoDone("✅ 已完成并部署"), true);
  assert.equal(isTodoDone("已关闭"), true);
  assert.equal(isTodoDone("完成"), true);
  assert.equal(isTodoDone("未完成"), false);
  assert.equal(isTodoDone("待启动"), false);
  assert.equal(isTodoDone("进行中"), false);
  assert.equal(isTodoDone(""), false);
});

test("解析真实本项目 INDEX.md：结构冒烟（不耦合演进数据）", async () => {
  const md = await readFile(REAL_INDEX, "utf8");
  const result = parseProjectIndex(md, { sourcePath: REAL_INDEX });
  // 真实 INDEX 随迭代持续演进，只断言结构不变量；精确解析行为由本文件内联 fixture 用例覆盖
  assert.match(result.iteration ?? "", /^v\d+/);
  assert.equal(result.mode, "标准迭代");
  assert.ok(result.phase && result.phase.length > 0);
  assert.ok(Array.isArray(result.todos));
});

test("完成态待办被剔除", () => {
  const md = `## 当前项目状态
- 当前迭代：v1

## 跨任务待办

| 优先级 | 待办 | 归属角色 | 状态 |
|--------|------|----------|------|
| P0 | 未完成项 | Dev | 待启动 |
| P1 | 完成项 | Dev | ✅ 已完成 |
`;
  const result = parseProjectIndex(md, { sourcePath: "x" });
  assert.equal(result.todos.length, 1);
  assert.equal(result.todos[0].text, "未完成项");
});

test("待办表缺「状态」列 → read-error，不汇总待办", () => {
  const md = `## 跨任务待办

| 优先级 | 待办 | 归属角色 |
|--------|------|----------|
| P0 | 某事 | Dev |
`;
  const result = parseProjectIndex(md, { sourcePath: "x" });
  assert.equal(result.todos.length, 0);
  assert.ok(result.errors.some((e) => e.code === "read-error"));
});

test("缺「当前项目状态」区 → warning，字段为 null", () => {
  const result = parseProjectIndex("# 空文档", { sourcePath: "x" });
  assert.equal(result.iteration, null);
  assert.ok(result.errors.some((e) => e.severity === "warning"));
});

test("有「跨任务待办」标题但无表格 → 空待办、不报错", () => {
  const md = `## 当前项目状态
- 当前迭代：v1

## 跨任务待办

> 暂无待办
`;
  const result = parseProjectIndex(md, { sourcePath: "x" });
  assert.equal(result.todos.length, 0);
  assert.equal(result.errors.length, 0);
});
