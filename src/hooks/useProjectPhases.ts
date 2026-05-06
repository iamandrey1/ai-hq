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

export function useProjectPhases(slug: string | null) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve slug → UUID, then fetch phases
  useEffect(() => {
    if (!slug) {
      setPhases([]);
      setProjectId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const run = async () => {
      setLoading(true);

      // Step 1: resolve UUID from slug
      const { data: proj, error: projErr } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", slug)
        .single();

      if (cancelled) return;

      if (projErr || !proj) {
        console.error("[useProjectPhases] project not found for slug:", slug, projErr?.message);
        setError(projErr?.message ?? "Project not found");
        setLoading(false);
        return;
      }

      const resolvedId = proj.id as string;
      setProjectId(resolvedId);

      // Step 2: fetch phases by UUID
      const { data, error: phasesErr } = await supabase
        .from("project_phases")
        .select("*")
        .eq("project_id", resolvedId)
        .order("order_index", { ascending: true });

      if (cancelled) return;

      if (phasesErr) {
        console.error("[useProjectPhases] fetch error:", phasesErr.message, "id:", resolvedId);
        setError(phasesErr.message);
      } else {
        setPhases(data || []);
        setError(null);
      }
      setLoading(false);
    };

    run();

    return () => { cancelled = true; };
  }, [slug]);

  // Realtime subscription — re-subscribe when projectId is resolved
  useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();

    const reload = async () => {
      const { data } = await supabase
        .from("project_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });
      if (data) setPhases(data);
    };

    const channel = supabase
      .channel(`phases-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_phases", filter: `project_id=eq.${projectId}` }, reload)
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
      .insert({ project_id: projectId, title, status: "pending", order_index: maxOrder + 1 })
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

  return { phases, projectId, loading, error, getProgress, addPhase, updatePhase, deletePhase };
}
