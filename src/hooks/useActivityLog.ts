"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ActivityEntry {
  id: string;
  user_id: string;
  action_type: string;
  project_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profile?: { full_name: string; initials: string };
  project?: { name: string; slug: string };
}

export const ACTION_LABELS: Record<string, string> = {
  project_created:     "добавил проект",
  project_deleted:     "удалил проект",
  task_created:        "добавил задачу",
  task_done:           "выполнил задачу",
  task_deleted:        "удалил задачу",
  file_added:          "добавил документ",
  file_deleted:        "удалил документ",
  checklist_done:      "выполнил пункт",
  checklist_undone:    "отменил пункт",
  subscription_added:  "добавил подписку",
  subscription_deleted:"удалил подписку",
  step_completed:      "выполнил шаг",
  row_added:           "добавил запись",
  row_deleted:         "удалил запись",
};

export function useActivityLog(options?: { projectId?: string; limit?: number }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = options?.limit ?? 20;

  const load = useCallback(async (p = 0) => {
    const supabase = createClient();
    // 2-step: грузим строки отдельно от профилей/проектов, чтобы не зависеть
    // от FK-relations в PostgREST (activity_log.user_id может ссылаться на
    // auth.users, а не на public.profiles — тогда select(... profiles(...)) падает).
    let q = supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(p * pageSize, (p + 1) * pageSize - 1);

    if (options?.projectId) q = q.eq("project_id", options.projectId);

    const { data: rows, error } = await q;
    if (error) {
      console.error("useActivityLog.load:", error.message, error.code, error.details, error.hint);
      setLoading(false);
      return;
    }
    if (!rows) {
      setLoading(false);
      return;
    }

    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    const projectIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean))] as string[];

    const [profilesRes, projectsRes] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, full_name, initials").in("id", userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; initials: string }>, error: null }),
      projectIds.length
        ? supabase.from("projects").select("id, name, slug").in("id", projectIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }>, error: null }),
    ]);

    if (profilesRes.error) console.warn("activity_log.profiles:", profilesRes.error.message);
    if (projectsRes.error) console.warn("activity_log.projects:", projectsRes.error.message);

    const profileMap = new Map<string, { full_name: string; initials: string }>(
      (profilesRes.data || []).map((p) => [p.id, { full_name: p.full_name, initials: p.initials }])
    );
    const projectMap = new Map<string, { name: string; slug: string }>(
      (projectsRes.data || []).map((pr) => [pr.id, { name: pr.name, slug: pr.slug }])
    );

    const mapped = rows.map((row) => ({
      ...row,
      profile: row.user_id ? profileMap.get(row.user_id) : undefined,
      project: row.project_id ? projectMap.get(row.project_id) : undefined,
    })) as ActivityEntry[];

    setEntries(p === 0 ? mapped : (prev) => [...prev, ...mapped]);
    setPage(p);
    setLoading(false);
  }, [options?.projectId, pageSize]);

  useEffect(() => {
    load(0);

    const supabase = createClient();
    const channel = supabase
      .channel(`activity-log-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, async (payload) => {
        const newRow = payload.new as Record<string, unknown>;
        // 2-step: подгружаем профиль и проект отдельно (без FK-зависимости PostgREST)
        const userId = newRow.user_id as string | null;
        const projectId = newRow.project_id as string | null;
        const [profileRes, projectRes] = await Promise.all([
          userId
            ? supabase.from("profiles").select("full_name, initials").eq("id", userId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          projectId
            ? supabase.from("projects").select("name, slug").eq("id", projectId).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);
        const entry = {
          ...newRow,
          profile: profileRes.data || undefined,
          project: projectRes.data || undefined,
        } as ActivityEntry;
        if (!options?.projectId || entry.project_id === options.projectId) {
          setEntries((prev) =>
            prev.some((e) => e.id === entry.id)
              ? prev
              : [entry, ...prev].slice(0, pageSize * (page + 1))
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [options?.projectId]);

  const loadMore = () => load(page + 1);
  const hasMore  = entries.length === (page + 1) * pageSize;

  return { entries, loading, loadMore, hasMore };
}

export async function logActivity(params: {
  action_type: string;
  description: string;
  project_id?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("logActivity: no user — skipping");
      return;
    }

    const { error } = await supabase.from("activity_log").insert({
      user_id: user.id,
      action_type: params.action_type,
      description: params.description,
      project_id: params.project_id || null,
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      metadata: params.metadata || null,
    });
    if (error) {
      // Не молчим: часто либо RLS блокирует, либо колонка отсутствует.
      console.error("logActivity:", error.message, error.code, error.details);
    }
  } catch (e) {
    console.error("logActivity exception:", e);
  }
}
