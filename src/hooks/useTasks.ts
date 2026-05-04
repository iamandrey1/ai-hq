"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setTasks(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel("tasks-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => loadTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createTask = useCallback(async (task: Omit<Task, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("tasks").insert(task);
    if (error) console.error("Failed to create task:", error);
    return !error;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id);
    if (error) console.error("Failed to update task:", error);
    return !error;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) console.error("Failed to delete task:", error);
    return !error;
  }, []);

  return { tasks, loading, createTask, updateTask, deleteTask };
}
