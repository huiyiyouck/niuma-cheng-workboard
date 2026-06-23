import { test } from "node:test";
import assert from "node:assert/strict";
import { makeProjectMatcher } from "./project-match.js";

const PROJECTS = [
  { id: "ai", name: "AI 处理中枢" },
  { id: "xiaobao", name: "牛马程小报" },
  { id: "workboard", name: "跨项目 Agent 工作看板" },
];

test("短 id ai 用词边界匹配，不误命中普通单词", () => {
  const match = makeProjectMatcher(PROJECTS);
  assert.deepEqual(match("ai · PM（ck）"), ["ai"]);
  assert.deepEqual(match("maintainable available"), []); // 含 ai 子串但非边界
  assert.deepEqual(match("xiaobao · Developer"), ["xiaobao"]);
});

test("项目名作为 alias 直接匹配", () => {
  const match = makeProjectMatcher(PROJECTS);
  assert.deepEqual(match("牛马程小报 · Developer"), ["xiaobao"]);
});

test("空 / 非字符串返回空数组", () => {
  const match = makeProjectMatcher(PROJECTS);
  assert.deepEqual(match(null), []);
  assert.deepEqual(match(""), []);
});
