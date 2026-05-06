"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";

export interface ChecklistItem {
  id: string;
  project_id: string;
  phase_id: string;
  title: string;
  description: string | null;
  is_done: boolean;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  order_index: number;
  created_at: string;
}

async function syncProjectProgress(projectId: string, items: ChecklistItem[]) {
  if (!items.length) return;
  const done = items.filter((c) => c.is_done).length;
  const pct = Math.round((done / items.length) * 100);
  const supabase = createClient();
  await supabase.from("projects").update({ progress: pct }).eq("id", projectId);
}

export function useProjectChecklist(projectId: string | null) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setChecklist([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchChecklist = async () => {
      const { data, error } = await supabase
        .from("project_checklist")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_id", { ascending: true })
        .order("order_index", { ascending: true });

      if (error) setError(error.message);
      else setChecklist(data || []);
      setLoading(false);
    };

    fetchChecklist();

    const channel = supabase
      .channel(`checklist-${projectId}-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "project_checklist", filter: `project_id=eq.${projectId}` }, (payload) => {
        const item = payload.new as ChecklistItem;
        setChecklist((prev) =>
          prev.some((x) => x.id === item.id)
            ? prev
            : [...prev, item].sort((a, b) => a.order_index - b.order_index)
        );
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "project_checklist", filter: `project_id=eq.${projectId}` }, (payload) => {
        const item = payload.new as ChecklistItem;
        setChecklist((prev) => prev.map((x) => x.id === item.id ? { ...x, ...item } : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "project_checklist", filter: `project_id=eq.${projectId}` }, (payload) => {
        const old = payload.old as { id: string };
        setChecklist((prev) => prev.filter((x) => x.id !== old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const toggleItem = useCallback(async (item: ChecklistItem) => {
    const isDone = !item.is_done;
    const now = new Date().toISOString();

    // Optimistic: flip immediately
    let prev: ChecklistItem | undefined;
    setChecklist((old) => {
      prev = old.find((c) => c.id === item.id);
      const updated = old.map((c) =>
        c.id === item.id
          ? { ...c, is_done: isDone, completed_at: isDone ? now : null }
          : c
      );
      if (projectId) syncProjectProgress(projectId, updated);
      return updated;
    });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("project_checklist")
      .update({
        is_done: isDone,
        completed_at: isDone ? now : null,
        completed_by: isDone ? (user?.id ?? null) : null,
      })
      .eq("id", item.id);

    if (error) {
      // Rollback
      if (prev) {
        setChecklist((old) => {
          const rolled = old.map((c) => c.id === item.id ? prev! : c);
          if (projectId) syncProjectProgress(projectId, rolled);
          return rolled;
        });
      }
      setError(error.message);
      return false;
    }

    logActivity({
      action_type: isDone ? "checklist_done" : "checklist_undone",
      description: `${isDone ? "Выполнил" : "Отменил"} пункт: ${item.title}`,
      project_id: projectId || undefined,
      entity_type: "checklist_item",
      entity_id: item.id,
    });

    return true;
  }, [projectId]);

  const addItem = useCallback(async (phaseId: string, title: string, description?: string, dueDate?: string) => {
    if (!projectId) return null;
    const supabase = createClient();
    const maxOrder = checklist
      .filter((c) => c.phase_id === phaseId)
      .reduce((max, c) => Math.max(max, c.order_index), -1);

    const { data, error } = await supabase
      .from("project_checklist")
      .insert({ project_id: projectId, phase_id: phaseId, title, description: description || null, due_date: dueDate || null, order_index: maxOrder + 1 })
      .select()
      .single();

    if (error) { setError(error.message); return null; }

    // Add immediately (realtime deduplicates)
    setChecklist((prev) => {
      if (prev.some((x) => x.id === (data as ChecklistItem).id)) return prev;
      const updated = [...prev, data as ChecklistItem].sort((a, b) => a.order_index - b.order_index);
      syncProjectProgress(projectId, updated);
      return updated;
    });

    return data;
  }, [projectId, checklist]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<Pick<ChecklistItem, "title" | "description" | "due_date">>) => {
    let prev: ChecklistItem | undefined;
    setChecklist((old) => {
      prev = old.find((c) => c.id === itemId);
      return old.map((c) => c.id === itemId ? { ...c, ...updates } : c);
    });

    const supabase = createClient();
    const { error } = await supabase.from("project_checklist").update(updates).eq("id", itemId);

    if (error) {
      if (prev) setChecklist((old) => old.map((c) => c.id === itemId ? prev! : c));
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    let removed: ChecklistItem | undefined;
    setChecklist((old) => {
      removed = old.find((c) => c.id === itemId);
      const updated = old.filter((c) => c.id !== itemId);
      if (projectId) syncProjectProgress(projectId, updated);
      return updated;
    });

    const supabase = createClient();
    const { error } = await supabase.from("project_checklist").delete().eq("id", itemId);

    if (error) {
      if (removed) {
        setChecklist((old) => {
          const rolled = [...old, removed!].sort((a, b) => a.order_index - b.order_index);
          if (projectId) syncProjectProgress(projectId, rolled);
          return rolled;
        });
      }
      setError(error.message);
      return false;
    }

    return true;
  }, [projectId]);

  const progress = {
    done: checklist.filter((c) => c.is_done).length,
    total: checklist.length,
    percentage: checklist.length > 0
      ? Math.round((checklist.filter((c) => c.is_done).length / checklist.length) * 100)
      : 0,
  };

  const getByPhase = useCallback((phaseId: string) => {
    return checklist.filter((c) => c.phase_id === phaseId);
  }, [checklist]);

  return { checklist, loading, error, toggleItem, addItem, updateItem, deleteItem, progress, getByPhase };
}
