"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const categoryColors: Record<string, string> = {
  crypto: "#f59e0b",
  telegram: "#3b82f6",
  shopify: "#22c55e",
  viral: "#ef4444",
  other: "#6b7280",
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

interface ForecastData {
  month_num: number;
  expected_revenue: number;
  expected_costs: number;
}

export default function RoadmapPage() {
  const { projects } = useProjects();
  const [projectPhases, setProjectPhases] = useState<Record<string, ProjectPhase[]>>({});
  const [projectForecasts, setProjectForecasts] = useState<Record<string, ForecastData[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      const phases: Record<string, ProjectPhase[]> = {};
      const forecasts: Record<string, ForecastData[]> = {};
      
      for (const project of projects) {
        const supabase = createClient();
        
        const { data: phasesData } = await supabase
          .from("project_phases")
          .select("id, project_id, start_week, end_week")
          .eq("project_id", project.id);
        
        if (phasesData) phases[project.id] = phasesData;
        
        const { data: forecastData } = await supabase
          .from("project_forecast")
          .select("month_num, expected_revenue, expected_costs")
          .eq("project_id", project.id)
          .order("month_num", { ascending: true });
        
        if (forecastData) forecasts[project.id] = forecastData;
      }
      
      setProjectPhases(phases);
      setProjectForecasts(forecasts);
      setLoading(false);
    };

    if (projects.length > 0) fetchAllData();
  }, [projects]);

  const months = Array.from({ length: 6 }, (_, i) => i + 1);

  const getProjectTimeline = (projectId: string) => {
    const phases = projectPhases[projectId] || [];
    if (!phases.length) return null;
    
    const minStart = Math.min(...phases.map(p => p.start_week || 1));
    const maxEnd = Math.max(...phases.map(p => p.end_week || 24));
    
    return { start: minStart, end: maxEnd };
  };

  // Aggregate all forecasts
  const allForecasts: ForecastData[] = [];
  for (let m = 1; m <= 6; m++) {
    let revenue = 0, costs = 0;
    Object.values(projectForecasts).forEach(forecasts => {
      const f = forecasts.find(f => f.month_num === m);
      if (f) { revenue += f.expected_revenue || 0; costs += f.expected_costs || 0; }
    });
    allForecasts.push({ month_num: m, expected_revenue: revenue, expected_costs: costs });
  }

  const totalRevenue = allForecasts.reduce((s, f) => s + f.expected_revenue, 0);
  const totalCosts = allForecasts.reduce((s, f) => s + f.expected_costs, 0);
  const maxRevenue = Math.max(...allForecasts.map(f => f.expected_revenue), 1);

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
            <ArrowLeft className="w-4 h-4" />Все проекты
          </Link>
          <h1 className="text-3xl font-bold text-ink-1">Roadmap</h1>
          <p className="text-ink-3 mt-2">Timeline всех проектов на 6 месяцев</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Gantt Chart */}
        <div className="bg-obsidian-3 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-ink-1 mb-6">Timeline проектов</h2>
          
          {/* Month headers */}
          <div className="flex mb-4 pl-[200px]">
            {months.map(m => (
              <div key={m} className="flex-1 text-center text-sm text-ink-3 font-mono">М{m}</div>
            ))}
          </div>

          {/* Project rows */}
          <div className="space-y-4">
            {projects.map(project => {
              const timeline = getProjectTimeline(project.id);
              const color = categoryColors[project.category] || categoryColors.other;
              const label = categoryLabels[project.category] || project.name;

              return (
                <div key={project.id} className="flex items-center gap-4">
                  <div className="w-[180px] flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm text-ink-1 truncate">{label}</span>
                  </div>
                  <div className="flex-1 relative h-8 bg-obsidian-4/50 rounded">
                    {timeline ? (
                      <div 
                        className="absolute h-full rounded-full opacity-80"
                        style={{ 
                          backgroundColor: color,
left: `${((Math.max(1, Math.ceil(timeline.start / 4)) - 1) / 6) * 100}%`,
                          width: `${Math.max(((timeline.end - timeline.start + 4) / 24) * 100, 16)}%`
                        }}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-ink-3">Нет данных</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-6 pt-6 border-t border-line/30">
            {Object.entries(categoryLabels).map(([cat, label]) => (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors[cat] }} />
                <span className="text-xs text-ink-3">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-obsidian-3 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-ink-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Прогноз доходов
            </h3>
            <div className="flex gap-6">
              <div className="text-right">
                <div className="text-xs text-ink-3">Доход</div>
                <div className="text-lg font-bold text-green-400">${totalRevenue.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-3">Расход</div>
                <div className="text-lg font-bold text-red-400">${totalCosts.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-3">Прибыль</div>
                <div className={`text-lg font-bold ${totalRevenue - totalCosts >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${(totalRevenue - totalCosts).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-4 h-48">
            {allForecasts.map((f, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1">
                  <div 
                    className="bg-green-500/60 rounded-t transition-all"
                    style={{ height: `${Math.max((f.expected_revenue / maxRevenue) * 160, f.expected_revenue > 0 ? 4 : 0)}px` }}
                  />
                  <div 
                    className="bg-red-500/60 rounded-t transition-all"
                    style={{ height: `${Math.max((f.expected_costs / maxRevenue) * 160, 4)}px` }}
                  />
                </div>
                <div className="text-xs text-ink-3 font-mono">М{idx + 1}</div>
                <div className="text-xs text-ink-2">${f.expected_revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500/60 rounded" />
              <span className="text-xs text-ink-3">Доход</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500/60 rounded" />
              <span className="text-xs text-ink-3">Расходы</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}