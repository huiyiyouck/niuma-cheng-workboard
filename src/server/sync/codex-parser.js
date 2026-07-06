/**
 * Codex 会话解析（IRC-003：会话源兼容 Claude Code + Codex 两种，不做通用适配层）。
 *
 * rollout-*.jsonl 结构：
 * - 首行 session_meta：payload.id / payload.timestamp / payload.cwd
 * - event_msg：payload.type = user_message / agent_message 为真实对话（developer 注入指令不在其中）
 * - response_item：payload.type = function_call 为工具调用；function_call_output / reasoning 跳过
 */

export function cwdToProjectId(cwd) {
  if (!cwd || typeof cwd !== "string") return null;
  // 与 Claude Code 目录编码一致：/ 和 . 都替换为 -（实测 /root/.claude → -root--claude），
  // 否则含点路径的项目在白名单里对不上，Codex 会话会被静默丢弃
  return cwd.replace(/\/+$/, "").replace(/[/.]/g, "-");
}

function toolCallText(name, argsRaw) {
  let detail = "";
  try {
    const args = JSON.parse(argsRaw || "{}");
    if (typeof args.cmd === "string") {
      detail = args.cmd.split("\n")[0].slice(0, 120);
    } else {
      const json = JSON.stringify(args);
      detail = json.length > 100 ? json.slice(0, 100) + "..." : json;
    }
  } catch {
    detail = String(argsRaw || "").slice(0, 100);
  }
  return `[工具调用 ${name}] ${detail}`.trim();
}

export function parseCodexLines(lines) {
  let meta = null;
  const messages = [];

  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (!obj) continue;
    const ts = obj.timestamp || null;
    const p = obj.payload || {};

    if (obj.type === "session_meta") {
      meta = {
        sessionUuid: p.id ?? null,
        cwd: p.cwd ?? null,
        startedAt: p.timestamp ?? ts,
      };
      continue;
    }

    if (obj.type === "event_msg") {
      if (p.type === "user_message" && typeof p.message === "string") {
        messages.push({ role: "user", content: p.message, created_at: ts, has_tool_use: 0, tool_name: null, has_thinking: 0 });
      } else if (p.type === "agent_message" && typeof p.message === "string") {
        messages.push({ role: "assistant", content: p.message, created_at: ts, has_tool_use: 0, tool_name: null, has_thinking: 0 });
      }
      continue;
    }

    if (obj.type === "response_item" && p.type === "function_call" && p.name) {
      messages.push({
        role: "assistant",
        content: toolCallText(p.name, p.arguments),
        created_at: ts,
        has_tool_use: 1,
        tool_name: p.name,
        has_thinking: 0,
      });
    }
  }

  return { meta, messages };
}
