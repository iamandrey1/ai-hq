"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

// Generic comments hook used by both task_comments and risk_comments tables.
// They have identical schema except for parent FK column (task_id vs risk_id).

export type CommentAttachment = {
  name: string;
  url: string;
  size_bytes?: number;
  mime?: string;
};

export type CommentReactions = Record<string, string[]>; // emoji -> uuid[] of reactors

export interface Comment {
  id: string;
  author_id: string;
  content: string;
  attachments: CommentAttachment[];
  reactions: CommentReactions;
  mentions: string[];
  created_at: string;
  updated_at: string;
  // joined
  author?: Pick<Profile, "id" | "full_name" | "initials"> | null;
}

type CommentTable = "task_comments" | "risk_comments";
type ParentColumn = "task_id" | "risk_id";

interface UseCommentsOptions {
  table: CommentTable;
  parentColumn: ParentColumn;
  parentId: string | null;
}

const tableToParent: Record<CommentTable, ParentColumn> = {
  task_comments: "task_id",
  risk_comments: "risk_id",
};

export function useComments({ table, parentColumn, parentId }: UseCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!parentId) { setComments([]); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Two-step load (no FK on profiles is needed because we resolve manually).
    const { data: rows, error: rowErr } = await supabase
      .from(table)
      .select("*")
      .eq(parentColumn, parentId)
      .order("created_at", { ascending: true });

    if (rowErr) {
      console.error(`useComments[${table}] load:`, rowErr);
      setError(rowErr.message);
      setLoading(false);
      return;
    }

    const authorIds = Array.from(new Set((rows ?? []).map(r => r.author_id))).filter(Boolean);
    const profilesMap = new Map<string, Pick<Profile, "id" | "full_name" | "initials">>();
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, initials")
        .in("id", authorIds);
      (profs ?? []).forEach(p => profilesMap.set(p.id, p as Pick<Profile, "id" | "full_name" | "initials">));
    }

    setComments((rows ?? []).map(r => ({
      ...(r as Comment),
      attachments: (r.attachments as CommentAttachment[]) ?? [],
      reactions: (r.reactions as CommentReactions) ?? {},
      mentions: (r.mentions as string[]) ?? [],
      author: profilesMap.get(r.author_id) ?? null,
    })));
    setLoading(false);
  }, [table, parentColumn, parentId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!parentId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${table}-${parentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `${parentColumn}=eq.${parentId}` },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, parentColumn, parentId, load]);

  const addComment = useCallback(async (params: {
    content: string;
    attachments?: CommentAttachment[];
    mentions?: string[];
  }) => {
    if (!parentId) return null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const insertRow = {
      [parentColumn]: parentId,
      author_id: user.id,
      content: params.content,
      attachments: params.attachments ?? [],
      mentions: params.mentions ?? [],
      reactions: {},
    };

    const { data, error: insErr } = await supabase
      .from(table)
      .insert(insertRow)
      .select()
      .single();

    if (insErr) { console.error(`useComments[${table}] add:`, insErr); return null; }
    return data as Comment;
  }, [table, parentColumn, parentId]);

  const updateComment = useCallback(async (id: string, content: string) => {
    const supabase = createClient();
    const { error: e } = await supabase.from(table).update({ content, updated_at: new Date().toISOString() }).eq("id", id);
    if (e) { console.error(`useComments[${table}] update:`, e); return false; }
    return true;
  }, [table]);

  const deleteComment = useCallback(async (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    const supabase = createClient();
    const { error: e } = await supabase.from(table).delete().eq("id", id);
    if (e) { console.error(`useComments[${table}] delete:`, e); load(); return false; }
    return true;
  }, [table, load]);

  const toggleReaction = useCallback(async (commentId: string, emoji: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const current = comments.find(c => c.id === commentId);
    if (!current) return false;

    const reactions = { ...current.reactions };
    const list = reactions[emoji] ?? [];
    const has = list.includes(user.id);

    reactions[emoji] = has ? list.filter(id => id !== user.id) : [...list, user.id];
    if (reactions[emoji].length === 0) delete reactions[emoji];

    // optimistic
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions } : c));

    const { error: e } = await supabase.from(table).update({ reactions }).eq("id", commentId);
    if (e) {
      console.error(`useComments[${table}] toggleReaction:`, e);
      load();
      return false;
    }
    return true;
  }, [table, comments, load]);

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    toggleReaction,
    reload: load,
  };
}

// Convenience wrappers
export const useTaskComments = (taskId: string | null) =>
  useComments({ table: "task_comments", parentColumn: tableToParent.task_comments, parentId: taskId });

export const useRiskComments = (riskId: string | null) =>
  useComments({ table: "risk_comments", parentColumn: tableToParent.risk_comments, parentId: riskId });

// Mention parser — finds @username patterns in text, looks up by full_name.
// Returns array of profile UUIDs to store in `mentions` column.
export function parseMentions(text: string, profiles: Pick<Profile, "id" | "full_name">[]): string[] {
  const matches = text.match(/@([\p{L}\d_-]+)/gu);
  if (!matches) return [];
  const ids = new Set<string>();
  for (const m of matches) {
    const handle = m.slice(1).toLowerCase();
    const profile = profiles.find(p =>
      p.full_name.toLowerCase().startsWith(handle) ||
      p.full_name.toLowerCase().split(" ")[0] === handle
    );
    if (profile) ids.add(profile.id);
  }
  return Array.from(ids);
}
