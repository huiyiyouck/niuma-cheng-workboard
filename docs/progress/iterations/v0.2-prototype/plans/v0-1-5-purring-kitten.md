# Plan: 新增「项目会话」视图（v0.2）

## Context

在 v0.1 四视图基础上新增第 5 个左菜单项「项目会话」，包含项目切换器、角色卡片网格、映射配置弹窗。UI 规格来自用户提供的 v0.2 文档（2026-07-04）。所有改动在 `src/app/App.tsx` 单文件内完成，沿用已有设计系统 token 和骨架屏模式。

---

## 文件

唯一修改文件：`src/app/App.tsx`

---

## 实现步骤

### 1. 新增类型

```typescript
type RoleMappingStatus = "mapped" | "unmapped" | "error";

interface RoleDef {
  id: "PM" | "Architect" | "Developer" | "DevOps" | "General";
  label: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
}

interface SessionItem {
  id: string;
  title: string;
  createdAt: string;
  lastActiveAt: string;
}

interface RoleMapping {
  roleId: string;
  status: RoleMappingStatus;
  sessionId?: string;
  sessionTitle?: string;
  errorMsg?: string;
}
```

### 2. 新增 Mock 数据

**ROLE_DEFS**（5 个角色，图标用 lucide 已有导入 + 新增 `Briefcase`, `Building2`, `Code2`, `Server`, `Sparkles`）：

| id | label | description |
|----|-------|-------------|
| PM | 产品经理 | 负责产品目标、需求拆解、范围边界、用户故事、验收标准和迭代规划 |
| Architect | 架构师 | 负责系统架构设计、技术选型、非功能需求、架构决策记录和技术方案评审 |
| Developer | 开发工程师 | 负责代码实现、自测、重构、技术债务管理和开发流程优化 |
| DevOps | 运维部署工程师 | 负责部署运维、环境管理、CI/CD、监控告警和生产稳定性 |
| General | 通用助手 | 通用助手，不进入标准迭代门禁，直接响应日常请求 |

**MOCK_SESSIONS**（3 条示例会话，用于弹窗第 3 步下拉）：
```typescript
[
  { id: "s1", title: "v0.2 UI 方案讨论", createdAt: "2026-07-04 10:30", lastActiveAt: "2026-07-04 15:45" },
  { id: "s2", title: "REQ-001 联调问题排查", createdAt: "2026-07-03 14:00", lastActiveAt: "2026-07-03 18:20" },
  { id: "s3", title: "部署去软链问题修复", createdAt: "2026-07-02 09:15", lastActiveAt: "2026-07-02 11:00" },
]
```

**初始映射状态**（`INITIAL_MAPPINGS`，按项目 id 分组）：
- xiaobao：PM→mapped(s1)、Developer→mapped(s3)、General→mapped(s2)、Architect/DevOps→unmapped
- workboard：PM→unmapped、Architect→mapped(s1)、Developer→mapped(s1)、DevOps/General→unmapped
- 其余项目：全部 unmapped

### 3. 扩展 View 类型与导航

```typescript
// 原：
type View = "workbench" | "deploy" | "diagnostics" | "crossproject";
// 改为：
type View = "workbench" | "deploy" | "diagnostics" | "crossproject" | "sessions";
```

NAV_ITEMS 末尾追加：
```typescript
{ id: "sessions", label: "项目会话", Icon: MessagesSquare }
```
（`MessagesSquare` 从 lucide-react 新增导入；VIEW_LABELS 同步追加 `sessions: "项目会话"`）

### 4. 新增骨架屏 `SessionsSkeleton`

布局结构：
- 项目切换器骨架（1 行宽矩形）
- 3 列角色卡骨架（5 张卡，每张含图标占位 + 2 行文字 + 底部按钮条）

放置位置：紧跟 `CrossProjectSkeleton` 之后（约 line 560 区域），与其他骨架屏并排。

### 5. 新增组件

#### `ProjectSwitcher`
Props: `{ selectedId: string; onChange: (id: string) => void }`

- 用 `<select>` 原生下拉或自定义 Radix `Select`（项目已有 @radix-ui）
- 选项来自 `PROJECTS` 数组（全部 5 个项目）
- 选中项显示：项目名 + KindBadge

#### `RoleCard`
Props: `{ role: RoleDef; mapping: RoleMapping; onConfigure: () => void; onViewDetail: () => void }`

布局：
```
┌─────────────────────────────┐
│ [Icon]  角色名称  [状态徽标] │
│ 职责简述（2行截断）          │
│ ─────────────────────────── │
│ [会话标题，仅已映射时显示]   │
│ [操作按钮]                   │
└─────────────────────────────┘
```

状态徽标配色（复用已有 className 模式）：
- 已映射：`bg-emerald-50 text-emerald-700 border border-emerald-200`
- 未选择：`bg-gray-100 text-gray-500 border border-gray-200`
- 读取异常：`bg-orange-50 text-orange-600 border border-orange-200`

操作按钮：
- 已映射 → 「查看详情」（打开右抽屉）
- 未选择 → 「配置映射」（打开 MappingModal）
- 读取异常 → 「重新读取」（模拟 reload，触发短暂 loading）

#### `MappingModal`
Props: `{ open: boolean; onClose: () => void; initialProjectId: string; initialRoleId?: string; onConfirm: (projectId: string, roleId: string, session: SessionItem) => void }`

实现：覆盖层 + 白色居中弹窗（非右抽屉），用 `fixed inset-0` + flex center，z-50。

三步表单（受控 state：`step1Project`, `step2Role`, `step3Session`）：

| 步骤 | 字段 | 启用条件 |
|------|------|---------|
| 1 | 选择项目（select） | 始终启用 |
| 2 | 选择角色（select） | step1Project 已选 |
| 3 | 选择会话（select，显示 title + lastActiveAt） | step2Role 已选 |

底部按钮：
- 「确认配置」：`bg-[#030213] text-white`，仅 3 步全选时启用
- 「取消」：`border border-border text-foreground`

点击确认 → 调用 `onConfirm` → 父组件更新 `mappings` state → 卡片变为「已映射」

#### `RoleMappingDrawerContent`
Props: `{ role: RoleDef; mapping: RoleMapping }`

复用已有 `Section` / `Field` 组件，展示：
- 角色信息（名称、职责）
- 会话信息（标题、创建时间、最近活动）
- 操作（重新配置按钮，打开 MappingModal）

#### `SessionsView`
Props: `{ onOpenDrawer: (role: RoleDef, mapping: RoleMapping) => void }`

内部 state：
- `selectedProjectId: string`（默认 `"workboard"`）
- `mappings: Record<string, RoleMapping[]>`（以项目 id 为 key）
- `modalOpen: boolean`
- `modalRoleId: string | undefined`

布局（从上到下）：
```
[ProjectSwitcher]
[3列 RoleCard 网格]
[MappingModal（条件渲染）]
```

### 6. 骨架屏接入

在 App 组件 loading 条件渲染块中追加：
```tsx
{activeView === "sessions" && <SessionsSkeleton />}
```

在非 loading 块追加：
```tsx
{activeView === "sessions" && (
  <SessionsView onOpenDrawer={(role, mapping) => openDrawer(() => { setDrawerRole({ role, mapping }); })} />
)}
```

新增 `drawerRole` state：`{ role: RoleDef; mapping: RoleMapping } | null`，对应一个新 `Drawer`：
```tsx
<Drawer open={!!drawerRole} onClose={() => setDrawerRole(null)} title={drawerRole?.role.label ?? "角色详情"}>
  {drawerLoading ? <ProjectDrawerSkeleton /> : drawerRole && <RoleMappingDrawerContent {...drawerRole} />}
</Drawer>
```

### 7. lucide-react 新增导入

在文件顶部 import 块追加：
```typescript
import {
  MessagesSquare,  // 项目会话导航图标
  Briefcase,       // PM
  Building2,       // Architect
  Code2,           // Developer
  Server,          // DevOps
  Sparkles,        // General
} from "lucide-react";
```

---

## 关键约束

- **不改动** v0.1 四视图任何逻辑
- `mappings` state 纯内存，不持久化（原型阶段）
- `MappingModal` 不使用 Radix Dialog，用自定义覆盖层保持一致性
- 骨架屏复用已有 `Sk` 组件

---

## 验证方式

1. 左菜单出现第 5 项「项目会话」，点击后内容区切换
2. 切换视图触发骨架屏（~800ms）
3. 项目切换器切换项目后角色卡映射状态随之变化
4. 「配置映射」打开弹窗，三步依次解锁，确认后卡片变为「已映射」
5. 「查看详情」打开右抽屉，展示会话信息，drawerLoading 骨架屏正常展示
6. v0.1 四视图功能无回归（工作台 / 部署 / 诊断 / 跨项目全部正常）
