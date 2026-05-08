"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Paperclip, Smile, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

interface CommentInputProps {
  onSubmit: (content: string, mentions: string[]) => Promise<void> | void;
  profiles?: Pick<Profile, "id" | "full_name">[];
  placeholder?: string;
  autoFocus?: boolean;
}

const COMMON_EMOJIS = ["👍", "🔥", "💡", "✅", "❤️", "🚀", "👀", "🤔"];

export function CommentInput({
  onSubmit,
  profiles = [],
  placeholder = "Написать комментарий... (@упомянуть)",
  autoFocus,
}: CommentInputProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  // Detect @-mention while typing
  useEffect(() => {
    const m = value.match(/@([\p{L}\d_-]*)$/u);
    setMentionQuery(m ? m[1].toLowerCase() : null);
    setMentionIndex(0);
  }, [value]);

  const filteredMentions = mentionQuery !== null
    ? profiles
        .filter(p => p.full_name.toLowerCase().includes(mentionQuery))
        .slice(0, 5)
    : [];

  const insertMention = (profile: Pick<Profile, "id" | "full_name">) => {
    const handle = profile.full_name.split(" ")[0];
    setValue(v => v.replace(/@([\p{L}\d_-]*)$/u, `@${handle} `));
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (filteredMentions.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setMentionIndex(i => {
        const max = filteredMentions.length - 1;
        if (e.key === "ArrowDown") return Math.min(i + 1, max);
        return Math.max(i - 1, 0);
      });
      return;
    }
    if (filteredMentions.length > 0 && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      insertMention(filteredMentions[mentionIndex]);
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  const submit = async () => {
    if (!value.trim() || submitting) return;
    const text = value.trim();
    setSubmitting(true);

    // Resolve @-mentions to profile IDs
    const matches = text.match(/@([\p{L}\d_-]+)/gu) ?? [];
    const mentionIds = new Set<string>();
    for (const m of matches) {
      const handle = m.slice(1).toLowerCase();
      const p = profiles.find(pr => pr.full_name.toLowerCase().split(" ")[0] === handle);
      if (p) mentionIds.add(p.id);
    }

    try {
      await onSubmit(text, Array.from(mentionIds));
      setValue("");
    } finally {
      setSubmitting(false);
    }
  };

  const insertEmoji = (e: string) => {
    setValue(v => v + e);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Mention dropdown */}
      {filteredMentions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 bg-panel border border-line rounded-lg shadow-xl min-w-[200px] py-1 z-10">
          {filteredMentions.map((p, i) => (
            <button
              key={p.id}
              onClick={() => insertMention(p)}
              className={cn(
                "w-full px-3 py-1.5 text-left text-[13px] transition-colors flex items-center gap-2",
                i === mentionIndex ? "bg-panel-2 text-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink"
              )}
            >
              <span className="font-medium">@{p.full_name.split(" ")[0]}</span>
              <span className="text-ink-3 text-[11px] truncate">{p.full_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full right-0 mb-2 bg-panel border border-line rounded-lg shadow-xl p-2 z-10">
          <div className="grid grid-cols-4 gap-1">
            {COMMON_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => insertEmoji(e)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-panel-2 text-[16px] transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 bg-panel-2 border border-line focus-within:border-accent/40 rounded-xl px-3 py-2 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent border-0 outline-none resize-none text-[13px] text-ink placeholder:text-ink-3 leading-relaxed py-1 max-h-[200px]"
        />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled
            title="Прикрепить (скоро)"
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-panel transition-colors disabled:opacity-30"
            aria-label="Прикрепить файл"
          >
            <Paperclip size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowEmoji(s => !s)}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-panel transition-colors"
            aria-label="Эмодзи"
          >
            <Smile size={14} />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || submitting}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-accent text-white hover:bg-accent-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Отправить"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
      <div className="font-mono text-[10px] text-ink-3 mt-1.5 px-1">
        ⌘↵ отправить · @ упомянуть
      </div>
    </div>
  );
}
