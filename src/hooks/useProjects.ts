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
  const supabase = createClient();

  const loadProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setProjects(data.map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();

    const channel = supabase
      .channel("projects-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => loadProjects())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { projects, loading };
}
