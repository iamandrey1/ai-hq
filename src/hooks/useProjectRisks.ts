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
    if (!projectId) {
      setRisks([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchRisks = async () => {
      const { data, error } = await supabase
        .from("project_risks")
        .select("*")
        .eq("project_id", projectId)
        .order("is_resolved", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setRisks(data || []);
      }
      setLoading(false);
    };

    fetchRisks();

    // Realtime subscription
    const channel = supabase
      .channel(`risks-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_risks", filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setRisks((prev) => {
              const updated = prev.map((r) => (r.id === payload.new.id ? payload.new : r));
              // Move resolved to bottom
              return updated.sort((a, b) => {
                if (a.is_resolved !== b.is_resolved) return a.is_resolved ? 1 : -1;
                return 0;
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const resolveRisk = useCallback(async (riskId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("project_risks")
      .update({ is_resolved: true })
      .eq("id", riskId);

    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  const updateRisk = useCallback(async (riskId: string, updates: Partial<Pick<Risk, "title" | "description" | "mitigation">>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("project_risks")
      .update(updates)
      .eq("id", riskId);

    if (error) {
      setError(error.message);
      return false;
    }
    return true;
  }, []);

  const getProbabilityColor = useCallback((probability: string) => {
    switch (probability) {
      case "low": return "bg-green-500";
      case "medium": return "bg-amber-500";
      case "high": return "bg-red-500";
      default: return "bg-ink-3";
    }
  }, []);

  const getProbabilityLabel = useCallback((probability: string) => {
    switch (probability) {
      case "low": return "Низкая";
      case "medium": return "Средняя";
      case "high": return "Высокая";
      default: return probability;
    }
  }, []);

  const unresolvedRisks = risks.filter((r) => !r.is_resolved);

  return { risks, loading, error, resolveRisk, updateRisk, getProbabilityColor, getProbabilityLabel, unresolvedRisks };
}