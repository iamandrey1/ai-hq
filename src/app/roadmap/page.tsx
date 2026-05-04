"use client";
import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { Corridor } from "@/components/Corridor";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const categoryColors: Record<string, string> = {
  crypto:   "#f59e0b",
  telegram: "#3b82f6",
  shopify:  "#22c55e",
  viral:    "#ef4444",
  other:    "#7c3aed",
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
  const { projects, loading: projectsLoading } = useProjects();
  const [projectPhases, setProjectPhases] = useState<Record<string, ProjectPhase[]>>({});
  const [projectForecasts, setProjectForecasts] = useState<Record<string, ForecastData[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects.length) return;

    const fetchAll = async () => {
      const supabase = createClient();
      const phases: Record<string, ProjectPhase[]> = {};
      const forecasts: Record<string, ForecastData[]> = {};

      await Promise.all(projects.map(async (project) => {
        const [phasesRes, forecastRes] = await Promise.all([
          supabase.from("project_phases").select("id, project_id, start_week, end_week").eq("project_id", project.id),
          supabase.from("project_forecast").select("month_num, expected_revenue, expected_costs").eq("project_id", project.id).order("month_num", { ascending: true }),
        ]);
        if (phasesRes.data)   phases[project.id]    = phasesRes.data;
        if (forecastRes.data) forecasts[project.id] = forecastRes.data;
      }));

      setProjectPhases(phases);
      setProjectForecasts(forecasts);
      setLoading(false);
    };

    fetchAll();
  }, [projects]);

  const TOTAL_WEEKS = 24;
  const months = Array.from({ length: 6 }, (_, i) => `М${i + 1}`);

  const getTimeline = (projectId: string) => {
    const phases = projectPhases[projectId] || [];
    if (!phases.length) return null;
    const starts = phases.map(p => p.start_week).filter(Boolean);
    const ends   = phases.map(p => p.end_week).filter(Boolean);
    if (!starts.length || !ends.length) return null;
    return { start: Math.min(...starts), end: Math.max(...ends) };
  };

  // Aggregate monthly forecast
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const m = i + 1;
    let revenue = 0;
    let costs = 0;
    Object.values(projectForecasts).forEach(fc => {
      const row = fc.find(f => f.month_num === m);
      if (row) { revenue += row.expected_revenue || 0; costs += row.expected_costs || 0; }
    });
    return { month: `М${m}`, revenue, costs, profit: revenue - costs };
  });

  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0);
  const totalCosts   = monthlyData.reduce((s, d) => s + d.costs, 0);
  const totalProfit  = totalRevenue - totalCosts;

  const isLoading = projectsLoading || loading;

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-8 py-8 pb-16 bg-bg">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-1">Roadmap</h1>
          <p className="text-sm text-ink-3">Timeline проектов · 6 месяцев</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-panel border border-line rounded-lg h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Gantt ── */}
            <div className="bg-panel border border-line rounded-lg p-5">
              <h2 className="text-[14px] font-semibold text-ink mb-5">Timeline проектов</h2>

              {/* Month headers */}
              <div className="flex mb-3 pl-[180px]">
                {months.map(m => (
                  <div key={m} className="flex-1 text-center text-[10px] font-mono text-ink-3">{m}</div>
                ))}
              </div>

              {/* Project rows */}
              <div className="space-y-3">
                {projects.map(project => {
                  const timeline = getTimeline(project.id);
                  const color = categoryColors[project.category] || categoryColors.other;

                  return (
                    <div key={project.id} className="flex items-center gap-3">
                      <div className="w-[160px] flex items-center gap-2 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[12px] text-ink truncate">{project.name}</span>
                      </div>
                      <div className="flex-1 relative h-6 bg-bg rounded">
                        {/* Week grid lines */}
                        {months.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 h-full border-l border-line"
                            style={{ left: `${(i / 6) * 100}%` }}
                          />
                        ))}
                        {timeline ? (
                          <div
                            className="absolute h-full rounded opacity-80 transition-all"
                            style={{
                              backgroundColor: color,
                              left: `${((timeline.start - 1) / TOTAL_WEEKS) * 100}%`,
                              width: `${Math.max(((timeline.end - timeline.start + 1) / TOTAL_WEEKS) * 100, 2)}%`,
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center px-2">
                            <span className="text-[10px] text-ink-3">нет данных</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Revenue Chart ── */}
            <div className="bg-panel border border-line rounded-lg p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-semibold text-ink">Прогноз доходов</h2>
                <div className="flex gap-6">
                  {[
                    { label: "Доход",    value: totalRevenue, color: "text-green" },
                    { label: "Расходы",  value: totalCosts,   color: "text-red" },
                    { label: "Прибыль",  value: totalProfit,  color: totalProfit >= 0 ? "text-green" : "text-red" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-right">
                      <div className="text-[10px] text-ink-3 mb-0.5">{label}</div>
                      <div className={`text-[15px] font-semibold ${color}`}>${value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgb(var(--color-ink-3))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgb(var(--color-ink-3))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: "rgb(var(--color-panel-2))", border: "1px solid rgb(var(--color-line))", borderRadius: "6px", fontSize: "12px" }}
                      labelStyle={{ color: "rgb(var(--color-ink-2))" }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e"  strokeWidth={1.5} dot={false} name="Доход" />
                    <Line type="monotone" dataKey="costs"   stroke="#ef4444"  strokeWidth={1.5} dot={false} name="Расходы" />
                    <Line type="monotone" dataKey="profit"  stroke="#7c3aed"  strokeWidth={1.5} dot={false} name="Прибыль" strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex gap-5 mt-3">
                {[
                  { color: "#22c55e", label: "Доход" },
                  { color: "#ef4444", label: "Расходы" },
                  { color: "#7c3aed", label: "Прибыль", dashed: true },
                ].map(({ color, label, dashed }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px] text-ink-3">
                    <div className={`w-4 h-px ${dashed ? "border-t border-dashed" : ""}`} style={{ background: dashed ? "none" : color, borderColor: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
