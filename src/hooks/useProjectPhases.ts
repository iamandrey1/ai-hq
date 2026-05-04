"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    if (!projectId) {
      setPhases([]);
      setLoading(false);
      return;
    }

    const fetchPhases = async () => {
      const { data, error } = await supabase
        .from("project_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setPhases(data || []);
      }
      setLoading(false);
    };

    fetchPhases();

    // Realtime subscription
    const channel = supabase
      .channel(`phases-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_phases", filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setPhases((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const getProgress = useCallback((phaseId: string, checklist: { phase_id: string; is_done: boolean }[]) => {
    const items = checklist.filter((c) => c.phase_id === phaseId);
    const done = items.filter((c) => c.is_done).length;
    return { done, total: items.length };
  }, []);

  return { phases, loading, error, getProgress };
}