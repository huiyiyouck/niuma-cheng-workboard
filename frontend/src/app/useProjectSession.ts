import { useState, useCallback, useEffect } from "react";
import type {
  SessionListResponse,
  SessionDetailResponse,
  SyncResult,
  SyncStatus,
  TimelineVersionsResponse,
  TimelineDetailResponse,
} from "./snapshot";

const API_BASE = "";
const SESSION_SYNC_EVENT = "workboard:sessions-synced";

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function useRefetchOnSessionSync(load: () => void) {
  useEffect(() => {
    const onSynced = () => { void load(); };
    window.addEventListener(SESSION_SYNC_EVENT, onSynced);
    return () => window.removeEventListener(SESSION_SYNC_EVENT, onSynced);
  }, [load]);
}

// ─── 会话列表 hook ──────────────────────────────────────────────────────────

export function useSessionList(params: {
  projectId?: string;
  status?: "all" | "manual" | "auto";
  role?: string;
  limit?: number;
  offset?: number;
}) {
  const [data, setData] = useState<SessionListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.projectId) qs.set("project_id", params.projectId);
      if (params.status) qs.set("status", params.status);
      if (params.role) qs.set("role", params.role);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      const r = await apiFetch<SessionListResponse>(`/api/sessions?${qs}`);
      setData(r);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [params.projectId, params.status, params.role, params.limit, params.offset]);

  useEffect(() => { load(); }, [load]);
  useRefetchOnSessionSync(load);

  return { data, loading, error, refetch: load };
}

// ─── 会话详情 hook ──────────────────────────────────────────────────────────

export function useSessionDetail(sessionId: string | null) {
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<SessionDetailResponse>(`/api/sessions/details?id=${encodeURIComponent(sessionId)}`);
      setData(r);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);
  useRefetchOnSessionSync(load);

  return { data, loading, error, refetch: load };
}

// ─── 打标签纠错（US-10：manual_role 覆写；成功后广播刷新各会话列表） ─────────

export async function setSessionRole(sessionId: string, role: string): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/sessions/role", {
    method: "PUT",
    body: JSON.stringify({ session_id: sessionId, role }),
  });
  window.dispatchEvent(new CustomEvent(SESSION_SYNC_EVENT));
}

export async function clearSessionRole(sessionId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/sessions/role?session_id=${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  window.dispatchEvent(new CustomEvent(SESSION_SYNC_EVENT));
}

// ─── 触发同步 ──────────────────────────────────────────────────────────────

export async function triggerSync(): Promise<SyncResult> {
  const result = await apiFetch<SyncResult>("/api/sync", { method: "POST" });
  window.dispatchEvent(new CustomEvent(SESSION_SYNC_EVENT, { detail: result }));
  return result;
}

// ─── 迭代时间轴：版本列表 hook ──────────────────────────────────────────────

export function useTimelineVersions(projectId: string | null) {
  const [data, setData] = useState<TimelineVersionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<TimelineVersionsResponse>(`/api/timeline/versions?project_id=${encodeURIComponent(projectId)}`);
      setData(r);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

// ─── 迭代时间轴：阶段门禁详情 hook ──────────────────────────────────────────

export function useTimelineDetail(projectId: string | null, version: string | null) {
  const [data, setData] = useState<TimelineDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !version) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<TimelineDetailResponse>(
        `/api/timeline/detail?project_id=${encodeURIComponent(projectId)}&version=${encodeURIComponent(version)}`
      );
      setData(r);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [projectId, version]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

// ─── 同步状态（从 snapshot 读） ─────────────────────────────────────────────

export function getSyncStatusFromSnapshot(snapshot: { syncStatus?: SyncStatus }): SyncStatus | null {
  return snapshot.syncStatus ?? null;
}
