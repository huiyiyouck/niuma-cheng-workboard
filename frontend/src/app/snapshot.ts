import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

// ─── 前端展示类型（组件消费的形状，由后端模型适配而来）────────────────────────

export type IntegrationStatus =
  | "integrated"
  | "not-bootstrapped"
  | "config-error"
  | "read-error"
  | "disabled"
  | "not-integrated";

export type ProjectKind = "business" | "workboard" | "coordination" | "workflow-source";

export interface AgentRole {
  role: string;
  recentAction: string;
  nextStep: string;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "mid" | "low";
}

export interface Project {
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

export type ReqStatus = "已提报" | "评估中" | "已承接" | "开发中" | "联调中" | "已关闭" | string;

export interface CrossProjectItem {
  id: string;
  title: string;
  sourceLabel: string;
  targetLabel: string;
  targetIteration: string;
  priority?: "P0" | "P1" | "P2";
  status: ReqStatus;
  updatedAt?: string;
}

export interface BcrItem {
  id: string;
  summary: string;
  target: string;
  status: string;
}

export interface CommItem {
  id: string;
  reqId: string;
  projects: string[];
  summary: string;
  ts?: string;
}

export interface CrossTodoItem {
  id: string;
  priority: "P0" | "P1" | "P2";
  text: string;
  project: string;
  role: string;
  status: string;
}

// ─── 后端模型（src/server 返回的 SnapshotResult，按需取字段）─────────────────

interface BackendDiagnostics {
  id: string;
  name: string;
  kind: ProjectKind;
  configPath: string;
  resolvedPath: string | null;
  parser: string | null;
  status: IntegrationStatus;
  fileChecks: { path: string; required: boolean; exists: boolean }[];
  lastReadAt: string | null;
  errors: { message: string }[];
}

interface BackendRole {
  role: string;
  recentAction: string | null;
  nextStep: string | null;
}

interface BackendTodo {
  id: string;
  priority: "P0" | "P1" | "P2" | null;
  text: string;
  projectName: string;
  role: string | null;
  status: string;
}

interface BackendSummary {
  id: string;
  iteration: string | null;
  mode: string | null;
  phase: string | null;
  blocked: string | null;
  nextStep: string | null;
  kindSummary: string | null;
  url: string | null;
  roles: BackendRole[];
  todos: BackendTodo[];
  errorSummary: string | null;
}

export interface SnapshotResult {
  generatedAt: string;
  refreshIntervalSeconds: number;
  projects: BackendSummary[];
  diagnostics: BackendDiagnostics[];
  crossProject: {
    blockerCount: number;
    requests: {
      id: string;
      title: string;
      sourceLabel: string | null;
      targetLabel: string | null;
      targetIteration: string | null;
      status: string;
    }[];
    bcrs: { id: string; summary: string; target: string | null; status: string }[];
    communications: { id: string; reqId: string | null; projects: string[]; summary: string | null }[];
  };
  todos: BackendTodo[];
  syncStatus?: SyncStatus;
}

// ─── v0.2：会话同步相关类型 ─────────────────────────────────────────────────

export interface SyncStatus {
  status: "synced" | "not_synced" | "error";
  sessionCount: number;
  messageCount: number;
  lastSyncedAt: string | null;
  error?: string;
}

export interface SessionPreviewMessage {
  role: string;
  content: string;
  created_at: string;
}

export interface ClaudeSession {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  first_message_at: string;
  last_message_at: string;
  message_count: number;
  user_message_count: number;
  assistant_message_count: number;
  jsonl_path: string;
  file_mtime: string;
  last_byte_pos: number;
  synced_at: string;
  detected_role?: string | null;
  role_confidence?: number | null;
  source?: string | null;
  manual_role?: string | null;
  resolved_role?: string;
  iteration_label?: string | null;
  iteration_inferred?: boolean;
  last_messages?: SessionPreviewMessage[] | null;
}

export interface ClaudeMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "unknown";
  content: string;
  created_at: string;
  has_tool_use: number;
  tool_name: string | null;
  has_thinking: number;
}

export interface SessionListResponse {
  items: ClaudeSession[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionDetailResponse {
  session: ClaudeSession;
  messages: ClaudeMessage[];
}

export interface SyncResult {
  syncedAt: string;
  projectCount: number;
  results: {
    projectId?: string;
    projectName?: string;
    source?: string;
    sessionId?: string;
    status: string;
    messageCount?: number;
    error?: string;
  }[];
}

// ─── v0.2：迭代时间轴相关类型 ───────────────────────────────────────────────

export type TimelineVersionStatus = "in_progress" | "completed" | "archived" | "not_started" | "planned" | "paused" | "blocked" | "unknown";

export interface TimelineVersion {
  version: string;
  title: string;
  status: TimelineVersionStatus;
  releaseDate: string | null;
}

export type TimelineStageStatus = "finalized" | "in_review" | "in_progress" | "not_started" | "blocked" | "completed" | "skipped" | "unknown";

export interface TimelineStage {
  id: string;
  name: string;
  status: TimelineStageStatus;
  standard?: boolean;
  reviewResult: string | null;
  summary: string | null;
}

export interface TimelineVersionsResponse {
  versions: TimelineVersion[];
  errors: { message: string; severity?: string }[];
}

export interface TimelineDetailResponse {
  version: string;
  stages: TimelineStage[];
  currentStage: TimelineStage | null;
  summary: {
    version: string | null;
    completedCount: number;
    totalStages: number;
    progress: number;
    isClosed: boolean;
    blockedStage: string | null;
  };
  errors: { message: string; severity?: string }[];
}

// ─── 适配：后端 SnapshotResult → 前端 ViewModel ──────────────────────────────

export interface ViewModel {
  projects: Project[]; // 全部项目（含 coordination），用于接入诊断 / 部署
  cardProjects: Project[]; // 排除 coordination，用于工作台卡片网格
  crossTodos: CrossTodoItem[];
  crossItems: CrossProjectItem[];
  bcrItems: BcrItem[];
  commItems: CommItem[];
  blockerCount: number;
  projectCount: number;
}

export const EMPTY_VIEW_MODEL: ViewModel = {
  projects: [],
  cardProjects: [],
  crossTodos: [],
  crossItems: [],
  bcrItems: [],
  commItems: [],
  blockerCount: 0,
  projectCount: 0,
};

export function mapSnapshot(data: SnapshotResult): ViewModel {
  const summaryById = new Map(data.projects.map((p) => [p.id, p]));

  const projects: Project[] = data.diagnostics.map((d) => {
    const s = summaryById.get(d.id);
    return {
      id: d.id,
      name: d.name,
      kind: d.kind,
      status: d.status,
      iteration: s?.iteration ?? undefined,
      mode: s?.mode ?? undefined,
      phase: s?.phase ?? undefined,
      blocked: s?.blocked ?? null,
      nextStep: s?.nextStep ?? null,
      kindSummary: s?.kindSummary ?? undefined,
      url: s?.url ?? undefined,
      configPath: d.configPath ?? "",
      resolvePath: d.resolvedPath ?? "",
      parser: d.parser ?? "",
      lastRead: relTime(d.lastReadAt),
      fileCheck: fileCheckOf(d),
      errorSummary: s?.errorSummary ?? d.errors?.[0]?.message ?? undefined,
      roles: (s?.roles ?? []).map((r) => ({
        role: r.role,
        recentAction: r.recentAction ?? "—",
        nextStep: r.nextStep ?? "—",
      })),
      todos: (s?.todos ?? []).map((t) => ({
        id: t.id,
        text: t.text,
        done: false,
        priority: mapTodoPriority(t.priority),
      })),
    };
  });

  const cp = data.crossProject ?? { blockerCount: 0, requests: [], bcrs: [], communications: [] };

  return {
    projects,
    cardProjects: projects.filter((p) => p.kind !== "coordination"),
    crossTodos: (data.todos ?? []).map((t) => ({
      id: t.id,
      priority: t.priority ?? "P2",
      text: t.text,
      project: t.projectName,
      role: t.role ?? "—",
      status: t.status,
    })),
    crossItems: (cp.requests ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      sourceLabel: r.sourceLabel ?? "—",
      targetLabel: r.targetLabel ?? "—",
      targetIteration: r.targetIteration ?? "—",
      status: r.status,
      // 后端需求模型无 priority / updatedAt，前端不臆造
      priority: undefined,
      updatedAt: undefined,
    })),
    bcrItems: (cp.bcrs ?? []).map((b) => ({
      id: b.id,
      summary: b.summary,
      target: b.target ?? "—",
      status: b.status,
    })),
    commItems: (cp.communications ?? []).map((c) => ({
      id: c.id,
      reqId: c.reqId ?? c.id,
      projects: c.projects ?? [],
      summary: c.summary ?? "",
      ts: undefined,
    })),
    blockerCount: cp.blockerCount ?? 0,
    projectCount: data.diagnostics.length,
  };
}

function mapTodoPriority(p: "P0" | "P1" | "P2" | null): "high" | "mid" | "low" {
  if (p === "P0") return "high";
  if (p === "P2") return "low";
  return "mid";
}

function fileCheckOf(d: BackendDiagnostics): "ok" | "missing" | "error" {
  if (d.status === "config-error" || d.status === "read-error") return "error";
  if (d.status === "not-bootstrapped") return "missing";
  if ((d.fileChecks ?? []).some((c) => c.required && !c.exists)) return "missing";
  return "ok";
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s 前`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  return new Date(iso).toLocaleString("zh-CN");
}

// ─── useSnapshot：拉取 + 按 refreshIntervalSeconds 轮询 ──────────────────────

export type SnapshotUiState =
  | { state: "loading" }
  | { state: "ready"; data: SnapshotResult }
  | { state: "error"; message: string };

export function useSnapshot(): { ui: SnapshotUiState; refetch: () => void } {
  const [ui, setUi] = useState<SnapshotUiState>({ state: "loading" });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const cancelled = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshot");
      if (!res.ok) throw new Error(`快照接口返回 HTTP ${res.status}`);
      const data: SnapshotResult = await res.json();
      if (cancelled.current) return;
      setUi({ state: "ready", data });
      schedule(Math.max(5, data.refreshIntervalSeconds || 60));
    } catch (err) {
      if (cancelled.current) return;
      setUi({ state: "error", message: String((err as Error)?.message ?? err) });
      schedule(60); // 出错后仍按 60s 重试
    }
    function schedule(sec: number) {
      clearTimeout(timer.current);
      timer.current = setTimeout(load, sec * 1000);
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    load();
    return () => {
      cancelled.current = true;
      clearTimeout(timer.current);
    };
  }, [load]);

  return { ui, refetch: load };
}

// ─── ViewModel Context ───────────────────────────────────────────────────────

const ViewModelContext = createContext<ViewModel>(EMPTY_VIEW_MODEL);
export const ViewModelProvider = ViewModelContext.Provider;

export function useViewModel(): ViewModel {
  return useContext(ViewModelContext);
}
