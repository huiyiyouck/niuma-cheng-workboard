/**
 * 通用 Markdown 解析原语：标题定位 + 表格列名映射 + 列表字段。
 *
 * 设计原则（4.4）：先用标题锚点定位区域，再在区域内按表头列名映射字段，
 * 不依赖固定列序，也不用正则跨全文硬抓（避免命中 Review 历史 / 归档内容）。
 */

/**
 * 定位某个标题下的区域内容（不含标题行本身），到下一个同级或更高级标题为止。
 * @param {string} markdown 全文
 * @param {string} heading 形如 "## 跨任务待办"
 * @returns {string|null} 区域文本；找不到返回 null
 */
export function findSection(markdown, heading) {
  const m = /^(#+)\s+(.*)$/.exec(heading.trim());
  if (!m) return null;
  const startLevel = m[1].length;
  const title = m[2].trim();

  const lines = markdown.split(/\r?\n/);
  let start = -1;
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const hm = /^(#+)\s+(.*)$/.exec(lines[i]);
    if (hm && hm[1].length === startLevel && hm[2].trim() === title) {
      start = i + 1;
      startIdx = i;
      break;
    }
  }
  if (start === -1) return null;

  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    const hm = /^(#+)\s+/.exec(lines[i]);
    if (hm && hm[1].length <= startLevel) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/**
 * 解析区域内第一个 Markdown 表格为对象数组（按表头列名）。
 * @returns {{ headers: string[], rows: Array<Record<string,string>> }|null} 无表格返回 null
 */
export function parseFirstTable(sectionText) {
  if (!sectionText) return null;
  const lines = sectionText.split(/\r?\n/);
  let i = 0;
  // 跳到第一张表的表头行
  while (i < lines.length && !isTableRow(lines[i])) i++;
  if (i >= lines.length) return null;
  const headerLine = lines[i];
  const sepLine = lines[i + 1];
  if (!sepLine || !/^\s*\|?[\s:|-]+\|?\s*$/.test(sepLine) || !sepLine.includes("-")) {
    return null; // 第二行不是分隔行，不构成合法表格
  }
  const headers = splitRow(headerLine);
  const rows = [];
  for (let j = i + 2; j < lines.length; j++) {
    if (!isTableRow(lines[j])) break;
    const cells = splitRow(lines[j]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

/**
 * 解析区域内的列表字段 "- key：value"（中英文冒号），返回首次出现的键值。
 * @returns {Record<string,string>}
 */
export function parseListFields(sectionText) {
  const out = {};
  if (!sectionText) return out;
  for (const line of sectionText.split(/\r?\n/)) {
    const m = /^\s*[-*]\s*([^:：]+)[：:]\s*(.*)$/.exec(line);
    if (m) {
      const key = m[1].trim();
      if (!(key in out)) out[key] = m[2].trim();
    }
  }
  return out;
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line ?? "");
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}
