"use client";

import { Corridor } from "@/components/Corridor";
import { useStore } from "@/lib/store";

const priorityColors: Record<string, string> = {
  low: "text-ink-3",
  medium: "text-accent",
  high: "text-red",
};

const statusIcons: Record<string, string> = {
  todo: "○",
  in_progress: "◐",
  done: "●",
};

export default function TasksPage() {
  const { tasks } = useStore();

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Задачи</em>
          </h1>
          <p className="text-ink-3 text-sm">
            {tasks.length} задач · {todoTasks.length} в очереди
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Todo */}
          <div>
            <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-line-2" />
              К выполнению
              <span className="ml-auto bg-panel px-2 py-0.5 rounded-full">{todoTasks.length}</span>
            </div>
            <div className="space-y-3">
              {todoTasks.map((task) => (
                <div key={task.id} className="bg-panel border border-line rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`font-mono text-[14px] ${priorityColors[task.priority]}`}>
                      {statusIcons[task.status]}
                    </span>
                    <span className="text-[14px] font-medium">{task.title}</span>
                  </div>
                  <p className="text-[12px] text-ink-3 leading-relaxed">{task.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress */}
          <div>
            <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
              В работе
              <span className="ml-auto bg-accent/20 text-accent px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
            </div>
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <div key={task.id} className="bg-panel border border-accent/30 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`font-mono text-[14px] ${priorityColors[task.priority]}`}>
                      {statusIcons[task.status]}
                    </span>
                    <span className="text-[14px] font-medium">{task.title}</span>
                  </div>
                  <p className="text-[12px] text-ink-3 leading-relaxed">{task.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Done */}
          <div>
            <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green" />
              Готово
              <span className="ml-auto bg-green/20 text-green px-2 py-0.5 rounded-full">{doneTasks.length}</span>
            </div>
            <div className="space-y-3">
              {doneTasks.map((task) => (
                <div key={task.id} className="bg-panel border border-green/20 rounded-lg p-4 opacity-60">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`font-mono text-[14px] text-green`}>
                      {statusIcons[task.status]}
                    </span>
                    <span className="text-[14px] font-medium line-through">{task.title}</span>
                  </div>
                  <p className="text-[12px] text-ink-3 leading-relaxed">{task.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
