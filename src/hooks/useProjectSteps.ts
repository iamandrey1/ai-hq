"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";

export interface ProjectStep {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  description_md: string | null;
  estimated_time: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export function useProjectSteps(projectId: string | null) {
  const [steps, setSteps] = useState<ProjectStep[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) { setSteps([]); setLoading(false); return; }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_steps")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });
    if (!error && data) setSteps(data as ProjectStep[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
    if (!projectId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`steps-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "project_steps",
        filter: `project_id=eq.${projectId}`,
      }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, load]);

  const toggleStep = useCallback(async (step: ProjectStep) => {
    const newCompleted = !step.completed;

    setSteps(prev => prev.map(s =>
      s.id === step.id
        ? { ...s, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : s
    ));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("project_steps")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
        completed_by: newCompleted ? (user?.id ?? null) : null,
      })
      .eq("id", step.id);

    if (error) {
      // rollback
      setSteps(prev => prev.map(s => s.id === step.id ? step : s));
      console.error("toggleStep:", error);
      return false;
    }

    if (newCompleted) {
      logActivity({
        action_type: "step_completed",
        description: `Выполнил шаг: ${step.title}`,
        project_id: step.project_id,
        entity_type: "project_step",
        entity_id: step.id,
      });
    }
    return true;
  }, []);

  const progress = {
    done: steps.filter(s => s.completed).length,
    total: steps.length,
    percentage: steps.length > 0
      ? Math.round((steps.filter(s => s.completed).length / steps.length) * 100)
      : 0,
  };

  return { steps, loading, toggleStep, progress, reload: load };
}
