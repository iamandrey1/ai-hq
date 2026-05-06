"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";

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

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .order("cost_monthly_usd", { ascending: false });
      if (data) setSubs(data as Subscription[]);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("subs-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscriptions" }, (payload) => {
        const s = payload.new as Subscription;
        setSubs((prev) => prev.some((x) => x.id === s.id) ? prev : [s, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "subscriptions" }, (payload) => {
        const s = payload.new as Subscription;
        setSubs((prev) => prev.map((x) => x.id === s.id ? { ...x, ...s } : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "subscriptions" }, (payload) => {
        const old = payload.old as { id: string };
        setSubs((prev) => prev.filter((x) => x.id !== old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const total = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.cost_monthly_usd), 0);

  const byCategory = subs.reduce((acc, s) => {
    if (s.status !== "active") return acc;
    acc[s.category] = (acc[s.category] || 0) + Number(s.cost_monthly_usd);
    return acc;
  }, {} as Record<string, number>);

  const createSub = useCallback(async (sub: Omit<Subscription, "id" | "created_at">) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("subscriptions").insert(sub).select().single();
    if (error) { console.error("createSub:", error); return false; }
    // Add immediately (realtime deduplicates)
    setSubs((prev) => {
      const s = data as Subscription;
      return prev.some((x) => x.id === s.id) ? prev : [s, ...prev];
    });
    logActivity({ action_type: "subscription_added", description: `Добавил подписку: ${sub.service}`, entity_type: "subscription" });
    return true;
  }, []);

  const updateSub = useCallback(async (id: string, updates: Partial<Subscription>) => {
    let prev: Subscription | undefined;
    setSubs((old) => {
      prev = old.find((s) => s.id === id);
      return old.map((s) => s.id === id ? { ...s, ...updates } : s);
    });

    const supabase = createClient();
    const { error } = await supabase.from("subscriptions").update(updates).eq("id", id);

    if (error) {
      if (prev) setSubs((old) => old.map((s) => s.id === id ? prev! : s));
      console.error("updateSub:", error);
      return false;
    }
    return true;
  }, []);

  const deleteSub = useCallback(async (id: string) => {
    let removed: Subscription | undefined;
    setSubs((old) => {
      removed = old.find((s) => s.id === id);
      return old.filter((s) => s.id !== id);
    });

    const supabase = createClient();
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);

    if (error) {
      if (removed) setSubs((old) => [removed!, ...old]);
      console.error("deleteSub:", error);
      return false;
    }

    if (removed) {
      logActivity({ action_type: "subscription_deleted", description: `Удалил подписку: ${removed.service}`, entity_type: "subscription" });
    }
    return true;
  }, []);

  return { subs, loading, total, byCategory, createSub, updateSub, deleteSub };
}
