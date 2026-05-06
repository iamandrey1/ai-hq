"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/index";

function mapRow(p: Record<string, unknown>): Project {
  return {
    id: p.id as string,
    slug: (p.slug as string) || "",
    name: p.name as string,
    category: (p.category as Project["category"]) || "other",
    description: (p.description as string) || "",
    status: (p.status as Project["status"]) || "active",
    progress: (p.progress as number) || 0,
    repo_url: p.repo_url as string | undefined,
    prod_url: p.prod_url as string | undefined,
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
    agents: (p.agents as string[]) || [],
  };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const supabase = createClient(); // fresh client each call
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    if (data && data.length > 0) setProjects(data.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();

    const supabase = createClient(); // separate client for channel
    const channel = supabase
      .channel(`projects-rt-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => loadProjects())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadProjects]);

  const createProject = useCallback(async (data: {
    name: string; slug: string; description?: string;
    category: Project["category"]; status: Project["status"];
    repo_url?: string; prod_url?: string;
  }) => {
    const supabase = createClient();
    const { data: result, error } = await supabase
      .from("projects")
      .insert({ ...data, progress: 0, agents: [] })
      .select().single();
    if (error) { console.error("createProject:", error); return null; }
    const p = mapRow(result as Record<string, unknown>);
    setProjects(prev => [...prev, p]);
    return p;
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Omit<Project, "id" | "created_at">>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const supabase = createClient();
    const { error } = await supabase.from("projects").update(updates).eq("id", id);
    if (error) { await loadProjects(); return false; }
    return true;
  }, [loadProjects]);

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { await loadProjects(); return false; }
    return true;
  }, [loadProjects]);

  return { projects, loading, createProject, updateProject, deleteProject };
}
