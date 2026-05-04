"use client";

import { Corridor } from "@/components/Corridor";
import { useStore } from "@/lib/store";
import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/types/index";

const agentColors: Record<string, string> = {
  claude:  "bg-accent text-white",
  minimax: "bg-blue text-white",
  chatgpt: "bg-green text-white",
};
const agentLabels: Record<string, string> = {
  claude:  "CL",
  minimax: "MM",
  chatgpt: "GP",
};
const statusLabels: Record<string, string> = {
  busy:  "Занят",
  idle:  "Свободен",
  queue: "В очереди",
};
const statusColors: Record<string, string> = {
  busy:  "text-accent bg-accent/10",
  idle:  "text-green bg-green/10",
  queue: "text-blue bg-blue/10",
};

export default function TeamPage() {
  const { agents } = useStore();
  const { profile: currentUser } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) setProfiles(data as Profile[]);
  }, []);

  useEffect(() => {
    loadProfiles();

    const channel = supabase
      .channel("team-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadProfiles())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditName(p.full_name || "");
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const cancelEdit = () => { setEditingId(null); setEditName(""); };

  const saveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) { cancelEdit(); return; }

    // Optimistic update
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, full_name: trimmed } : p));
    cancelEdit();

    const { error } = await supabase.from("profiles").update({ full_name: trimmed }).eq("id", id);
    if (error) {
      toast.error("Ошибка при сохранении");
      loadProfiles();
    } else {
      toast.success("Имя обновлено");
    }
  };

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-8 py-8 pb-16 bg-bg">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-1">Команда</h1>
          <p className="text-sm text-ink-3">{agents.length} AI-агента · {profiles.length} CEO</p>
        </div>

        {/* CEO Section */}
        <h2 className="text-[13px] font-semibold text-ink-3 uppercase tracking-wider mb-3">CEO</h2>
        <div className="grid grid-cols-2 gap-3 mb-10">
          {profiles.map(p => {
            const isMe = p.id === currentUser?.id;
            const isEditing = editingId === p.id;

            return (
              <div key={p.id} className="bg-panel border border-line rounded-lg p-4 flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-semibold shrink-0 ${
                  isMe ? "bg-accent text-white" : "bg-blue text-white"
                }`}>
                  {p.initials || p.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={editRef}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveEdit(p.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 bg-bg border border-accent/40 rounded px-2 py-1 text-sm text-ink outline-none"
                        maxLength={60}
                      />
                      <button onClick={() => saveEdit(p.id)} className="text-green hover:text-green/80">
                        <Check size={14} />
                      </button>
                      <button onClick={cancelEdit} className="text-ink-3 hover:text-ink">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-ink truncate">{p.full_name || "—"}</span>
                      {isMe && <span className="font-mono text-[9px] text-accent shrink-0">(вы)</span>}
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-ink-3 uppercase mt-0.5">
                    {p.role === "ceo" ? "CEO · Основатель" : p.role}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded bg-green/10 text-green">
                    <span className="w-1.5 h-1.5 bg-green rounded-full" />
                    Online
                  </span>
                  {isMe && !isEditing && (
                    <button
                      onClick={() => startEdit(p)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-panel-2 rounded text-ink-3 hover:text-ink"
                      title="Редактировать имя"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Agents */}
        <h2 className="text-[13px] font-semibold text-ink-3 uppercase tracking-wider mb-3">AI-агенты</h2>
        <div className="grid grid-cols-2 gap-3">
          {agents.map(agent => (
            <div key={agent.id} className="bg-panel border border-line rounded-lg p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-mono text-[16px] font-bold ${agentColors[agent.id] || "bg-ink-3 text-white"}`}>
                {agentLabels[agent.id] || agent.id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-ink mb-0.5">{agent.name}</div>
                <div className="font-mono text-[10px] text-ink-3 uppercase mb-2">{agent.role}</div>
                <span className={`inline-flex font-mono text-[10px] px-2 py-0.5 rounded ${statusColors[agent.status] || "text-ink-3 bg-ink-3/10"}`}>
                  {statusLabels[agent.status] || agent.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
