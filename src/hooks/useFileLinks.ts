"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";

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
    const insertPayload = {
      title: data.title,
      url: data.url,
      icon_type: getIconType(data.url),
      project_id: data.project_id || null,
      tags: data.tags || [],
      added_by: user?.id || null,
    };
    const { data: row, error } = await supabase
      .from("file_links")
      .insert(insertPayload)
      .select("*, profiles(full_name), projects(name, slug)")
      .single();
    if (error || !row) {
      console.error("addFile:", error?.message, error?.code, error?.details);
      return false;
    }
    const r = row as Record<string, unknown>;
    const enriched: FileLink = {
      ...(r as unknown as FileLink),
      profile: (r.profiles as { full_name: string }) || undefined,
      project: (r.projects as { name: string; slug: string }) || undefined,
    };
    // Optimistic insert; realtime will dedupe by id
    setFiles((prev) => prev.some((f) => f.id === enriched.id) ? prev : [enriched, ...prev]);
    logActivity({
      action_type: "file_added",
      description: `Добавил файл: ${data.title}`,
      project_id: insertPayload.project_id || undefined,
      entity_type: "file_link",
      entity_id: enriched.id,
    });
    return true;
  }, []);

  const updateFile = useCallback(async (id: string, updates: Partial<Pick<FileLink, "title" | "url" | "tags" | "project_id">>) => {
    const patch: Record<string, unknown> = { ...updates };
    if (updates.url) patch.icon_type = getIconType(updates.url);
    if ("project_id" in patch && patch.project_id === "") patch.project_id = null;
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("file_links")
      .update(patch)
      .eq("id", id)
      .select("*, profiles(full_name), projects(name, slug)")
      .single();
    if (error || !data) {
      console.error("updateFile:", error?.message);
      return false;
    }
    const d = data as Record<string, unknown>;
    const enriched: FileLink = {
      ...(d as unknown as FileLink),
      profile: (d.profiles as { full_name: string }) || undefined,
      project: (d.projects as { name: string; slug: string }) || undefined,
    };
    setFiles((prev) => prev.map((f) => f.id === id ? enriched : f));
    return true;
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    let removed: FileLink | undefined;
    setFiles((prev) => {
      removed = prev.find((f) => f.id === id);
      return prev.filter((f) => f.id !== id);
    });
    const { error } = await supabase.from("file_links").delete().eq("id", id);
    if (error) {
      if (removed) setFiles((prev) => [removed!, ...prev]);
      console.error("deleteFile:", error.message);
      return false;
    }
    if (removed) {
      logActivity({
        action_type: "file_deleted",
        description: `Удалил файл: ${removed.title}`,
        project_id: removed.project_id || undefined,
        entity_type: "file_link",
        entity_id: id,
      });
    }
    return true;
  }, []);

  return { files, loading, addFile, updateFile, deleteFile };
}
