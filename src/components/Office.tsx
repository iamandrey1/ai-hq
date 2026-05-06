"use client";

import { useStore } from "@/lib/store";
import { formatTime, formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { useProjects } from "@/hooks/useProjects";
import { DollarSign, FolderKanban, CheckSquare } from "lucide-react";

const categoryColors: Record<string, string> = {
  crypto:   "text-amber-400 bg-amber-400/10",
  telegram: "text-blue bg-blue/10",
  shopify:  "text-green bg-green/10",
  viral:    "text-red bg-red/10",
  other:    "text-ink-3 bg-ink-3/10",
};

const categoryLabels: Record<string, string> = {
  crypto:   "Crypto",
  telegram: "Telegram",
  shopify:  "Shopify",
  viral:    "Viral",
  other:    "Other",
};

const agentColors: Record<string, string> = {
  claude:  "bg-accent text-white",
  minimax: "bg-blue text-white",
  chatgpt: "bg-green text-white",
};
const agentLabels: Record<string, string> = {
  claude: "CL",
  minimax: "MM",
  chatgpt: "GP",
};

const quickLinks = [
  { href: "/budget",   label: "Бюджет",   icon: DollarSign },
  { href: "/tasks",    label: "Задачи",   icon: CheckSquare },
  { href: "/projects", label: "Проекты",  icon: FolderKanban },
];

export function Office() {
  const { agents, messages } = useStore();
  const [time, setTime] = useState(new Date());
  const { profile } = useProfile();
  const { projects, loading: projectsLoading } = useProjects();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const userName = profile?.full_name ? profile.full_name.split(" ")[0] : "команда";

  const hour = new Date().getHours();
  const greeting =
    hour >= 6 && hour < 12 ? "Доброе утро"
    : hour < 18            ? "Хороший день"
    :                        "Добрый вечер";

  const activeProjects = projects.filter(p => p.status === "active" || p.status === "in_progress");
  const claudeMessages = messages.filter(m => m.sender === "claude").length;

  return (
    <main className="flex-1 overflow-y-auto px-8 py-8 pb-16 bg-bg">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="font-mono text-[10px] text-ink-3 tracking-[0.14em] uppercase mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green rounded-full animate-pulse-slow" />
            {formatDate(time)}
          </div>
          <h1 className="text-[30px] font-semibold tracking-tight text-ink mb-1.5">
            {greeting}, {userName}.
          </h1>
          <p className="text-sm text-ink-3">
            {activeProjects.length} активных проекта · {claudeMessages} ответов Claude
          </p>
        </div>
        <div className="font-mono text-right">
          <div className="text-[18px] font-semibold text-ink">{formatTime(time)}</div>
          <div className="text-[10px] text-ink-3 mt-0.5">Warsaw · UTC+2</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-2 mb-8">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-3 py-2 bg-panel border border-line rounded text-[12px] font-medium text-ink-2 hover:text-ink hover:border-line-2 transition-colors"
          >
            <Icon size={13} className="text-ink-3" />
            {label}
          </Link>
        ))}
      </div>

      {/* Claude agent card */}
      <div className="bg-panel border border-line rounded-lg p-5 flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-full bg-accent text-white font-bold text-[22px] flex items-center justify-center relative shrink-0">
          C
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green rounded-full border-2 border-panel" />
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-semibold text-ink mb-0.5">Claude</div>
          <div className="text-[12px] text-ink-3 mb-2">Стратег · контент · ТЗ для MiniMax · аналитика</div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-green">
            <span className="w-1.5 h-1.5 bg-green rounded-full" />На связи
          </div>
        </div>
        <div className="flex gap-8 text-right">
          <div>
            <div className="text-[22px] font-semibold text-ink">{claudeMessages}</div>
            <div className="font-mono text-[9px] text-ink-3 uppercase tracking-wider mt-0.5">Ответов</div>
          </div>
          <div>
            <div className="text-[22px] font-semibold text-ink">{activeProjects.length}</div>
            <div className="font-mono text-[9px] text-ink-3 uppercase tracking-wider mt-0.5">Проектов</div>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-ink">Активные проекты</h2>
        <Link href="/projects" className="font-mono text-[10px] text-ink-3 hover:text-accent transition-colors">
          Все проекты →
        </Link>
      </div>

      {projectsLoading ? (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-panel border border-line rounded-lg h-32 animate-pulse" />)}
        </div>
      ) : activeProjects.length === 0 ? (
        <div className="text-center py-8 mb-8 bg-panel border border-line rounded-lg">
          <div className="text-sm text-ink-3">Нет активных проектов</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {activeProjects.slice(0, 4).map(project => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="bg-panel border border-line rounded-lg p-4 hover:border-line-2 transition-all duration-150 hover:-translate-y-px no-underline"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${categoryColors[project.category] || categoryColors.other}`}>
                  {categoryLabels[project.category] || "Other"}
                </span>
                <span className="font-mono text-[10px] text-ink-3">{project.progress}%</span>
              </div>
              <div className="text-[14px] font-semibold text-ink mb-1.5">{project.name}</div>
              <div className="text-[11px] text-ink-3 mb-3 line-clamp-1">{project.description}</div>
              <div className="h-[2px] bg-line rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${project.progress}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  {project.agents?.map(agent => (
                    <div key={agent} className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[8px] font-bold ${agentColors[agent] || agentColors.claude}`}>
                      {agentLabels[agent] || "CL"}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* AI Agents */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold text-ink">AI-команда</h2>
        <Link href="/team" className="font-mono text-[10px] text-ink-3 hover:text-accent transition-colors">
          Управление →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {agents.map(agent => {
          const sColors: Record<string, string> = { busy: "text-accent bg-accent/10", idle: "text-green bg-green/10", queue: "text-blue bg-blue/10" };
          const sLabels: Record<string, string> = { busy: "занят", idle: "свободен", queue: "в очереди" };
          return (
            <div key={agent.id} className="bg-panel border border-line rounded-lg p-3.5 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${agentColors[agent.id] || "bg-ink-3 text-white"}`}>
                {agentLabels[agent.id] || agent.id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-ink truncate">{agent.name}</div>
                <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${sColors[agent.status] || "text-ink-3 bg-ink-3/10"}`}>
                  {sLabels[agent.status] || agent.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
