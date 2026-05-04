"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Subscription {
  id: string;
  service: string;
  category: "ai" | "content" | "automation" | "hosting" | "other";
  cost_monthly_usd: number;
  status: "active" | "paused" | "cancelled";
  notes?: string;
  created_at: string;
}

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadSubs = useCallback(async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .order("cost_monthly_usd", { ascending: false });
    
    if (data) {
      setSubs(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSubs();

    const channel = supabase
      .channel("subs-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => loadSubs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const total = subs
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + Number(s.cost_monthly_usd), 0);

  const byCategory = subs.reduce((acc, s) => {
    if (s.status !== "active") return acc;
    acc[s.category] = (acc[s.category] || 0) + Number(s.cost_monthly_usd);
    return acc;
  }, {} as Record<string, number>);

  const createSub = useCallback(async (sub: Omit<Subscription, "id" | "created_at">) => {
    const { error } = await supabase.from("subscriptions").insert(sub);
    if (error) console.error("Failed to create subscription:", error);
    return !error;
  }, []);

  const updateSub = useCallback(async (id: string, updates: Partial<Subscription>) => {
    const { error } = await supabase
      .from("subscriptions")
      .update(updates)
      .eq("id", id);
    if (error) console.error("Failed to update subscription:", error);
    return !error;
  }, []);

  const deleteSub = useCallback(async (id: string) => {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (error) console.error("Failed to delete subscription:", error);
    return !error;
  }, []);

  return { subs, loading, total, byCategory, createSub, updateSub, deleteSub };
}
