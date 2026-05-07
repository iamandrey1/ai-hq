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

  const fetchKpis = useCallback(async () => {
    if (!projectId) { setKpis([]); setLoading(false); return; }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_kpis")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setKpis(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setKpis([]); setLoading(false); return; }

    fetchKpis();

    const supabase = createClient();
    const channel = supabase
      .channel(`kpis-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "project_kpis", filter: `project_id=eq.${projectId}` }, (payload) => {
        const k = payload.new as Kpi;
        setKpis(prev => prev.some(x => x.id === k.id) ? prev : [...prev, k]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "project_kpis", filter: `project_id=eq.${projectId}` }, (payload) => {
        setKpis(prev => prev.map(k => k.id === payload.new.id ? payload.new as Kpi : k));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "project_kpis", filter: `project_id=eq.${projectId}` }, (payload) => {
        const old = payload.old as { id: string };
        setKpis(prev => prev.filter(k => k.id !== old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const addKpi = useCallback(async (data: {
    name: string;
    current_value?: number;
    target_value?: number;
    unit?: string;
    description?: string;
  }) => {
    if (!projectId) return null;
    const supabase = createClient();
    const { data: result, error } = await supabase
      .from("project_kpis")
      .insert({
        project_id: projectId,
        name: data.name,
        current_value: data.current_value ?? 0,
        target_value: data.target_value ?? 100,
        unit: data.unit ?? null,
        description: data.description ?? null,
      })
      .select().single();
    if (error) { setError(error.message); return null; }
    setKpis(prev => prev.some(k => k.id === (result as Kpi).id) ? prev : [...prev, result as Kpi]);
    return result as Kpi;
  }, [projectId]);

  const updateValue = useCallback(async (kpiId: string, newValue: number) => {
    setKpis(prev => prev.map(k => k.id === kpiId ? { ...k, current_value: newValue } : k));
    const supabase = createClient();
    const { error } = await supabase.from("project_kpis").update({ current_value: newValue }).eq("id", kpiId);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const updateKpi = useCallback(async (kpiId: string, updates: Partial<Pick<Kpi, "name" | "current_value" | "target_value" | "unit" | "description">>) => {
    setKpis(prev => prev.map(k => k.id === kpiId ? { ...k, ...updates } : k));
    const supabase = createClient();
    const { error } = await supabase.from("project_kpis").update(updates).eq("id", kpiId);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const deleteKpi = useCallback(async (kpiId: string) => {
    setKpis(prev => prev.filter(k => k.id !== kpiId));
    const supabase = createClient();
    const { error } = await supabase.from("project_kpis").delete().eq("id", kpiId);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const getProgress = useCallback((kpi: Kpi) => {
    return kpi.target_value > 0 ? Math.min(Math.round((kpi.current_value / kpi.target_value) * 100), 100) : 0;
  }, []);

  const getProgressColor = useCallback((pct: number) => {
    if (pct < 30) return "text-red";
    if (pct < 70) return "text-amber-400";
    return "text-green";
  }, []);

  return { kpis, loading, error, addKpi, updateValue, updateKpi, deleteKpi, getProgress, getProgressColor };
}
