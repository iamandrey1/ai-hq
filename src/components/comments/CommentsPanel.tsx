"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardMeta } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { useComments } from "@/hooks/useComments";
import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import { toast } from "sonner";

interface CommentsPanelProps {
  table: "task_comments" | "risk_comments";
  parentColumn: "task_id" | "risk_id";
  parentId: string | null;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function CommentsPanel({
  table,
  parentColumn,
  parentId,
  title = "Обсуждение",
  subtitle,
  className,
}: CommentsPanelProps) {
  const { profile } = useProfile();
  const { comments, loading, addComment, updateComment, deleteComment, toggleReaction } =
    useComments({ table, parentColumn, parentId });

  const [allProfiles, setAllProfiles] = useState<Pick<Profile, "id" | "full_name" | "initials">[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("id, full_name, initials").then(({ data }) => {
      if (data) setAllProfiles(data as Pick<Profile, "id" | "full_name" | "initials">[]);
    });
  }, []);

  const handleSubmit = async (content: string, mentions: string[]) => {
    const result = await addComment({ content, mentions });
    if (!result) {
      toast.error("Не удалось отправить — проверь RLS");
    }
  };

  return (
    <Card padding="none" className={className}>
      <CardHeader className="px-5 py-4 border-b border-line mb-0">
        <CardTitle>
          <MessageCircle size={14} className="text-ink-3" />
          {title}
        </CardTitle>
        {subtitle && <CardMeta>{subtitle}</CardMeta>}
      </CardHeader>

      <div className="px-5 py-4 max-h-[480px] overflow-y-auto space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={20} />}
            title="Пока нет комментариев"
            description="Начни обсуждение — упомяни напарника через @"
          />
        ) : (
          comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              isOwn={c.author_id === profile?.id}
              currentUserId={profile?.id}
              onEdit={async (id, content) => {
                const ok = await updateComment(id, content);
                if (!ok) toast.error("Не удалось обновить");
              }}
              onDelete={async (id) => {
                const ok = await deleteComment(id);
                if (!ok) toast.error("Не удалось удалить");
              }}
              onToggleReaction={(id, emoji) => toggleReaction(id, emoji)}
            />
          ))
        )}
      </div>

      <div className="border-t border-line px-5 py-3">
        <CommentInput
          onSubmit={handleSubmit}
          profiles={allProfiles}
        />
      </div>
    </Card>
  );
}
