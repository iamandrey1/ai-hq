"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { useSubscriptions } from "@/hooks/useSubscriptions";

const navItems = [
  { href: "/office", label: "Офис", badge: "live", icon: "◆" },
  { href: "/projects", label: "Проекты", icon: "◇" },
  { href: "/tasks", label: "Задачи", icon: "◇" },
  { href: "/team", label: "Команда", icon: "◇" },
];

const financeItems = [
  { href: "/budget", label: "Бюджет", icon: "◇" },
  { href: "/settings", label: "Настройки", icon: "◇" },
];

export function Corridor() {
  const pathname = usePathname();
  const { activeNav, setActiveNav } = useStore();
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { total: budgetTotal } = useSubscriptions();

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const activeTasks = tasks.filter((t) => t.status !== "done").length;

  return (
    <aside className="w-[240px] bg-bg-2 border-r border-line flex flex-col py-7 px-0 relative shrink-0">
      {/* Brand */}
      <div className="px-6 pb-7 border-b border-line mb-5">
        <Link href="/office" className="block">
          <div className="font-display font-semibold text-[26px] tracking-[-0.02em] leading-tight">
            AI<span style={{ color: "var(--accent)", fontStyle: "normal" }}>·</span>HQ
          </div>
          <div className="font-mono text-[10px] text-ink-3 tracking-[0.15em] uppercase mt-2">
            Headquarters · 01
          </div>
        </Link>
      </div>

      {/* Navigation Label */}
      <div className="font-mono text-[10px] text-ink-3 tracking-[0.18em] uppercase px-6 mb-2.5 mt-4">
        Кабинеты
      </div>

      {/* Nav Items */}
      {navItems.map((item) => {
        let badge = item.badge;
        if (item.href === "/projects") badge = String(activeProjects);
        if (item.href === "/tasks") badge = String(activeTasks);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setActiveNav(item.href.slice(1))}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 cursor-pointer text-ink-2 border-l-2 border-transparent transition-all duration-200 text-sm font-medium hover:bg-panel hover:text-ink",
              (pathname === item.href || activeNav === item.href.slice(1)) &&
                "bg-gradient-to-r from-accent/12 to-transparent border-l-accent text-ink"
            )}
          >
            <span className="text-ink-3 w-4 h-4 flex items-center justify-center" style={{ fontSize: "12px" }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {badge && (
              <span
                className={cn(
                  "ml-auto font-mono text-[10px] bg-panel-2 text-ink-2 px-1.5 py-0.5 rounded-full",
                  (pathname === item.href || activeNav === item.href.slice(1)) && "bg-accent text-bg"
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}

      {/* Finance Label */}
      <div className="font-mono text-[10px] text-ink-3 tracking-[0.18em] uppercase px-6 mb-2.5 mt-5">
        Финансы
      </div>

      {financeItems.map((item) => {
        let badge = null;
        if (item.href === "/budget") badge = `$${budgetTotal}`;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setActiveNav(item.href.slice(1))}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 cursor-pointer text-ink-2 border-l-2 border-transparent transition-all duration-200 text-sm font-medium hover:bg-panel hover:text-ink",
              (pathname === item.href || activeNav === item.href.slice(1)) &&
                "bg-gradient-to-r from-accent/12 to-transparent border-l-accent text-ink"
            )}
          >
            <span className="text-ink-3 w-4 h-4 flex items-center justify-center" style={{ fontSize: "12px" }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {badge && (
              <span className="ml-auto font-mono text-[10px] bg-panel-2 text-ink-2 px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </Link>
        );
      })}

      {/* CEO Card */}
      <div className="mt-auto mx-4 p-3.5 bg-panel border border-line rounded-xl flex items-center gap-3">
        <div className="flex relative">
          <div className="w-8 h-8 rounded-full bg-accent text-bg font-display font-semibold text-[13px] flex items-center justify-center border-2 border-panel">
            J
          </div>
          <div className="w-8 h-8 rounded-full bg-blue text-ink font-display font-semibold text-[13px] flex items-center justify-center border-2 border-panel -ml-2.5">
            A
          </div>
        </div>
        <div className="text-xs leading-relaxed">
          <b className="text-ink font-semibold block">CEO · 2</b>
          <span className="text-ink-3 font-mono text-[10px]">Jo & Андрей</span>
        </div>
      </div>
    </aside>
  );
}
