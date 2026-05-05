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
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) { console.error("Failed to create task:", error); return false; }
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
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);
    if (error) { console.error("Failed to update task:", error); return false; }
    if (updates.status === "done") {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        logActivity({
          action_type: "task_done",
          description: `Закрыл задачу: ${task.title}`,
          project_id: task.project_id,
          entity_type: "task",
          entity_id: id,
        });
      }
    }
    return true;
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { console.error("Failed to delete task:", error); return false; }
    if (task) {
      logActivity({
        action_type: "task_deleted",
        description: `Удалил задачу: ${task.title}`,
        project_id: task.project_id,
        entity_type: "task",
        entity_id: id,
      });
    }
    return true;
  }, [tasks]);

  return { tasks, loading, createTask, updateTask, deleteTask };
}
