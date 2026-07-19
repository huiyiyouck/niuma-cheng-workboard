import { useState, useMemo, useEffect } from "react";
import {
  useSessionList,
  useSessionDetail,
  useTimelineVersions,
  useTimelineDetail,
  setSessionRole,
  triggerSync,
} from "../useProjectSession";
import type { ClaudeSession, ClaudeMessage, Project, TimelineStage, TimelineStageStatus, TimelineVersionStatus } from "../snapshot";
import { MarkdownContent } from "./MarkdownContent";
import {
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Circle,
  X,
  AlertCircle,
  Tag,
  ArrowLeft,
  Settings,
  Layers,
  Flag,
  Bot,
  Boxes,
  Hammer,
  Sparkles,
  MessagesSquare,
  History,
  Loader2,
} from "lucide-react";

// ─── 常量 ─────────────────────────────────────────────────────────────────

const ROLES = [
  { id: "PM", label: "PM", zhLabel: "产品经理", icon: Flag, desc: "负责需求分析与产品决策" },
  { id: "Architect", label: "Architect", zhLabel: "架构师", icon: Boxes, desc: "负责技术选型与架构设计" },
  { id: "Developer", label: "Developer", zhLabel: "开发工程师", icon: Hammer, desc: "负责按设计文档落地实现" },
  { id: "DevOps", label: "DevOps", zhLabel: "运维部署工程师", icon: Settings, desc: "负责部署与生产环境维护" },
  { id: "General", label: "General", zhLabel: "通用助手", icon: Sparkles, desc: "处理非工作流角色任务（可选）" },
] as const;

function roleLabel(roleId: string | null): string {
  if (!roleId) return "";
  return ROLES.find((r) => r.id === roleId)?.zhLabel ?? roleId;
}

// ─── 工具函数 ────────────────────────────────────────────────────────────

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s 前`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

// ─── 主入口：项目会话视图 ────────────────────────────────────────────────

type View =
  | { kind: "ecosystem" }
  | { kind: "subproject"; projectId: string };

interface EcosystemViewProps {
  projects: Project[];
  onSessionClick: (sessionId: string) => void;
  // 生态根只读卡片钻取（方案 A ④）：公告板 → 需求池视图；框架真源 → 项目详情抽屉
  onOpenProject: (projectId: string) => void;
  onViewCrossProject: () => void;
}

export function EcosystemView({ projects, onSessionClick, onOpenProject, onViewCrossProject }: EcosystemViewProps) {
  const [view, setView] = useState<View>({ kind: "ecosystem" });

  if (view.kind === "subproject") {
    const project = projects.find((p) => p.id === view.projectId);
    if (!project) {
      setView({ kind: "ecosystem" });
      return null;
    }
    return (
      <SubProjectView
        project={project}
        onBack={() => setView({ kind: "ecosystem" })}
        onSessionClick={onSessionClick}
      />
    );
  }

  return (
    <EcosystemRootView
      projects={projects}
      onSubProjectClick={(id) => setView({ kind: "subproject", projectId: id })}
      onSessionClick={onSessionClick}
      onOpenProject={onOpenProject}
      onViewCrossProject={onViewCrossProject}
    />
  );
}

// ─── 生态根目录视图 ──────────────────────────────────────────────────────

function EcosystemRootView({
  projects,
  onSubProjectClick,
  onSessionClick,
  onOpenProject,
  onViewCrossProject,
}: {
  projects: Project[];
  onSubProjectClick: (id: string) => void;
  onSessionClick: (sessionId: string) => void;
  onOpenProject: (projectId: string) => void;
  onViewCrossProject: () => void;
}) {
  // 按 kind 拆分
  const rootComponents = projects.filter((p) => p.kind === "workflow-source" || p.kind === "coordination");
  const subProjects = projects.filter((p) => p.kind === "business" || p.kind === "workboard");


  return (
    <div className="space-y-6">
      {/* 顶部：同步状态与手动刷新 */}
      <SyncBar />

      {/* 顶部：参谋长席位 */}
      <ChiefOfStaffCard onSessionClick={onSessionClick} />

      {/* 中部：生态根维护的组成部分（只读，可钻取查看当前表现） */}
      <div>
        <SectionLabel>生态根维护的组成部分（只读 · 点击查看详情）</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rootComponents.map((p) => (
            <ReadOnlyRootCard
              key={p.id}
              project={p}
              onClick={() => (p.kind === "coordination" ? onViewCrossProject() : onOpenProject(p.id))}
            />
          ))}
        </div>
      </div>

      {/* 底部：项目组列表（可选子项目） */}
      <div>
        <SectionLabel>项目组（可选子项目，{subProjects.length} 个）</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {subProjects.map((p) => (
            <SubProjectCard
              key={p.id}
              project={p}
              onClick={() => onSubProjectClick(p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

// ─── 会话同步状态与手动刷新 ──────────────────────────────────────────────

function SyncBar() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setErr(null);
    try {
      const r = await triggerSync();
      const updated = r.results.filter((x) => ["full", "rebuild", "incremental"].includes(x.status)).length;
      const failed = r.results.filter((x) => x.status === "error").length;
      const suffix = failed > 0 ? `，${failed} 个文件失败` : "";
      setLastResult(`已同步 ${r.projectCount} 个项目目录，${updated} 个会话有更新${suffix} · ${new Date(r.syncedAt).toLocaleTimeString("zh-CN")}`);
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-border px-4 py-2.5">
      <div className="min-w-0">
        {err ? (
          <p className="text-xs text-red-600 truncate">同步失败：{err}</p>
        ) : lastResult ? (
          <p className="text-xs text-muted-foreground truncate">{lastResult}</p>
        ) : (
          <p className="text-xs text-muted-foreground">会话每次服务启动自动同步一次；需要最新数据时可手动刷新</p>
        )}
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "同步中..." : "同步会话"}
      </button>
    </div>
  );
}

// ─── 参谋长席位卡片 ──────────────────────────────────────────────────────

function ChiefOfStaffCard({ onSessionClick }: { onSessionClick?: (sessionId: string) => void }) {
  // M-1 模型下无 chief-of-staff 手动映射：参谋长席位 = 生态根最新活跃会话（自动，免配置）
  const { data } = useSessionList({ projectId: "ecosystem-root", limit: 1 });
  const latest = data?.items?.[0] ?? null;

  return (
    <div className="bg-white rounded-xl border border-[#030213]/15 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-[#030213] flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">参谋长席位</p>
            <p className="text-xs text-muted-foreground mt-0.5">niuma-cheng 生态根会话 · 自动取最新</p>
            {latest ? (
              <div className="mt-2 space-y-0.5">
                <p className="text-sm text-foreground truncate">{latest.title || "（无标题）"}</p>
                <p className="text-xs text-muted-foreground">最近活动 {relTime(latest.last_message_at)}</p>
              </div>
            ) : (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                  <Circle className="h-2.5 w-2.5" /> 暂无会话
                </span>
              </div>
            )}
          </div>
        </div>
        {latest && (
          <button
            onClick={() => onSessionClick?.(latest.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#030213] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <MessagesSquare className="h-3.5 w-3.5" />
            查看对话
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 生态根只读卡片（框架真源 / 公告板） ──────────────────────────────────

function ReadOnlyRootCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-xl border border-border p-4 hover:border-[#030213]/20 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#030213]/5 flex items-center justify-center flex-shrink-0">
          {project.kind === "workflow-source" ? (
            <Layers className="h-4 w-4 text-[#030213]/60" />
          ) : (
            <MessageSquare className="h-4 w-4 text-[#030213]/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.kind === "workflow-source" ? "框架真源 · 点击看状态详情" : "公告板（coordination）· 点击进需求池"}
          </p>
          {project.kindSummary && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
              {project.kindSummary}
            </p>
          )}
          {project.nextStep && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{project.nextStep}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── 子项目卡片（生态根目录视图底部） ─────────────────────────────────────

function SubProjectCard({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-white rounded-xl border border-border p-4 hover:border-[#030213]/20 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{project.id}</p>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs px-1.5 py-0.5 rounded bg-[#030213]/5 text-[#030213]/50 border border-[#030213]/10 uppercase tracking-wide">
          {project.kind === "workboard" ? "工具" : "业务"}
        </span>
      </div>
    </button>
  );
}

// ─── 子项目视图（5 角色卡片） ────────────────────────────────────────────

function SubProjectView({
  project,
  onBack,
  onSessionClick,
}: {
  project: Project;
  onBack: () => void;
  onSessionClick: (sessionId: string) => void;
}) {
  const { data: sessionData, loading: sessionsLoading, error: sessionsError } = useSessionList({ projectId: project.id, limit: 200 });
  const [drawerRole, setDrawerRole] = useState<string | null>(null);

  // M-1 归类：按 resolved_role 分组（1:N），组内按最近活动倒序
  const sessionsByRole = useMemo(() => {
    const m = new Map<string, ClaudeSession[]>();
    for (const s of sessionData?.items ?? []) {
      const role = s.resolved_role ?? "General";
      if (!m.has(role)) m.set(role, []);
      m.get(role)!.push(s);
    }
    for (const list of m.values()) {
      list.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
    }
    return m;
  }, [sessionData]);

  // 时间轴「查看对话」兼容：角色 → 当前会话（该角色最新一条）
  const mappingsByRole = useMemo(() => {
    const m = new Map<string, { sessionId: string; note?: string | null; sessionTitle?: string | null; lastMessageAt?: string | null }>();
    for (const [role, list] of sessionsByRole) {
      const latest = list[0];
      if (latest) m.set(role, { sessionId: latest.id, sessionTitle: latest.title, lastMessageAt: latest.last_message_at });
    }
    return m;
  }, [sessionsByRole]);

  return (
    <div className="space-y-5">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          生态根
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* 双层时间轴：迭代总览轴 + 阶段门禁详情 */}
      <IterationTimeline
        project={project}
        mappingsByRole={mappingsByRole}
        onSessionClick={onSessionClick}
      />

      {/* 5 个角色入口卡片（点击开对话抽屉） */}
      <div>
        <SectionLabel>角色会话（{sessionData?.total ?? 0} 个会话按角色归类）</SectionLabel>
        {sessionsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-600">会话加载失败：{sessionsError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <RoleCard
                key={r.id}
                role={r}
                sessions={sessionsByRole.get(r.id) ?? []}
                loading={sessionsLoading}
                onOpen={() => setDrawerRole(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 第二级：对话抽屉（左角色菜单 + 当前/历史 + 正文 + 打标签） */}
      {drawerRole && (
        <ConversationDrawer
          project={project}
          sessionsByRole={sessionsByRole}
          initialRole={drawerRole}
          onClose={() => setDrawerRole(null)}
        />
      )}
    </div>
  );
}

// ─── 双层时间轴：迭代总览轴 + 阶段门禁详情 ──────────────────────────────────

// 阶段 id（后端 iteration-record 解析器归一化后的 key）→ 责任角色，用于阶段钻取对话（US-14）
const STAGE_ROLE_MAP: Record<string, string> = {
  prd: "PM",
  prd_review: "PM",
  ui_design: "PM",
  design: "Architect",
  implementation: "Developer",
  testing: "Developer",
  deploy_check: "DevOps",
  iteration_close: "PM",
};

const VERSION_STATUS_STYLE: Record<TimelineVersionStatus, { dot: string; label: string }> = {
  in_progress: { dot: "bg-blue-500", label: "进行中" },
  completed: { dot: "bg-emerald-500", label: "已完成" },
  archived: { dot: "bg-gray-400", label: "已归档" },
  not_started: { dot: "bg-gray-300", label: "未开始" },
  planned: { dot: "bg-gray-300", label: "规划中" },
  paused: { dot: "bg-amber-400", label: "已暂停" },
  blocked: { dot: "bg-red-500", label: "阻塞" },
  unknown: { dot: "bg-gray-300", label: "未知" },
};

const STAGE_STATUS_STYLE: Record<TimelineStageStatus, { className: string; label: string }> = {
  finalized: { className: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "已定稿" },
  completed: { className: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "已完成" },
  in_review: { className: "bg-blue-50 text-blue-700 border border-blue-200", label: "Review 中" },
  in_progress: { className: "bg-blue-50 text-blue-700 border border-blue-200", label: "进行中" },
  not_started: { className: "bg-gray-100 text-gray-500 border border-gray-200", label: "未开始" },
  skipped: { className: "bg-gray-100 text-gray-500 border border-gray-200", label: "已跳过" },
  blocked: { className: "bg-red-50 text-red-600 border border-red-200", label: "阻塞" },
  unknown: { className: "bg-gray-100 text-gray-500 border border-gray-200", label: "未知" },
};

function IterationTimeline({
  project,
  mappingsByRole,
  onSessionClick,
}: {
  project: Project;
  mappingsByRole: Map<string, { sessionId: string; note?: string | null; sessionTitle?: string | null; lastMessageAt?: string | null }>;
  onSessionClick: (sessionId: string) => void;
}) {
  const { data: versionsData, loading: versionsLoading, error: versionsError } = useTimelineVersions(project.id);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const versions = versionsData?.versions ?? [];

  // 默认选中进行中的版本；没有则选最后一个（通常是最新版本）
  useEffect(() => {
    if (selectedVersion || versions.length === 0) return;
    const inProgress = versions.find((v) => v.status === "in_progress");
    setSelectedVersion(inProgress?.version ?? versions[versions.length - 1].version);
  }, [versions, selectedVersion]);

  if (versionsLoading && versions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-5 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        加载迭代时间轴...
      </div>
    );
  }

  if (versionsError || versions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-border p-5 text-center">
        <p className="text-xs text-muted-foreground">
          {versionsError ? `迭代时间轴加载失败：${versionsError}` : "该项目暂无迭代记录（未找到版本列表）"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">迭代时间轴</p>
      </div>

      {/* 第一层：版本总览轴 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {versions.map((v, i) => {
          const style = VERSION_STATUS_STYLE[v.status] ?? VERSION_STATUS_STYLE.unknown;
          const isSelected = v.version === selectedVersion;
          return (
            <div key={v.version} className="flex items-center flex-shrink-0">
              {i > 0 && <div className="h-px w-4 bg-border flex-shrink-0" />}
              <button
                onClick={() => setSelectedVersion(v.version)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                  isSelected ? "bg-[#030213] text-white" : "bg-[#f6f7f9] text-foreground hover:bg-accent"
                }`}
                title={`${v.version}${v.title ? " · " + v.title : ""} · ${style.label}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : style.dot}`} />
                {v.version}
              </button>
            </div>
          );
        })}
      </div>

      {/* 第二层：选中版本的阶段门禁详情 */}
      {selectedVersion && (
        <StageDrawer
          project={project}
          version={selectedVersion}
          mappingsByRole={mappingsByRole}
          onSessionClick={onSessionClick}
        />
      )}
    </div>
  );
}

// ─── 阶段门禁详情（时间轴第二层） ───────────────────────────────────────────

function StageDrawer({
  project,
  version,
  mappingsByRole,
  onSessionClick,
}: {
  project: Project;
  version: string;
  mappingsByRole: Map<string, { sessionId: string; note?: string | null; sessionTitle?: string | null; lastMessageAt?: string | null }>;
  onSessionClick: (sessionId: string) => void;
}) {
  const { data, loading, error } = useTimelineDetail(project.id, version);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        加载 {version} 阶段详情...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-xs text-red-600">{version} 阶段详情加载失败：{error}</p>
      </div>
    );
  }

  const stages = data?.stages ?? [];
  if (stages.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-1 py-1">{version} 暂无阶段门禁记录</p>
    );
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      {data?.summary && (
        <p className="text-xs text-muted-foreground px-1">
          {data.summary.completedCount}/{data.summary.totalStages} 阶段已完成
          {data.summary.blockedStage && <span className="text-red-600">（阻塞于「{data.summary.blockedStage}」）</span>}
        </p>
      )}
      {stages.map((s) => (
        <StageRow key={s.id} stage={s} mappingsByRole={mappingsByRole} onSessionClick={onSessionClick} />
      ))}
    </div>
  );
}

function StageRow({
  stage,
  mappingsByRole,
  onSessionClick,
}: {
  stage: TimelineStage;
  mappingsByRole: Map<string, { sessionId: string; note?: string | null; sessionTitle?: string | null; lastMessageAt?: string | null }>;
  onSessionClick: (sessionId: string) => void;
}) {
  const statusStyle = STAGE_STATUS_STYLE[stage.status] ?? STAGE_STATUS_STYLE.unknown;
  const roleId = STAGE_ROLE_MAP[stage.id];
  const mapping = roleId ? mappingsByRole.get(roleId) : undefined;
  // 非标准阶段（附加记录）：不显示状态徽章，用灰色「附加记录」标签区分（Owner 拍板）
  const isExtra = stage.standard === false;

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 ${isExtra ? "opacity-75" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${isExtra ? "text-muted-foreground" : "text-foreground"}`}>{stage.name}</span>
          {isExtra ? (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">附加记录</span>
          ) : (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusStyle.className}`}>{statusStyle.label}</span>
          )}
          {!isExtra && roleId && <span className="text-xs font-mono text-muted-foreground/70">{roleId}</span>}
        </div>
        {stage.summary && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{stage.summary}</p>
        )}
      </div>
      {mapping?.sessionId && (
        <button
          onClick={() => onSessionClick(mapping.sessionId)}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <MessagesSquare className="h-3 w-3" />
          查看对话
        </button>
      )}
    </div>
  );
}

// ─── 角色卡片 ─────────────────────────────────────────────────────────────

function RoleCard({
  role,
  sessions,
  loading,
  onOpen,
}: {
  role: typeof ROLES[number];
  sessions: ClaudeSession[];
  loading: boolean;
  onOpen: () => void;
}) {
  const latest = sessions[0] ?? null;

  return (
    <div className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#030213]/5 flex items-center justify-center flex-shrink-0">
            <role.icon className="h-4 w-4 text-[#030213]/70" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{role.zhLabel}</p>
            <p className="text-xs font-mono text-muted-foreground">{role.label}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          sessions.length > 0
            ? "bg-[#030213]/5 text-[#030213]/70 border border-[#030213]/10"
            : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}>
          {loading ? "…" : `${sessions.length} 个会话`}
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{role.desc}</p>

      {latest && (
        <div className="rounded-lg bg-[#f6f7f9] border border-border/60 p-2.5">
          <p className="text-xs text-foreground truncate font-medium">{latest.title || "（无标题）"}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>最近活动 {relTime(latest.last_message_at)}</span>
            {latest.iteration_label && <IterationBadge label={latest.iteration_label} />}
            <SourceBadge source={latest.source} />
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          onClick={onOpen}
          className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#030213] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          查看对话
        </button>
      </div>
    </div>
  );
}

// ─── 徽章：迭代标签（US-5，恒标注推断）与来源标签（US-12） ─────────────────

function IterationBadge({ label, full }: { label: string | null | undefined; full?: boolean }) {
  if (!label) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
        {full ? "迭代未归属" : "未归属"}
      </span>
    );
  }
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
      title="按项目 INDEX 的 git 历史区间推断，尽力而为"
    >
      {full ? `所属迭代 ${label} · 推断` : label}
    </span>
  );
}

function SourceBadge({ source }: { source: string | null | undefined }) {
  const isCodex = source === "codex";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
      isCodex ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-[#030213]/5 text-[#030213]/60 border-[#030213]/10"
    }`}>
      {isCodex ? "Codex" : "Claude"}
    </span>
  );
}

// ─── 对话抽屉（A 组核心：左角色菜单 + 当前/历史 + 打标签 + 正文） ──────────

function ConversationDrawer({
  project,
  sessionsByRole,
  initialRole,
  onClose,
}: {
  project: Project;
  sessionsByRole: Map<string, ClaudeSession[]>;
  initialRole: string;
  onClose: () => void;
}) {
  const [activeRole, setActiveRole] = useState(initialRole);
  // US-11：当前会话为前端临时 state（选择即当前；刷新/切项目丢失回落默认最新）
  const [currentByRole, setCurrentByRole] = useState<Record<string, string>>({});
  const [dragOverRole, setDragOverRole] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  // 拖拽进行中：撤掉下拉的「点击外部关闭」透明层，否则它挡住左侧角色菜单接收 drop
  const [dragging, setDragging] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const roleSessions = sessionsByRole.get(activeRole) ?? [];
  const chosenId = currentByRole[activeRole];
  const currentSession = roleSessions.find((s) => s.id === chosenId) ?? roleSessions[0] ?? null;
  const historySessions = roleSessions.filter((s) => s.id !== currentSession?.id);

  const { data: detail, loading: detailLoading, error: detailError } = useSessionDetail(currentSession?.id ?? null);

  const handleTag = async (sessionId: string, role: string) => {
    setMenuFor(null);
    setTagError(null);
    try {
      await setSessionRole(sessionId, role); // 成功后广播事件，父级会话列表自动刷新
    } catch (e) {
      setTagError(String((e as Error)?.message ?? e));
    }
  };

  // 会话行（当前 + 历史共用）：标题 / 时间 / 迭代标签 / 来源标签 + ⌄改角色菜单；可拖拽
  const SessionRow = ({ s, isCurrent }: { s: ClaudeSession; isCurrent: boolean }) => (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/session-id", s.id); setDragging(true); }}
      onDragEnd={() => setDragging(false)}
      onClick={() => setCurrentByRole((m) => ({ ...m, [activeRole]: s.id }))}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isCurrent ? "bg-[#030213]/5 border border-[#030213]/15" : "hover:bg-accent/40 border border-transparent"
      }`}
    >
      {isCurrent && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#030213] text-white flex-shrink-0">当前</span>
      )}
      <span className="text-sm text-foreground truncate flex-1 min-w-0">{s.title || "（无标题）"}</span>
      <span className="text-xs text-muted-foreground flex-shrink-0">{relTime(s.last_message_at)}</span>
      <IterationBadge label={s.iteration_label} />
      <SourceBadge source={s.source} />
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === s.id ? null : s.id); }}
          className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
          title="标记为其他角色"
        >
          <Tag className="h-3.5 w-3.5" />
        </button>
        {menuFor === s.id && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg py-1 w-36">
            <p className="px-3 py-1 text-[10px] text-muted-foreground">标记为角色</p>
            {ROLES.filter((r) => r.id !== activeRole).map((r) => (
              <button
                key={r.id}
                onClick={(e) => { e.stopPropagation(); handleTag(s.id, r.id); }}
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                {r.zhLabel}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const generalPool = activeRole !== "General" ? (sessionsByRole.get("General") ?? []) : [];

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* 右侧抽屉面板（~72%） */}
      <div className="absolute top-0 right-0 h-full w-[72%] min-w-[640px] max-w-full bg-white border-l border-border shadow-xl flex">
        {/* 左：角色菜单（切角色 + 拖拽放置目标） */}
        <div className="w-52 flex-shrink-0 border-r border-border bg-[#fafbfc] flex flex-col">
          <div className="px-4 py-3.5 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">角色会话</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
            {ROLES.map((r) => {
              const count = (sessionsByRole.get(r.id) ?? []).length;
              const isActive = r.id === activeRole;
              const isDragOver = dragOverRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => { setActiveRole(r.id); setHistoryOpen(false); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverRole(r.id); }}
                  onDragLeave={() => setDragOverRole(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverRole(null);
                    setDragging(false);
                    setHistoryOpen(false);
                    const id = e.dataTransfer.getData("text/session-id");
                    if (id) handleTag(id, r.id);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-[#030213] text-white"
                      : isDragOver
                        ? "bg-[#030213]/10 text-foreground ring-1 ring-[#030213]/30"
                        : "text-foreground hover:bg-accent"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <r.icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-[#030213]/60"}`} />
                    <span className="truncate">{r.zhLabel}</span>
                  </span>
                  <span className={`text-xs font-mono flex-shrink-0 ${isActive ? "text-white/70" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed">拖会话到角色改归属，或用会话行的 🏷 菜单</p>
          </div>
        </div>

        {/* 右：内容区 */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#f3f5f8]">
          {/* 顶栏 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white flex-shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentSession ? (currentSession.title || "（无标题）") : roleLabel(activeRole)}
                </p>
                {currentSession && (
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <IterationBadge label={currentSession.iteration_label} full />
                    <SourceBadge source={currentSession.source} />
                  </span>
                )}
              </div>
              {currentSession && (
                <p className="text-xs text-muted-foreground">
                  {project.name} · {currentSession.message_count} 条消息
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {tagError && (
            <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-600">改归属失败：{tagError}</p>
            </div>
          )}

          {roleSessions.length === 0 ? (
            /* US-3 空态：该角色暂无归属会话 */
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-xl mx-auto mt-8 text-center space-y-3">
                <div className="h-12 w-12 mx-auto rounded-xl bg-[#030213]/5 flex items-center justify-center">
                  {(() => { const R = ROLES.find((r) => r.id === activeRole); return R ? <R.icon className="h-5 w-5 text-[#030213]/50" /> : null; })()}
                </div>
                <p className="text-sm text-foreground">「{roleLabel(activeRole)}」还没有归属会话</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  识别错的会话可以拖到左侧角色菜单改归属，或用会话行的 🏷 菜单标记
                </p>
              </div>
              {generalPool.length > 0 && (
                <div className="max-w-xl mx-auto mt-6">
                  <p className="text-xs font-medium text-muted-foreground mb-2">从通用助手（General）会话中挑选打标：</p>
                  <div className="space-y-1 bg-white rounded-xl border border-border p-2">
                    {generalPool.slice(0, 8).map((s) => (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("text/session-id", s.id); setDragging(true); }}
                        onDragEnd={() => setDragging(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/40 cursor-grab"
                      >
                        <span className="text-sm text-foreground truncate flex-1 min-w-0">{s.title || "（无标题）"}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{relTime(s.last_message_at)}</span>
                        <button
                          onClick={() => handleTag(s.id, activeRole)}
                          className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-[#030213] text-white rounded hover:opacity-90 transition-opacity"
                        >
                          标为{roleLabel(activeRole)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 当前会话 + 历史下拉框（原型图定稿形态：悬浮下拉，不平铺占位） */}
              <div className="px-5 py-3 border-b border-border bg-white/60 flex-shrink-0 space-y-1">
                {currentSession && <SessionRow s={currentSession} isCurrent />}
                {historySessions.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setHistoryOpen((v) => !v)}
                      className="w-full flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                    >
                      <span>历史会话（{historySessions.length}）· 可回溯，选中即成为当前</span>
                      <ChevronRight className={`h-3 w-3 transition-transform ${historyOpen ? "-rotate-90" : "rotate-90"}`} />
                    </button>
                    {historyOpen && (
                      <>
                        {/* 点击外部关闭（拖拽中撤掉，让角色菜单能接收 drop） */}
                        {!dragging && <div className="fixed inset-0 z-20" onClick={() => setHistoryOpen(false)} />}
                        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto p-1 space-y-0.5">
                          {historySessions.map((s) => (
                            <div key={s.id} onClick={() => setHistoryOpen(false)}>
                              <SessionRow s={s} isCurrent={false} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 对话正文 */}
              <div className="flex-1 overflow-y-auto px-0 sm:px-5 py-0 sm:py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="min-h-full bg-[#f8fafc] border-x sm:border border-[#d4dce7] sm:rounded-lg shadow-sm">
                  {detailLoading ? (
                    <div className="p-5 space-y-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 w-20 bg-[#030213]/[0.08] rounded animate-pulse" />
                          <div className="h-16 bg-white border border-border/70 rounded-lg animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : detailError ? (
                    <div className="p-5">
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-xs text-red-600">{detailError}</p>
                      </div>
                    </div>
                  ) : detail?.messages ? (
                    <MessageList messages={detail.messages} />
                  ) : null}
                </div>
              </div>

              {/* 底部只读提示 */}
              <div className="px-5 py-2.5 border-t border-border bg-white flex-shrink-0">
                <p className="text-xs text-muted-foreground text-center">只读模式 · v0.4+ 将支持直接在此输入消息</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 对话视图（单会话查看：时间轴/看板钻取入口，右侧抽屉容器） ─────────────

export function ConversationView({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data, loading, error } = useSessionDetail(sessionId);

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* 右侧抽屉面板（~72%） */}
      <div className="absolute top-0 right-0 h-full w-[72%] min-w-[640px] max-w-full bg-[#f3f5f8] border-l border-border shadow-xl flex flex-col">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white shadow-sm flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {data?.session.title ?? "加载中..."}
              </p>
              {data?.session && <SourceBadge source={data.session.source} />}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.session.project_name} · {data?.session.message_count ?? 0} 条消息
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 对话区 */}
        <div className="flex-1 overflow-y-auto bg-[#e3e9f0] px-0 sm:px-6 py-0 sm:py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="min-h-full max-w-5xl mx-auto bg-[#f8fafc] border-x sm:border border-[#d4dce7] sm:rounded-lg shadow-sm">
            {loading ? (
              <div className="p-5 space-y-4 max-w-4xl mx-auto">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-[#030213]/[0.08] rounded animate-pulse" />
                    <div className="h-16 bg-white border border-border/70 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-5">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              </div>
            ) : data?.messages ? (
              <MessageList messages={data.messages} />
            ) : null}
          </div>
        </div>

        {/* 底部只读提示 */}
        <div className="px-5 py-3 border-t border-border bg-white flex-shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            只读模式 · v0.4+ 将支持直接在此输入消息
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 消息列表 ─────────────────────────────────────────────────────────────

function MessageList({ messages }: { messages: ClaudeMessage[] }) {
  // 过滤掉纯工具调用消息（content 为空且 has_tool_use=1）和纯思考消息
  const visibleMessages = messages.filter((m) => {
    const hasText = m.content && m.content.trim();
    return hasText;
  });

  if (visibleMessages.length === 0) {
    return (
      <div className="p-5 text-center text-sm text-muted-foreground">
        无可见消息（会话可能全是工具调用）
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">
      {visibleMessages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ClaudeMessage }) {
  const isUser = msg.role === "user";
  const content = msg.content?.trim() || "";
  // 纯工具调用消息：content 以 [工具调用 开头
  const isToolOnly = content.startsWith("[工具调用");

  const renderContent = () => {
    if (content) return content;
    if (msg.has_thinking) return "[思考中...]";
    return "(空消息)";
  };

  if (isToolOnly) {
    // 工具调用消息：单行紧凑样式，灰色等宽字体
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] items-start flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              TOOL
            </span>
            <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString("zh-CN")}</span>
          </div>
          <div className="rounded-lg px-3 py-2 text-xs leading-relaxed font-mono whitespace-pre-wrap break-all bg-white text-purple-900 border border-purple-100 shadow-sm">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
            isUser ? "bg-blue-100 text-blue-700" : "bg-[#030213] text-white"
          }`}>
            {isUser ? "USER" : "ASSISTANT"}
          </span>
          <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString("zh-CN")}</span>
        </div>
        {/* US-1：AI 回复按 Markdown 渲染；用户消息保持原文换行 */}
        <div className={`rounded-lg px-4 py-2.5 text-sm break-words shadow-sm ${
          isUser ? "bg-blue-50 text-blue-900 border border-blue-100 leading-relaxed whitespace-pre-wrap" : "bg-white text-foreground border border-border/70"
        }`}>
          {isUser ? renderContent() : <MarkdownContent text={renderContent()} />}
        </div>
      </div>
    </div>
  );
}
