import { test } from "node:test";
import assert from "node:assert/strict";
import { cwdToProjectId, parseCodexLines } from "./codex-parser.js";

test("cwdToProjectId：路径转 Claude Code 同款项目目录名", () => {
  assert.equal(
    cwdToProjectId("/Users/ck/Project/niuma-cheng/niuma-cheng-xiaobao"),
    "-Users-ck-Project-niuma-cheng-niuma-cheng-xiaobao"
  );
  assert.equal(cwdToProjectId("/root/Project/niuma-cheng-ai"), "-root-Project-niuma-cheng-ai");
  assert.equal(cwdToProjectId(null), null);
});

test("cwdToProjectId：路径含点号时与 Claude Code 编码一致（. 也转 -，如 /root/.claude → -root--claude）", () => {
  // Claude Code 实测把 / 和 . 都替换为 -；Codex 侧须一致，否则含点路径的项目白名单匹配不上
  assert.equal(cwdToProjectId("/root/.claude"), "-root--claude");
  assert.equal(cwdToProjectId("/Users/ck/Project/my.project"), "-Users-ck-Project-my-project");
});

// 结构照真实 rollout-*.jsonl：session_meta 首行 + event_msg 对话 + response_item 工具调用
const LINES = [
  JSON.stringify({
    timestamp: "2026-05-27T12:16:58.293Z",
    type: "session_meta",
    payload: { id: "019e695d-1173-7673", timestamp: "2026-05-27T12:16:07.561Z", cwd: "/Users/ck/Project/demo" },
  }),
  JSON.stringify({
    timestamp: "2026-05-27T12:16:58.298Z",
    type: "response_item",
    payload: { type: "message", role: "developer", content: [{ type: "input_text", text: "<permissions instructions>..." }] },
  }),
  JSON.stringify({
    timestamp: "2026-05-27T12:16:58.301Z",
    type: "event_msg",
    payload: { type: "user_message", message: "你是开发，帮我 Review 这个文件" },
  }),
  JSON.stringify({
    timestamp: "2026-05-27T12:18:48.031Z",
    type: "event_msg",
    payload: { type: "agent_message", message: "我会先把项目结构摸清楚。" },
  }),
  JSON.stringify({
    timestamp: "2026-05-27T12:18:48.037Z",
    type: "response_item",
    payload: { type: "function_call", name: "exec_command", arguments: JSON.stringify({ cmd: "pwd", workdir: "/tmp" }) },
  }),
  JSON.stringify({
    timestamp: "2026-05-27T12:18:48.276Z",
    type: "response_item",
    payload: { type: "function_call_output", call_id: "c1", output: "..." },
  }),
  JSON.stringify({
    timestamp: "2026-05-27T12:18:49.000Z",
    type: "response_item",
    payload: { type: "reasoning", summary: [], encrypted_content: "gAAA..." },
  }),
];

test("parseCodexLines：提取 meta 与对话消息", () => {
  const { meta, messages } = parseCodexLines(LINES);
  assert.equal(meta.cwd, "/Users/ck/Project/demo");
  assert.equal(meta.sessionUuid, "019e695d-1173-7673");

  // developer 注入指令、function_call_output、reasoning 不产生消息
  assert.equal(messages.length, 3);
  assert.deepEqual(
    messages.map((m) => m.role),
    ["user", "assistant", "assistant"]
  );
  assert.equal(messages[0].content, "你是开发，帮我 Review 这个文件");
  assert.equal(messages[1].content, "我会先把项目结构摸清楚。");
});

test("parseCodexLines：工具调用转为可读文本并带 tool_name", () => {
  const { messages } = parseCodexLines(LINES);
  const tool = messages[2];
  assert.equal(tool.has_tool_use, 1);
  assert.equal(tool.tool_name, "exec_command");
  assert.match(tool.content, /\[工具调用 exec_command\] pwd/);
});

test("parseCodexLines：无 session_meta 时 meta 为 null", () => {
  const { meta } = parseCodexLines([LINES[2]]);
  assert.equal(meta, null);
});
