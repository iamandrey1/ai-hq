"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  created_at: string;
  updated_at: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setTasks(data as Task[]);
      setLoading(false);
    };

    load();

    // Payload-based realtime — no full reload
    const channel = supabase
      .channel(`tasks-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, (payload) => {
        const t = payload.new as Task;
        setTasks((prev) => prev.some((x) => x.id === t.id) ? prev : [t, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        const t = payload.new as Task;
        setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, ...t } : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, (payload) => {
        const old = payload.old as { id: string };
        setTasks((prev) => prev.filter((x) => x.id !== old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const createTask = useCallback(async (task: Omit<Task, "id" | "created_at" | "updated_at">) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) { console.error("createTask:", error); return false; }
    // Add immediately (realtime will deduplicate)
    setTasks((prev) => {
      const t = data as Task;
      return prev.some((x) => x.id === t.id) ? prev : [t, ...prev];
    });
    logActivity({
      action_type: "task_created",
      description: `Создал задачу: ${task.title}`,
      project_id: task.project_id,
      entity_type: "task",
      entity_id: data?.id,
    });
    return true;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    // Optimistic: update state before waiting for DB
    let prev: Task | undefined;
    setTasks((old) => {
      prev = old.find((t) => t.id === id);
      return old.map((t) => t.id === id ? { ...t, ...updates } : t);
    });

    const supabase = createClient();
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);

    if (error) {
      // Rollback
      if (prev) setTasks((old) => old.map((t) => t.id === id ? prev! : t));
      console.error("updateTask:", error);
      return false;
    }

    if (updates.status === "done" && prev) {
      logActivity({
        action_type: "task_done",
        description: `Закрыл задачу: ${prev.title}`,
        project_id: prev.project_id,
        entity_type: "task",
        entity_id: id,
      });
    }
    return true;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    // Optimistic: remove immediately
    let removed: Task | undefined;
    setTasks((old) => {
      removed = old.find((t) => t.id === id);
      return old.filter((t) => t.id !== id);
    });

    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      // Rollback
      if (removed) setTasks((old) => [removed!, ...old]);
      console.error("deleteTask:", error);
      return false;
    }

    if (removed) {
      logActivity({
        action_type: "task_deleted",
        description: `Удалил задачу: ${removed.title}`,
        project_id: removed.project_id,
        entity_type: "task",
        entity_id: id,
      });
    }
    return true;
  }, []);

  return { tasks, loading, createTask, updateTask, deleteTask };
}
