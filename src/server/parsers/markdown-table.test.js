import { test } from "node:test";
import assert from "node:assert/strict";
import { findSection, parseFirstTable, parseListFields } from "./markdown-table.js";

const DOC = `# 标题

## 当前项目状态

- 当前迭代：v0.1
- 当前模式：标准迭代
- 阻塞项：无

## 跨任务待办

> 引言段落

| 优先级 | 待办 | 归属角色 | 状态 |
|--------|------|----------|------|
| P0 | 实现 MVP | Developer | 待启动 |
| P1 | 写文档 | PM | ✅ 已完成 |

## 下一节
其他内容
`;

test("findSection 定位区域，止于下一个同级标题", () => {
  const section = findSection(DOC, "## 当前项目状态");
  assert.match(section, /当前迭代：v0.1/);
  assert.doesNotMatch(section, /跨任务待办/);
});

test("findSection 找不到返回 null", () => {
  assert.equal(findSection(DOC, "## 不存在"), null);
});

test("parseListFields 解析中文冒号键值，取首次出现", () => {
  const fields = parseListFields(findSection(DOC, "## 当前项目状态"));
  assert.equal(fields["当前迭代"], "v0.1");
  assert.equal(fields["当前模式"], "标准迭代");
  assert.equal(fields["阻塞项"], "无");
});

test("parseFirstTable 按列名映射，忽略引言段", () => {
  const table = parseFirstTable(findSection(DOC, "## 跨任务待办"));
  assert.deepEqual(table.headers, ["优先级", "待办", "归属角色", "状态"]);
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0]["待办"], "实现 MVP");
  assert.equal(table.rows[1]["状态"], "✅ 已完成");
});

test("parseFirstTable 无表格返回 null", () => {
  assert.equal(parseFirstTable("没有任何表格的纯文本"), null);
});

test("parseFirstTable 缺分隔行不构成表格，返回 null", () => {
  assert.equal(parseFirstTable("| a | b |\n| 1 | 2 |"), null);
});
