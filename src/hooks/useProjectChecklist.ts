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
  const done = items.filter(c => c.is_done).length;
  const pct  = Math.round((done / items.length) * 100);
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
      .channel(`checklist-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_checklist", filter: `project_id=eq.${projectId}` }, (payload) => {
        setChecklist(prev => {
          let next: ChecklistItem[];
          if (payload.eventType === "INSERT") {
            next = [...prev, payload.new as ChecklistItem].sort((a, b) => a.order_index - b.order_index);
          } else if (payload.eventType === "UPDATE") {
            next = prev.map(item => item.id === payload.new.id ? payload.new as ChecklistItem : item);
          } else if (payload.eventType === "DELETE") {
            next = prev.filter(item => item.id !== (payload.old as ChecklistItem).id);
          } else {
            next = prev;
          }
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const toggleItem = useCallback(async (item: ChecklistItem) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isDone = !item.is_done;

    const { error } = await supabase
      .from("project_checklist")
      .update({
        is_done: isDone,
        completed_at: isDone ? new Date().toISOString() : null,
        completed_by: isDone ? (user?.id ?? null) : null,
      })
      .eq("id", item.id);

    if (error) { setError(error.message); return false; }

    // Sync project progress + log activity
    setChecklist(prev => {
      const updated = prev.map(c => c.id === item.id ? { ...c, is_done: isDone } : c);
      if (projectId) syncProjectProgress(projectId, updated);
      return updated;
    });

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
      .filter(c => c.phase_id === phaseId)
      .reduce((max, c) => Math.max(max, c.order_index), -1);

    const { data, error } = await supabase
      .from("project_checklist")
      .insert({ project_id: projectId, phase_id: phaseId, title, description: description || null, due_date: dueDate || null, order_index: maxOrder + 1 })
      .select()
      .single();

    if (error) { setError(error.message); return null; }

    setChecklist(prev => {
      const updated = [...prev, data as ChecklistItem].sort((a, b) => a.order_index - b.order_index);
      syncProjectProgress(projectId, updated);
      return updated;
    });

    return data;
  }, [projectId, checklist]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<Pick<ChecklistItem, "title" | "description" | "due_date">>) => {
    const supabase = createClient();
    const { error } = await supabase.from("project_checklist").update(updates).eq("id", itemId);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("project_checklist").delete().eq("id", itemId);
    if (error) { setError(error.message); return false; }

    setChecklist(prev => {
      const updated = prev.filter(c => c.id !== itemId);
      if (projectId) syncProjectProgress(projectId, updated);
      return updated;
    });

    return true;
  }, [projectId]);

  const progress = {
    done: checklist.filter(c => c.is_done).length,
    total: checklist.length,
    percentage: checklist.length > 0
      ? Math.round((checklist.filter(c => c.is_done).length / checklist.length) * 100)
      : 0,
  };

  const getByPhase = useCallback((phaseId: string) => {
    return checklist.filter(c => c.phase_id === phaseId);
  }, [checklist]);

  return { checklist, loading, error, toggleItem, addItem, updateItem, deleteItem, progress, getByPhase };
}
