# 牛马程生态 UI 设计系统（风格统一基线）

## 元信息
- 类型：UI
- 来源：调研 `niuma-cheng-xiaobao` 前端（`frontend/src/styles/theme.css`、`frontend/package.json`）
- 创建日期：2026-06-23
- 相关角色：PM（兼 UI 职责）
- 相关迭代/任务：`niuma-cheng-workboard` v0.1（UI 先行）

## 内容摘要

确立**「牛马程生态所有项目 UI 风格统一」为全局宗旨**。统一基线取自 `niuma-cheng-xiaobao` 的 **shadcn/ui（Radix UI + Tailwind v4）** 设计体系。

关键事实：小报前端 package 名为 `@figma/my-make-file`，即由 **Figma Make 生成导出**，技术栈为 React 18 + Tailwind v4 + shadcn/ui（非根目录索引所记的 Vue3）。因此用 Figma / Claude Design 出图可与小报共用同一套设计语言，统一成本接近于零。

### 设计 Token（浅色为主，支持深色模式）

| 类别 | Token | 值 |
|------|-------|-----|
| 背景 | background | `#f6f7f9`（浅灰蓝） |
| 卡片 | card | `#ffffff` |
| 主色 | primary | `#030213`（近黑深蓝紫） |
| 主色前景 | primary-foreground | `#ffffff` |
| 次要 | secondary | `oklch(0.95 0.0058 264.53)`（浅灰蓝） |
| 弱化背景 | muted | `#ececf0` |
| 弱化前景 | muted-foreground | `#717182`（中灰） |
| 强调 | accent | `#e9ebef` |
| 警示 | destructive | `#d4183d`（红） |
| 边框 | border | `rgba(0,0,0,0.1)`（极细） |
| 输入背景 | input-background | `#f3f3f5` |
| 圆角 | radius | `0.625rem`（10px）→ sm 6px / md 8px / lg 10px / xl 14px |
| 字号 | font-size | 16px 基准，行高 1.5 |
| 字重 | font-weight | normal 400 / **medium 500（最重，无粗体）** |
| 侧边栏 | sidebar | `#ffffff`（白底），选中 sidebar-primary `#030213` |
| 图表色板 | chart-1~5 | `oklch` 橙 / 青 / 蓝 / 黄 / 暖 |

### 风格原则
- 浅色、克制、专业的**中后台调性**（New York 风）。
- 字重最多 500，**不使用粗体**，靠层级与留白区分主次。
- 统一 10px 圆角、白卡 + 极细边框、浅灰背景。
- 图标 **lucide**，图表 **recharts**，抽屉 **vaul (drawer)**，Toast **sonner**，动画 **motion**。

### 组件体系
shadcn/ui（Radix）全家桶：Sidebar、Card、Badge、Dialog/Drawer、Table、Tabs、Tooltip、Dropdown、Select、Switch、Checkbox、Separator、ScrollArea 等。

## 适用场景
牛马程生态各项目的**新建界面与原型图**，优先沿用本基线，保证跨项目视觉一致。

## 不适用场景
- 需强烈差异化品牌视觉的对外营销页（另议，不强套本基线）。

## 证据/链接
- `niuma-cheng-xiaobao/frontend/src/styles/theme.css`（设计 token 真源）
- `niuma-cheng-xiaobao/frontend/package.json`（`@figma/my-make-file`，Figma Make 导出，shadcn/Radix 依赖清单）

## 后续动作
- **[待 Owner 推进｜跨仓]** 本设计系统当前只落在 `niuma-cheng-workboard`，仅约束本项目。要真正成为**约束所有项目的全局宗旨**，需提升到 `agent-workflow`（工作流真源）或 `niuma-cheng-coordination`（跨项目真源）。该提升属跨仓动作，按红线不在本项目会话直接改那两个仓，须 Owner 单独推进。
- **[记录]** 根目录索引 `/root/Project/CLAUDE.md` 将小报技术栈记为 Vue3，与实际前端（React/shadcn/Figma Make）不符，建议 Owner 在根目录订正。
