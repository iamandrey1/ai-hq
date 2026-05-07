"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface BudgetItem {
  id: string;
  project_id: string;
  category: string;
  amount: number;
  spent: number;
  color: string;
  created_at: string;
}

export function useProjectBudget(projectId: string | null) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!projectId) { setItems([]); setLoading(false); return; }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("project_budget")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setItems(data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setItems([]); setLoading(false); return; }
    fetchItems();
    const supabase = createClient();
    const channel = supabase
      .channel(`budget-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_budget", filter: `project_id=eq.${projectId}` }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const totalBudget = items.reduce((s, i) => s + Number(i.amount), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent), 0);

  const addItem = useCallback(async (data: { category: string; amount: number; spent?: number; color?: string }) => {
    if (!projectId) return null;
    const supabase = createClient();
    const { data: result, error } = await supabase
      .from("project_budget")
      .insert({
        project_id: projectId,
        category: data.category,
        amount: data.amount,
        spent: data.spent ?? 0,
        color: data.color ?? "#4D9EBF",
      })
      .select().single();
    if (error) { setError(error.message); return null; }
    setItems(prev => prev.some(x => x.id === (result as BudgetItem).id) ? prev : [...prev, result as BudgetItem]);
    return result as BudgetItem;
  }, [projectId]);

  const updateItem = useCallback(async (id: string, updates: Partial<Pick<BudgetItem, "category" | "amount" | "spent" | "color">>) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
    const supabase = createClient();
    const { error } = await supabase.from("project_budget").update(updates).eq("id", id);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("project_budget").delete().eq("id", id);
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  return { items, loading, error, totalBudget, totalSpent, addItem, updateItem, deleteItem };
}
