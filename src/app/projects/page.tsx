"use client";

import { Corridor } from "@/components/Corridor";
import { useStore } from "@/lib/store";
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

const statusLabels: Record<string, string> = {
  active: "Активен",
  paused: "На паузе",
  done: "Готов",
  archived: "В архиве",
};

export default function ProjectsPage() {
  const { projects } = useStore();

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
            Все <em style={{ fontStyle: "italic", color: "var(--accent)" }}>проекты</em>
          </h1>
          <p className="text-ink-3 text-sm">
            {projects.length} проектов · {projects.filter((p) => p.status === "active").length} активных
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="bg-panel border border-line rounded-xl p-5 transition-all duration-200 hover:border-line-2 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden group cursor-pointer no-underline"
            >
              <div
                className={`absolute top-0 right-5 font-mono text-[9px] ${categoryColors[project.category]} px-2.5 py-1 rounded-b-md uppercase tracking-[0.12em] font-semibold`}
              >
                {categoryLabels[project.category]}
              </div>
              <div className="font-display text-[19px] font-medium mb-1.5 mt-4">{project.name}</div>
              <div className="text-[12px] text-ink-3 mb-4 leading-relaxed">{project.description}</div>
              
              <div className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em] mb-3">
                {statusLabels[project.status]}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-line">
                <div className="flex-1 mr-3">
                  <div className="flex justify-between font-mono text-[10px] text-ink-3 mb-1">
                    <span>Прогресс</span>
                    <b className="text-ink">{project.progress}%</b>
                  </div>
                  <div className="h-[3px] bg-line rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-2 rounded"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex">
                  {project.agents.map((agent) => (
                    <div
                      key={agent}
                      className={`w-[26px] h-[26px] rounded-full ${agentColors[agent]} border-2 border-panel flex items-center justify-center font-mono text-[9px] font-semibold -ml-2 first:ml-0`}
                    >
{agentLabels[agent]}
                    </div>
                  ))}
                </div>
              </div>

              {(project.repo_url || project.prod_url) && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-line">
                  {project.repo_url && (
                    <a
                      href={project.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      GitHub →
                    </a>
                  )}
                  {project.prod_url && (
                    <a
                      href={project.prod_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-green hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Prod →
                    </a>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
