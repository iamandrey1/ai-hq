"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  probability: "low" | "medium" | "high";
  impact: string | null;
  mitigation: string | null;
  is_resolved: boolean;
  created_at: string;
}

export function useProjectRisks(projectId: string | null) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) { setRisks([]); setLoading(false); return; }

    const supabase = createClient();

    const fetchRisks = async () => {
      const { data, error } = await supabase
        .from("project_risks")
        .select("*")
        .eq("project_id", projectId)
        .order("is_resolved", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) setError(error.message);
      else setRisks(data || []);
      setLoading(false);
    };

    fetchRisks();

    const channel = supabase
      .channel(`risks-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_risks", filter: `project_id=eq.${projectId}` }, () => fetchRisks())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const addRisk = useCallback(async (data: {
    title: string; description?: string; probability: Risk["probability"];
    mitigation?: string; impact?: string;
  }) => {
    if (!projectId) return null;
    const supabase = createClient();
    const { data: result, error } = await supabase
      .from("project_risks")
      .insert({ ...data, project_id: projectId, is_resolved: false })
      .select().single();
    if (error) { setError(error.message); return null; }
    setRisks(prev => [result as Risk, ...prev]);
    return result as Risk;
  }, [projectId]);

  const resolveRisk = useCallback(async (riskId: string) => {
    setRisks(prev => prev.map(r => r.id === riskId ? { ...r, is_resolved: true } : r)
      .sort((a, b) => (a.is_resolved === b.is_resolved ? 0 : a.is_resolved ? 1 : -1)));
    const supabase = createClient();
    const { error } = await supabase.from("project_risks").update({ is_resolved: true }).eq("id", riskId);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const updateRisk = useCallback(async (riskId: string, updates: Partial<Pick<Risk, "title" | "description" | "mitigation" | "probability">>) => {
    setRisks(prev => prev.map(r => r.id === riskId ? { ...r, ...updates } : r));
    const supabase = createClient();
    const { error } = await supabase.from("project_risks").update(updates).eq("id", riskId);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const deleteRisk = useCallback(async (riskId: string) => {
    setRisks(prev => prev.filter(r => r.id !== riskId));
    const supabase = createClient();
    const { error } = await supabase.from("project_risks").delete().eq("id", riskId);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const getProbabilityColor = useCallback((p: string) => {
    return p === "low" ? "bg-green" : p === "medium" ? "bg-amber-500" : "bg-red";
  }, []);

  const getProbabilityLabel = useCallback((p: string) => {
    return p === "low" ? "Низкая" : p === "medium" ? "Средняя" : p === "high" ? "Высокая" : p;
  }, []);

  const unresolvedRisks = risks.filter(r => !r.is_resolved);

  return { risks, loading, error, addRisk, resolveRisk, updateRisk, deleteRisk, getProbabilityColor, getProbabilityLabel, unresolvedRisks };
}
