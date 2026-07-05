/**
 * 会话元信息前置处理（设计 4.3 标题提取 / 4.4 角色自动识别）。
 * 识别结果仅作辅助标签，最终角色以用户映射配置为准。
 */

const TITLE_MAX = 50;

// 「你是 XX」精确匹配别名 → 规范角色 ID（长别名在前，避免「开发」抢先匹配「开发工程师」）
const ROLE_ALIASES = [
  { role: "PM", aliases: ["PM", "产品经理", "产品"] },
  { role: "Architect", aliases: ["Architect", "架构师", "架构"] },
  { role: "Developer", aliases: ["Developer", "开发工程师", "开发"] },
  { role: "DevOps", aliases: ["DevOps", "运维部署工程师", "运维"] },
  { role: "General", aliases: ["General", "通用助手"] },
];

// 关键词加权表（与前端 EcosystemView ROLE_KEYWORDS 保持一致）
const ROLE_KEYWORDS = [
  { role: "PM", keywords: ["PM", "产品", "PRD", "需求", "用户故事", "验收"] },
  { role: "Architect", keywords: ["架构", "Architect", "设计文档", "技术选型", "数据模型", "Spike"] },
  { role: "Developer", keywords: ["开发", "Developer", "实现", "代码", "重构", "Bug", "修复", "测试"] },
  { role: "DevOps", keywords: ["部署", "DevOps", "运维", "上线", "发布", "systemd", "nginx", "证书"] },
];

export function extractTitle({ customTitle, firstUserContent } = {}) {
  if (typeof customTitle === "string" && customTitle.trim()) {
    return customTitle.trim();
  }
  if (typeof firstUserContent === "string" && firstUserContent.trim()) {
    return firstUserContent.trim().slice(0, TITLE_MAX);
  }
  return "未命名会话";
}

/**
 * @param {string[]} userContents 前 5 条 user 消息文本（首条在前）
 * @returns {{ role: string, confidence: number }}
 */
export function detectRole(userContents) {
  const contents = Array.isArray(userContents) ? userContents.filter((c) => typeof c === "string") : [];
  if (contents.length === 0) return { role: "Unknown", confidence: 0 };

  // 1. 精确匹配：首条消息「你是 XX」→ 置信度 1.0
  const first = contents[0].trim();
  const m = first.match(/你是\s*([A-Za-z一-龥]+)/);
  if (m) {
    const said = m[1];
    for (const { role, aliases } of ROLE_ALIASES) {
      if (aliases.some((a) => said.toLowerCase().startsWith(a.toLowerCase()))) {
        return { role, confidence: 1.0 };
      }
    }
  }

  // 2. 关键词加权：扫描前 5 条 user 消息 → 置信度 0.5~0.9
  const text = contents.slice(0, 5).join("\n").toLowerCase();
  const scores = ROLE_KEYWORDS.map(({ role, keywords }) => ({
    role,
    hits: keywords.filter((k) => text.includes(k.toLowerCase())).length,
  })).sort((a, b) => b.hits - a.hits);

  const [top, second] = scores;
  if (top.hits > 0 && top.hits > (second?.hits ?? 0)) {
    return { role: top.role, confidence: Math.min(0.5 + top.hits * 0.1, 0.9) };
  }

  // 3. 无法识别（含打平不硬猜）
  return { role: "Unknown", confidence: 0 };
}
