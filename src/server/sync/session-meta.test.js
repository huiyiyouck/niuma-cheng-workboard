import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTitle, detectRole } from "./session-meta.js";

// ─── 标题提取（设计 4.3：customTitle → 首条 user 消息前 50 字 → 未命名会话） ───

test("extractTitle：优先使用 custom-title 事件的 customTitle", () => {
  assert.equal(extractTitle({ customTitle: "小报/运维", firstUserContent: "你是运维" }), "小报/运维");
});

test("extractTitle：无 customTitle 时取首条 user 消息前 50 字", () => {
  assert.equal(extractTitle({ customTitle: null, firstUserContent: "你是开发" }), "你是开发");
});

test("extractTitle：首条 user 消息超过 50 字截断", () => {
  const long = "一".repeat(80);
  assert.equal(extractTitle({ customTitle: null, firstUserContent: long }), "一".repeat(50));
});

test("extractTitle：两者都缺时 fallback 为 未命名会话", () => {
  assert.equal(extractTitle({ customTitle: null, firstUserContent: null }), "未命名会话");
  assert.equal(extractTitle({}), "未命名会话");
});

// ─── 角色识别（设计 4.4：精确匹配 1.0 → 关键词加权 0.5~0.9 → Unknown 0） ───

test("detectRole：首条消息「你是 XX」精确匹配置信度 1.0", () => {
  assert.deepEqual(detectRole(["你是 PM"]), { role: "PM", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是产品经理"]), { role: "PM", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是 Developer"]), { role: "Developer", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是开发工程师"]), { role: "Developer", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是 Architect"]), { role: "Architect", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是 DevOps"]), { role: "DevOps", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是运维部署工程师"]), { role: "DevOps", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是 General"]), { role: "General", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是通用助手"]), { role: "General", confidence: 1.0 });
});

test("detectRole：实际使用的短别名也精确匹配（你是开发/你是运维/你是产品/你是架构）", () => {
  assert.deepEqual(detectRole(["你是开发"]), { role: "Developer", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是运维"]), { role: "DevOps", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是产品"]), { role: "PM", confidence: 1.0 });
  assert.deepEqual(detectRole(["你是架构"]), { role: "Architect", confidence: 1.0 });
});

test("detectRole：精确匹配只看首条消息", () => {
  const r = detectRole(["帮我看看这个文件", "你是开发"]);
  assert.notEqual(r.confidence, 1.0);
});

test("detectRole：关键词加权扫描前 5 条 user 消息，置信度 0.5~0.9", () => {
  const r = detectRole(["帮我写个 PRD", "需求是这样的", "验收标准补充一下"]);
  assert.equal(r.role, "PM");
  assert.ok(r.confidence >= 0.5 && r.confidence <= 0.9);
});

test("detectRole：多角色关键词打平时不硬猜，返回 Unknown", () => {
  const r = detectRole(["产品和部署都聊聊"]);
  assert.deepEqual(r, { role: "Unknown", confidence: 0 });
});

test("detectRole：无任何命中返回 Unknown 置信度 0", () => {
  assert.deepEqual(detectRole(["今天天气不错"]), { role: "Unknown", confidence: 0 });
  assert.deepEqual(detectRole([]), { role: "Unknown", confidence: 0 });
});
