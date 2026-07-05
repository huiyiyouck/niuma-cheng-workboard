import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Rocket,
  Stethoscope,
  Network,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  AlertTriangle,
  X,
  Circle,
  ArrowRight,
  RefreshCw,
  Layers,
  Package,
  Users,
  MessageSquare,
  GitBranch,
  Flag,
  Unlink,
  GitPullRequest,
  MessagesSquare,
  Briefcase,
  Building2,
  Code2,
  Server,
  Sparkles,
  CalendarClock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus =
  | "integrated"
  | "not-bootstrapped"
  | "config-error"
  | "read-error"
  | "disabled"
  | "not-integrated";

type ProjectKind = "business" | "workboard" | "coordination" | "workflow-source";

interface AgentRole {
  role: string;
  recentAction: string;
  nextStep: string;
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "mid" | "low";
}

interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  status: IntegrationStatus;
  iteration?: string;
  mode?: string;
  phase?: string;
  blocked?: string | null;
  nextStep?: string | null;
  kindSummary?: string;
  url?: string;
  configPath: string;
  resolvePath: string;
  parser: string;
  lastRead: string;
  fileCheck: "ok" | "missing" | "error";
  errorSummary?: string;
  roles: AgentRole[];
  todos: Todo[];
}

type ReqStatus = "已提报" | "评估中" | "已承接" | "开发中" | "联调中" | "已关闭";

interface CrossProjectItem {
  id: string;
  title: string;
  sourceLabel: string;
  targetLabel: string;
  targetIteration: string;
  priority: "P0" | "P1" | "P2";
  status: ReqStatus;
  updatedAt: string;
}

interface BcrItem {
  id: string;
  summary: string;
  target: string;
  status: string;
}

interface CommItem {
  id: string;
  reqId: string;
  projects: string[];
  summary: string;
  ts: string;
}

interface CrossTodoItem {
  id: string;
  priority: "P0" | "P1" | "P2";
  text: string;
  project: string;
  role: string;
  status: string;
}

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

// ─── Real Data ────────────────────────────────────────────────────────────────

const PROJECTS: Project[] = [
  {
    id: "workflow",
    name: "团队工作流",
    kind: "workflow-source",
    status: "integrated",
    kindSummary: "工作流真源 · P8 BCR 自举中 · baseline / templates / ROADMAP",
    blocked: null,
    nextStep: null,
    configPath: "../agent-workflow",
    resolvePath: "/root/Project/agent-workflow",
    parser: "workflowSourceParser",
    lastRead: "刚刚",
    fileCheck: "ok",
    roles: [],
    todos: [],
  },
  {
    id: "xiaobao",
    name: "牛马程小报",
    kind: "business",
    status: "integrated",
    iteration: "v0.6",
    mode: "标准迭代",
    phase: "实现阶段·联调精修",
    blocked: "生产/测试部署去软链接化待 DevOps",
    nextStep: "Owner 报具体 bug → Developer 修复 / DevOps 规整生产部署去软链",
    url: "https://news.huiyiyou.cloud",
    configPath: "../niuma-cheng-xiaobao",
    resolvePath: "/root/Project/niuma-cheng-xiaobao",
    parser: "businessParser",
    lastRead: "12s 前",
    fileCheck: "ok",
    roles: [
      { role: "PM", recentAction: "v0.6 设计 R2 定稿裁定，进实现阶段", nextStep: "跟进开发收口" },
      { role: "UI", recentAction: "v0.6 UI 方案 R2 已定稿", nextStep: "待开发反馈" },
      { role: "Architect", recentAction: "v0.6 设计文档翻牌定稿", nextStep: "—" },
      { role: "Developer", recentAction: "前端联调精修，已收口", nextStep: "等 Owner 报 bug" },
      { role: "Tester", recentAction: "v0.6 设计 R2 复审，有条件通过", nextStep: "—" },
      { role: "DevOps", recentAction: "—", nextStep: "规整生产部署去软链" },
      { role: "WM", recentAction: "初始化 coordination 骨架", nextStep: "—" },
    ],
    todos: [
      { id: "t1", text: "Owner 报具体 bug", done: false, priority: "high" },
      { id: "t2", text: "规整生产部署去软链接化", done: false, priority: "high" },
    ],
  },
  {
    id: "ai",
    name: "AI 处理中枢",
    kind: "business",
    status: "integrated",
    iteration: "—",
    mode: "未选择",
    phase: "已承接 REQ-001，待启动 v0.1",
    blocked: null,
    nextStep: "PM 创建 v0.1-prd.md 启动标准迭代，把 REQ-001 由 stub 转真实",
    configPath: "../niuma-cheng-ai",
    resolvePath: "/root/Project/niuma-cheng-ai",
    parser: "businessParser",
    lastRead: "8s 前",
    fileCheck: "ok",
    roles: [
      { role: "PM", recentAction: "已承接 REQ-001，待启动 v0.1", nextStep: "创建 v0.1-prd.md" },
    ],
    todos: [
      { id: "t3", text: "PM 创建 v0.1-prd.md 启动标准迭代", done: false, priority: "high" },
      { id: "t4", text: "REQ-001 各节点从 stub 转真实实现", done: false, priority: "high" },
    ],
  },
  // coordination stays in PROJECTS for diagnostics table, but NOT rendered in workbench card grid
  {
    id: "coordination",
    name: "跨项目协调仓库",
    kind: "coordination",
    status: "integrated",
    kindSummary: "协调仓 · 不要求 INDEX",
    blocked: null,
    nextStep: null,
    configPath: "../niuma-cheng-coordination",
    resolvePath: "/root/Project/niuma-cheng-coordination",
    parser: "coordinationParser",
    lastRead: "5s 前",
    fileCheck: "ok",
    roles: [],
    todos: [],
  },
  {
    id: "workboard",
    name: "项目管理工作台",
    kind: "workboard",
    status: "integrated",
    iteration: "v0.1",
    mode: "标准迭代",
    phase: "UI/原型先行",
    blocked: null,
    nextStep: "Owner 出原型图 → PM 回填 v0.1 功能 PRD",
    configPath: ".",
    resolvePath: "/root/Project/niuma-cheng-workboard",
    parser: "workboardParser",
    lastRead: "3s 前",
    fileCheck: "ok",
    roles: [
      { role: "PM", recentAction: "—", nextStep: "回填 v0.1 功能 PRD" },
      { role: "Architect", recentAction: "v0.1 UI 方案 R1 已通过", nextStep: "—" },
      { role: "Developer", recentAction: "v0.1 UI 方案 R1 已通过", nextStep: "待 PRD 回填后启动开发" },
    ],
    todos: [
      { id: "t5", text: "Owner 出原型图", done: true, priority: "high" },
      { id: "t6", text: "PM 回填 v0.1 功能 PRD", done: false, priority: "high" },
    ],
  },
];

// Projects shown in workbench card grid (coordination excluded)
const CARD_PROJECTS = PROJECTS.filter((p) => p.kind !== "coordination");

const CROSS_TODOS: CrossTodoItem[] = [
  { id: "ct1", priority: "P0", text: "实现第一版只读看板 MVP", project: "workboard", role: "Developer", status: "待启动" },
  { id: "ct2", priority: "P1", text: "REQ-001 启动 v0.1，实现真实 L1 处理（stub→真实）", project: "ai", role: "PM", status: "待启动" },
  { id: "ct3", priority: "P1", text: "MCP 协议信息源完整支持（新建/编辑/删除 UI + 工具配置）", project: "xiaobao", role: "PM", status: "待评估" },
  { id: "ct4", priority: "P1", text: "生产/测试部署去软链接化", project: "xiaobao", role: "DevOps", status: "待启动" },
];

const CROSS_PROJECT_ITEMS: CrossProjectItem[] = [
  {
    id: "REQ-001",
    title: "新闻 L1 处理：四维原始评分 + 五类标签 + 摘要 + 翻译 + 按需工具调用",
    sourceLabel: "牛马程小报 · Developer",
    targetLabel: "AI 处理中枢 · PM",
    targetIteration: "ai v0.1（待启动）",
    priority: "P0",
    status: "联调中",
    updatedAt: "2026-06-23",
  },
];

const BCR_ITEMS: BcrItem[] = [
  { id: "BCR-001", summary: "基线修正提案改走 coordination 管理", target: "agent-workflow", status: "已回流下游" },
  { id: "BCR-002", summary: "communications 命名轴（按需求一份）", target: "agent-workflow", status: "已回流下游" },
];

const COMM_ITEMS: CommItem[] = [
  {
    id: "c1",
    reqId: "REQ-001-news-l1",
    projects: ["牛马程小报", "AI 处理中枢"],
    summary: "news-l1 v1 契约定稿，端到端单条已通过，3–5 条小批量观察中",
    ts: "2026-06-23",
  },
];

// ─── Sessions Data ────────────────────────────────────────────────────────────

const ROLE_DEFS: RoleDef[] = [
  { id: "PM", label: "产品经理", description: "负责产品目标、需求拆解、范围边界、用户故事、验收标准和迭代规划", Icon: ({ className }) => <Briefcase className={className} /> },
  { id: "Architect", label: "架构师", description: "负责系统架构设计、技术选型、非功能需求、架构决策记录和技术方案评审", Icon: ({ className }) => <Building2 className={className} /> },
  { id: "Developer", label: "开发工程师", description: "负责代码实现、自测、重构、技术债务管理和开发流程优化", Icon: ({ className }) => <Code2 className={className} /> },
  { id: "DevOps", label: "运维部署工程师", description: "负责部署运维、环境管理、CI/CD、监控告警和生产稳定性", Icon: ({ className }) => <Server className={className} /> },
  { id: "General", label: "通用助手", description: "通用助手，不进入标准迭代门禁，直接响应日常请求", Icon: ({ className }) => <Sparkles className={className} /> },
];

const MOCK_SESSIONS: SessionItem[] = [
  { id: "s0", title: "生态根会话 - 2026-07-04", createdAt: "2026-07-04 09:00", lastActiveAt: "2026-07-04 16:30" },
  { id: "s1", title: "v0.2 UI 方案讨论", createdAt: "2026-07-04 10:30", lastActiveAt: "2026-07-04 15:45" },
  { id: "s2", title: "REQ-001 联调问题排查", createdAt: "2026-07-03 14:00", lastActiveAt: "2026-07-03 18:20" },
  { id: "s3", title: "部署去软链问题修复", createdAt: "2026-07-02 09:15", lastActiveAt: "2026-07-02 11:00" },
];

// Chief of staff seat state (ecosystem root level)
interface ChiefMapping {
  status: "mapped" | "unmapped";
  sessionId?: string;
  sessionTitle?: string;
}

const INITIAL_CHIEF: ChiefMapping = { status: "unmapped" };

// Readonly root components (agent-workflow + coordination)
const ROOT_COMPONENTS = [
  {
    id: "agent-workflow",
    name: "agent-workflow",
    label: "框架真源",
    category: "框架真源·参谋长第二目录",
    positioning: "一人公司 AI 组织操作架构 SOP 真源",
    techStack: "Markdown + shell scripts",
    status: "自我演进中",
  },
  {
    id: "coordination",
    name: "公告板",
    label: "公告板",
    category: "协调·公告板",
    positioning: "契约 / 需求池 / 状态 / 决策的单一真源",
    techStack: "纯 Markdown",
    status: "维护中",
  },
];

// Subprojects (level=subproject, 3 total)
const SUBPROJECTS_META = [
  { id: "xiaobao", name: "牛马程小报", type: "业务·主产品" },
  { id: "ai", name: "AI 处理中枢", type: "业务·服务方" },
  { id: "workboard", name: "项目管理工作台", type: "工具" },
];

const INITIAL_MAPPINGS: Record<string, RoleMapping[]> = {
  xiaobao: [
    { roleId: "PM", status: "mapped", sessionId: "s1", sessionTitle: "v0.2 UI 方案讨论" },
    { roleId: "Architect", status: "unmapped" },
    { roleId: "Developer", status: "mapped", sessionId: "s3", sessionTitle: "部署去软链问题修复" },
    { roleId: "DevOps", status: "unmapped" },
    { roleId: "General", status: "mapped", sessionId: "s2", sessionTitle: "REQ-001 联调问题排查" },
  ],
  ai: [
    { roleId: "PM", status: "mapped", sessionId: "s2", sessionTitle: "REQ-001 联调问题排查" },
    { roleId: "Architect", status: "unmapped" },
    { roleId: "Developer", status: "unmapped" },
    { roleId: "DevOps", status: "unmapped" },
    { roleId: "General", status: "unmapped" },
  ],
  workboard: [
    { roleId: "PM", status: "unmapped" },
    { roleId: "Architect", status: "mapped", sessionId: "s1", sessionTitle: "v0.2 UI 方案讨论" },
    { roleId: "Developer", status: "mapped", sessionId: "s1", sessionTitle: "v0.2 UI 方案讨论" },
    { roleId: "DevOps", status: "unmapped" },
    { roleId: "General", status: "unmapped" },
  ],
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-[#030213]/[0.06] ${className}`} />;
}

function WorkbenchSkeleton() {
  return (
    <div className="space-y-4">
      {/* SummaryBar */}
      <div className="flex items-center bg-white rounded-xl border border-border px-2 py-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 flex-1">
            <Sk className="h-4 w-4 rounded-full flex-shrink-0" />
            <div className="space-y-1.5">
              <Sk className="h-3.5 w-5" />
              <Sk className="h-2.5 w-14" />
            </div>
            {i < 3 && <div className="ml-auto h-6 w-px bg-border" />}
          </div>
        ))}
      </div>
      {/* CoordinationBanner */}
      <div className="bg-white rounded-xl border border-border px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Sk className="h-3 w-16" />
            <Sk className="h-5 w-20 rounded-full" />
            <Sk className="h-3 w-48" />
          </div>
          <Sk className="h-3 w-24" />
        </div>
      </div>
      {/* CrossTodoList */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <Sk className="h-4 w-20" />
          <Sk className="h-3 w-40" />
        </div>
        <div className="divide-y divide-border/50">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4">
              <Sk className="h-5 w-8 rounded" />
              <Sk className={`h-4 ${i % 2 === 0 ? "w-72" : "w-56"}`} />
              <Sk className="h-5 w-16 rounded ml-auto" />
              <Sk className="h-5 w-14 rounded" />
              <Sk className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Sk className="h-4 w-32" />
                <div className="flex gap-1.5">
                  <Sk className="h-4 w-14 rounded" />
                  <Sk className="h-4 w-14 rounded-full" />
                </div>
              </div>
              <Sk className="h-4 w-4" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Sk className="h-2.5 w-8" /><Sk className="h-3.5 w-10" /></div>
              <div className="space-y-1"><Sk className="h-2.5 w-8" /><Sk className="h-3.5 w-14" /></div>
              <div className="col-span-2 space-y-1"><Sk className="h-2.5 w-8" /><Sk className="h-3.5 w-28" /></div>
            </div>
            <div className="flex items-start gap-1.5">
              <Sk className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <Sk className="h-3 w-44" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeploySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Sk className="h-4 w-28" />
              <Sk className="h-4 w-14 rounded" />
            </div>
            <Sk className="h-7 w-7 rounded-full" />
          </div>
          <Sk className="h-3 w-48" />
          <div className="flex items-center gap-1.5">
            <Sk className="h-1.5 w-1.5 rounded-full" />
            <Sk className="h-3 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DiagnosticsSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[#f6f7f9]">
              {["ID", "项目名", "类型", "接入状态", "文件检查", "解析路径", "解析器", "最近读取", "错误摘要", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-3"><Sk className="h-3 w-20" /></td>
                <td className="px-4 py-3"><Sk className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Sk className="h-5 w-14 rounded" /></td>
                <td className="px-4 py-3"><Sk className="h-5 w-16 rounded-full" /></td>
                <td className="px-4 py-3"><Sk className="h-4 w-12" /></td>
                <td className="px-4 py-3"><Sk className="h-3 w-36" /></td>
                <td className="px-4 py-3"><Sk className="h-3 w-28" /></td>
                <td className="px-4 py-3"><Sk className="h-3 w-12" /></td>
                <td className="px-4 py-3"><Sk className="h-3 w-20" /></td>
                <td className="px-4 py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectDrawerSkeleton() {
  return (
    <div className="space-y-6">
      {/* badges */}
      <div className="flex items-center gap-2">
        <Sk className="h-5 w-14 rounded" />
        <Sk className="h-5 w-16 rounded-full" />
      </div>
      {/* iteration */}
      <div>
        <Sk className="h-3 w-20 mb-3" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="space-y-1.5">
              <Sk className="h-2.5 w-12" />
              <Sk className="h-4 w-20" />
            </div>
          ))}
        </div>
        <Sk className="h-10 w-full rounded-lg" />
      </div>
      {/* roles */}
      <div>
        <Sk className="h-3 w-24 mb-3" />
        <div className="space-y-2">
          {[0,1,2].map(i => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Sk className="h-5 w-14 rounded" />
                <Sk className="h-3 w-28" />
              </div>
              <Sk className={`h-3 ${i === 1 ? "w-3/4" : "w-full"}`} />
            </div>
          ))}
        </div>
      </div>
      {/* todos */}
      <div>
        <Sk className="h-3 w-20 mb-3" />
        <div className="space-y-2">
          {[0,1].map(i => (
            <div key={i} className="flex items-start gap-2.5">
              <Sk className="h-4 w-4 rounded flex-shrink-0 mt-0.5" />
              <Sk className={`h-4 ${i === 0 ? "w-56" : "w-40"}`} />
            </div>
          ))}
        </div>
      </div>
      {/* paths */}
      <div>
        <Sk className="h-3 w-16 mb-3" />
        <div className="space-y-3">
          {[0,1].map(i => (
            <div key={i} className="space-y-1">
              <Sk className="h-2.5 w-8" />
              <Sk className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiagnosticDrawerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sk className="h-5 w-14 rounded" />
        <Sk className="h-5 w-16 rounded-full" />
      </div>
      <div>
        <Sk className="h-3 w-20 mb-3" />
        <div className="space-y-3">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50">
              <Sk className="h-3 w-20" />
              <Sk className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CrossItemDrawerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sk className="h-5 w-10 rounded" />
        <Sk className="h-5 w-14 rounded-full" />
        <Sk className="h-4 w-16" />
      </div>
      <div>
        <Sk className="h-3 w-24 mb-3" />
        <div className="space-y-2">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex items-start gap-2">
              <Sk className="h-3 w-14 flex-shrink-0 mt-0.5" />
              <Sk className={`h-4 ${i % 2 === 0 ? "w-48" : "w-36"}`} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Sk className="h-3 w-20 mb-3" />
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Sk className="h-3 w-32" />
            <Sk className="h-3 w-20" />
          </div>
          <Sk className="h-4 w-full" />
          <Sk className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

function CrossProjectSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1 w-fit">
        {[0, 1, 2, 3].map((i) => (
          <Sk key={i} className="h-7 w-16 rounded" />
        ))}
      </div>
      <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1 w-fit">
        {[0, 1, 2].map((i) => <Sk key={i} className="h-6 w-12 rounded" />)}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sk className="h-5 w-16 rounded" />
            <Sk className="h-5 w-16 rounded" />
            <Sk className="h-5 w-24 rounded-full" />
          </div>
          <Sk className={`h-4 ${i === 0 ? "w-full" : "w-3/4"}`} />
          <div className="flex items-center gap-2">
            <Sk className="h-3 w-36" />
            <Sk className="h-3 w-3" />
            <Sk className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Chief of staff card */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Sk className="h-3 w-20" />
            <Sk className="h-5 w-36" />
          </div>
          <Sk className="h-8 w-16 rounded-lg" />
        </div>
        <Sk className="h-3 w-3/4" />
      </div>
      {/* Root component cards */}
      <div>
        <Sk className="h-3 w-28 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sk className="h-7 w-7 rounded-lg" />
                <Sk className="h-4 w-28" />
              </div>
              <Sk className="h-3 w-full" />
              <Sk className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
      {/* Subproject cards */}
      <div>
        <Sk className="h-3 w-20 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-3">
              <div className="space-y-1.5">
                <Sk className="h-4 w-28" />
                <Sk className="h-3 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Sk className="h-3 w-20" />
                <Sk className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; className: string; Icon: React.FC<{ className?: string }> }> = {
  integrated: {
    label: "已接入",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Icon: ({ className }) => <CheckCircle2 className={className} />,
  },
  "not-bootstrapped": {
    label: "未接入工作流",
    className: "bg-gray-100 text-gray-500 border border-gray-200",
    Icon: ({ className }) => <Circle className={className} />,
  },
  "config-error": {
    label: "配置异常",
    className: "bg-red-50 text-red-600 border border-red-200",
    Icon: ({ className }) => <XCircle className={className} />,
  },
  "read-error": {
    label: "读取异常",
    className: "bg-orange-50 text-orange-600 border border-orange-200",
    Icon: ({ className }) => <AlertTriangle className={className} />,
  },
  disabled: {
    label: "已禁用",
    className: "bg-white text-gray-400 border border-gray-200",
    Icon: ({ className }) => <MinusCircle className={className} />,
  },
  "not-integrated": {
    label: "未接入团队工作流",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    Icon: ({ className }) => <AlertCircle className={className} />,
  },
};

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-none ${cfg.className}`}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

const KIND_LABEL: Record<ProjectKind, string> = {
  business: "业务",
  workboard: "工作板",
  coordination: "协调",
  "workflow-source": "工作流源",
};

function KindBadge({ kind }: { kind: ProjectKind }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-[#030213]/5 text-[#030213]/50 border border-[#030213]/10 uppercase tracking-wide">
      {KIND_LABEL[kind]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: "P0" | "P1" | "P2" }) {
  const map = { P0: "bg-red-50 text-red-600 border border-red-200", P1: "bg-orange-50 text-orange-600 border border-orange-200", P2: "bg-gray-100 text-gray-500 border border-gray-200" };
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${map[priority]}`}>{priority}</span>;
}

const BCR_STATUS_COLORS: Record<string, string> = {
  "已提报": "bg-gray-100 text-gray-500 border border-gray-200",
  "评估中": "bg-blue-50 text-blue-600 border border-blue-200",
  "已采纳": "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "已落地真源": "bg-emerald-50 text-emerald-700 border border-emerald-300",
  "回流中": "bg-amber-50 text-amber-600 border border-amber-200",
  "已回流下游": "bg-[#030213]/5 text-[#030213]/50 border border-[#030213]/10",
};

function BcrStatusBadge({ status }: { status: string }) {
  const cls = BCR_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-500 border border-gray-200";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

const REQ_STATUS_COLORS: Record<ReqStatus, string> = {
  "已提报": "bg-gray-100 text-gray-500",
  "评估中": "bg-blue-50 text-blue-600",
  "已承接": "bg-purple-50 text-purple-600",
  "开发中": "bg-amber-50 text-amber-600",
  "联调中": "bg-emerald-50 text-emerald-700",
  "已关闭": "bg-gray-100 text-gray-400",
};

function ReqStatusBadge({ status }: { status: ReqStatus }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REQ_STATUS_COLORS[status]}`}>{status}</span>;
}

// ─── Drawer ────────────────────────────────────────────────────────────────────

function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 z-50 h-full w-[500px] max-w-full bg-white border-l border-border shadow-xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}

// ─── Project Drawer Content ────────────────────────────────────────────────────

function ProjectDrawerContent({ project }: { project: Project }) {
  const isIterative = project.kind === "business" || project.kind === "workboard";
  const pendingTodos = project.todos.filter((t) => !t.done);
  const doneTodos = project.todos.filter((t) => t.done);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <KindBadge kind={project.kind} />
        <StatusBadge status={project.status} />
        {project.url && (
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
            <ExternalLink className="h-3 w-3" />
            {project.url}
          </a>
        )}
      </div>

      {project.errorSummary && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-700 mb-1">错误摘要</p>
              <p className="text-xs text-red-600 font-mono leading-relaxed">{project.errorSummary}</p>
            </div>
          </div>
        </div>
      )}

      {project.kind === "workflow-source" && project.kindSummary && (
        <Section title="工作流真源">
          <p className="text-sm text-foreground/80 leading-relaxed">{project.kindSummary}</p>
        </Section>
      )}

      {isIterative && (
        <Section title="迭代信息">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {project.iteration && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">当前迭代</p>
                <p className="text-sm font-medium text-foreground">{project.iteration}</p>
              </div>
            )}
            {project.mode && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">模式</p>
                <p className="text-sm font-medium text-foreground">{project.mode}</p>
              </div>
            )}
            {project.phase && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">阶段</p>
                <p className="text-sm font-medium text-foreground">{project.phase}</p>
              </div>
            )}
            {project.blocked && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">阻塞</p>
                <p className="text-sm font-medium text-orange-600">{project.blocked}</p>
              </div>
            )}
          </div>
          {project.nextStep && (
            <div className="flex items-start gap-2 rounded-lg bg-[#030213]/[0.03] px-3 py-2.5 border border-[#030213]/[0.06]">
              <ArrowRight className="h-3.5 w-3.5 text-[#030213]/40 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[#030213]/70">{project.nextStep}</p>
            </div>
          )}
        </Section>
      )}

      {project.roles.length > 0 && (
        <Section title={`角色看板 (${project.roles.length})`}>
          <div className="space-y-2">
            {project.roles.map((r) => (
              <div key={r.role} className="rounded-lg border border-border bg-white p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-medium bg-[#030213] text-white px-2 py-0.5 rounded">{r.role}</span>
                  {r.nextStep !== "—" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      {r.nextStep}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">{r.recentAction}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {project.todos.length > 0 && (
        <Section title={`待办 (${pendingTodos.length} 待完成)`}>
          <div className="space-y-2">
            {pendingTodos.map((t) => (
              <div key={t.id} className="flex items-start gap-2.5">
                <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center border flex-shrink-0 ${t.priority === "high" ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
                  <Flag className={`h-2.5 w-2.5 ${t.priority === "high" ? "text-red-400" : "text-gray-300"}`} />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{t.text}</p>
              </div>
            ))}
            {doneTodos.map((t) => (
              <div key={t.id} className="flex items-start gap-2.5 opacity-40">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm line-through text-muted-foreground leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="配置路径">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">配置</p>
            <p className="text-sm font-mono text-foreground/70 break-all">{project.configPath}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">解析</p>
            <p className="text-sm font-mono text-foreground/70 break-all">{project.resolvePath}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">解析器</p>
              <p className="text-sm font-mono text-foreground/70">{project.parser}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">最近读取</p>
              <p className="text-sm text-foreground/60">{project.lastRead}</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Diagnostic Drawer Content ─────────────────────────────────────────────────

function DiagnosticDrawerContent({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <KindBadge kind={project.kind} />
        <StatusBadge status={project.status} />
      </div>
      {project.errorSummary && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700 mb-2">错误堆栈</p>
          <pre className="text-xs text-red-600 font-mono leading-relaxed whitespace-pre-wrap break-all">{project.errorSummary}</pre>
        </div>
      )}
      <Section title="接入详情">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">文件检查</span>
            <span className={`text-sm font-medium ${project.fileCheck === "ok" ? "text-emerald-600" : project.fileCheck === "missing" ? "text-amber-600" : "text-red-600"}`}>
              {project.fileCheck === "ok" ? "通过" : project.fileCheck === "missing" ? "文件缺失" : "检查失败"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">ID</span>
            <span className="text-sm font-mono text-foreground/60">{project.id}</span>
          </div>
          <div className="py-2 border-b border-border/50">
            <p className="text-xs text-muted-foreground mb-1">配置路径</p>
            <p className="text-sm font-mono text-foreground/70 break-all">{project.configPath}</p>
          </div>
          <div className="py-2 border-b border-border/50">
            <p className="text-xs text-muted-foreground mb-1">解析路径</p>
            <p className="text-sm font-mono text-foreground/70 break-all">{project.resolvePath}</p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">解析器</p>
              <p className="text-sm font-mono text-foreground/70">{project.parser}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">最近读取</p>
              <p className="text-sm text-foreground/60">{project.lastRead}</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Cross-project item Drawer ────────────────────────────────────────────────

function CrossProjectDrawerContent({ item }: { item: CrossProjectItem }) {
  const relatedComm = COMM_ITEMS.filter((c) => c.reqId.startsWith(item.id));
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={item.priority} />
        <ReqStatusBadge status={item.status} />
        <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
      </div>
      <Section title="提出方 / 承接方">
        <div className="space-y-2">
          {[
            { label: "提出方", value: item.sourceLabel },
            { label: "承接方", value: item.targetLabel },
            { label: "转入迭代", value: item.targetIteration, mono: true },
            { label: "更新", value: item.updatedAt, mono: true },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground w-14 mt-0.5 flex-shrink-0">{f.label}</span>
              <span className={`text-sm font-medium text-foreground ${f.mono ? "font-mono" : ""}`}>{f.value}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="关联沟通">
        {relatedComm.length > 0
          ? relatedComm.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-accent/40 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-foreground/60">{c.reqId}</span>
                <span className="text-xs font-mono text-muted-foreground">{c.ts}</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{c.summary}</p>
            </div>
          ))
          : <p className="text-sm text-muted-foreground">暂无关联沟通记录</p>
        }
      </Section>
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar() {
  const active = CARD_PROJECTS.filter((p) => p.phase?.includes("实现") || p.phase?.includes("开发")).length;
  const blocked = CARD_PROJECTS.filter((p) => p.blocked).length;
  const errors = PROJECTS.filter((p) => p.status === "config-error" || p.status === "read-error").length;
  const totalTodos = CROSS_TODOS.filter((t) => t.status !== "已完成").length;

  const stats = [
    { label: "开发中项目", value: active, icon: Layers, color: "text-[#030213]" },
    { label: "阻塞中", value: blocked, icon: AlertCircle, color: "text-orange-500" },
    { label: "配置/读取异常", value: errors, icon: AlertTriangle, color: "text-red-500" },
    { label: "跨项目待办", value: totalTodos, icon: Clock, color: "text-blue-500" },
  ];

  return (
    <div className="flex items-center bg-white rounded-xl border border-border px-2 py-2">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 flex-1">
          <s.icon className={`h-4 w-4 ${s.color} flex-shrink-0`} />
          <div>
            <p className="text-sm font-medium text-foreground leading-none mb-0.5">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
          {i < stats.length - 1 && <div className="ml-auto h-6 w-px bg-border" />}
        </div>
      ))}
    </div>
  );
}

// ─── Coordination Banner ──────────────────────────────────────────────────────

function CoordinationBanner({ onViewCrossProject }: { onViewCrossProject: () => void }) {
  const activeReq = CROSS_PROJECT_ITEMS.filter((r) => r.status !== "已关闭")[0];
  const blockingCount = 0;
  const bcrCount = BCR_ITEMS.length;

  return (
    <button
      onClick={onViewCrossProject}
      className="w-full text-left bg-white rounded-xl border border-border px-5 py-3.5 hover:border-[#030213]/20 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 flex-wrap min-w-0">
          {/* label */}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-shrink-0">跨项目协作</span>

          {/* active req */}
          {activeReq && (
            <div className="flex items-center gap-2 min-w-0">
              <ReqStatusBadge status={activeReq.status} />
              <span className="text-sm font-medium text-foreground truncate max-w-[240px]">{activeReq.id}</span>
              <span className="text-sm text-muted-foreground hidden sm:block truncate">{activeReq.sourceLabel.split(" · ")[0]} → {activeReq.targetLabel.split(" · ")[0]}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm flex-shrink-0">
            {blockingCount === 0
              ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />无跨项目阻塞</span>
              : <span className="flex items-center gap-1 text-red-600"><AlertCircle className="h-3.5 w-3.5" />{blockingCount} 阻塞</span>
            }
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">契约 <span className="text-foreground font-medium">news-l1</span></span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">BCR <span className="text-foreground font-medium">{bcrCount}</span> 已回流</span>
          </div>
        </div>

        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1 flex-shrink-0">
          查看跨项目全貌 <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </button>
  );
}

// ─── Cross-project Todo List ──────────────────────────────────────────────────

function CrossTodoList() {
  const statusColor: Record<string, string> = {
    "待启动": "bg-gray-100 text-gray-500",
    "待评估": "bg-amber-50 text-amber-600",
    "进行中": "bg-blue-50 text-blue-600",
    "已完成": "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">跨项目待办</p>
        <p className="text-xs text-muted-foreground">聚合自各项目 INDEX.md · 只读</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-[#f6f7f9]">
            {["优先级", "待办", "项目", "归属角色", "状态"].map((h) => (
              <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CROSS_TODOS.map((t) => (
            <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
              <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
              <td className="px-5 py-3 text-foreground max-w-[320px]">
                <p className="leading-relaxed">{t.text}</p>
              </td>
              <td className="px-5 py-3">
                <span className="font-mono text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded">{t.project}</span>
              </td>
              <td className="px-5 py-3">
                <span className="font-mono text-xs bg-[#030213] text-white px-1.5 py-0.5 rounded">{t.role}</span>
              </td>
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[t.status] ?? "bg-gray-100 text-gray-500"}`}>{t.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const isError = project.status === "config-error" || project.status === "read-error";
  const isIterative = project.kind === "business" || project.kind === "workboard";
  const pendingTodos = project.todos.filter((t) => !t.done).length;

  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-xl border bg-white p-4 flex flex-col gap-3 transition-all duration-150 group cursor-pointer ${isError ? "border-red-200 hover:border-red-300 hover:shadow-sm" : "border-border hover:border-[#030213]/20 hover:shadow-sm"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">{project.name}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <KindBadge kind={project.kind} />
            <StatusBadge status={project.status} />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-150" />
      </div>

      {isIterative && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {project.iteration && (
            <div>
              <p className="text-xs text-muted-foreground">迭代</p>
              <p className={`text-sm font-medium ${project.iteration === "—" ? "text-muted-foreground" : "text-foreground"}`}>{project.iteration}</p>
            </div>
          )}
          {project.mode && (
            <div>
              <p className="text-xs text-muted-foreground">模式</p>
              <p className="text-sm font-medium text-foreground">{project.mode}</p>
            </div>
          )}
          {project.phase && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">阶段</p>
              <p className="text-sm font-medium text-foreground">{project.phase}</p>
            </div>
          )}
          {pendingTodos > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">待办</p>
              <p className="text-sm font-medium text-foreground">{pendingTodos} 项</p>
            </div>
          )}
        </div>
      )}

      {project.kind === "workflow-source" && project.kindSummary && (
        <p className="text-xs text-muted-foreground leading-relaxed">{project.kindSummary}</p>
      )}

      {project.blocked && (
        <div className="flex items-start gap-1.5 rounded-lg bg-orange-50 border border-orange-100 px-2.5 py-2">
          <AlertTriangle className="h-3 w-3 text-orange-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700 leading-relaxed">{project.blocked}</p>
        </div>
      )}

      {project.errorSummary && (
        <div className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-2">
          <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600 leading-relaxed line-clamp-2">{project.errorSummary}</p>
        </div>
      )}

      {project.nextStep && (
        <div className="flex items-start gap-1.5">
          <ArrowRight className="h-3 w-3 text-[#030213]/30 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{project.nextStep}</p>
        </div>
      )}
    </button>
  );
}

// ─── Workbench View ───────────────────────────────────────────────────────────

function WorkbenchView({ onProjectClick, onViewCrossProject }: { onProjectClick: (p: Project) => void; onViewCrossProject: () => void }) {
  return (
    <div className="space-y-4">
      <SummaryBar />
      <CoordinationBanner onViewCrossProject={onViewCrossProject} />
      <CrossTodoList />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {CARD_PROJECTS.map((p) => (
          <ProjectCard key={p.id} project={p} onClick={() => onProjectClick(p)} />
        ))}
      </div>
    </div>
  );
}

// ─── Deploy View ──────────────────────────────────────────────────────────────

function DeployView() {
  const withUrl = PROJECTS.filter((p) => p.url);
  const withoutUrl = PROJECTS.filter((p) => !p.url);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {withUrl.map((p) => (
        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-xl border border-border p-4 hover:border-[#030213]/20 hover:shadow-sm transition-all duration-150 group">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <div className="mt-1"><KindBadge kind={p.kind} /></div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs font-mono text-muted-foreground truncate">{p.url}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-xs text-muted-foreground">在线</p>
          </div>
        </a>
      ))}
      {withoutUrl.map((p) => (
        <div key={p.id} className="bg-white rounded-xl border border-border p-4 opacity-50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <div className="mt-1"><KindBadge kind={p.kind} /></div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
              <Unlink className="h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">未配置线上地址</p>
        </div>
      ))}
    </div>
  );
}

// ─── Diagnostics View ─────────────────────────────────────────────────────────

function DiagnosticsView({ onRowClick }: { onRowClick: (p: Project) => void }) {
  const isHighlight = (p: Project) => p.status === "config-error" || p.status === "read-error";

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[#f6f7f9]">
              {["ID", "项目名", "类型", "接入状态", "文件检查", "解析路径", "解析器", "最近读取", "错误摘要", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-border/50 transition-colors ${isHighlight(p) ? "bg-red-50/40 hover:bg-red-50/70 cursor-pointer" : "hover:bg-accent/40"}`}
                onClick={() => isHighlight(p) && onRowClick(p)}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.id}</td>
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{p.name}</td>
                <td className="px-4 py-3"><KindBadge kind={p.kind} /></td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${p.fileCheck === "ok" ? "text-emerald-600" : p.fileCheck === "missing" ? "text-amber-600" : "text-red-500"}`}>
                    {p.fileCheck === "ok" ? "✓ 通过" : p.fileCheck === "missing" ? "⚠ 缺失" : "✗ 失败"}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[160px]">
                  <p className="text-xs font-mono text-muted-foreground truncate">{p.resolvePath}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-mono text-muted-foreground whitespace-nowrap">{p.parser}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-xs font-mono text-muted-foreground">{p.lastRead}</p>
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  {p.errorSummary
                    ? <p className="text-xs text-red-600 truncate font-mono">{p.errorSummary}</p>
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {isHighlight(p) && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium whitespace-nowrap">
                      详情 <ChevronRight className="h-3 w-3" />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Cross-project View ───────────────────────────────────────────────────────

type ActiveFilter = "进行中" | "已关闭" | "全部";
const CLOSED_STATUSES: ReqStatus[] = ["已关闭"];
const BCR_CLOSED_STATUSES = ["已回流下游"];

function CrossProjectView({ onItemClick }: { onItemClick: (item: CrossProjectItem) => void }) {
  const [tab, setTab] = useState<"pool" | "blocking" | "comm" | "bcr">("pool");
  const [tabLoading, setTabLoading] = useState(false);
  const [reqFilter, setReqFilter] = useState<ActiveFilter>("进行中");
  const [bcrFilter, setBcrFilter] = useState<ActiveFilter>("进行中");

  const switchTab = (next: typeof tab) => {
    if (next === tab) return;
    setTabLoading(true);
    setTab(next);
    setTimeout(() => setTabLoading(false), 500);
  };

  const tabs = [
    { id: "pool" as const, label: "需求池", icon: Package },
    { id: "blocking" as const, label: "谁等谁", icon: Users },
    { id: "comm" as const, label: "沟通", icon: MessageSquare },
    { id: "bcr" as const, label: "BCR", icon: GitPullRequest },
  ];

  const visibleReqs = CROSS_PROJECT_ITEMS.filter((item) => {
    if (reqFilter === "进行中") return !CLOSED_STATUSES.includes(item.status);
    if (reqFilter === "已关闭") return CLOSED_STATUSES.includes(item.status);
    return true;
  });

  const visibleBcr = BCR_ITEMS.filter((item) => {
    if (bcrFilter === "进行中") return !BCR_CLOSED_STATUSES.includes(item.status);
    if (bcrFilter === "已关闭") return BCR_CLOSED_STATUSES.includes(item.status);
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-1 mb-5 bg-white border border-border rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 ${tab === t.id ? "bg-[#030213] text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tabLoading && (
        <div className="space-y-3">
          {tab === "pool" && (
            <>
              <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1 w-fit">
                {[0,1,2].map(i => <Sk key={i} className="h-6 w-12 rounded" />)}
              </div>
              {[0,1].map(i => (
                <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sk className="h-4 w-16" /><Sk className="h-5 w-10 rounded" /><Sk className="h-5 w-14 rounded-full" />
                  </div>
                  <Sk className={`h-4 ${i === 0 ? "w-full" : "w-3/4"}`} />
                  <div className="flex items-center gap-2">
                    <Sk className="h-3 w-32" /><Sk className="h-3 w-3" /><Sk className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </>
          )}
          {tab === "blocking" && (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              {[0,1,2].map(i => (
                <div key={i} className="px-4 py-3 border-b border-border/50 flex items-center gap-4">
                  <Sk className="h-4 w-24" /><Sk className="h-4 w-24" /><Sk className="h-3 w-48" /><Sk className="h-3 w-16 ml-auto" />
                </div>
              ))}
            </div>
          )}
          {tab === "comm" && (
            <>
              {[0,1].map(i => (
                <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Sk className="h-4 w-32 rounded" /><Sk className="h-3 w-24" /></div>
                    <Sk className="h-3 w-20" />
                  </div>
                  <Sk className="h-4 w-full" />
                  <Sk className="h-4 w-2/3" />
                </div>
              ))}
            </>
          )}
          {tab === "bcr" && (
            <>
              <Sk className="h-4 w-full rounded" />
              <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1 w-fit">
                {[0,1,2].map(i => <Sk key={i} className="h-6 w-12 rounded" />)}
              </div>
              {[0,1].map(i => (
                <div key={i} className="bg-white rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2"><Sk className="h-4 w-16" /><Sk className="h-5 w-20 rounded-full" /></div>
                  <Sk className={`h-4 ${i === 0 ? "w-3/4" : "w-1/2"}`} />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* 需求池 */}
      {!tabLoading && tab === "pool" && (
        <div className="space-y-4">
          <FilterBar value={reqFilter} onChange={setReqFilter} />
          {visibleReqs.length === 0
            ? <EmptyState icon={Package} message={reqFilter === "进行中" ? "暂无进行中需求" : "暂无已关闭需求"} />
            : visibleReqs.map((item) => (
              <button key={item.id} onClick={() => onItemClick(item)} className="w-full text-left bg-white rounded-xl border border-border p-4 hover:border-[#030213]/20 hover:shadow-sm transition-all duration-150 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
                      <PriorityBadge priority={item.priority} />
                      <ReqStatusBadge status={item.status} />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2 leading-relaxed">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{item.sourceLabel}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{item.targetLabel}</span>
                      <span className="text-[#030213]/30">·</span>
                      <span className="font-mono">{item.targetIteration}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-muted-foreground">{item.updatedAt}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            ))
          }
        </div>
      )}

      {/* 谁等谁 */}
      {!tabLoading && tab === "blocking" && <EmptyState icon={Users} message="当前无阻塞依赖" />}

      {/* 沟通 */}
      {!tabLoading && tab === "comm" && (
        <div className="space-y-3">
          {COMM_ITEMS.length === 0
            ? <EmptyState icon={MessageSquare} message="暂无沟通记录" />
            : COMM_ITEMS.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground bg-accent px-2 py-0.5 rounded">{c.reqId}</span>
                    <span className="text-xs text-muted-foreground">{c.projects.join(" ↔ ")}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{c.ts}</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{c.summary}</p>
              </div>
            ))
          }
        </div>
      )}

      {/* BCR */}
      {!tabLoading && tab === "bcr" && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground leading-relaxed">
            针对 <span className="font-mono">agent-workflow</span> 真源的基线修正，独立状态机：已提报 → 评估中 → 已采纳 → 已落地真源 → 回流中 → 已回流下游。
          </div>
          <FilterBar value={bcrFilter} onChange={setBcrFilter} />
          {visibleBcr.length === 0
            ? <EmptyState icon={GitPullRequest} message={bcrFilter === "进行中" ? "暂无进行中 BCR" : "暂无已关闭 BCR"} />
            : visibleBcr.map((bcr) => (
              <div key={bcr.id} className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">{bcr.id}</span>
                      <BcrStatusBadge status={bcr.status} />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{bcr.summary}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-0.5">目标</p>
                    <p className="text-xs font-mono text-foreground/60">{bcr.target}</p>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function FilterBar({ value, onChange }: { value: ActiveFilter; onChange: (v: ActiveFilter) => void }) {
  const options: ActiveFilter[] = ["进行中", "已关闭", "全部"];
  return (
    <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1 w-fit">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 ${value === o ? "bg-[#030213] text-white" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.FC<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent border border-border">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Sessions: EcosystemBreadcrumb ───────────────────────────────────────────

function EcosystemBreadcrumb({ subprojectName, onBack }: { subprojectName: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
        niuma-cheng 生态
      </button>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="font-medium text-foreground">{subprojectName}</span>
    </div>
  );
}

// ─── Sessions: MappingModal ───────────────────────────────────────────────────

function ModalStep({ step, label, active, children }: { step: number; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 transition-opacity duration-150 ${active ? "opacity-100" : "opacity-40"}`}>
      <div className="flex items-center gap-2">
        <span className={`h-5 w-5 rounded-full text-xs font-medium flex items-center justify-center flex-shrink-0 ${active ? "bg-[#030213] text-white" : "bg-gray-100 text-gray-400"}`}>
          {step}
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

function SessionSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const selected = MOCK_SESSIONS.find((s) => s.id === value);
  return (
    <div className="space-y-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-[#f6f7f9] border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#030213]/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <option value="">— 请选择会话 —</option>
        {MOCK_SESSIONS.map((s) => (
          <option key={s.id} value={s.id}>{s.title}（{s.lastActiveAt}）</option>
        ))}
      </select>
      {selected && (
        <div className="rounded-lg bg-accent/50 border border-border px-3 py-2 flex items-start gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>创建：<span className="font-mono">{selected.createdAt}</span></p>
            <p>最近活动：<span className="font-mono">{selected.lastActiveAt}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Chief of staff single-step modal */
function ChiefMappingModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (session: SessionItem) => void;
}) {
  const [sessionId, setSessionId] = useState("");
  useEffect(() => { if (open) setSessionId(""); }, [open]);
  if (!open) return null;
  const session = MOCK_SESSIONS.find((s) => s.id === sessionId);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">配置参谋长席位</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-6 py-5 space-y-4">
            {/* Fixed labels */}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-accent/40 border border-border px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">项目</p>
                <p className="text-sm font-medium text-foreground">niuma-cheng 生态</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">席位</p>
                <p className="text-sm font-medium text-foreground">参谋长</p>
              </div>
            </div>
            <ModalStep step={1} label="选择会话" active>
              <SessionSelect value={sessionId} onChange={setSessionId} />
            </ModalStep>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">取消</button>
            <button
              onClick={() => { if (session) { onConfirm(session); onClose(); } }}
              disabled={!session}
              className="px-4 py-2 rounded-lg bg-[#030213] text-white text-sm font-medium hover:bg-[#030213]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认配置
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Role mapping 3-step modal (subproject roles) */
function RoleMappingModal({
  open,
  onClose,
  initialProjectId,
  initialRoleId,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  initialProjectId: string;
  initialRoleId?: string;
  onConfirm: (projectId: string, roleId: string, session: SessionItem) => void;
}) {
  const [proj, setProj] = useState(initialProjectId);
  const [roleId, setRoleId] = useState(initialRoleId ?? "");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (open) { setProj(initialProjectId); setRoleId(initialRoleId ?? ""); setSessionId(""); }
  }, [open, initialProjectId, initialRoleId]);

  const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
  const canConfirm = proj !== "" && roleId !== "" && !!session;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-md pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">配置角色映射</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="px-6 py-5 space-y-5">
            <ModalStep step={1} label="选择项目" active>
              <select
                value={proj}
                onChange={(e) => { setProj(e.target.value); setRoleId(""); setSessionId(""); }}
                className="w-full appearance-none bg-[#f6f7f9] border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#030213]/20"
              >
                {SUBPROJECTS_META.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </ModalStep>
            <ModalStep step={2} label="选择角色" active={proj !== ""}>
              <select
                value={roleId}
                onChange={(e) => { setRoleId(e.target.value); setSessionId(""); }}
                disabled={proj === ""}
                className="w-full appearance-none bg-[#f6f7f9] border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#030213]/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">— 请选择角色 —</option>
                {ROLE_DEFS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}（{r.id}）</option>
                ))}
              </select>
            </ModalStep>
            <ModalStep step={3} label="选择会话" active={roleId !== ""}>
              <SessionSelect value={sessionId} onChange={setSessionId} disabled={roleId === ""} />
            </ModalStep>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors">取消</button>
            <button
              onClick={() => { if (canConfirm && session) { onConfirm(proj, roleId, session); onClose(); } }}
              disabled={!canConfirm}
              className="px-4 py-2 rounded-lg bg-[#030213] text-white text-sm font-medium hover:bg-[#030213]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认配置
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sessions: RoleCard ───────────────────────────────────────────────────────

function RoleCard({
  role,
  mapping,
  onConfigure,
  onViewDetail,
}: {
  role: RoleDef;
  mapping: RoleMapping;
  onConfigure: () => void;
  onViewDetail: () => void;
}) {
  const statusCfg = {
    mapped: { label: "已映射", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    unmapped: { label: "未选择", className: "bg-gray-100 text-gray-500 border border-gray-200" },
    error: { label: "读取异常", className: "bg-orange-50 text-orange-600 border border-orange-200" },
  }[mapping.status];

  return (
    <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#030213]/[0.05] border border-[#030213]/10 flex items-center justify-center flex-shrink-0">
            <role.Icon className="h-4 w-4 text-[#030213]/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{role.label}</p>
            <p className="text-xs font-mono text-muted-foreground">{role.id}</p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${statusCfg.className}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{role.description}</p>

      {/* Session info (mapped only) */}
      {mapping.status === "mapped" && mapping.sessionTitle && (
        <div className="flex items-start gap-1.5 rounded-lg bg-accent/50 border border-border px-2.5 py-2">
          <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground/70 truncate">{mapping.sessionTitle}</p>
        </div>
      )}

      {/* Error info */}
      {mapping.status === "error" && mapping.errorMsg && (
        <div className="flex items-start gap-1.5 rounded-lg bg-orange-50 border border-orange-100 px-2.5 py-2">
          <AlertTriangle className="h-3 w-3 text-orange-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-600 leading-relaxed line-clamp-2">{mapping.errorMsg}</p>
        </div>
      )}

      {/* Divider + action */}
      <div className="pt-0.5 border-t border-border/50">
        {mapping.status === "mapped" && (
          <button
            onClick={onViewDetail}
            className="w-full text-sm font-medium text-[#030213] bg-[#030213]/[0.04] hover:bg-[#030213]/[0.08] rounded-lg py-2 transition-colors"
          >
            查看详情
          </button>
        )}
        {mapping.status === "unmapped" && (
          <button
            onClick={onConfigure}
            className="w-full text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-[#030213]/20 rounded-lg py-2 transition-colors"
          >
            配置映射
          </button>
        )}
        {mapping.status === "error" && (
          <button
            onClick={onConfigure}
            className="w-full text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg py-2 transition-colors"
          >
            重新读取
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sessions: RoleMappingDrawerContent ──────────────────────────────────────

function RoleMappingDrawerContent({
  role,
  mapping,
  onReconfigure,
}: {
  role: RoleDef;
  mapping: RoleMapping;
  onReconfigure: () => void;
}) {
  const session = MOCK_SESSIONS.find((s) => s.id === mapping.sessionId);
  return (
    <div className="space-y-6">
      {/* Role header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#030213]/[0.05] border border-[#030213]/10 flex items-center justify-center flex-shrink-0">
          <role.Icon className="h-5 w-5 text-[#030213]/60" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{role.label}</p>
          <p className="text-xs font-mono text-muted-foreground">{role.id}</p>
        </div>
      </div>

      <Section title="职责">
        <p className="text-sm text-foreground/80 leading-relaxed">{role.description}</p>
      </Section>

      {session && (
        <Section title="关联会话">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">会话名称</p>
              <p className="text-sm font-medium text-foreground">{session.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">创建时间</p>
                <p className="text-xs font-mono text-foreground/70">{session.createdAt}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">最近活动</p>
                <p className="text-xs font-mono text-foreground/70">{session.lastActiveAt}</p>
              </div>
            </div>
          </div>
        </Section>
      )}

      <div className="pt-2">
        <button
          onClick={onReconfigure}
          className="w-full text-sm font-medium border border-border rounded-lg py-2.5 text-foreground hover:bg-accent transition-colors"
        >
          重新配置映射
        </button>
      </div>
    </div>
  );
}

// ─── Sessions: Conversation Data & View ──────────────────────────────────────

interface ConvMessage {
  id: string;
  type: "user" | "claude";
  sender: string;
  content: string;
  ts: string;
}

const MOCK_CONV_MESSAGES: ConvMessage[] = [
  { id: "m1", type: "user", sender: "用户", content: "你是 PM，帮我梳理一下 v0.2 的需求", ts: "2026-07-04 10:30" },
  {
    id: "m2",
    type: "claude",
    sender: "PM",
    content: "好的，我来梳理 v0.2 的需求。基于之前的讨论，v0.2 主要包含以下内容：\n\n1. 新增【项目会话】视图\n2. 生态根目录视图（参谋长席位 + 框架真源 + 公告板 + 项目组列表）\n3. 子项目视图（5 个角色卡片）\n4. 映射配置弹窗（三步选择）\n5. 对话视图（展示会话内容）",
    ts: "2026-07-04 10:31",
  },
  { id: "m3", type: "user", sender: "用户", content: "映射配置后必须能看到对话内容", ts: "2026-07-04 10:35" },
  {
    id: "m4",
    type: "claude",
    sender: "PM",
    content: "收到！已更新方案：配置映射后，点击角色卡片进入对话视图，展示该角色会话的全部对话内容。",
    ts: "2026-07-04 10:36",
  },
];

function renderMessageContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (/^\d+\.\s/.test(line)) {
      return (
        <p key={i} className="flex gap-1.5">
          <span className="opacity-50">{line.match(/^\d+/)![0]}.</span>
          <span>{line.replace(/^\d+\.\s/, "")}</span>
        </p>
      );
    }
    if (line === "") return <div key={i} className="h-2" />;
    // bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part
    );
    return <p key={i}>{parts}</p>;
  });
}

function ConversationView({
  role,
  session,
  onBack,
}: {
  role: RoleDef;
  session: SessionItem;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full -mx-6 -my-5">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-border flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          返回
        </button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#030213]/[0.05] border border-[#030213]/10 flex items-center justify-center">
            <role.Icon className="h-3.5 w-3.5 text-[#030213]/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-none">{role.label}</p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{role.id}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          最近活动：<span className="font-mono">{session.lastActiveAt}</span>
        </div>
      </div>

      {/* Session label */}
      <div className="px-5 py-2 bg-accent/40 border-b border-border/50 flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          <span className="font-mono text-foreground/60">{session.title}</span>
          <span className="mx-2">·</span>
          创建于 <span className="font-mono">{session.createdAt}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MOCK_CONV_MESSAGES.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[75%] rounded-xl px-4 py-3 ${msg.type === "user" ? "bg-[#030213] text-white" : "bg-[#f0f0f0] text-foreground"}`}>
              <p className={`text-xs font-medium mb-1.5 ${msg.type === "user" ? "text-white/60" : "text-foreground/50"}`}>
                {msg.sender}
              </p>
              <div className={`text-sm leading-relaxed space-y-1 ${msg.type === "user" ? "text-white" : "text-foreground/80"}`}>
                {renderMessageContent(msg.content)}
              </div>
              <p className={`text-xs mt-2 font-mono ${msg.type === "user" ? "text-white/40" : "text-foreground/40"}`}>
                {msg.ts}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Disabled input */}
      <div className="flex-shrink-0 px-5 py-3 bg-white border-t border-border">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-[#f6f7f9] px-4 py-2.5 opacity-50">
          <p className="flex-1 text-sm text-muted-foreground">v0.3+ 将支持直接在此输入消息</p>
          <div className="h-7 w-7 rounded-lg bg-[#030213]/20 flex items-center justify-center flex-shrink-0">
            <ArrowRight className="h-3.5 w-3.5 text-[#030213]/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sessions: Ecosystem Root View ───────────────────────────────────────────

function ChiefCard({ mapping, onConfigure }: { mapping: ChiefMapping; onConfigure: () => void }) {
  const isMapped = mapping.status === "mapped";
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">niuma-cheng 生态</p>
          </div>
          <div className="flex items-center gap-2.5 mb-2">
            <p className="text-sm font-medium text-foreground">参谋长席位</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isMapped ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
              {isMapped ? "已映射" : "未选择"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">生态级调研、跨项目信息聚合、项目导航索引维护</p>
          {isMapped && mapping.sessionTitle && (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100 px-2.5 py-1.5">
              <MessageSquare className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700 truncate">{mapping.sessionTitle}</p>
            </div>
          )}
        </div>
        <button
          onClick={onConfigure}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          {isMapped ? "重新配置" : "配置"}
        </button>
      </div>
    </div>
  );
}

function RootComponentCard({ comp }: { comp: typeof ROOT_COMPONENTS[number] }) {
  return (
    <div className="bg-white rounded-xl border border-border/60 p-4 opacity-80">
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 rounded-lg bg-[#030213]/[0.04] border border-[#030213]/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Layers className="h-3.5 w-3.5 text-[#030213]/40" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-foreground">{comp.name}</p>
            <span className="text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded font-mono">{comp.category}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{comp.positioning}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{comp.techStack}</span>
            <span>·</span>
            <span>{comp.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubprojectOverviewCard({
  meta,
  mappings,
  onClick,
}: {
  meta: typeof SUBPROJECTS_META[number];
  mappings: RoleMapping[];
  onClick: () => void;
}) {
  const mappedCount = mappings.filter((m) => m.status === "mapped").length;
  const total = ROLE_DEFS.length;

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-xl border border-border p-4 hover:border-[#030213]/20 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">{meta.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.type}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-3">
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${(mappedCount / total) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-foreground flex-shrink-0">
          {mappedCount}/{total} 已映射
        </span>
      </div>
    </button>
  );
}

// ─── Sessions: Dual-Layer Iteration Timeline ──────────────────────────────────

type StageStatus = "done" | "in-progress" | "pending" | "blocked";
type VersionStatus = "done" | "in-progress";

interface IterationStage {
  id: string;
  name: string;
  status: StageStatus;
  role: string;
  completedAt?: string;
  docName?: string;
  outputSummary?: string; // shown when parent iteration is "done"
  sessionId?: string;
}

interface IterationVersion {
  version: string;
  status: VersionStatus;
  stages: IterationStage[];
}

interface ProjectIterations {
  currentVersion: string;
  versions: IterationVersion[];
}

const COMPLETED_STAGES_V05: IterationStage[] = [
  { id: "prd", name: "PRD", status: "done", role: "PM", completedAt: "05-20", docName: "v0.5-prd.md", outputSummary: "v0.5 PRD 定位为「订阅功能迭代」，定义付费墙、会员等级、订阅周期 3 个核心用户故事", sessionId: "s2" },
  { id: "design", name: "设计", status: "done", role: "Architect", completedAt: "05-22", docName: "v0.5-design.md", outputSummary: "设计订阅状态机（免费/月度/年度/过期）、支付回调流程、会员权益字段扩展", sessionId: "s2" },
  { id: "impl", name: "实现", status: "done", role: "Developer", completedAt: "05-28", outputSummary: "接入支付 SDK、实现会员等级判断中间件、付费墙组件、订阅管理后台", sessionId: "s3" },
  { id: "deploy", name: "部署检查", status: "done", role: "DevOps", completedAt: "05-29", outputSummary: "生产环境支付密钥配置、CDN 缓存策略调整、订阅回调域名白名单验证", sessionId: "s3" },
  { id: "close", name: "迭代关闭", status: "done", role: "PM", completedAt: "05-30", outputSummary: "6 阶段门禁核实全部定稿、生产实测订阅流程通过、生成 v0.5-summary.md", sessionId: "s1" },
  { id: "wrap", name: "收尾", status: "done", role: "各角色", completedAt: "05-31", outputSummary: "入库测试报告、归档迭代记录、更新 INDEX.md 版本列表与收尾摘要", sessionId: "s1" },
];

const ITERATION_DATA: Record<string, ProjectIterations> = {
  xiaobao: {
    currentVersion: "v0.6",
    versions: [
      { version: "v0.1", status: "done", stages: COMPLETED_STAGES_V05.map(s => ({ ...s, docName: s.docName?.replace("v0.5", "v0.1") })) },
      { version: "v0.2", status: "done", stages: COMPLETED_STAGES_V05.map(s => ({ ...s, docName: s.docName?.replace("v0.5", "v0.2") })) },
      { version: "v0.3", status: "done", stages: COMPLETED_STAGES_V05.map(s => ({ ...s, docName: s.docName?.replace("v0.5", "v0.3") })) },
      { version: "v0.4", status: "done", stages: COMPLETED_STAGES_V05.map(s => ({ ...s, docName: s.docName?.replace("v0.5", "v0.4") })) },
      { version: "v0.5", status: "done", stages: COMPLETED_STAGES_V05 },
      {
        version: "v0.6", status: "in-progress", stages: [
          { id: "prd", name: "PRD", status: "done", role: "PM", completedAt: "06-28", docName: "v0.6-prd.md", sessionId: "s1" },
          { id: "design", name: "设计", status: "done", role: "Architect", completedAt: "06-30", docName: "v0.6-design.md", sessionId: "s1" },
          { id: "impl", name: "实现", status: "in-progress", role: "Developer", sessionId: "s3" },
          { id: "deploy", name: "部署检查", status: "pending", role: "DevOps" },
          { id: "close", name: "迭代关闭", status: "pending", role: "PM" },
          { id: "wrap", name: "收尾", status: "pending", role: "各角色" },
        ],
      },
    ],
  },
  ai: {
    currentVersion: "v0.1",
    versions: [
      {
        version: "v0.1", status: "in-progress", stages: [
          { id: "prd", name: "PRD", status: "in-progress", role: "PM", sessionId: "s2" },
          { id: "design", name: "设计", status: "pending", role: "Architect" },
          { id: "impl", name: "实现", status: "pending", role: "Developer" },
          { id: "deploy", name: "部署检查", status: "pending", role: "DevOps" },
          { id: "close", name: "迭代关闭", status: "pending", role: "PM" },
          { id: "wrap", name: "收尾", status: "pending", role: "各角色" },
        ],
      },
    ],
  },
  workboard: {
    currentVersion: "v0.1",
    versions: [
      {
        version: "v0.1", status: "in-progress", stages: [
          { id: "prd", name: "PRD", status: "done", role: "PM", completedAt: "07-02", docName: "v0.1-prd.md", sessionId: "s1" },
          { id: "design", name: "设计", status: "done", role: "Architect", completedAt: "07-04", docName: "v0.1-design.md", sessionId: "s1" },
          { id: "impl", name: "实现", status: "in-progress", role: "Developer", sessionId: "s1" },
          { id: "deploy", name: "部署检查", status: "pending", role: "DevOps" },
          { id: "close", name: "迭代关闭", status: "pending", role: "PM" },
          { id: "wrap", name: "收尾", status: "pending", role: "各角色" },
        ],
      },
    ],
  },
};

const STAGE_STATUS_CFG: Record<StageStatus, { dot: string; label: string; labelCls: string; lineCls: string }> = {
  done: { dot: "bg-emerald-500 border-emerald-500", label: "已定稿", labelCls: "text-emerald-600", lineCls: "bg-emerald-400" },
  "in-progress": { dot: "bg-blue-500 border-blue-500 ring-4 ring-blue-100", label: "进行中", labelCls: "text-blue-600", lineCls: "bg-gray-200" },
  pending: { dot: "bg-white border-gray-300", label: "未开始", labelCls: "text-muted-foreground", lineCls: "bg-gray-200" },
  blocked: { dot: "bg-red-500 border-red-500", label: "阻塞", labelCls: "text-red-600", lineCls: "bg-red-300" },
};

const VERSION_STATUS_CFG: Record<VersionStatus, { dot: string; ring: string; label: string }> = {
  done: { dot: "bg-emerald-500 border-emerald-500", ring: "ring-emerald-100", label: "已完成" },
  "in-progress": { dot: "bg-blue-500 border-blue-500", ring: "ring-blue-100", label: "进行中" },
};

function StagePipeline({
  version,
  onStageClick,
}: {
  version: IterationVersion;
  onStageClick: (stage: IterationStage) => void;
}) {
  const isDone = version.status === "done";
  if (version.stages.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        暂无迭代记录
      </div>
    );
  }

  return (
    <div className="relative flex items-start justify-between">
      {version.stages.map((stage, i) => {
        const cfg = isDone
          ? STAGE_STATUS_CFG.done
          : STAGE_STATUS_CFG[stage.status];
        const isClickable = isDone || stage.status === "done" || stage.status === "in-progress";
        const prevLineCls = i > 0
          ? (isDone ? "bg-emerald-400" : STAGE_STATUS_CFG[version.stages[i - 1].status].lineCls)
          : "";

        return (
          <div key={stage.id} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div className="absolute top-[10px] right-1/2 w-full h-0.5 -translate-y-1/2">
                <div className={`h-full w-full ${prevLineCls}`} />
              </div>
            )}
            <button
              onClick={() => isClickable && onStageClick(stage)}
              disabled={!isClickable}
              className={`relative z-10 h-5 w-5 rounded-full border-2 transition-transform duration-150 flex-shrink-0 ${cfg.dot} ${isClickable ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
            />
            <div className="mt-2 text-center px-1 max-w-[80px]">
              <p className={`text-xs font-medium leading-tight ${cfg.labelCls}`}>{stage.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stage.role}</p>
              {stage.completedAt && (
                <p className="text-xs font-mono text-muted-foreground/70 mt-0.5">{stage.completedAt}</p>
              )}
              {isDone && stage.outputSummary && (
                <p className="text-xs text-muted-foreground/70 mt-1 leading-tight line-clamp-2 text-left">{stage.outputSummary}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DualLayerTimeline({
  data,
  onStageClick,
}: {
  data: ProjectIterations;
  onStageClick: (stage: IterationStage, iterationDone: boolean) => void;
}) {
  const [selectedVersion, setSelectedVersion] = useState(data.currentVersion);
  const selected = data.versions.find((v) => v.version === selectedVersion) ?? data.versions[0];

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Layer 1 — version axis */}
      <div className="px-5 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">项目迭代总览</p>
          <span className="text-xs font-mono text-muted-foreground">
            当前：<span className="text-foreground">{data.currentVersion}</span>
          </span>
        </div>
        <div className="flex items-center gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
          {data.versions.map((v, i) => {
            const cfg = VERSION_STATUS_CFG[v.status];
            const isSelected = v.version === selectedVersion;
            return (
              <div key={v.version} className="flex items-center flex-shrink-0">
                {i > 0 && (
                  <div className={`h-0.5 w-8 ${data.versions[i - 1].status === "done" ? "bg-emerald-300" : "bg-gray-200"}`} />
                )}
                <button
                  onClick={() => setSelectedVersion(v.version)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${cfg.dot} ${isSelected ? `ring-3 ${cfg.ring}` : ""} group-hover:scale-110`} />
                  <span className={`text-xs font-mono transition-colors ${isSelected ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {v.version}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Layer 2 — stage pipeline */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {selected?.version} 迭代详情
          </p>
          {selected && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              selected.status === "done" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
              selected.status === "in-progress" ? "bg-blue-50 text-blue-600 border border-blue-200" :
              "bg-gray-100 text-gray-500 border border-gray-200"
            }`}>
              {VERSION_STATUS_CFG[selected.status].label}
            </span>
          )}
        </div>
        {selected ? (
          <StagePipeline version={selected} onStageClick={(s) => onStageClick(s, selected.status === "done")} />
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">暂无迭代记录</p>
        )}
      </div>
    </div>
  );
}

function StageDetailDrawer({
  open,
  stage,
  iterationDone,
  onClose,
  onViewConversation,
}: {
  open: boolean;
  stage: IterationStage | null;
  iterationDone: boolean;
  onClose: () => void;
  onViewConversation: (sessionId: string) => void;
}) {
  if (!stage) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 z-50 h-full w-[420px] max-w-full bg-white border-l border-border shadow-xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-medium text-foreground">{stage.name} — 阶段详情</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {iterationDone ? "已完成" : STAGE_STATUS_CFG[stage.status].label}
            </span>
            <span className="text-xs font-mono text-muted-foreground bg-accent px-1.5 py-0.5 rounded">{stage.role}</span>
            {stage.completedAt && <span className="text-xs font-mono text-muted-foreground">{stage.completedAt}</span>}
          </div>

          {/* Output summary (completed iterations) */}
          {stage.outputSummary && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">产出摘要</p>
              <div className="rounded-lg border border-border bg-accent/30 px-4 py-3">
                <p className="text-sm text-foreground/80 leading-relaxed">{stage.outputSummary}</p>
              </div>
            </div>
          )}

          {/* Document */}
          {stage.docName && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">产出文档</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/40 px-3 py-2.5">
                <GitPullRequest className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-mono text-foreground">{stage.docName}</span>
              </div>
            </div>
          )}

          {/* Session */}
          {stage.sessionId && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">关联会话</p>
              {(() => {
                const s = MOCK_SESSIONS.find((s) => s.id === stage.sessionId);
                return s ? (
                  <div className="rounded-lg border border-border bg-white p-3 space-y-1.5">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs font-mono text-muted-foreground">最近活动：{s.lastActiveAt}</p>
                  </div>
                ) : null;
              })()}
              <button
                onClick={() => { onClose(); onViewConversation(stage.sessionId!); }}
                className="mt-3 w-full rounded-lg bg-[#030213] text-white text-sm font-medium py-2.5 hover:bg-[#030213]/90 transition-colors"
              >
                查看当时的对话 →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sessions: SessionsView ───────────────────────────────────────────────────

function SessionsView() {
  const [subView, setSubView] = useState<"root" | "subproject" | "conversation">("root");
  const [selectedSubprojectId, setSelectedSubprojectId] = useState("workboard");
  const [conversationRole, setConversationRole] = useState<{ role: RoleDef; session: SessionItem } | null>(null);
  const [mappings, setMappings] = useState<Record<string, RoleMapping[]>>(INITIAL_MAPPINGS);
  const [chiefMapping, setChiefMapping] = useState<ChiefMapping>(INITIAL_CHIEF);
  const [chiefModalOpen, setChiefModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [modalRoleId, setModalRoleId] = useState<string | undefined>(undefined);
  const [stageDrawerOpen, setStageDrawerOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<IterationStage | null>(null);
  const [selectedStageIterDone, setSelectedStageIterDone] = useState(false);

  const currentMeta = SUBPROJECTS_META.find((p) => p.id === selectedSubprojectId)!;
  const currentMappings = mappings[selectedSubprojectId] ?? ROLE_DEFS.map((r) => ({ roleId: r.id, status: "unmapped" as RoleMappingStatus }));

  const handleConfirmRole = (projectId: string, roleId: string, session: SessionItem) => {
    setMappings((prev) => {
      const list = prev[projectId] ?? ROLE_DEFS.map((r) => ({ roleId: r.id, status: "unmapped" as RoleMappingStatus }));
      return {
        ...prev,
        [projectId]: list.map((m) =>
          m.roleId === roleId ? { roleId, status: "mapped", sessionId: session.id, sessionTitle: session.title } : m
        ),
      };
    });
  };

  const openRoleModal = (roleId?: string) => {
    setModalRoleId(roleId);
    setRoleModalOpen(true);
  };

  const openConversationBySessionId = (sessionId: string) => {
    const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
    // Find a mapped role that uses this session, or fallback to first role
    const currentMaps = mappings[selectedSubprojectId] ?? [];
    const roleMapping = currentMaps.find((m) => m.sessionId === sessionId);
    const role = roleMapping ? ROLE_DEFS.find((r) => r.id === roleMapping.roleId) : ROLE_DEFS[0];
    if (session && role) {
      setConversationRole({ role, session });
      setSubView("conversation");
    }
  };

  const handleStageClick = (stage: IterationStage, iterationDone: boolean) => {
    if (!iterationDone && stage.status === "in-progress" && stage.sessionId) {
      openConversationBySessionId(stage.sessionId);
    } else {
      setSelectedStage(stage);
      setSelectedStageIterDone(iterationDone);
      setStageDrawerOpen(true);
    }
  };

  // ── Conversation view ──
  if (subView === "conversation" && conversationRole) {
    return (
      <ConversationView
        role={conversationRole.role}
        session={conversationRole.session}
        onBack={() => setSubView("subproject")}
      />
    );
  }

  // ── Root view ──
  if (subView === "root") {
    return (
      <div className="space-y-6">
        <ChiefCard mapping={chiefMapping} onConfigure={() => setChiefModalOpen(true)} />

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">生态根维护</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROOT_COMPONENTS.map((comp) => <RootComponentCard key={comp.id} comp={comp} />)}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">项目组</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SUBPROJECTS_META.map((meta) => (
              <SubprojectOverviewCard
                key={meta.id}
                meta={meta}
                mappings={mappings[meta.id] ?? []}
                onClick={() => { setSelectedSubprojectId(meta.id); setSubView("subproject"); }}
              />
            ))}
          </div>
        </div>

        <ChiefMappingModal
          open={chiefModalOpen}
          onClose={() => setChiefModalOpen(false)}
          onConfirm={(session) => setChiefMapping({ status: "mapped", sessionId: session.id, sessionTitle: session.title })}
        />
      </div>
    );
  }

  // ── Subproject view ──
  const iterData = ITERATION_DATA[selectedSubprojectId];
  return (
    <div className="space-y-5">
      <EcosystemBreadcrumb subprojectName={currentMeta.name} onBack={() => setSubView("root")} />

      {/* Dual-layer timeline */}
      {iterData && (
        <DualLayerTimeline
          data={iterData}
          onStageClick={(stage, iterDone) => handleStageClick(stage, iterDone)}
        />
      )}

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ROLE_DEFS.map((role) => {
          const mapping = currentMappings.find((m) => m.roleId === role.id) ?? { roleId: role.id, status: "unmapped" as RoleMappingStatus };
          return (
            <RoleCard
              key={role.id}
              role={role}
              mapping={mapping}
              onConfigure={() => openRoleModal(role.id)}
              onViewDetail={() => {
                const session = MOCK_SESSIONS.find((s) => s.id === mapping.sessionId);
                if (session) { setConversationRole({ role, session }); setSubView("conversation"); }
              }}
            />
          );
        })}
      </div>

      <RoleMappingModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        initialProjectId={selectedSubprojectId}
        initialRoleId={modalRoleId}
        onConfirm={handleConfirmRole}
      />

      <StageDetailDrawer
        open={stageDrawerOpen}
        stage={selectedStage}
        iterationDone={selectedStageIterDone}
        onClose={() => setStageDrawerOpen(false)}
        onViewConversation={openConversationBySessionId}
      />
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type View = "workbench" | "deploy" | "diagnostics" | "crossproject" | "sessions";

const NAV_ITEMS: { id: View; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "workbench", label: "工作台", Icon: LayoutDashboard },
  { id: "sessions", label: "项目会话", Icon: MessagesSquare },
  { id: "crossproject", label: "跨项目", Icon: Network },
  { id: "deploy", label: "部署", Icon: Rocket },
  { id: "diagnostics", label: "接入诊断", Icon: Stethoscope },
];

const VIEW_LABELS: Record<View, string> = {
  workbench: "工作台",
  deploy: "部署",
  diagnostics: "接入诊断",
  crossproject: "跨项目",
  sessions: "项目会话",
};

function Sidebar({ activeView, onViewChange }: { activeView: View; onViewChange: (v: View) => void }) {
  const errorCount = PROJECTS.filter((p) => p.status === "config-error" || p.status === "read-error").length;

  return (
    <div className="w-52 flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#030213] flex items-center justify-center flex-shrink-0">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-none">项目看板</p>
            <p className="text-xs text-muted-foreground mt-0.5">Owner Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${active ? "bg-[#030213] text-white" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              <item.Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
              {item.id === "diagnostics" && errorCount > 0 && (
                <span className={`ml-auto text-xs font-medium rounded-full px-1.5 py-0.5 leading-none ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
                  {errorCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#030213] flex items-center justify-center">
            <span className="text-xs text-white font-medium">牛</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-none">Owner</p>
            <p className="text-xs text-muted-foreground mt-0.5">只读监督</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeView, setActiveView] = useState<View>("workbench");
  const [drawerProject, setDrawerProject] = useState<Project | null>(null);
  const [drawerDiagProject, setDrawerDiagProject] = useState<Project | null>(null);
  const [drawerCrossItem, setDrawerCrossItem] = useState<CrossProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  }, []);

  const openDrawer = useCallback((fn: () => void) => {
    setDrawerLoading(true);
    fn();
    setTimeout(() => setDrawerLoading(false), 600);
  }, []);

  const closeAllDrawers = () => {
    setDrawerProject(null);
    setDrawerDiagProject(null);
    setDrawerCrossItem(null);
  };

  const handleViewChange = (v: View) => {
    closeAllDrawers();
    if (v !== activeView) setLoading(true);
    setActiveView(v);
    if (v !== activeView) setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-white border-b border-border px-6 py-3.5 flex-shrink-0 flex items-center justify-between">
          <h1 className="text-sm font-medium text-foreground">{VIEW_LABELS[activeView]}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">{PROJECTS.length} 个项目</span>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 transition-transform duration-700 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <>
              {activeView === "workbench" && <WorkbenchSkeleton />}
              {activeView === "deploy" && <DeploySkeleton />}
              {activeView === "diagnostics" && <DiagnosticsSkeleton />}
              {activeView === "crossproject" && <CrossProjectSkeleton />}
              {activeView === "sessions" && <SessionsSkeleton />}
            </>
          ) : (
            <>
              {activeView === "workbench" && (
                <WorkbenchView
                  onProjectClick={(p) => openDrawer(() => setDrawerProject(p))}
                  onViewCrossProject={() => handleViewChange("crossproject")}
                />
              )}
              {activeView === "deploy" && <DeployView />}
              {activeView === "diagnostics" && (
                <DiagnosticsView onRowClick={(p) => openDrawer(() => setDrawerDiagProject(p))} />
              )}
              {activeView === "crossproject" && (
                <CrossProjectView onItemClick={(item) => openDrawer(() => setDrawerCrossItem(item))} />
              )}
              {activeView === "sessions" && <SessionsView />}
            </>
          )}
        </div>
      </div>

      <Drawer open={!!drawerProject} onClose={() => setDrawerProject(null)} title={drawerProject?.name ?? "项目详情"}>
        {drawerLoading ? <ProjectDrawerSkeleton /> : drawerProject && <ProjectDrawerContent project={drawerProject} />}
      </Drawer>

      <Drawer open={!!drawerDiagProject} onClose={() => setDrawerDiagProject(null)} title={drawerDiagProject ? `${drawerDiagProject.name} — 接入详情` : "接入详情"}>
        {drawerLoading ? <DiagnosticDrawerSkeleton /> : drawerDiagProject && <DiagnosticDrawerContent project={drawerDiagProject} />}
      </Drawer>

      <Drawer open={!!drawerCrossItem} onClose={() => setDrawerCrossItem(null)} title={drawerCrossItem?.id ?? "需求详情"}>
        {drawerLoading ? <CrossItemDrawerSkeleton /> : drawerCrossItem && <CrossProjectDrawerContent item={drawerCrossItem} />}
      </Drawer>

    </div>
  );
}
