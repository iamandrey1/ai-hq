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
    // Empty string for uuid column → "invalid input syntax" — normalize to null
    const payload = {
      title: task.title,
      description: task.description || null,
      project_id: task.project_id || null,
      status: task.status || "todo",
      priority: task.priority || "medium",
    };
    const { data, error } = await supabase.from("tasks").insert(payload).select().single();
    if (error) {
      console.error("createTask:", error.message, error.code, error.details);
      return false;
    }
    // Add immediately (realtime will deduplicate)
    setTasks((prev) => {
      const t = data as Task;
      return prev.some((x) => x.id === t.id) ? prev : [t, ...prev];
    });
    logActivity({
      action_type: "task_created",
      description: `Создал задачу: ${task.title}`,
      project_id: payload.project_id || undefined,
      entity_type: "task",
      entity_id: data?.id,
    });
    return true;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    // Only pass fields that exist on the tasks table — avoids trigger errors from stale schema
    const allowed = ["title", "description", "project_id", "status", "priority"] as const;
    const sanitized: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) {
        const value = updates[key as keyof typeof updates];
        // Empty string for uuid column → "invalid input syntax" — normalize to null
        if (key === "project_id" && value === "") {
          sanitized[key] = null;
        } else {
          sanitized[key] = value;
        }
      }
    }

    let prev: Task | undefined;
    setTasks((old) => {
      prev = old.find((t) => t.id === id);
      return old.map((t) => t.id === id ? { ...t, ...sanitized } : t);
    });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update(sanitized)
      .eq("id", id)
      .select();

    if (error) {
      if (prev) setTasks((old) => old.map((t) => t.id === id ? prev! : t));
      console.error("updateTask error:", error.message, error.code, error.details);
      return false;
    }
    if (!data || data.length === 0) {
      if (prev) setTasks((old) => old.map((t) => t.id === id ? prev! : t));
      console.warn("updateTask: 0 rows — id не найден или RLS блокирует:", id);
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
