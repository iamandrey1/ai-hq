"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useProfile } from "@/hooks/useProfile";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Sun, Moon, LayoutDashboard, FolderKanban, GitBranch,
  CheckSquare, Users, DollarSign, Settings, Pencil, Check, X,
  Link as LinkIcon, Activity,
} from "lucide-react";
import type { Profile } from "@/types/index";

const navItems = [
  { href: "/office",    label: "Офис",       icon: LayoutDashboard },
  { href: "/projects",  label: "Проекты",    icon: FolderKanban },
  { href: "/roadmap",   label: "Roadmap",    icon: GitBranch },
  { href: "/tasks",     label: "Задачи",     icon: CheckSquare },
  { href: "/team",      label: "Команда",    icon: Users },
  { href: "/files",     label: "Файлы",      icon: LinkIcon },
  { href: "/activity",  label: "Активность", icon: Activity },
];

const financeItems = [
  { href: "/budget",   label: "Бюджет",    icon: DollarSign },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Corridor() {
  const pathname = usePathname();
  const { activeNav, setActiveNav } = useStore();
  const { profile } = useProfile();
  const { onlineIds } = useOnlinePresence();
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Dynamic badge counts
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);

  // Inline name editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("light", next === "light");
  };

  // ── Profiles ───────────────────────────────────────────────────────────────
  const loadProfiles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*");
    if (data) setAllProfiles(data as Profile[]);
  }, []);

  useEffect(() => {
    loadProfiles();
    const supabase = createClient();
    const channel = supabase
      .channel("corridor-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadProfiles())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadProfiles]);

  // ── Badge counts ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCounts = async () => {
      const supabase = createClient();
      const [tasksRes, subsRes, projRes] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
        supabase.from("subscriptions").select("cost_monthly_usd").eq("status", "active"),
        supabase.from("projects").select("id", { count: "exact", head: true }),
      ]);
      if (tasksRes.count !== null) setTaskCount(tasksRes.count);
      if (subsRes.data) setBudgetTotal(subsRes.data.reduce((s, r) => s + Number(r.cost_monthly_usd), 0));
      if (projRes.count !== null) setProjectCount(projRes.count);
    };
    fetchCounts();
  }, []);

  // ── Inline name edit ───────────────────────────────────────────────────────
  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditName(p.full_name || "");
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) { cancelEdit(); return; }

    // Optimistic
    setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, full_name: trimmed } : p));
    cancelEdit();

    const supabase = createClient();
    await supabase.from("profiles").update({ full_name: trimmed }).eq("id", id);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isActive = (href: string) =>
    pathname === href || activeNav === href.slice(1);

  const avatarColor = (index: number) =>
    index === 0 ? "bg-accent text-white" : "bg-blue text-white";

  return (
    <aside className="w-[240px] bg-bg-2 border-r border-line flex flex-col py-6 px-0 relative shrink-0">

      {/* Brand */}
      <div className="px-5 pb-5 border-b border-line mb-4">
        <Link href="/office" className="block group">
          <div className="font-display font-semibold text-[22px] tracking-[-0.03em] leading-tight text-ink">
            AI<span className="text-accent">·</span>HQ
          </div>
          <div className="font-mono text-[10px] text-ink-3 tracking-[0.14em] uppercase mt-1.5">
            Headquarters · 01
          </div>
        </Link>
      </div>

      {/* Nav section label */}
      <div className="font-mono text-[9px] text-ink-3 tracking-[0.18em] uppercase px-5 mb-1.5">
        Кабинеты
      </div>

      {/* Main nav */}
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const badge = item.href === "/projects" ? projectCount
          : item.href === "/tasks" ? taskCount
          : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setActiveNav(item.href.slice(1))}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2 text-[13px] font-medium transition-colors duration-150 border-l-2 border-transparent",
              active
                ? "bg-accent/10 border-l-accent text-ink"
                : "text-ink-2 hover:bg-panel hover:text-ink"
            )}
          >
            <Icon size={14} className={active ? "text-accent" : "text-ink-3"} strokeWidth={1.75} />
            <span>{item.label}</span>
            {badge !== null && (
              <span className={cn(
                "ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded",
                active ? "bg-accent text-white" : "bg-panel-2 text-ink-2"
              )}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}

      {/* Finance section label */}
      <div className="font-mono text-[9px] text-ink-3 tracking-[0.18em] uppercase px-5 mb-1.5 mt-4">
        Финансы
      </div>

      {financeItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const badge = item.href === "/budget" && budgetTotal !== null
          ? `$${Math.round(budgetTotal)}`
          : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setActiveNav(item.href.slice(1))}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2 text-[13px] font-medium transition-colors duration-150 border-l-2 border-transparent",
              active
                ? "bg-accent/10 border-l-accent text-ink"
                : "text-ink-2 hover:bg-panel hover:text-ink"
            )}
          >
            <Icon size={14} className={active ? "text-accent" : "text-ink-3"} strokeWidth={1.75} />
            <span>{item.label}</span>
            {badge && (
              <span className="ml-auto font-mono text-[10px] bg-panel-2 text-ink-2 px-1.5 py-0.5 rounded">
                {badge}
              </span>
            )}
          </Link>
        );
      })}

      {/* CEO Card */}
      <div className="mt-auto mx-3 mb-3 p-3 bg-panel border border-line rounded-lg">
        <div className="space-y-2">
          {allProfiles.length > 0 ? (
            allProfiles.map((p, i) => {
              const isMe = p.id === profile?.id;
              const isEditing = editingId === p.id;

              return (
                <div key={p.id} className="flex items-center gap-2 group/ceo">
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold",
                      avatarColor(i)
                    )}>
                      {p.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-panel",
                      onlineIds.includes(p.id) ? "bg-green" : "bg-ink-3"
                    )} />
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        ref={editRef}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveEdit(p.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 bg-bg border border-accent/40 rounded px-1.5 py-0.5 text-[12px] text-ink outline-none"
                        maxLength={40}
                      />
                      <button onClick={() => saveEdit(p.id)} className="text-green hover:text-green/80">
                        <Check size={12} />
                      </button>
                      <button onClick={cancelEdit} className="text-ink-3 hover:text-ink-2">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-[12px] font-medium text-ink truncate">
                        {p.full_name?.split(" ")[0] || "CEO"}
                      </span>
                      {isMe && (
                        <span className="font-mono text-[9px] text-accent shrink-0">(вы)</span>
                      )}
                      {isMe && (
                        <button
                          onClick={() => startEdit(p)}
                          className="ml-auto opacity-0 group-hover/ceo:opacity-100 transition-opacity text-ink-3 hover:text-ink"
                        >
                          <Pencil size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent/20 animate-pulse" />
              <span className="text-[12px] text-ink-3">Загрузка...</span>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded bg-bg border border-line text-[11px] text-ink-3 hover:text-ink hover:border-line-2 transition-colors"
        >
          {theme === "dark" ? (
            <><Sun size={12} /><span>Светлая тема</span></>
          ) : (
            <><Moon size={12} /><span>Тёмная тема</span></>
          )}
        </button>
      </div>
    </aside>
  );
}
