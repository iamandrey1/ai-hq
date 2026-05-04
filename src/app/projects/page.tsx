"use client";

import { Corridor } from "@/components/Corridor";
import { useProjects } from "@/hooks/useProjects";
import Link from "next/link";

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

const statusLabels: Record<string, string> = {
  active:      "Активен",
  in_progress: "В разработке",
  paused:      "На паузе",
  done:        "Завершён",
  archived:    "В архиве",
};

const statusColors: Record<string, string> = {
  active:      "text-green",
  in_progress: "text-accent",
  paused:      "text-amber-400",
  done:        "text-blue",
  archived:    "text-ink-3",
};

export default function ProjectsPage() {
  const { projects, loading } = useProjects();

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 bg-bg">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-1">
            Проекты
          </h1>
          <p className="text-sm text-ink-3">
            {loading ? "Загрузка..." : `${projects.length} проектов · ${projects.filter(p => p.status === "active" || p.status === "in_progress").length} активных`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-panel border border-line rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="bg-panel border border-line rounded-lg p-5 transition-all duration-150 hover:border-line-2 hover:-translate-y-px group no-underline"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${categoryColors[project.category] || categoryColors.other}`}>
                    {categoryLabels[project.category] || project.category}
                  </span>
                  <span className={`font-mono text-[10px] ${statusColors[project.status] || statusColors.active}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                </div>

                {/* Title */}
                <div className="text-[16px] font-semibold text-ink mb-1.5 group-hover:text-ink transition-colors">
                  {project.name}
                </div>
                <div className="text-[12px] text-ink-3 mb-4 leading-relaxed line-clamp-2">
                  {project.description}
                </div>

                {/* Progress */}
                <div className="mt-auto">
                  <div className="flex justify-between font-mono text-[10px] text-ink-3 mb-1.5">
                    <span>Прогресс</span>
                    <span className="text-ink">{project.progress}%</span>
                  </div>
                  <div className="h-[2px] bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Links */}
                {(project.repo_url || project.prod_url) && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-line">
                    {project.repo_url && (
                      <a
                        href={project.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-ink-3 hover:text-accent transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        GitHub →
                      </a>
                    )}
                    {project.prod_url && (
                      <a
                        href={project.prod_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-ink-3 hover:text-green transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        Prod →
                      </a>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
