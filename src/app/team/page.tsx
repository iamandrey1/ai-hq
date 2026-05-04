"use client";

import { Corridor } from "@/components/Corridor";
import { useStore } from "@/lib/store";
import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/index";

const agentColors: Record<string, string> = {
  claude: "bg-accent text-bg",
  minimax: "bg-blue",
  chatgpt: "bg-[#4a7d5a] text-ink",
};
const agentLabels: Record<string, string> = {
  claude: "CL",
  minimax: "MM",
  chatgpt: "GP",
};
const statusLabels: Record<string, string> = {
  busy: "Занят",
  idle: "Свободен",
  queue: "В очереди",
};
const statusColors: Record<string, string> = {
  busy: "bg-accent/15 text-accent",
  idle: "bg-green/15 text-green",
  queue: "bg-blue/15 text-blue",
};

export default function TeamPage() {
  const { agents } = useStore();
  const { profile: currentUser } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const loadProfiles = async () => {
      const { data } = await supabase.from("profiles").select("*");
      if (data) setProfiles(data);
    };
    loadProfiles();
  }, []);

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
            AI-<em style={{ fontStyle: "italic", color: "var(--accent)" }}>команда</em>
          </h1>
          <p className="text-ink-3 text-sm">
            {agents.length} агента · управление и мониторинг
          </p>
        </div>

        {/* CEO Team */}
        <h2 className="font-display text-[22px] font-medium mb-4">
          CEO <em style={{ fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>команда</em>
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-10">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="bg-panel border border-line rounded-xl p-5 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
                  p.id === currentUser?.id
                    ? "bg-accent text-bg"
                    : "bg-blue text-ink"
                }`}
              >
                {p.initials || p.full_name?.charAt(0) || "?"}
              </div>
              <div>
                <div className="font-display text-lg font-medium">
                  {p.full_name || "Неизвестно"}
                  {p.id === currentUser?.id && (
                    <span className="ml-2 font-mono text-[10px] text-accent">(вы)</span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-ink-3 uppercase">
                  {p.role === "ceo" ? "CEO · Основатель" : p.role}
                </div>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded bg-green/15 text-green">
                  <span className="w-1.5 h-1.5 bg-green rounded-full" />
                  Online
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* AI Agents */}
        <h2 className="font-display text-[22px] font-medium mb-4">
          AI-<em style={{ fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>агенты</em>
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-panel border border-line rounded-xl p-6 flex items-center gap-5"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center font-mono text-xl font-bold ${agentColors[agent.id]}`}
              >
                {agentLabels[agent.id]}
              </div>
              <div className="flex-1">
                <div className="font-display text-xl font-medium mb-1">{agent.name}</div>
                <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.05em] mb-3">
                  {agent.role}
                </div>
                <div className={`inline-flex font-mono text-[10px] px-2.5 py-1 rounded-md ${statusColors[agent.status]}`}>
                  {statusLabels[agent.status]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
