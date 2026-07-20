# agent-workflow 卡片深度详情 · PM 范围定义（交 Developer 实现）

- 日期：2026-07-20
- 角色：PM（定范围）
- 来源：INDEX 跨任务待办「生态根卡片钻取」④ 子项剩余部分（入口 `a1685d8` 已做，剩后端深度）
- 状态：范围已定，待 Developer 实现（不阻塞 v0.3 部署，可并入后续一轮）

## 背景 / 现状

- 前端：生态根「框架真源(agent-workflow)」只读卡片的**钻取入口已做**（`a1685d8`，App.tsx/EcosystemView），但点进去详情薄。
- 后端：`src/server/parsers/workflow-source.js` 现**仅浅层**——探测 `docs/ROADMAP.md`/`docs/baseline`/`docs/templates` 是否存在，返回 `{ summary, checks }`（一句摘要 + 3 个布尔）。

## 关键修正（PM 核实真实目录后）

原待办写"展示 baseline / **版本** / 演进"——但 **agent-workflow 没有版本号**（无 `VERSION`/`CHANGELOG`，它是持续演进的框架真源、不是版本化产品）。**「版本列表」维度不适用，删去**；"演进"改由 ROADMAP + progress 体现。

## 范围：卡片点进去展示什么（4 块，全只读）

真实可取内容（均在 agent-workflow 目录，`workflow-source.js` 读）：

1. **定位** —— `README.md` 首段（"一人公司 AI 多角色开发团队工作流…"一句话）。
2. **演进 / 路线** —— `docs/ROADMAP.md`：现只取了首标题，扩展为取**各级标题/章节列表**（呈现路线图骨架）。
3. **基线清单**（框架真源核心）—— `docs/baseline/*.md` 文件清单（现有 20 个）。建议按前缀轻分组：角色手册 `role-*.md`、机制/流程（`mechanisms`/`runtime`/`standard-iteration-quick` 等）。每项列文件名（可选首标题）。
4. **模板清单** —— `docs/templates/*.md` 文件清单（现有 10 个：prd/design/iteration/review-plan…）。

## 数据来源（只读，不改 agent-workflow）

`README.md`（定位）· `docs/ROADMAP.md`（章节）· `docs/baseline/*.md`（清单）· `docs/templates/*.md`（清单）。

## 实现拆分（交 Developer）

- **后端** `workflow-source.js`：扩展返回结构，在现 `{ summary, checks }` 基础上加 `positioning`（README 首段）、`roadmap`（ROADMAP 章节数组）、`baseline`（文件清单，可含分组）、`templates`（文件清单）。目录不存在时对应字段留空、不报错（沿用现有容错风格）。
- **前端**：卡片钻取详情面板展示上述 4 块，只读（与 coordination 详情一致的只读呈现）。
- **不做**：版本列表（不适用）；不改 agent-workflow 任何文件（只读它）。

## 验收要点

- agent-workflow 卡片点进去能看到：定位 + ROADMAP 章节 + baseline 清单 + templates 清单；
- agent-workflow 目录若缺某项（如无 ROADMAP）对应块优雅留空、不报错；
- 全程只读，不写 agent-workflow。
