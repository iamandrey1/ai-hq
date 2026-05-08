"use client";

import { useState } from "react";
import { Pencil, Trash2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import type { Comment } from "@/hooks/useComments";

interface CommentItemProps {
  comment: Comment;
  isOwn: boolean;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  currentUserId?: string;
}

const COMMON_REACTIONS = ["👍", "🔥", "💡", "✅", "❤️"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "сейчас";
  if (min < 60) return `${min}м`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}ч`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}д`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function renderContent(text: string) {
  // Split on @mentions and render highlighted
  const parts = text.split(/(@[\p{L}\d_-]+)/gu);
  return parts.map((p, i) =>
    p.startsWith("@")
      ? <span key={i} className="text-accent font-medium">{p}</span>
      : <span key={i}>{p}</span>
  );
}

export function CommentItem({ comment, isOwn, onEdit, onDelete, onToggleReaction, currentUserId }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  const authorName = comment.author?.full_name?.split(" ")[0] ?? "Кто-то";
  const initials = comment.author?.initials ?? authorName.charAt(0);
  const isMe = isOwn;

  const handleSaveEdit = () => {
    if (draft.trim() && draft !== comment.content) {
      onEdit?.(comment.id, draft.trim());
    }
    setEditing(false);
  };

  return (
    <div className="flex gap-3 group/comment">
      <Avatar
        size="sm"
        initials={initials}
        tone={isMe ? "accent" : "purple"}
      />
      <div className="flex-1 min-w-0">
        <div className="bg-panel-2 border border-line rounded-xl rounded-tl-sm px-3.5 py-2.5">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[12px] font-semibold text-ink">{authorName}</span>
            {isMe && <span className="font-mono text-[9px] text-accent">(вы)</span>}
            <span className="font-mono text-[10px] text-ink-3">{timeAgo(comment.created_at)}</span>
            {comment.updated_at !== comment.created_at && (
              <span className="font-mono text-[9px] text-ink-3 italic">изменено</span>
            )}
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                autoFocus
                className="w-full bg-bg border border-accent/40 rounded px-2 py-1.5 text-[13px] text-ink outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setEditing(false); setDraft(comment.content); }
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { handleSaveEdit(); }
                }}
              />
              <div className="flex gap-2 text-[11px]">
                <button onClick={handleSaveEdit} className="text-accent hover:underline">Сохранить</button>
                <button onClick={() => { setEditing(false); setDraft(comment.content); }} className="text-ink-3 hover:text-ink">
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
              {renderContent(comment.content)}
            </div>
          )}

          {comment.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {comment.attachments.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-bg border border-line rounded-md text-[11px] text-ink-2 hover:text-ink hover:border-line-2 transition-colors"
                >
                  <Paperclip size={11} />
                  {a.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {(Object.keys(comment.reactions).length > 0 || showReactionsMenu) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(comment.reactions).map(([emoji, userIds]) => {
              const isReacted = currentUserId ? userIds.includes(currentUserId) : false;
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction?.(comment.id, emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-all",
                    isReacted
                      ? "bg-accent/12 border-accent/30 text-accent"
                      : "bg-panel border-line text-ink-2 hover:border-line-2"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-mono">{userIds.length}</span>
                </button>
              );
            })}
            {showReactionsMenu && (
              <div className="inline-flex gap-0.5 px-1 py-0.5 rounded-full bg-panel border border-line">
                {COMMON_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { onToggleReaction?.(comment.id, emoji); setShowReactionsMenu(false); }}
                    className="w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-panel-2 text-[14px] transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
          <button
            onClick={() => setShowReactionsMenu(s => !s)}
            className="text-[10px] text-ink-3 hover:text-ink"
            aria-label="Добавить реакцию"
          >
            + реакция
          </button>
          {isMe && !editing && (
            <>
              <span className="text-ink-3">·</span>
              <button
                onClick={() => setEditing(true)}
                className="text-[10px] text-ink-3 hover:text-ink inline-flex items-center gap-0.5"
              >
                <Pencil size={9} /> править
              </button>
              <span className="text-ink-3">·</span>
              <button
                onClick={() => onDelete?.(comment.id)}
                className="text-[10px] text-ink-3 hover:text-red inline-flex items-center gap-0.5"
              >
                <Trash2 size={9} /> удалить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
