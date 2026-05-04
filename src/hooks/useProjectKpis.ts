"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Kpi {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  current_value: number;
  target_value: number;
  unit: string | null;
  created_at: string;
}

export function useProjectKpis(projectId: string | null) {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setKpis([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchKpis = async () => {
      const { data, error } = await supabase
        .from("project_kpis")
        .select("*")
        .eq("project_id", projectId);

      if (error) {
        setError(error.message);
      } else {
        setKpis(data || []);
      }
      setLoading(false);
    };

    fetchKpis();

    // Realtime subscription
    const channel = supabase
      .channel(`kpis-${projectId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "project_kpis", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setKpis((prev) =>
            prev.map((k) => (k.id === payload.new.id ? payload.new : k))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const updateValue = useCallback(async (kpiId: string, newValue: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("project_kpis")
      .update({ current_value: newValue })
      .eq("id", kpiId);

    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  const getProgress = useCallback((kpi: Kpi) => {
    const percentage = kpi.target_value > 0
      ? Math.round((kpi.current_value / kpi.target_value) * 100)
      : 0;
    return Math.min(percentage, 100);
  }, []);

  const getProgressColor = useCallback((percentage: number) => {
    if (percentage < 30) return "bg-red-500";
    if (percentage < 70) return "bg-amber-500";
    return "bg-green-500";
  }, []);

  return { kpis, loading, error, updateValue, getProgress, getProgressColor };
}