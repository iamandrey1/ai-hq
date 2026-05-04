"use client";

import { useStore } from "@/lib/store";
import { formatTime, formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";
import Link from "next/link";

const categoryColors: Record<string, string> = {
  crypto: "bg-accent text-bg",
  telegram: "bg-blue text-ink",
  shopify: "bg-green text-bg",
  viral: "bg-red text-ink",
};

const categoryLabels: Record<string, string> = {
  crypto: "Crypto",
  telegram: "Telegram",
  shopify: "Shopify",
  viral: "Viral",
};

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

export function Office() {
  const { projects, agents, messages, addMessage } = useStore();
  const [time, setTime] = useState(new Date());
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    addMessage({
      id: crypto.randomUUID(),
      sender: "ceo",
      senderName: "Jo (CEO)",
      content: inputValue.trim(),
    });
    setInputValue("");
  };

  const activeProjects = projects.filter((p) => p.status === "active");
  const claudeMessages = messages.filter((m) => m.sender === "claude").length;
  const activeTasks = 4;

  return (
    <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-9">
        <div>
          <div className="font-mono text-[11px] text-ink-3 tracking-[0.15em] uppercase mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green rounded-full animate-pulse-slow" />
            {formatDate(time)}
          </div>
          <h1 className="font-display font-normal text-[38px] leading-tight tracking-[-0.02em] mb-2.5">
            Доброе утро, <em style={{ fontStyle: "italic", color: "var(--accent)" }}>команда.</em>
          </h1>
          <p className="text-ink-3 text-sm">
            Claude и MiniMax готовы к работе. {activeTasks} задачи в очереди, 1 ждёт вашего решения.
          </p>
        </div>
        <div className="font-mono text-[11px] text-ink-3 text-right leading-loose">
          <b className="text-ink font-medium text-sm">{formatTime(time)}</b>
          <br />
          Warsaw · UTC+2
        </div>
      </div>

      {/* Claude Employee Card */}
      <div className="bg-gradient-to-br from-panel to-panel-2 border border-line rounded-2xl p-6 grid grid-cols-[auto_1fr_auto] gap-6 items-center mb-8 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 0% 0%, rgba(212,164,92,0.08), transparent 50%)",
          }}
        />
        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-accent to-accent-2 text-bg font-display font-bold text-3xl flex items-center justify-center relative shadow-[0_8px_24px_rgba(212,164,92,0.25)]">
          C
          <div
            className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green rounded-full border-[3px] border-panel"
            style={{ bottom: "2px", right: "2px" }}
          />
        </div>
        <div>
          <div className="font-display text-2xl font-medium tracking-[-0.01em] mb-1">
            Claude{" "}
            <em style={{ color: "var(--ink-3)", fontStyle: "italic", fontWeight: 400, fontSize: "14px" }}>
              — Креативный директор
            </em>
          </div>
          <div className="text-[13px] text-ink-2 mb-2.5">Стратегия · контент · ТЗ для MiniMax · аналитика</div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] text-green tracking-[0.1em] uppercase">
            <span className="w-1.5 h-1.5 bg-green rounded-full" />
            На связи · отвечает мгновенно
          </div>
        </div>
        <div className="flex gap-7 text-right">
          <div>
            <div className="font-display text-[28px] font-medium tracking-[-0.02em] leading-tight">{claudeMessages}</div>
            <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mt-1">ТЗ выдано</div>
          </div>
          <div>
            <div className="font-display text-[28px] font-medium tracking-[-0.02em] leading-tight">{activeTasks}</div>
            <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mt-1">Активно</div>
          </div>
          <div>
            <div className="font-display text-[28px] font-medium tracking-[-0.02em] leading-tight" style={{ color: "var(--green)" }}>
              98%
            </div>
            <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.1em] mt-1">Закрыто</div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex items-baseline justify-between mb-4.5">
        <div className="font-display text-[22px] font-medium tracking-[-0.01em]">
          Текущие <em style={{ fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>проекты</em>
        </div>
        <Link href="/projects" className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.12em] hover:text-accent transition-colors">
          Открыть все →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-9">
        {activeProjects.map((project) => (
          <div
            key={project.id}
            className="bg-panel border border-line rounded-xl p-5 cursor-pointer transition-all duration-250 hover:border-line-2 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden group"
          >
            <div
              className={`absolute top-0 right-5 font-mono text-[9px] ${categoryColors[project.category]} px-2.5 py-1 rounded-b-md uppercase tracking-[0.12em] font-semibold`}
            >
              {categoryLabels[project.category]}
            </div>
            <div className="font-display text-[19px] font-medium mb-1.5 mt-4">{project.name}</div>
            <div className="text-[12px] text-ink-3 mb-4 leading-relaxed line-clamp-2">{project.description}</div>
            <div className="flex items-center justify-between pt-3.5 border-t border-line">
              <div className="flex-1 mr-3.5">
                <div className="flex justify-between font-mono text-[10px] text-ink-3 uppercase tracking-[0.08em] mb-1.5">
                  <span>Прогресс</span>
                  <b className="text-ink font-medium">{project.progress}%</b>
                </div>
                <div className="h-[3px] bg-line rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-2 rounded"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex">
                {project.agents.map((agent, i) => (
                  <div
                    key={agent}
                    className={`w-[26px] h-[26px] rounded-full ${agentColors[agent]} border-2 border-panel flex items-center justify-center font-mono text-[9px] font-semibold -ml-2 first:ml-0`}
                  >
                    {agentLabels[agent]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Section */}
      <div className="flex items-baseline justify-between mb-4.5">
        <div className="font-display text-[22px] font-medium tracking-[-0.01em]">
          AI-<em style={{ fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>команда</em>
        </div>
        <Link href="/team" className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.12em] hover:text-accent transition-colors">
          Управление →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {agents.map((agent) => {
          const statusLabels: Record<string, string> = { busy: "занят", idle: "свободен", queue: "в очереди" };
          const statusColors: Record<string, string> = {
            busy: "bg-accent/15 text-accent",
            idle: "bg-green/15 text-green",
            queue: "bg-blue/15 text-blue",
          };
          return (
            <div key={agent.id} className="bg-panel border border-line rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${agentColors[agent.id]}`}>
                {agentLabels[agent.id]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold mb-0.5 truncate">{agent.name}</div>
                <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.05em] truncate">{agent.role}</div>
              </div>
              <div className={`font-mono text-[10px] px-2 py-1 rounded-md shrink-0 ${statusColors[agent.status]}`}>
                {statusLabels[agent.status]}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
