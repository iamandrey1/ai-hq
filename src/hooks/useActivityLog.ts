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
  checklist_done:      "выполнил пункт",
  checklist_undone:    "отменил пункт",
  task_created:        "создал задачу",
  task_done:           "закрыл задачу",
  task_deleted:        "удалил задачу",
  subscription_added:  "добавил подписку",
  subscription_deleted:"удалил подписку",
  file_added:          "добавил файл",
  file_deleted:        "удалил файл",
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
    let q = supabase
      .from("activity_log")
      .select("*, profiles(full_name, initials), projects(name, slug)")
      .order("created_at", { ascending: false })
      .range(p * pageSize, (p + 1) * pageSize - 1);

    if (options?.projectId) q = q.eq("project_id", options.projectId);

    const { data, error } = await q;
    if (!error && data) {
      const mapped = data.map((row: Record<string, unknown>) => ({
        ...row,
        profile: (row.profiles as { full_name: string; initials: string }) || undefined,
        project: (row.projects as { name: string; slug: string }) || undefined,
      })) as ActivityEntry[];
      setEntries(p === 0 ? mapped : prev => [...prev, ...mapped]);
      setPage(p);
    }
    setLoading(false);
  }, [options?.projectId, pageSize]);

  useEffect(() => {
    load(0);

    const supabase = createClient();
    const channel = supabase
      .channel(`activity-log-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, async (payload) => {
        // Fetch the new entry with joins so we have profile/project names
        const { data } = await supabase
          .from("activity_log")
          .select("*, profiles(full_name, initials), projects(name, slug)")
          .eq("id", payload.new.id)
          .single();
        if (data) {
          const entry = {
            ...data,
            profile: (data.profiles as { full_name: string; initials: string }) || undefined,
            project: (data.projects as { name: string; slug: string }) || undefined,
          } as ActivityEntry;
          if (!options?.projectId || entry.project_id === options.projectId) {
            setEntries((prev) => [entry, ...prev].slice(0, pageSize * (page + 1)));
          }
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
    if (!user) return;

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action_type: params.action_type,
      description: params.description,
      project_id: params.project_id || null,
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      metadata: params.metadata || null,
    });
  } catch {}
}
