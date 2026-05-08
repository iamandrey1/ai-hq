"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Sun, Moon, LayoutDashboard, FolderKanban, GitBranch,
  CheckSquare, Users, DollarSign, Settings, Pencil, Check, X,
  Link as LinkIcon, Activity, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useProfile } from "@/hooks/useProfile";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/index";
import { Avatar } from "@/components/ui/Avatar";

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

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { activeNav, setActiveNav } = useStore();
  const { profile } = useProfile();
  const { onlineIds } = useOnlinePresence();
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

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

  const loadProfiles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*");
    if (data) setAllProfiles(data as Profile[]);
  }, []);

  useEffect(() => {
    loadProfiles();
    const supabase = createClient();
    const channel = supabase
      .channel(`sidebar-profiles-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadProfiles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadProfiles]);

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
    setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, full_name: trimmed } : p));
    cancelEdit();
    const supabase = createClient();
    await supabase.from("profiles").update({ full_name: trimmed }).eq("id", id);
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/") || activeNav === href.slice(1);

  return (
    <aside className="h-full bg-bg-2 border-r border-line flex flex-col w-[240px]" aria-label="Главная навигация">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-line">
        <Link
          href="/office"
          onClick={onNavigate}
          className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
        >
          <div className="font-display font-semibold text-[22px] tracking-[-0.03em] leading-tight text-ink">
            AI<span className="text-accent">·</span>HQ
          </div>
          <div className="font-mono text-[10px] text-ink-3 tracking-[0.14em] uppercase mt-1.5">
            Headquarters · 01
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="font-mono text-[10px] font-medium text-ink-3 tracking-[0.18em] uppercase px-5 mb-1.5">
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const badge =
            item.href === "/projects" ? projectCount :
            item.href === "/tasks" ? taskCount : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { setActiveNav(item.href.slice(1)); onNavigate?.(); }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2 text-[13px] font-medium transition-colors duration-150 border-l-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50",
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

        <div className="font-mono text-[10px] font-medium text-ink-3 tracking-[0.18em] uppercase px-5 mb-1.5 mt-5">
          Finance
        </div>

        {financeItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const badge = item.href === "/budget" && budgetTotal !== null
            ? `$${Math.round(budgetTotal)}` : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => { setActiveNav(item.href.slice(1)); onNavigate?.(); }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2 text-[13px] font-medium transition-colors duration-150 border-l-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50",
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
      </nav>

      {/* CEO Card */}
      <div className="mx-3 mb-3 p-3 bg-panel border border-line rounded-lg">
        <div className="space-y-2">
          {allProfiles.length > 0 ? (
            allProfiles.map((p) => {
              const isMe = p.id === profile?.id;
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className="flex items-center gap-2 group/ceo">
                  <Avatar
                    size="sm"
                    initials={p.full_name?.charAt(0).toUpperCase() || "?"}
                    online={onlineIds.includes(p.id)}
                    tone={isMe ? "accent" : "purple"}
                  />
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
                      <button onClick={() => saveEdit(p.id)} className="text-green hover:text-green/80" aria-label="Сохранить">
                        <Check size={12} />
                      </button>
                      <button onClick={cancelEdit} className="text-ink-3 hover:text-ink-2" aria-label="Отмена">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-[12px] font-medium text-ink truncate">
                        {p.full_name?.split(" ")[0] || "CEO"}
                      </span>
                      {isMe && <span className="font-mono text-[9px] text-accent shrink-0">(вы)</span>}
                      {isMe && (
                        <button
                          onClick={() => startEdit(p)}
                          className="ml-auto opacity-0 group-hover/ceo:opacity-100 transition-opacity text-ink-3 hover:text-ink"
                          aria-label="Редактировать имя"
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
              <div className="w-7 h-7 rounded-lg bg-accent/20 animate-pulse" />
              <span className="text-[12px] text-ink-3">Загрузка...</span>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded bg-bg border border-line text-[11px] text-ink-3 hover:text-ink hover:border-line-2 transition-colors"
          aria-label="Переключить тему"
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

// Compact bottom nav for mobile
const mobileNavItems = [
  { href: "/office",   label: "Офис",     icon: LayoutDashboard },
  { href: "/projects", label: "Проекты",  icon: FolderKanban },
  { href: "/tasks",    label: "Задачи",   icon: CheckSquare },
  { href: "/activity", label: "Лента",    icon: Inbox },
  { href: "/team",     label: "Команда",  icon: Users },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-2/90 backdrop-blur-xl border-t border-line"
      aria-label="Мобильная навигация"
    >
      <div className="flex justify-around items-stretch h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors",
                active ? "text-accent" : "text-ink-3 hover:text-ink"
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
