import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MarkdownContent } from "./components/MarkdownContent";
import {
  type Project,
  type CrossProjectItem,
  type ReqStatus,
  type ProjectKind,
  type IntegrationStatus,
  useSnapshot,
  mapSnapshot,
  ViewModelProvider,
  useViewModel,
  EMPTY_VIEW_MODEL,
} from "./snapshot";
import {
  LayoutDashboard,
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
  GitPullRequest,
  MessagesSquare,
  Compass,
} from "lucide-react";
import { EcosystemView, ConversationView } from "./components/EcosystemView";

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
  // US-6：部署 + 接入诊断降级为项目详情抽屉 tab
  const [tab, setTab] = useState<"overview" | "infra">("overview");
  const isIterative = project.kind === "business" || project.kind === "workboard";
  const pendingTodos = project.todos.filter((t) => !t.done);
  const doneTodos = project.todos.filter((t) => t.done);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-[#f6f7f9] border border-border rounded-lg p-1 w-fit">
        {([["overview", "概览"], ["infra", "接入 / 部署"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${tab === id ? "bg-[#030213] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "infra" && <InfraDrawerTab project={project} />}

      {tab === "overview" && (
      <>
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
      </>
      )}
    </div>
  );
}

// ─── 接入 / 部署 tab（US-6：原部署视图 + 接入诊断视图降级并入） ────────────────

function InfraDrawerTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <Section title="部署">
        {project.url ? (
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-border bg-white p-3 hover:border-[#030213]/20 transition-colors group">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <p className="text-sm font-mono text-foreground/70 truncate">{project.url}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">未配置线上地址</p>
        )}
      </Section>
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
  const { commItems: COMM_ITEMS } = useViewModel();
  const relatedComm = COMM_ITEMS.filter((c) => c.reqId.startsWith(item.id));
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {item.priority && <PriorityBadge priority={item.priority} />}
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
          ]
            .filter((f) => f.value)
            .map((f) => (
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

// ─── 沟通全文抽屉（US-8：GET /api/communications/detail + Markdown 只读渲染） ──

type CommDetailState =
  | { status: "loading" }
  | { status: "ready"; content: string }
  | { status: "notfound" }
  | { status: "error"; message: string };

function CommDetailDrawerContent({ commId }: { commId: string }) {
  const [state, setState] = useState<CommDetailState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetch(`/api/communications/detail?id=${encodeURIComponent(commId)}`)
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 404) { setState({ status: "notfound" }); return; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setState({ status: "ready", content: j.content ?? "" });
      })
      .catch((e) => { if (alive) setState({ status: "error", message: String((e as Error)?.message ?? e) }); });
    return () => { alive = false; };
  }, [commId]);

  if (state.status === "loading") {
    return (
      <div className="space-y-3">
        <Sk className="h-5 w-2/3" />
        {[0, 1, 2, 3, 4].map((i) => <Sk key={i} className={`h-4 ${i % 2 === 0 ? "w-full" : "w-4/5"}`} />)}
      </div>
    );
  }
  if (state.status === "notfound") {
    return <EmptyState icon={MessageSquare} message="沟通文档未找到" />;
  }
  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-xs text-red-600">加载失败：{state.message}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="text-sm text-foreground/85">
        <MarkdownContent text={state.content} />
      </div>
      <p className="text-xs text-muted-foreground text-center border-t border-border pt-3">
        只读 · 聚合自 coordination communications
      </p>
    </div>
  );
}

// ─── SPA 404 兜底（US-9） ─────────────────────────────────────────────────────

function NotFoundView() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <p className="text-5xl font-mono text-[#030213]/20">404</p>
      <p className="text-sm text-foreground">页面不存在</p>
      <p className="text-xs text-muted-foreground font-mono">{window.location.pathname}</p>
      <a
        href="/"
        className="mt-2 px-4 py-2 text-sm font-medium bg-[#030213] text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        返回工作台
      </a>
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar() {
  const { projects: PROJECTS, cardProjects: CARD_PROJECTS, crossTodos: CROSS_TODOS } = useViewModel();
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
  const { crossItems: CROSS_PROJECT_ITEMS, bcrItems: BCR_ITEMS, blockerCount } = useViewModel();
  const activeReq = CROSS_PROJECT_ITEMS.filter((r) => r.status !== "已关闭")[0];
  const blockingCount = blockerCount;
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

// US-7：单条待办文本 ≤2 行截断 + hover 浮层看全文（portal 到 body，防外层 overflow-hidden 裁剪）
function TodoTextCell({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [pop, setPop] = useState<{ top: number; left: number; width: number } | null>(null);

  const show = () => {
    const el = ref.current;
    if (!el) return;
    // 只在真的被截断时弹浮层
    if (el.scrollHeight <= el.clientHeight + 2) return;
    const r = el.getBoundingClientRect();
    setPop({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 320) });
  };

  return (
    <>
      <p ref={ref} className="leading-relaxed line-clamp-2" onMouseEnter={show} onMouseLeave={() => setPop(null)}>
        {text}
      </p>
      {pop && createPortal(
        <div
          className="fixed z-[70] bg-white border border-border rounded-lg shadow-xl p-3 text-sm text-foreground leading-relaxed max-w-[480px] max-h-[50vh] overflow-y-auto pointer-events-none"
          style={{ top: pop.top, left: pop.left, width: pop.width }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

function CrossTodoList() {
  const { crossTodos: CROSS_TODOS } = useViewModel();
  // US-7：默认前 5 条，超出折叠；footer hover 浮现 peek 预览
  const [expanded, setExpanded] = useState(false);
  const [peek, setPeek] = useState<{ top: number; left: number } | null>(null);
  const footerRef = useRef<HTMLButtonElement>(null);
  const statusColor: Record<string, string> = {
    "待启动": "bg-gray-100 text-gray-500",
    "待评估": "bg-amber-50 text-amber-600",
    "进行中": "bg-blue-50 text-blue-600",
    "已完成": "bg-emerald-50 text-emerald-600",
  };

  const visible = expanded ? CROSS_TODOS : CROSS_TODOS.slice(0, 5);
  const hiddenCount = CROSS_TODOS.length - 5;

  const showPeek = () => {
    const el = footerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPeek({ top: r.top - 8, left: r.left + 16 });
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
          {visible.map((t) => (
            <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
              <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
              <td className="px-5 py-3 text-foreground max-w-[320px]">
                <TodoTextCell text={t.text} />
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
      {hiddenCount > 0 && (
        <button
          ref={footerRef}
          onClick={() => { setExpanded((v) => !v); setPeek(null); }}
          onMouseEnter={() => !expanded && showPeek()}
          onMouseLeave={() => setPeek(null)}
          className="w-full px-5 py-2.5 border-t border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors flex items-center justify-center gap-1.5"
        >
          {expanded ? (
            <>收起 <ChevronRight className="h-3 w-3 -rotate-90" /></>
          ) : (
            <>展开全部 · 还有 {hiddenCount} 条 <ChevronRight className="h-3 w-3 rotate-90" /></>
          )}
        </button>
      )}
      {peek && !expanded && createPortal(
        <div
          className="fixed z-[70] -translate-y-full bg-white border border-border rounded-lg shadow-xl p-3 w-[420px] max-w-[80vw] pointer-events-none space-y-1.5"
          style={{ top: peek.top, left: peek.left }}
        >
          <p className="text-[10px] text-muted-foreground">未展开的 {hiddenCount} 条：</p>
          {CROSS_TODOS.slice(5, 10).map((t) => (
            <p key={t.id} className="text-xs text-foreground/80 truncate">
              <span className="font-mono text-muted-foreground mr-1">{t.priority}</span>{t.text}
            </p>
          ))}
          {hiddenCount > 5 && <p className="text-[10px] text-muted-foreground">…等 {hiddenCount} 条</p>}
        </div>,
        document.body
      )}
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
  const { cardProjects: CARD_PROJECTS } = useViewModel();
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

// ─── Cross-project View ───────────────────────────────────────────────────────

type ActiveFilter = "进行中" | "已关闭" | "全部";
const CLOSED_STATUSES: ReqStatus[] = ["已关闭"];
// 终态可能带后缀（如「已回流下游（终态）」），用包含匹配；已拒绝也是终态
const BCR_CLOSED_STATUSES = ["已回流下游", "已拒绝"];
const isBcrClosed = (status: string) => BCR_CLOSED_STATUSES.some((s) => status.includes(s));

function CrossProjectView({ onItemClick, onCommClick }: { onItemClick: (item: CrossProjectItem) => void; onCommClick: (commId: string) => void }) {
  const { crossItems: CROSS_PROJECT_ITEMS, bcrItems: BCR_ITEMS, commItems: COMM_ITEMS } = useViewModel();
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
    if (bcrFilter === "进行中") return !isBcrClosed(item.status);
    if (bcrFilter === "已关闭") return isBcrClosed(item.status);
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
                      {item.priority && <PriorityBadge priority={item.priority} />}
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
              <button key={c.id} onClick={() => onCommClick(c.id)} className="w-full text-left bg-white rounded-xl border border-border p-4 hover:border-[#030213]/20 hover:shadow-sm transition-all duration-150 group">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground bg-accent px-2 py-0.5 rounded">{c.reqId}</span>
                    <span className="text-xs text-muted-foreground">{c.projects.join(" ↔ ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{c.ts}</span>
                    <span className="text-xs text-[#030213]/50 group-hover:text-foreground flex items-center gap-0.5 transition-colors">
                      查看全文 <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{c.summary}</p>
              </button>
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{bcr.id}</span>
                      <BcrStatusBadge status={bcr.status} />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{bcr.summary}</p>
                  </div>
                  {/* 影响范围可能很长：限宽 + 两行截断，避免挤压左列（曾致摘要一字一行竖排） */}
                  <div className="text-right flex-shrink-0 max-w-[200px]">
                    <p className="text-xs text-muted-foreground mb-0.5">目标</p>
                    <p className="text-xs font-mono text-foreground/60 line-clamp-2 break-all">{bcr.target}</p>
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type View = "workbench" | "sessions" | "crossproject";

// US-6 菜单 5→3（方案 A）：部署+接入诊断降级进看板项目详情抽屉 tab；跨项目收敛为需求池
const NAV_ITEMS: { id: View; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "workbench", label: "看板", Icon: LayoutDashboard },
  { id: "sessions", label: "项目会话", Icon: MessagesSquare },
  { id: "crossproject", label: "需求池", Icon: Package },
];

const VIEW_LABELS: Record<View, string> = {
  workbench: "看板",
  sessions: "项目会话",
  crossproject: "需求池",
};

function Sidebar({ activeView, onViewChange }: { activeView: View; onViewChange: (v: View) => void }) {
  const { projects: PROJECTS } = useViewModel();
  const errorCount = PROJECTS.filter((p) => p.status === "config-error" || p.status === "read-error").length;

  return (
    <div className="w-52 flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#030213] flex items-center justify-center flex-shrink-0">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-none">项目管理工作台</p>
            <p className="text-xs text-muted-foreground mt-0.5">统一管理中枢</p>
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
              {item.id === "workbench" && errorCount > 0 && (
                <span className={`ml-auto text-xs font-medium rounded-full px-1.5 py-0.5 leading-none ${active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
                  {errorCount}
                </span>
              )}
            </button>
          );
        })}
        <a
          href="/tour.html"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Compass className="h-4 w-4 flex-shrink-0" />
          <span>参赛导览</span>
          <ExternalLink className="ml-auto h-3 w-3 flex-shrink-0" />
        </a>
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
  const { ui, refetch } = useSnapshot();
  const [activeView, setActiveView] = useState<View>("workbench");
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>(null);
  const [drawerCrossId, setDrawerCrossId] = useState<string | null>(null);
  const [drawerCommId, setDrawerCommId] = useState<string | null>(null);
  const [conversationSessionId, setConversationSessionId] = useState<string | null>(null);

  const vm = ui.state === "ready" ? mapSnapshot(ui.data) : EMPTY_VIEW_MODEL;
  const isLoading = ui.state === "loading";
  const isError = ui.state === "error";

  // US-9：SPA 404 兜底（后端未知路径回退 index.html，前端按 pathname 判断）
  if (typeof window !== "undefined" && window.location.pathname !== "/" && !window.location.pathname.endsWith(".html")) {
    return <NotFoundView />;
  }

  const closeAllDrawers = () => {
    setDrawerProjectId(null);
    setDrawerCrossId(null);
    setDrawerCommId(null);
  };

  const handleViewChange = (v: View) => {
    closeAllDrawers();
    setActiveView(v);
  };

  // Drawer 用 id 保留：轮询刷新后仍指向最新对象；对象消失 / 被禁用则降级
  const drawerProject = drawerProjectId ? vm.projects.find((p) => p.id === drawerProjectId) ?? null : null;
  const drawerCrossItem = drawerCrossId ? vm.crossItems.find((c) => c.id === drawerCrossId) ?? null : null;
  const drawerCommItem = drawerCommId ? vm.commItems.find((c) => c.id === drawerCommId) ?? null : null;

  return (
    <ViewModelProvider value={vm}>
      <div className="h-screen flex bg-background overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={handleViewChange} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-white border-b border-border px-6 py-3.5 flex-shrink-0 flex items-center justify-between">
            <h1 className="text-sm font-medium text-foreground">{VIEW_LABELS[activeView]}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{vm.projectCount} 个项目</span>
              <button
                onClick={refetch}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 transition-transform duration-700 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isError ? (
              <ErrorPanel message={ui.state === "error" ? ui.message : ""} onRetry={refetch} />
            ) : isLoading ? (
              <>
                {activeView === "workbench" && <WorkbenchSkeleton />}
                {activeView === "sessions" && <WorkbenchSkeleton />}
                {activeView === "crossproject" && <CrossProjectSkeleton />}
              </>
            ) : (
              <>
                {activeView === "workbench" && (
                  <WorkbenchView
                    onProjectClick={(p) => setDrawerProjectId(p.id)}
                    onViewCrossProject={() => handleViewChange("crossproject")}
                  />
                )}
                {activeView === "sessions" && (
                  <EcosystemView
                    projects={vm.projects}
                    onSessionClick={(id) => setConversationSessionId(id)}
                  />
                )}
                {activeView === "crossproject" && (
                  <CrossProjectView
                    onItemClick={(item) => setDrawerCrossId(item.id)}
                    onCommClick={(id) => setDrawerCommId(id)}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <Drawer open={!!drawerProjectId} onClose={() => setDrawerProjectId(null)} title={drawerProject?.name ?? "项目详情"}>
          {drawerProject ? <ProjectDrawerContent project={drawerProject} /> : <DrawerGone />}
        </Drawer>

        <Drawer open={!!drawerCrossId} onClose={() => setDrawerCrossId(null)} title={drawerCrossItem?.id ?? "需求详情"}>
          {drawerCrossItem ? <CrossProjectDrawerContent item={drawerCrossItem} /> : <DrawerGone />}
        </Drawer>

        <Drawer open={!!drawerCommId} onClose={() => setDrawerCommId(null)} title={drawerCommItem ? `${drawerCommItem.reqId} · 沟通记录` : "沟通记录"}>
          {drawerCommItem ? <CommDetailDrawerContent commId={drawerCommItem.id} /> : <DrawerGone />}
        </Drawer>

        {conversationSessionId && (
          <ConversationView
            sessionId={conversationSessionId}
            onClose={() => setConversationSessionId(null)}
          />
        )}
      </div>
    </ViewModelProvider>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-500" />
      </div>
      <p className="text-sm font-medium text-foreground">读取快照失败</p>
      <p className="text-xs text-muted-foreground font-mono max-w-md text-center break-all">{message}</p>
      <button onClick={onRetry} className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-[#030213] text-white hover:opacity-90 transition-opacity">
        重试
      </button>
    </div>
  );
}

function DrawerGone() {
  return <p className="text-sm text-muted-foreground">该对象已不存在或被禁用。</p>;
}
