"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface FileLink {
  id: string;
  title: string;
  url: string;
  icon_type: string | null;
  project_id: string | null;
  tags: string[] | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string };
  project?: { name: string; slug: string };
}

export function getIconType(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host.includes("docs.google") || host.includes("drive.google")) {
      const path = new URL(url).pathname;
      if (path.includes("/spreadsheets")) return "gsheet";
      if (path.includes("/presentation")) return "gslides";
      if (path.includes("/drive")) return "gdrive";
      return "gdoc";
    }
    if (host.includes("notion.so")) return "notion";
    if (host.includes("figma.com")) return "figma";
    if (host.includes("github.com")) return "github";
    if (host.includes("vercel.com") || host.includes("vercel.app")) return "vercel";
    return "link";
  } catch {
    return "link";
  }
}

export const ICON_LABELS: Record<string, string> = {
  gdoc:    "Google Doc",
  gsheet:  "Google Sheet",
  gslides: "Google Slides",
  gdrive:  "Google Drive",
  notion:  "Notion",
  figma:   "Figma",
  github:  "GitHub",
  vercel:  "Vercel",
  link:    "Ссылка",
};

export function useFileLinks(projectId?: string | null) {
  const [files, setFiles] = useState<FileLink[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    let q = supabase
      .from("file_links")
      .select("*, profiles(full_name), projects(name, slug)")
      .order("created_at", { ascending: false });

    if (projectId !== undefined) {
      q = projectId ? q.eq("project_id", projectId) : q.is("project_id", null);
    }

    const { data } = await q;
    if (data) {
      setFiles(data.map((row: Record<string, unknown>) => ({
        ...row,
        profile: (row.profiles as { full_name: string }) || undefined,
        project: (row.projects as { name: string; slug: string }) || undefined,
      })) as FileLink[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`file-links-${projectId ?? "all"}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "file_links" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const addFile = useCallback(async (data: {
    title: string;
    url: string;
    project_id?: string | null;
    tags?: string[];
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("file_links").insert({
      title: data.title,
      url: data.url,
      icon_type: getIconType(data.url),
      project_id: data.project_id || null,
      tags: data.tags || [],
      added_by: user?.id || null,
    });
    return !error;
  }, []);

  const updateFile = useCallback(async (id: string, updates: Partial<Pick<FileLink, "title" | "url" | "tags" | "project_id">>) => {
    const patch: Record<string, unknown> = { ...updates };
    if (updates.url) patch.icon_type = getIconType(updates.url);
    patch.updated_at = new Date().toISOString();
    const { error } = await supabase.from("file_links").update(patch).eq("id", id);
    return !error;
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    const { error } = await supabase.from("file_links").delete().eq("id", id);
    return !error;
  }, []);

  return { files, loading, addFile, updateFile, deleteFile };
}
