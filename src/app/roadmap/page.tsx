"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useProjectForecast } from "@/hooks/useProjectForecast";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, TrendingUp } from "lucide-react";

const categoryColors: Record<string, string> = {
  crypto: "bg-amber-500/80",
  telegram: "bg-blue-500/80",
  shopify: "bg-green-500/80",
  viral: "bg-red-500/80",
  other: "bg-gray-500/80",
};

const categoryLabels: Record<string, string> = {
  crypto: "Крипто-Компас",
  telegram: "TG-каналы",
  shopify: "Shopify",
  viral: "Виральный контент",
  other: "Другое",
};

interface ProjectPhase {
  id: string;
  project_id: string;
  start_week: number;
  end_week: number;
}

export default function RoadmapPage() {
  const { projects } = useProjects();
  const [projectPhases, setProjectPhases] = useState<Record<string, ProjectPhase[]>>({});
  const [projectForecasts, setProjectForecasts] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllPhases = async () => {
      const phases: Record<string, ProjectPhase[]> = {};
      const forecasts: Record<string, any[]> = {};
      
      await Promise.all(
        projects.map(async (project) => {
          const supabase = createClient();
          
          // Fetch phases
          const { data: phasesData } = await supabase
            .from("project_phases")
            .select("id, project_id, start_week, end_week")
            .eq("project_id", project.id);
          
          if (phasesData) {
            phases[project.id] = phasesData;
          }
          
          // Fetch forecast
          const { data: forecastData } = await supabase
            .from("project_forecast")
            .select("*")
            .eq("project_id", project.id)
            .order("month_num", { ascending: true });
          
          if (forecastData) {
            forecasts[project.id] = forecastData;
          }
        })
      );
      
      setProjectPhases(phases);
      setProjectForecasts(forecasts);
      setLoading(false);
    };

    if (projects.length > 0) {
      fetchAllPhases();
    }
  }, [projects]);

  // Calculate months (6 months from project start)
  const months = Array.from({ length: 6 }, (_, i) => i + 1);

  // Calculate timeline for each project
  const getProjectTimeline = (projectId: string) => {
    const phases = projectPhases[projectId] || [];
    if (phases.length === 0) return { start: 1, end: 6, hasFuture: false };
    
    const minStart = Math.min(...phases.map(p => p.start_week));
    const maxEnd = Math.max(...phases.map(p => p.end_week));
    
    const startMonth = Math.max(1, Math.ceil(minStart / 4));
    const endMonth = Math.min(6, Math.ceil(maxEnd / 4));
    
    return { start: startMonth, end: endMonth };
  };

  // Calculate total forecast revenue by month
  const totalForecastByMonth = months.map((month) => {
    let total = 0;
    Object.values(projectForecasts).forEach((forecasts) => {
      const monthForecast = forecasts.find((f: any) => f.month_num === month);
      if (monthForecast) {
        total += monthForecast.expected_revenue || 0;
      }
    });
    return total;
  });

  const maxRevenue = Math.max(...totalForecastByMonth, 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-1 flex items-center justify-center">
        <div className="text-ink-3">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-1">
      {/* Header */}
      <div className="bg-obsidian-2 border-b border-line/30">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link href="/projects" className="inline-flex items-center gap-2 text-ink-3 hover:text-ink-1 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Все проекты
          </Link>
          
          <h1 className="text-3xl font-bold text-ink-1">Roadmap</h1>
          <p className="text-ink-3 mt-2">План по всем проектам на 6 месяцев</p>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-obsidian-3 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-ink-1 mb-6">Timeline проектов</h2>
          
          {/* Gantt grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Month headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                <div className="text-sm text-ink-3 font-medium">Проект</div>
                {months.map((m) => (
                  <div key={m} className="text-center text-sm text-ink-3 font-mono">
                    M{m}
                  </div>
                ))}
              </div>

              {/* Project rows */}
              <div className="space-y-3">
                {projects.map((project) => {
                  const timeline = getProjectTimeline(project.id);
                  const colorClass = categoryColors[project.category] || categoryColors.other;
                  const label = categoryLabels[project.category] || project.name;

                  return (
                    <div key={project.id} className="grid grid-cols-7 gap-2 items-center">
                      <div className="text-sm text-ink-1 truncate pr-4">{label}</div>
                      {months.map((m) => (
                        <div key={m} className="h-8 rounded bg-obsidian-4/50" />
                      ))}
                      {/* Overlay bars */}
                      <div className="absolute left-[calc(16.66%+16.66%*0)]" />
                      <div 
                        className="col-start-2 col-span-4 h-8 rounded-full opacity-80 relative overflow-hidden"
                        style={{ 
                          gridColumn: `${timeline.start + 1} / ${timeline.end + 2}`,
                        }}
                      >
                        <div className={`absolute inset-0 ${colorClass} rounded-full`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Better Gantt visualization */}
              <div className="mt-8">
                <div className="flex items-center gap-8">
                  {projects.map((project) => {
                    const timeline = getProjectTimeline(project.id);
                    const colorClass = categoryColors[project.category] || categoryColors.other;
                    const label = categoryLabels[project.category] || project.name;
                    const width = ((timeline.end - timeline.start + 1) / 6) * 100;
                    const left = ((timeline.start - 1) / 6) * 100;

                    return (
                      <div key={project.id} className="flex items-center gap-4 min-w-[200px]">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: colorClass.replace("/80", "") }} />
                        <div className="flex-1">
                          <div className="text-sm text-ink-1 mb-1">{label}</div>
                          <div className="relative h-6 bg-obsidian-4 rounded">
                            <div 
                              className="absolute h-full rounded" 
style={{ 
                                left: `${left}%`, 
                                width: `${width}%`,
                                backgroundColor: colorClass.replace("/80", "") 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Month scale */}
                <div className="flex justify-between mt-4 pl-8">
                  {months.map((m) => (
                    <div key={m} className="text-xs text-ink-3 font-mono w-8 text-center">M{m}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-6 pt-6 border-t border-line/30">
            {Object.entries(categoryColors).slice(0, 5).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: color.replace("/80", "") }} />
                <span className="text-xs text-ink-3">{categoryLabels[cat] || cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total forecast */}
        <div className="bg-obsidian-3 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-ink-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Общий прогноз дохода
            </h3>
            <div className="text-right">
              <div className="text-sm text-ink-3">За 6 месяцев</div>
              <div className="text-xl font-bold text-green-400">
                ${totalForecastByMonth.reduce((a, b) => a + b, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-4 h-48">
            {totalForecastByMonth.map((revenue, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1">
                  <div 
                    className="bg-amber-500/60 rounded-t transition-all"
                    style={{ height: `${Math.max((revenue / maxRevenue) * 160, 4)}px` }}
                  />
                </div>
                <div className="text-xs text-ink-3 font-mono">M{idx + 1}</div>
                <div className="text-xs text-ink-2">${revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}