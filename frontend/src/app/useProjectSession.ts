import { useState, useCallback, useEffect } from "react";
import type {
  ClaudeSession,
  ClaudeMessage,
  SessionMapping,
  SessionListResponse,
  SessionDetailResponse,
  MappingListResponse,
  SyncResult,
  SyncStatus,
  TimelineVersionsResponse,
  TimelineDetailResponse,
} from "./snapshot";

const API_BASE = "";

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

// ─── 会话列表 hook ──────────────────────────────────────────────────────────

export function useSessionList(params: {
  projectId?: string;
  status?: "all" | "mapped" | "unmapped";
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
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));
      const r = await apiFetch<SessionListResponse>(`/api/sessions?${qs}`);
      setData(r);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [params.projectId, params.status, params.limit, params.offset]);

  useEffect(() => { load(); }, [load]);

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

  return { data, loading, error, refetch: load };
}

// ─── 映射列表 hook ──────────────────────────────────────────────────────────

export function useMappingList(projectId?: string) {
  const [data, setData] = useState<MappingListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
      const r = await apiFetch<MappingListResponse>(`/api/mappings${qs}`);
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

// ─── 创建/更新映射 ──────────────────────────────────────────────────────────

export async function saveMapping(input: {
  session_id: string;
  project_id: string;
  role: string;
  note?: string;
}): Promise<SessionMapping> {
  return apiFetch<SessionMapping>("/api/mappings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── 删除映射 ──────────────────────────────────────────────────────────────

export async function deleteMapping(sessionId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/mappings?session_id=${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

// ─── 触发同步 ──────────────────────────────────────────────────────────────

export async function triggerSync(): Promise<SyncResult> {
  return apiFetch<SyncResult>("/api/sync", { method: "POST" });
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
