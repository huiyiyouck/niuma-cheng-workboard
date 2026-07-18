import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCurrentIteration, buildIntervals, matchIteration } from "./iteration-history.js";

// ---------- parseCurrentIteration：从历史版本 INDEX 全文抽「当前迭代」 ----------

test("parseCurrentIteration：抽取「- 当前迭代：v0.3」", () => {
  const text = "# 项目进度索引\n\n## 当前项目状态\n\n- 当前迭代：v0.3\n- 当前模式：标准迭代\n";
  assert.equal(parseCurrentIteration(text), "v0.3");
});

test("parseCurrentIteration：「无」与空值归 null", () => {
  assert.equal(parseCurrentIteration("- 当前迭代：无\n"), null);
  assert.equal(parseCurrentIteration("- 当前迭代：\n"), null);
  assert.equal(parseCurrentIteration("# 没有该字段的文档\n"), null);
});

test("parseCurrentIteration：带修饰文字时提取版本号（如「v0.2（进行中）」）", () => {
  assert.equal(parseCurrentIteration("- 当前迭代：v0.2（进行中）\n"), "v0.2");
});

// ---------- buildIntervals：变化点切区间（设计 §2.3） ----------

test("buildIntervals：值变化切区间，最新区间 endAt=null", () => {
  const entries = [
    { time: "2026-06-01T00:00:00Z", iteration: "v0.1" },
    { time: "2026-06-10T00:00:00Z", iteration: "v0.1" }, // 同值不切
    { time: "2026-06-20T00:00:00Z", iteration: "v0.2" },
    { time: "2026-07-01T00:00:00Z", iteration: null },   // 当前迭代=无
    { time: "2026-07-12T00:00:00Z", iteration: "v0.3" },
  ];
  assert.deepEqual(buildIntervals(entries), [
    { version: "v0.1", startAt: "2026-06-01T00:00:00Z", endAt: "2026-06-20T00:00:00Z" },
    { version: "v0.2", startAt: "2026-06-20T00:00:00Z", endAt: "2026-07-01T00:00:00Z" },
    { version: null, startAt: "2026-07-01T00:00:00Z", endAt: "2026-07-12T00:00:00Z" },
    { version: "v0.3", startAt: "2026-07-12T00:00:00Z", endAt: null },
  ]);
});

test("buildIntervals：空历史返回空数组", () => {
  assert.deepEqual(buildIntervals([]), []);
});

// ---------- matchIteration：会话时间落区间（含边界与降级） ----------

const intervals = [
  { version: "v0.1", startAt: "2026-06-01T00:00:00Z", endAt: "2026-06-20T00:00:00Z" },
  { version: null, startAt: "2026-06-20T00:00:00Z", endAt: "2026-07-12T00:00:00Z" },
  { version: "v0.3", startAt: "2026-07-12T00:00:00Z", endAt: null },
];

test("matchIteration：命中具名区间返回版本", () => {
  assert.equal(matchIteration(intervals, "2026-06-05T12:00:00Z"), "v0.1");
});

test("matchIteration：命中「当前迭代=无」区间返回 null（中性未归属）", () => {
  assert.equal(matchIteration(intervals, "2026-07-01T00:00:00Z"), null);
});

test("matchIteration：最新开放区间（endAt=null）命中", () => {
  assert.equal(matchIteration(intervals, "2026-07-18T00:00:00Z"), "v0.3");
});

test("matchIteration：早于首区间 / 空区间表 / 非法时间 → null", () => {
  assert.equal(matchIteration(intervals, "2026-05-01T00:00:00Z"), null);
  assert.equal(matchIteration([], "2026-07-01T00:00:00Z"), null);
  assert.equal(matchIteration(intervals, null), null);
  assert.equal(matchIteration(intervals, "not-a-date"), null);
});

test("matchIteration：边界——等于 startAt 归本区间，等于 endAt 归下一区间", () => {
  assert.equal(matchIteration(intervals, "2026-06-01T00:00:00Z"), "v0.1");
  assert.equal(matchIteration(intervals, "2026-06-20T00:00:00Z"), null); // 进入「无」区间
  assert.equal(matchIteration(intervals, "2026-07-12T00:00:00Z"), "v0.3");
});
