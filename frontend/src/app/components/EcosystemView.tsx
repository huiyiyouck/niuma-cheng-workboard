import { useState, useMemo, useEffect } from "react";
import {
  useSessionList,
  useSessionDetail,
  useMappingList,
  useTimelineVersions,
  useTimelineDetail,
  saveMapping,
  deleteMapping,
  triggerSync,
  apiFetch,
} from "../useProjectSession";
import type { ClaudeSession, ClaudeMessage, Project, SessionPreviewMessage, TimelineStage, TimelineStageStatus, TimelineVersionStatus } from "../snapshot";
import {
  MessageSquare,
  RefreshCw,
  Search,
  ChevronRight,
  CheckCircle2,
  Circle,
  X,
  AlertCircle,
  Tag,
  ArrowLeft,
  Settings,
  Layers,
  Flag,
  Bot,
  User,
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
  onRefreshMappings: () => void;
  mappingsVersion: number;
}

export function EcosystemView({ projects, onSessionClick, onRefreshMappings, mappingsVersion }: EcosystemViewProps) {
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
        mappingsVersion={mappingsVersion}
        onRefreshMappings={onRefreshMappings}
      />
    );
  }

  return (
    <EcosystemRootView
      projects={projects}
      onSubProjectClick={(id) => setView({ kind: "subproject", projectId: id })}
      onSessionClick={onSessionClick}
      mappingsVersion={mappingsVersion}
    />
  );
}

// ─── 生态根目录视图 ──────────────────────────────────────────────────────

function EcosystemRootView({
  projects,
  onSubProjectClick,
  onSessionClick,
  mappingsVersion,
}: {
  projects: Project[];
  onSubProjectClick: (id: string) => void;
  onSessionClick: (sessionId: string) => void;
  mappingsVersion: number;
}) {
  // 按 kind 拆分
  const rootComponents = projects.filter((p) => p.kind === "workflow-source" || p.kind === "coordination");
  const subProjects = projects.filter((p) => p.kind === "business" || p.kind === "workboard");

  // 拉所有映射，按 project_id 分组
  const { data: mappingsData } = useMappingList();
  const mappingsByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of mappingsData?.items ?? []) {
      m.set(it.project_id, (m.get(it.project_id) ?? 0) + 1);
    }
    return m;
  }, [mappingsData, mappingsVersion]);

  return (
    <div className="space-y-6">
      {/* 顶部：同步状态与手动刷新 */}
      <SyncBar />

      {/* 顶部：参谋长席位 */}
      <ChiefOfStaffCard onSessionClick={onSessionClick} />

      {/* 中部：生态根维护的组成部分（只读） */}
      <div>
        <SectionLabel>生态根维护的组成部分（只读）</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rootComponents.map((p) => (
            <ReadOnlyRootCard key={p.id} project={p} />
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
              mappedCount={mappingsByProject.get(p.id) ?? 0}
              totalRoles={ROLES.length}
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
      const changed = r.results.filter((x) => x.status !== "unchanged" && x.status !== "error").length;
      setLastResult(`已同步 ${r.projectCount} 个项目目录，${changed} 个会话有更新 · ${new Date(r.syncedAt).toLocaleTimeString("zh-CN")}`);
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
          <p className="text-xs text-muted-foreground">Claude Code 会话每次服务启动自动同步一次；需要最新数据时可手动刷新</p>
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
  const [showDialog, setShowDialog] = useState(false);
  const { data: mappingData, refetch } = useMappingList("ecosystem-root");
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const mapping = mappingData?.items?.find((m) => m.role === "chief-of-staff");

  // 映射变化时，拉取会话详情显示标题
  useEffect(() => {
    if (!mapping?.session_id) {
      setSessionTitle(null);
      setLastMessageAt(null);
      setSessionId(null);
      return;
    }
    setSessionId(mapping.session_id);
    apiFetch<{ session: ClaudeSession }>(`/api/sessions/details?id=${mapping.session_id}`)
      .then((r) => {
        setSessionTitle(r.session?.title || "(无标题)");
        setLastMessageAt(r.session?.last_message_at || null);
      })
      .catch(() => {
        setSessionTitle("(会话已删除)");
        setLastMessageAt(null);
      });
  }, [mapping?.session_id]);

  const mapped = !!sessionId;

  return (
    <div className="bg-white rounded-xl border border-[#030213]/15 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-[#030213] flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">参谋长席位</p>
            <p className="text-xs text-muted-foreground mt-0.5">niuma-cheng 生态根会话</p>
            {mapped ? (
              <div className="mt-2 space-y-0.5">
                <p className="text-sm text-foreground truncate">{sessionTitle}</p>
                <p className="text-xs text-muted-foreground">最近活动 {relTime(lastMessageAt)}</p>
              </div>
            ) : (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                  <Circle className="h-2.5 w-2.5" /> 未选择
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {mapped && sessionId && (
            <button
              onClick={() => onSessionClick?.(sessionId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#030213] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              查看对话
            </button>
          )}
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {mapped ? "重新配置" : "配置"}
          </button>
        </div>
      </div>

      {showDialog && (
        <ChiefOfStaffDialog
          existingMapping={mapping ? { sessionId: mapping.session_id, note: mapping.note } : undefined}
          onClose={() => setShowDialog(false)}
          onSaved={() => { refetch(); setShowDialog(false); }}
        />
      )}
    </div>
  );
}

// ─── 参谋长席位配置弹窗（单步） ──────────────────────────────────────────

function ChiefOfStaffDialog({
  existingMapping,
  onClose,
  onSaved,
}: {
  existingMapping?: { sessionId: string; note?: string | null };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: sessionData, loading, error: sessionError } = useSessionList({ projectId: "ecosystem-root", limit: 100 });
  const [selected, setSelected] = useState<string>(existingMapping?.sessionId ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setErr(null);
    try {
      await saveMapping({
        session_id: selected,
        project_id: "ecosystem-root",
        role: "chief-of-staff",
        note: existingMapping?.note || undefined,
      });
      onSaved();
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell title="配置参谋长席位" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">映射目标：</span>
          <span className="px-2 py-1 bg-gray-50 border border-border rounded text-foreground font-medium">
            niuma-cheng 生态
          </span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          <span className="px-2 py-1 bg-gray-50 border border-border rounded text-foreground font-medium">
            参谋长
          </span>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">选择会话</label>
          <SessionSelect
            sessions={sessionData?.items ?? []}
            loading={loading}
            loadError={sessionError}
            value={selected}
            onChange={setSelected}
          />
        </div>

        {err && <div className="text-xs text-red-600">{err}</div>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="px-4 py-1.5 text-sm font-medium bg-[#030213] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "确认配置"}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── 生态根只读卡片（框架真源 / 公告板） ──────────────────────────────────

function ReadOnlyRootCard({ project }: { project: Project }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 opacity-90">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#030213]/5 flex items-center justify-center flex-shrink-0">
          {project.kind === "workflow-source" ? (
            <Layers className="h-4 w-4 text-[#030213]/60" />
          ) : (
            <MessageSquare className="h-4 w-4 text-[#030213]/60" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.kind === "workflow-source" ? "框架真源" : "公告板（coordination）"}
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
    </div>
  );
}

// ─── 子项目卡片（生态根目录视图底部） ─────────────────────────────────────

function SubProjectCard({
  project,
  mappedCount,
  totalRoles,
  onClick,
}: {
  project: Project;
  mappedCount: number;
  totalRoles: number;
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
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          mappedCount > 0
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}>
          {mappedCount}/{totalRoles} 已映射
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
  mappingsVersion,
  onRefreshMappings,
}: {
  project: Project;
  onBack: () => void;
  onSessionClick: (sessionId: string) => void;
  mappingsVersion: number;
  onRefreshMappings: () => void;
}) {
  const { data: mappingsData, refetch } = useMappingList(project.id);
  useEffect(() => { refetch(); }, [mappingsVersion, refetch]);

  const mappingsByRole = useMemo(() => {
    const m = new Map<string, { sessionId: string; note?: string | null; sessionTitle?: string | null; lastMessageAt?: string | null }>();
    for (const it of mappingsData?.items ?? []) {
      m.set(it.role, {
        sessionId: it.session_id,
        note: it.note,
        sessionTitle: it.session_title,
        lastMessageAt: it.last_message_at,
      });
    }
    return m;
  }, [mappingsData]);

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

      {/* 5 个角色卡片 */}
      <div>
        <SectionLabel>角色映射（{mappingsByRole.size}/{ROLES.length} 已映射）</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {ROLES.map((r) => {
            const mapping = mappingsByRole.get(r.id);
            return (
              <RoleCard
                key={r.id}
                role={r}
                project={project}
                mapping={mapping}
                onSessionClick={onSessionClick}
                onMapped={onRefreshMappings}
              />
            );
          })}
        </div>
      </div>
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
  project,
  mapping,
  onSessionClick,
  onMapped,
}: {
  role: typeof ROLES[number];
  project: Project;
  mapping?: { sessionId: string; note?: string | null; sessionTitle?: string | null; lastMessageAt?: string | null };
  onSessionClick: (sessionId: string) => void;
  onMapped: () => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const isMapped = !!mapping;

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
        {isMapped ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> 已映射
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            <Circle className="h-2.5 w-2.5" /> 未选择
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{role.desc}</p>

      {isMapped && (
        <div className="rounded-lg bg-[#f6f7f9] border border-border/60 p-2.5">
          <p className="text-xs text-foreground truncate font-medium">
            {mapping?.sessionTitle ?? "（无标题）"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            最近活动 {relTime(mapping?.lastMessageAt ?? null)}
          </p>
          {mapping?.note && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{mapping.note}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        {isMapped ? (
          <>
            <button
              onClick={() => mapping?.sessionId && onSessionClick(mapping.sessionId)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#030213] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              查看对话
            </button>
            <button
              onClick={() => setShowDialog(true)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-border rounded-lg hover:bg-accent transition-colors"
            >
              重新配置
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowDialog(true)}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-white border border-border rounded-lg hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            配置映射
          </button>
        )}
      </div>

      {showDialog && (
        <MappingDialog
          project={project}
          defaultRole={role.id}
          existingMapping={mapping ? { sessionId: mapping.sessionId, note: mapping.note } : undefined}
          onClose={() => setShowDialog(false)}
          onSaved={() => {
            setShowDialog(false);
            onMapped();
          }}
        />
      )}
    </div>
  );
}

// ─── 角色映射配置弹窗（单步：项目+角色已由点击上下文确定） ───────────────

function MappingDialog({
  project,
  defaultRole,
  existingMapping,
  onClose,
  onSaved,
}: {
  project: Project;
  defaultRole: string;
  existingMapping?: { sessionId: string; note?: string | null };
  onClose: () => void;
  onSaved: () => void;
}) {
  // 项目和角色由调用上下文确定，弹窗内不再让用户选
  const [selectedSessionId, setSelectedSessionId] = useState(existingMapping?.sessionId ?? "");
  const [note, setNote] = useState(existingMapping?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const role = ROLES.find((r) => r.id === defaultRole);
  const { data: sessionData, loading: sessionLoading, error: sessionError } = useSessionList({ projectId: project.id, limit: 100 });

  const handleSave = async () => {
    if (!selectedSessionId) return;
    setSaving(true);
    setErr(null);
    try {
      await saveMapping({
        session_id: selectedSessionId,
        project_id: project.id,
        role: defaultRole,
        note: note || undefined,
      });
      onSaved();
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell title="配置角色映射" onClose={onClose}>
      <div className="space-y-4">
        {/* 顶部一行紧凑 badge：项目 + 角色（都由点击上下文确定，只读） */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">映射目标：</span>
          <span className="px-2 py-1 bg-gray-50 border border-border rounded text-foreground font-medium max-w-[50%] truncate">
            {project.name}
          </span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
          <span className="px-2 py-1 bg-gray-50 border border-border rounded text-foreground font-medium flex-shrink-0">
            {role?.zhLabel ?? defaultRole}
          </span>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">选择会话</label>
          <SessionSelect
            sessions={sessionData?.items ?? []}
            loading={sessionLoading}
            loadError={sessionError}
            value={selectedSessionId}
            onChange={setSelectedSessionId}
            highlightRole={defaultRole}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">备注（可选）</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="这个会话做了什么..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-[#030213]/30 resize-none"
          />
        </div>

        {err && <div className="text-xs text-red-600">{err}</div>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedSessionId || saving}
            className="px-4 py-1.5 text-sm font-medium bg-[#030213] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "确认配置"}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ─── 会话下拉选择 ─────────────────────────────────────────────────────────

function SessionSelect({
  sessions,
  loading,
  loadError,
  value,
  onChange,
  highlightRole,
}: {
  sessions: ClaudeSession[];
  loading: boolean;
  loadError?: string | null;
  value: string;
  onChange: (v: string) => void;
  highlightRole?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // 附加后端同步时识别的角色（前置处理，Unknown 不展示标签）
  const sessionsWithRole = useMemo(() => {
    return sessions.map((s) => ({
      ...s,
      inferredRole: s.detected_role && s.detected_role !== "Unknown" ? s.detected_role : null,
    }));
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessionsWithRole;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.title?.toLowerCase().includes(q) || s.project_name?.toLowerCase().includes(q)
      );
    }
    // 排序：当前选择角色匹配的会话优先；其次按最近活动时间倒序
    if (highlightRole) {
      list = [...list].sort((a, b) => {
        const aMatch = a.inferredRole === highlightRole ? 0 : 1;
        const bMatch = b.inferredRole === highlightRole ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
      });
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
      );
    }
    return list;
  }, [sessionsWithRole, search, highlightRole]);

  const selected = sessions.find((s) => s.id === value);
  const matchCount = highlightRole
    ? sessionsWithRole.filter((s) => s.inferredRole === highlightRole).length
    : 0;

  return (
    <div className="space-y-2">
      {/* 当前选择/触发器 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 text-sm bg-white border border-border rounded-lg flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <span className={selected ? "text-foreground truncate" : "text-muted-foreground"}>
          {selected ? selected.title : loading ? "加载中..." : "请选择会话"}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {/* 内联展开列表（占位高度，避免双重滚动） */}
      {open && (
        <div className="bg-white border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索标题/项目..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-[#f6f7f9] border border-border rounded focus:outline-none focus:border-[#030213]/30"
                autoFocus
              />
            </div>
            {highlightRole && (
              <p className="text-[11px] text-muted-foreground mt-1.5 px-0.5">
                推断匹配 <span className="font-medium text-foreground">{roleLabel(highlightRole)}</span> 的会话已置顶
                {matchCount > 0 && <span>（共 {matchCount} 个）</span>}
              </p>
            )}
          </div>
          <div className="overflow-y-auto max-h-[300px]">
            {loadError ? (
              <p className="text-xs text-red-600 px-3 py-4 text-center">
                会话数据加载失败（{loadError}）——请检查数据库连接（本地开发需 SSH 隧道在线）后重试
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                {loading ? "加载中..." : "无匹配会话"}
              </p>
            ) : (
              filtered.map((s) => {
                const isSelected = value === s.id;
                const isMatched = highlightRole && s.inferredRole === highlightRole;
                const shortId = s.id ? s.id.slice(0, 8) : "";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onChange(s.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-accent/40 transition-colors border-b border-border/30 ${
                      isSelected ? "bg-[#030213]/5" : ""
                    } ${isMatched ? "border-l-2 border-l-[#030213]" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{s.title || "（无标题）"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {s.source === "codex" && (
                            <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[10px]">Codex</span>
                          )}
                          <span>{s.project_name}</span>
                          <span>·</span>
                          <span>{s.message_count} 条</span>
                          <span>·</span>
                          <span>{relTime(s.last_message_at)}</span>
                          <span>·</span>
                          <span className="font-mono text-[10px] text-muted-foreground/70">id: {shortId}</span>
                        </p>
                        {s.last_messages && s.last_messages.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {s.last_messages.slice(0, 2).map((m, i) => (
                              <SessionPreviewRow key={i} msg={m} />
                            ))}
                          </div>
                        )}
                      </div>
                      {s.inferredRole && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${
                          isMatched
                            ? "bg-[#030213] text-white"
                            : "bg-[#030213]/5 text-[#030213]/60 border border-[#030213]/10"
                        }`}>
                          {roleLabel(s.inferredRole)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 弹窗外壳 ─────────────────────────────────────────────────────────────

function SessionPreviewRow({ msg }: { msg: SessionPreviewMessage }) {
  const isUser = msg.role === "user";
  const content = (msg.content || "").replace(/\s+/g, " ").trim();
  const truncated = content.length > 120 ? content.slice(0, 120) + "…" : content;
  if (!truncated) return null;
  return (
    <div className="flex items-start gap-1.5">
      <span className={`text-[9px] font-mono px-1 py-0.5 rounded flex-shrink-0 mt-0.5 ${
        isUser ? "bg-blue-100 text-blue-700" : "bg-[#030213] text-white"
      }`}>
        {isUser ? "U" : "A"}
      </span>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 break-words">
        {truncated}
      </p>
    </div>
  );
}

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── 对话视图（全屏对话查看器） ───────────────────────────────────────────

export function ConversationView({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data, loading, error } = useSessionDetail(sessionId);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {data?.session.title ?? "加载中..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {data?.session.project_name} · {data?.session.message_count ?? 0} 条消息
            </p>
          </div>
        </div>
      </div>

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
          <div className="p-5 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 bg-[#030213]/[0.06] rounded animate-pulse" />
                <div className="h-16 bg-[#030213]/[0.04] rounded animate-pulse" />
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

      {/* 底部只读提示 */}
      <div className="px-5 py-3 border-t border-border bg-[#f6f7f9] flex-shrink-0">
        <p className="text-xs text-muted-foreground text-center">
          只读模式 · v0.3+ 将支持直接在此输入消息
        </p>
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
          <div className="rounded-lg px-3 py-2 text-xs leading-relaxed font-mono whitespace-pre-wrap break-alls bg-purple-50/50 text-purple-900 border border-purple-100">
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
        <div className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser ? "bg-blue-50 text-blue-900" : "bg-[#f6f7f9] text-foreground border border-border/60"
        }`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
