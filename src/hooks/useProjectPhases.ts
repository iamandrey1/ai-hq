"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Phase {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "pending" | "active" | "completed" | "blocked";
  order_index: number;
  start_week: number;
  end_week: number;
  created_at: string;
}

export function useProjectPhases(projectId: string | null) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) { setPhases([]); setLoading(false); return; }

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });

    if (err) {
      console.error("[useProjectPhases] fetch error:", err.message, "projectId:", projectId);
      setError(err.message);
    } else {
      console.debug("[useProjectPhases] loaded", data?.length, "phases for", projectId);
      setPhases(data || []);
      setError(null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();

    if (!projectId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`phases-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_phases", filter: `project_id=eq.${projectId}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const getProgress = useCallback((phaseId: string, checklist: { phase_id: string; is_done: boolean }[]) => {
    const items = checklist.filter((c) => c.phase_id === phaseId);
    return { done: items.filter((c) => c.is_done).length, total: items.length };
  }, []);

  const addPhase = useCallback(async (title: string) => {
    if (!projectId) return null;
    const supabase = createClient();
    const maxOrder = phases.reduce((m, p) => Math.max(m, p.order_index), 0);
    const { data, error } = await supabase
      .from("project_phases")
      .insert({ project_id: projectId, title, status: "pending", order_index: maxOrder + 1, start_week: 0, end_week: 0 })
      .select().single();
    if (error) { console.error(error); return null; }
    return data as Phase;
  }, [projectId, phases]);

  const updatePhase = useCallback(async (id: string, updates: Partial<Pick<Phase, "title" | "status" | "description">>) => {
    const supabase = createClient();
    const { error } = await supabase.from("project_phases").update(updates).eq("id", id);
    return !error;
  }, []);

  const deletePhase = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("project_phases").delete().eq("id", id);
    return !error;
  }, []);

  return { phases, loading, error, getProgress, addPhase, updatePhase, deletePhase };
}
