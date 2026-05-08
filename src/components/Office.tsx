"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  CheckSquare,
  FolderKanban,
  Sparkles,
  Activity as ActivityIcon,
  Wallet,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useProfile } from "@/hooks/useProfile";
import { useProjects } from "@/hooks/useProjects";
import { createClient } from "@/lib/supabase/client";
import { ACTION_LABELS } from "@/hooks/useActivityLog";

const projectIconPalette = [
  "from-accent to-[#2E7AA0]",
  "from-purple-400 to-[#7C5DD8]",
  "from-green to-[#16A34A]",
  "from-pink-400 to-[#DB2777]",
  "from-amber-400 to-[#D97706]",
];

function projectInitials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const statusPill: Record<string, { className: string; label: string }> = {
  active:      { className: "bg-green/10 text-green border-green/25",    label: "Active" },
  in_progress: { className: "bg-accent/10 text-accent border-accent/25", label: "Active" },
  paused:      { className: "bg-amber-400/10 text-amber-400 border-amber-400/25", label: "Pause" },
  done:        { className: "bg-blue/10 text-blue border-blue/25",       label: "Done" },
  archived:    { className: "bg-ink-3/10 text-ink-3 border-ink-3/25",    label: "Arch" },
};

interface ActivityRow {
  id: string;
  user_id: string | null;
  action_type: string;
  description: string;
  created_at: string;
  actor_name?: string | null;
  entity_name?: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | null;
}

interface SubscriptionRow {
  id: string;
  name: string;
  category: string | null;
  cost_monthly_usd: number;
}

const categoryColors: Record<string, string> = {
  ai:           "var(--accent)",
  hosting:      "rgb(167 139 250)",
  tools:        "rgb(var(--color-green))",
  marketing:    "rgb(245 158 11)",
  domain:       "rgb(244 114 182)",
  storage:      "rgb(var(--color-blue))",
  other:        "rgb(var(--color-ink-3))",
};

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)}м`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  return `${Math.floor(diff / 86400)}д`;
}

export function Office() {
  const { messages } = useStore();
  const { profile } = useProfile();
  const { projects, loading: projectsLoading } = useProjects();

  const [time, setTime] = useState(new Date());
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [openRisks, setOpenRisks] = useState<number>(0);
  const [openTasksCount, setOpenTasksCount] = useState<number>(0);
  const [budgetTotal, setBudgetTotal] = useState<number>(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const fetchAll = async () => {
      const [actRes, tasksRes, subsRes, risksRes, openTasksRes] = await Promise.all([
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("tasks").select("id, title, status, priority").neq("status", "done").order("created_at", { ascending: false }).limit(5),
        supabase.from("subscriptions").select("id, name, category, cost_monthly_usd").eq("status", "active"),
        supabase.from("project_risks").select("id", { count: "exact", head: true }).eq("is_resolved", false),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
      ]);
      if (actRes.data) {
        const rows = actRes.data as ActivityRow[];
        const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean) as string[])];
        if (userIds.length) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
          const map = new Map((profs || []).map(p => [p.id as string, p.full_name as string]));
          setActivity(rows.map(r => ({ ...r, actor_name: r.user_id ? map.get(r.user_id) ?? null : null })));
        } else {
          setActivity(rows);
        }
      }
      if (tasksRes.data) setTasks(tasksRes.data as TaskRow[]);
      if (subsRes.data) {
        setSubscriptions(subsRes.data as SubscriptionRow[]);
        setBudgetTotal((subsRes.data as SubscriptionRow[]).reduce((s, r) => s + Number(r.cost_monthly_usd || 0), 0));
      }
      if (risksRes.count !== null && risksRes.count !== undefined) setOpenRisks(risksRes.count);
      if (openTasksRes.count !== null && openTasksRes.count !== undefined) setOpenTasksCount(openTasksRes.count);
    };
    fetchAll();
  }, []);

  const userName = profile?.full_name ? profile.full_name.split(" ")[0] : "команда";
  const hour = time.getHours();
  const greeting =
    hour >= 6 && hour < 12 ? "Доброе утро" :
    hour < 18              ? "Добрый день" :
                             "Добрый вечер";

  const dateStr = time.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  const lastClaudeMsg = [...messages].reverse().find(m => m.sender === "claude");

  // Budget category breakdown
  const byCategory = subscriptions.reduce<Record<string, number>>((acc, s) => {
    const k = (s.category || "other").toLowerCase();
    acc[k] = (acc[k] || 0) + Number(s.cost_monthly_usd || 0);
    return acc;
  }, {});
  const totalBudget = budgetTotal;
  const budgetEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="px-4 md:px-8 py-8 pb-16 max-w-[1480px] w-full">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink leading-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-[13px] text-ink-3 mt-1 capitalize">
            {dateStr} · {timeStr}
            {projects.length > 0 && (
              <>
                <span className="inline-block w-1 h-1 rounded-full bg-ink-3 mx-2 align-middle" />
                {projects.filter(p => p.status === "active" || p.status === "in_progress").length} активных
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-panel border border-line rounded-lg text-[12px] font-medium text-ink hover:bg-panel-2 hover:border-line-2 transition-colors"
          >
            <Plus size={14} className="opacity-70" /> Новый проект
          </Link>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-panel border border-line rounded-lg text-[12px] font-medium text-ink hover:bg-panel-2 hover:border-line-2 transition-colors"
          >
            <CheckSquare size={14} className="opacity-70" /> Новая задача
          </Link>
          <Link
            href="/files"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-[12px] font-medium hover:bg-accent-2 transition-colors"
          >
            <Search size={14} className="opacity-90" /> Поиск
          </Link>
        </div>
      </div>

      {/* KPI ticker */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden mb-4">
        <div className="bg-panel p-4 hover:bg-panel-2 transition-colors">
          <div className="text-[11px] text-ink-3 uppercase tracking-wider font-medium">Активных проектов</div>
          <div className="font-mono text-[22px] font-semibold text-ink mt-1.5 tracking-tight">
            {projectsLoading ? "—" : projects.filter(p => p.status === "active" || p.status === "in_progress").length}
          </div>
          <div className="font-mono text-[11px] text-ink-3 mt-1">всего {projects.length}</div>
        </div>
        <div className="bg-panel p-4 hover:bg-panel-2 transition-colors">
          <div className="text-[11px] text-ink-3 uppercase tracking-wider font-medium">Открытых задач</div>
          <div className="font-mono text-[22px] font-semibold text-ink mt-1.5 tracking-tight">
            {openTasksCount}
          </div>
          <div className="font-mono text-[11px] text-green mt-1 inline-flex items-center gap-1">
            <TrendingUp size={11} /> в работе
          </div>
        </div>
        <div className="bg-panel p-4 hover:bg-panel-2 transition-colors">
          <div className="text-[11px] text-ink-3 uppercase tracking-wider font-medium">Бюджет, мес.</div>
          <div className="font-mono text-[22px] font-semibold text-ink mt-1.5 tracking-tight">
            ${Math.round(totalBudget).toLocaleString()}
          </div>
          <div className="font-mono text-[11px] text-ink-3 mt-1 inline-flex items-center gap-1">
            <TrendingDown size={11} /> {subscriptions.length} подписок
          </div>
        </div>
        <div className="bg-panel p-4 hover:bg-panel-2 transition-colors">
          <div className="text-[11px] text-ink-3 uppercase tracking-wider font-medium">Открытых рисков</div>
          <div className="font-mono text-[22px] font-semibold text-ink mt-1.5 tracking-tight">{openRisks}</div>
          <div className={`font-mono text-[11px] mt-1 inline-flex items-center gap-1 ${openRisks > 0 ? "text-red" : "text-ink-3"}`}>
            <AlertTriangle size={11} /> {openRisks > 0 ? "требует внимания" : "под контролем"}
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* Projects card */}
        <div className="md:col-span-8 md:row-span-2 bg-panel border border-line rounded-xl p-5 hover:shadow-lg hover:-translate-y-px transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <FolderKanban size={14} className="text-ink-3" /> Проекты
            </div>
            <Link href="/projects" className="font-mono text-[11px] text-accent hover:text-accent-2 transition-colors">
              Все →
            </Link>
          </div>
          {projectsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-panel-2 animate-pulse rounded-lg" />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-ink-3 text-[13px]">Нет проектов. Создай первый.</div>
          ) : (
            <div className="-mx-2">
              {projects.slice(0, 5).map((p, i) => {
                const status = statusPill[p.status] || statusPill.active;
                const palette = projectIconPalette[i % projectIconPalette.length];
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="grid grid-cols-[28px_1fr_auto] md:grid-cols-[28px_1fr_auto_100px_auto] items-center gap-3 px-2 py-3 rounded-lg hover:bg-panel-2 transition-colors no-underline group"
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${palette} grid place-items-center text-[10px] font-bold text-white shrink-0`}>
                      {projectInitials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate">{p.name}</div>
                      <div className="text-[11px] text-ink-3 truncate">
                        {p.description || `${p.category} · ${p.progress}%`}
                      </div>
                    </div>
                    <span className={`hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.className}`}>
                      {status.label}
                    </span>
                    <div className="hidden md:block w-[100px] h-[3px] bg-panel-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="font-mono text-[11px] text-ink-3 text-right w-8 hidden md:block">{p.progress}%</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Brief card */}
        <div className="md:col-span-4 md:row-span-2 bg-panel border border-accent/30 rounded-xl p-5 relative overflow-hidden flex flex-col"
             style={{ boxShadow: "0 0 40px rgba(77,158,191,0.08)" }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Sparkles size={14} className="text-accent" /> AI Brief
            </div>
            <span className="font-mono text-[11px] text-ink-3">обновлено {timeStr}</span>
          </div>
          <div className="flex-1 text-[13px] leading-relaxed text-ink-2">
            {lastClaudeMsg ? (
              <p className="line-clamp-6">{lastClaudeMsg.content}</p>
            ) : (
              <>
                <p>
                  Сегодня <strong className="text-accent">{projects.filter(p => p.status === "active" || p.status === "in_progress").length} активных</strong> проектов
                  {openRisks > 0 && (
                    <>, {openRisks} {openRisks === 1 ? "открытый риск" : "открытых рисков"}</>
                  )}
                  .
                </p>
                {openTasksCount > 0 && (
                  <p className="mt-2.5">
                    На повестке <strong className="text-accent">{openTasksCount}</strong> {openTasksCount === 1 ? "задача" : "задач"}.
                    Стоит закрыть приоритетные до конца дня.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="bg-panel-2 border-l-2 border-accent rounded-lg p-3 my-3">
            <div className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1.5">Рекомендация</div>
            <div className="text-[12px] text-ink leading-snug">
              {openRisks > 0
                ? "Просмотри открытые риски — они могут заблокировать релиз."
                : "Самое время добавить новый KPI или зафиксировать прогресс."}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-panel-2 border border-line rounded-lg mt-auto">
            <Sparkles size={13} className="text-accent shrink-0" />
            <input
              placeholder="Спросить про любой проект..."
              className="flex-1 bg-transparent border-0 outline-none text-[13px] text-ink placeholder:text-ink-3"
            />
            <span className="font-mono text-[10px] text-ink-3 shrink-0">↵</span>
          </div>
        </div>

        {/* Activity */}
        <div className="md:col-span-4 md:row-span-2 bg-panel border border-line rounded-xl p-5 hover:shadow-lg hover:-translate-y-px transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <ActivityIcon size={14} className="text-ink-3" /> Активность
            </div>
            <Link href="/activity" className="font-mono text-[11px] text-accent hover:text-accent-2 transition-colors">
              Все →
            </Link>
          </div>
          {activity.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-ink-3">Нет активности</div>
          ) : (
            <div className="space-y-px">
              {activity.map(a => (
                <div key={a.id} className="grid grid-cols-[24px_1fr_auto] gap-2.5 py-2 border-b border-line last:border-0 text-[12px]">
                  <div className="w-6 h-6 rounded-full bg-panel-2 grid place-items-center shrink-0">
                    <ActivityIcon size={12} className="text-ink-3" />
                  </div>
                  <div className="text-ink min-w-0 truncate">
                    <b className="font-semibold">{a.actor_name || "Кто-то"}</b>{" "}
                    <span className="text-ink-3">{ACTION_LABELS[a.action_type] || a.action_type}</span>
                  </div>
                  <div className="font-mono text-[10px] text-ink-3 shrink-0">{relativeTime(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="md:col-span-4 md:row-span-2 bg-panel border border-line rounded-xl p-5 hover:shadow-lg hover:-translate-y-px transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <CheckSquare size={14} className="text-ink-3" /> Сегодня
            </div>
            <span className="font-mono text-[11px] text-ink-3">{tasks.length} / {openTasksCount}</span>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-ink-3">Нет открытых задач</div>
          ) : (
            <div>
              {tasks.map(t => (
                <Link
                  key={t.id}
                  href="/tasks"
                  className="grid grid-cols-[16px_1fr_auto] gap-2.5 items-center py-2.5 border-b border-line last:border-0 text-[12px] no-underline hover:opacity-80 transition-opacity"
                >
                  <span className="w-3.5 h-3.5 rounded border-[1.5px] border-ink-3 cursor-pointer" />
                  <span className="text-ink font-medium truncate">{t.title}</span>
                  {t.priority && (
                    <span className={`text-[10px] font-semibold px-1.5 py-px rounded ${
                      t.priority === "high"   ? "bg-red/12 text-red" :
                      t.priority === "medium" ? "bg-amber-400/12 text-amber-400" :
                                                "bg-ink-3/12 text-ink-3"
                    }`}>
                      {t.priority === "high" ? "High" : t.priority === "medium" ? "Med" : "Low"}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="md:col-span-4 md:row-span-2 bg-panel border border-line rounded-xl p-5 hover:shadow-lg hover:-translate-y-px transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Wallet size={14} className="text-ink-3" /> Бюджет
            </div>
            <Link href="/budget" className="font-mono text-[11px] text-accent hover:text-accent-2 transition-colors">
              Все →
            </Link>
          </div>
          <div className="font-mono text-[26px] font-semibold text-ink tracking-tight">
            ${Math.round(totalBudget).toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-3">в месяц · {subscriptions.length} активных</div>
          {totalBudget > 0 && (
            <>
              <div className="flex gap-px h-2 rounded overflow-hidden bg-panel-2 mt-3">
                {budgetEntries.map(([cat, amount]) => {
                  const pct = (amount / totalBudget) * 100;
                  return (
                    <span
                      key={cat}
                      style={{
                        width: `${pct}%`,
                        background: categoryColors[cat] || categoryColors.other,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {budgetEntries.slice(0, 5).map(([cat, amount]) => (
                  <div key={cat} className="inline-flex items-center gap-1.5 text-[11px] text-ink-3">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: categoryColors[cat] || categoryColors.other }}
                    />
                    {cat} · ${Math.round(amount)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
