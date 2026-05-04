"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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

      if (error) {
        setError(error.message);
      } else {
        setChecklist(data || []);
      }
      setLoading(false);
    };

    fetchChecklist();

    // Realtime subscription
    const channel = supabase
      .channel(`checklist-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_checklist", filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setChecklist((prev) => [...prev, payload.new].sort((a, b) => a.order_index - b.order_index));
          } else if (payload.eventType === "UPDATE") {
            setChecklist((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          } else if (payload.eventType === "DELETE") {
            setChecklist((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const toggleItem = useCallback(async (item: ChecklistItem) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("project_checklist")
      .update({
        is_done: !item.is_done,
        completed_at: !item.is_done ? new Date().toISOString() : null,
        completed_by: !item.is_done ? (await supabase.auth.getUser()).data.user?.id : null,
      })
      .eq("id", item.id);

    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  const addItem = useCallback(async (phaseId: string, title: string, description?: string, dueDate?: string) => {
    const supabase = createClient();
    const maxOrder = checklist
      .filter((c) => c.phase_id === phaseId)
      .reduce((max, c) => Math.max(max, c.order_index), -1);

    const { data, error } = await supabase
      .from("project_checklist")
      .insert({
        project_id: projectId,
        phase_id: phaseId,
        title,
        description: description || null,
        due_date: dueDate || null,
        order_index: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return null;
    }
    return data;
  }, [projectId, checklist]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<Pick<ChecklistItem, "title" | "description" | "due_date">>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("project_checklist")
      .update(updates)
      .eq("id", itemId);

    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("project_checklist")
      .delete()
      .eq("id", itemId);

    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

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