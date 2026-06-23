/**
 * 跨项目归属识别（设计 2.4）。
 *
 * 把自由文本字段（如「xiaobao · Developer」「ai · PM（ck）」）匹配到配置项目 id。
 * id 用词边界匹配，避免 `ai` 这类短 id 命中普通单词；项目名作为 alias 直接包含匹配。
 */
export function makeProjectMatcher(projects) {
  return function resolveProjectIds(label) {
    if (!label || typeof label !== "string") return [];
    const ids = [];
    for (const p of projects) {
      const byId = new RegExp(`(^|[^a-zA-Z0-9_-])${escapeRegExp(p.id)}([^a-zA-Z0-9_-]|$)`).test(label);
      const byName = p.name && label.includes(p.name);
      if (byId || byName) ids.push(p.id);
    }
    return ids;
  };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
