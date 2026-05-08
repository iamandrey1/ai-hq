"use client";
import { useState, useEffect, useCallback } from "react";
import { useProjects } from "@/hooks/useProjects";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Pencil, Trash2, Calendar, GitBranch } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import type { RoadmapItem } from "@/types/index";

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

const statusConfig: Record<RoadmapItem["status"], { label: string; dot: string; badge: string }> = {
  planned:     { label: "Запланировано", dot: "bg-ink-3",  badge: "text-ink-3 bg-ink-3/10" },
  in_progress: { label: "В работе",      dot: "bg-accent", badge: "text-accent bg-accent/10" },
  done:        { label: "Готово",         dot: "bg-green",  badge: "text-green bg-green/10" },
};

type FormState = {
  title: string;
  description: string;
  status: RoadmapItem["status"];
  target_date: string;
  project_id: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  status: "planned",
  target_date: "",
  project_id: "",
};

function formatMilestoneDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function RoadmapPage() {
  const { projects, loading: projectsLoading } = useProjects();
  const [projectPhases, setProjectPhases] = useState<Record<string, ProjectPhase[]>>({});
  const [projectForecasts, setProjectForecasts] = useState<Record<string, ForecastData[]>>({});
  const [loading, setLoading] = useState(true);

  // milestones
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

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

  const loadItems = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("roadmap_items")
      .select("*")
      .order("order_index", { ascending: true })
      .order("target_date", { ascending: true, nullsFirst: false });
    if (data) setRoadmapItems(data as RoadmapItem[]);
    setItemsLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
    const supabase = createClient();
    const channel = supabase
      .channel(`roadmap-items-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "roadmap_items" }, () => loadItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadItems]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description ?? "",
      status: item.status,
      target_date: item.target_date ?? "",
      project_id: item.project_id ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Укажите название вехи"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      target_date: form.target_date || null,
      project_id: form.project_id || null,
    };

    if (editingItem) {
      const { error } = await supabase.from("roadmap_items").update(payload).eq("id", editingItem.id);
      if (error) { toast.error("Ошибка при сохранении"); }
      else { toast.success("Веха обновлена"); setModalOpen(false); }
    } else {
      const { error } = await supabase.from("roadmap_items").insert({ ...payload, order_index: roadmapItems.length });
      if (error) { toast.error("Ошибка при создании"); }
      else { toast.success("Веха добавлена"); setModalOpen(false); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const supabase = createClient();
    const { error } = await supabase.from("roadmap_items").delete().eq("id", deleteId);
    if (error) { toast.error("Ошибка при удалении"); }
    else { toast.success("Веха удалена"); }
    setDeleteId(null);
  };

  const filteredItems = filterProjectId
    ? roadmapItems.filter(i => i.project_id === filterProjectId)
    : roadmapItems;

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
    <AppShell>
      <main className="px-4 md:px-8 py-8 pb-16 bg-bg min-h-full">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-1">Roadmap</h1>
          <p className="text-sm text-ink-3">Timeline проектов · Вехи · 6 месяцев</p>
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

              <div className="flex mb-3 pl-[180px]">
                {months.map(m => (
                  <div key={m} className="flex-1 text-center text-[10px] font-mono text-ink-3">{m}</div>
                ))}
              </div>

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
                    { label: "Доход",   value: totalRevenue, color: "text-green" },
                    { label: "Расходы", value: totalCosts,   color: "text-red" },
                    { label: "Прибыль", value: totalProfit,  color: totalProfit >= 0 ? "text-green" : "text-red" },
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
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Доход" />
                    <Line type="monotone" dataKey="costs"   stroke="#ef4444" strokeWidth={1.5} dot={false} name="Расходы" />
                    <Line type="monotone" dataKey="profit"  stroke="#4D9EBF" strokeWidth={1.5} dot={false} name="Прибыль" strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex gap-5 mt-3">
                {[
                  { color: "#22c55e", label: "Доход" },
                  { color: "#ef4444", label: "Расходы" },
                  { color: "#4D9EBF", label: "Прибыль", dashed: true },
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

        {/* ── Milestones ── */}
        <div className="mt-6 bg-panel border border-line rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-semibold text-ink">Вехи</h2>
            <div className="flex items-center gap-3">
              <select
                value={filterProjectId}
                onChange={e => setFilterProjectId(e.target.value)}
                className="bg-bg border border-line rounded text-[12px] text-ink px-2 py-1.5 outline-none focus:border-accent cursor-pointer"
              >
                <option value="">Все проекты</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium px-3 py-1.5 rounded hover:bg-accent/90 transition-colors"
              >
                <Plus size={13} />
                Добавить
              </button>
            </div>
          </div>

          {itemsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-bg rounded animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-ink-3">
              <GitBranch size={32} className="mb-3 opacity-30" />
              <p className="text-[13px]">Вех нет. Нажмите «Добавить», чтобы создать первую.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-3 bottom-3 w-px bg-line" />
              <div className="space-y-4">
                {filteredItems.map(item => {
                  const cfg = statusConfig[item.status];
                  const projectName = projects.find(p => p.id === item.project_id)?.name;

                  return (
                    <div key={item.id} className="relative flex gap-4 pl-6">
                      <div className={`absolute left-0 top-[6px] w-3.5 h-3.5 rounded-full border-2 border-panel ${cfg.dot}`} />
                      <div className="flex-1 bg-bg border border-line rounded-lg p-3.5 group hover:border-line-2 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[14px] font-semibold text-ink">{item.title}</span>
                              <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[12px] text-ink-3 mb-1.5 leading-relaxed">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-ink-3">
                              {item.target_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  {formatMilestoneDate(item.target_date)}
                                </span>
                              )}
                              {projectName && (
                                <span className="truncate opacity-70">{projectName}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 hover:bg-panel-2 rounded text-ink-3 hover:text-ink transition-colors"
                              title="Редактировать"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 hover:bg-red/10 rounded text-ink-3 hover:text-red transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      <Dialog.Root open={modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-panel border border-line rounded-2xl p-6 shadow-2xl focus:outline-none"
            aria-describedby={undefined}
          >
            <Dialog.Title className="text-[16px] font-semibold text-ink mb-5">
              {editingItem ? "Редактировать веху" : "Новая веха"}
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                  Название *
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-[13px] text-ink outline-none focus:border-accent transition-colors"
                  placeholder="Название вехи"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                  Описание
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-[13px] text-ink outline-none focus:border-accent transition-colors resize-none"
                  placeholder="Описание (необязательно)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                    Статус
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as RoadmapItem["status"] }))}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-[13px] text-ink outline-none focus:border-accent transition-colors cursor-pointer"
                  >
                    <option value="planned">Запланировано</option>
                    <option value="in_progress">В работе</option>
                    <option value="done">Готово</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                    Дата
                  </label>
                  <input
                    type="date"
                    value={form.target_date}
                    onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-[13px] text-ink outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                  Проект
                </label>
                <select
                  value={form.project_id}
                  onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-[13px] text-ink outline-none focus:border-accent transition-colors cursor-pointer"
                >
                  <option value="">Без проекта</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Dialog.Close asChild>
                <button
                  disabled={saving}
                  className="flex-1 py-2 text-[13px] text-ink-2 border border-line rounded hover:bg-bg transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
              </Dialog.Close>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 text-[13px] font-medium bg-accent text-white rounded hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Сохранение..." : editingItem ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <ConfirmDialog
          title="Удалить веху?"
          message="Это действие нельзя отменить. Веха будет удалена навсегда."
          confirmText="Удалить"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </AppShell>
  );
}
