"use client";
import { useState } from "react";
import { Corridor } from "@/components/Corridor";
import { useActivityLog, ACTION_LABELS } from "@/hooks/useActivityLog";
import { useProjects } from "@/hooks/useProjects";
import { Activity, Filter } from "lucide-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "long" });
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function ActivityPage() {
  const [projectFilter, setProjectFilter] = useState("");
  const { projects } = useProjects();
  const { entries, loading, loadMore, hasMore } = useActivityLog({
    projectId: projectFilter || undefined,
    limit: 30,
  });

  const groups: { date: string; items: typeof entries }[] = [];
  for (const entry of entries) {
    const label = formatDateLabel(entry.created_at);
    const last = groups[groups.length - 1];
    if (last && last.date === label) last.items.push(entry);
    else groups.push({ date: label, items: [entry] });
  }

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto bg-bg">
        <div className="border-b border-line px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-accent" />
              <h1 className="text-[20px] font-semibold text-ink">Активность</h1>
            </div>
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-ink-3" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-panel border border-line rounded px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/50"
              >
                <option value="">Все проекты</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 max-w-2xl">
          {loading && entries.length === 0 && (
            <div className="text-ink-3 text-sm text-center py-12">Загрузка...</div>
          )}
          {!loading && entries.length === 0 && (
            <div className="text-ink-3 text-sm text-center py-12">
              Нет записей активности
            </div>
          )}

          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.date}>
                <div className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-3">
                  {group.date}
                </div>
                <div className="space-y-px">
                  {group.items.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-panel transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-semibold text-accent shrink-0 mt-0.5">
                        {initials(entry.profile?.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-ink">
                            {entry.profile?.full_name || "Пользователь"}
                          </span>
                          <span className="text-[13px] text-ink-3">
                            {ACTION_LABELS[entry.action_type] || entry.action_type}
                          </span>
                          {entry.project && (
                            <span className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent rounded font-mono">
                              {entry.project.name}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-ink-3 mt-0.5 truncate">
                          {entry.description}
                        </div>
                      </div>
                      <div className="text-[11px] text-ink-3 shrink-0 mt-1 font-mono">
                        {formatTime(entry.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              className="mt-6 w-full py-2.5 text-sm text-ink-3 hover:text-ink border border-line rounded-lg hover:bg-panel transition-colors"
            >
              Загрузить ещё
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
