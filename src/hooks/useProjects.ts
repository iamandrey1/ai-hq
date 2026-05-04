"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (data && data.length > 0) {
        setProjects(data.map(p => ({
          id: p.id,
          slug: p.slug || "",
          name: p.name,
          category: p.category || "other",
          description: p.description || "",
          status: p.status || "active",
          progress: p.progress || 0,
          repo_url: p.repo_url,
          prod_url: p.prod_url,
          created_at: p.created_at,
          updated_at: p.updated_at,
          agents: p.agents || [],
        })));
      }
      setLoading(false);
    };

    loadProjects();
  }, []);

  return { projects, loading };
}