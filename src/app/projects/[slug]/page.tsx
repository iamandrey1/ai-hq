"use client";
import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhases, Phase } from "@/hooks/useProjectPhases";
import { useProjectChecklist, ChecklistItem } from "@/hooks/useProjectChecklist";
import { useProjectKpis, Kpi } from "@/hooks/useProjectKpis";
import { useProjectForecast } from "@/hooks/useProjectForecast";
import { useProjectRisks, Risk } from "@/hooks/useProjectRisks";
import { useFileLinks, FileLink, getIconType, ICON_LABELS } from "@/hooks/useFileLinks";
import { useCustomTables, useCustomTableData, CustomColumn } from "@/hooks/useCustomTable";
import { Corridor } from "@/components/Corridor";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, ChevronDown, ChevronRight, Check,
  Plus, Pencil, Trash2, TrendingUp, AlertTriangle,
  Link as LinkIcon, Search, X, FileText, Github, Figma, Globe, Table, HardDrive, Database,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "overview" | "plan" | "kpi" | "risks" | "files" | "data";

const categoryBadge: Record<string, string> = {
  crypto:   "bg-amber-400/10 text-amber-400",
  telegram: "bg-blue/10 text-blue",
  shopify:  "bg-green/10 text-green",
  viral:    "bg-red/10 text-red",
  other:    "bg-ink-3/10 text-ink-3",
};

const statusBadge: Record<string, string> = {
  active:      "bg-green/10 text-green",
  in_progress: "bg-accent/10 text-accent",
  paused:      "bg-amber-400/10 text-amber-400",
  done:        "bg-blue/10 text-blue",
  archived:    "bg-ink-3/10 text-ink-3",
};

const statusLabel: Record<string, string> = {
  active:      "Активный",
  in_progress: "В разработке",
  paused:      "На паузе",
  done:        "Завершён",
  archived:    "В архиве",
};

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects } = useProjects();
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [updatingKpi, setUpdatingKpi] = useState<Kpi | null>(null);
  const [newKpiValue, setNewKpiValue] = useState("");

  const [planEditMode, setPlanEditMode] = useState(false);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseTitle, setEditingPhaseTitle] = useState("");

  const project = projects.find(p => p.slug === slug);

  // Pass slug directly — hook resolves UUID internally to avoid race condition
  const { phases, projectId, addPhase, updatePhase, deletePhase } = useProjectPhases(slug);
  // Once projectId is resolved by useProjectPhases, use it for all other hooks
  const resolvedId = projectId ?? project?.id ?? null;
  const { checklist, toggleItem, addItem, updateItem, deleteItem, progress, getByPhase } = useProjectChecklist(resolvedId);
  const { kpis, updateValue, getProgress, getProgressColor } = useProjectKpis(resolvedId);
  const { chartData, totalProfit } = useProjectForecast(resolvedId);
  const { risks, resolveRisk, getProbabilityColor, getProbabilityLabel, unresolvedRisks } = useProjectRisks(resolvedId);

  // Auto-expand active phase
  useEffect(() => {
    if (phases.length > 0) {
      const active = phases.find(p => p.status === "active");
      if (active) setExpandedPhases(new Set([active.id]));
    }
  }, [phases]);

  const togglePhase = (id: string) =>
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleToggleItem = async (item: ChecklistItem) => {
    const ok = await toggleItem(item);
    if (ok) toast.success(item.is_done ? "Отмечено как невыполненное" : "Выполнено!");
  };

  const handleAddItem = async (phaseId: string) => {
    if (!newItemTitle.trim()) return;
    const result = await addItem(phaseId, newItemTitle.trim());
    if (result) {
      toast.success("Пункт добавлен");
      setNewItemTitle("");
      setAddingToPhase(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editTitle.trim()) return;
    const ok = await updateItem(editingItem.id, { title: editTitle.trim() });
    if (ok) { toast.success("Обновлено"); setEditingItem(null); }
  };

  const handleDeleteItem = async (id: string) => {
    const ok = await deleteItem(id);
    if (ok) toast.success("Удалено");
  };

  const handleAddPhase = async () => {
    if (!newPhaseTitle.trim()) return;
    const p = await addPhase(newPhaseTitle.trim());
    if (p) { toast.success("Фаза добавлена"); setNewPhaseTitle(""); setAddingPhase(false); }
    else toast.error("Ошибка при добавлении");
  };

  const handleSavePhase = async () => {
    if (!editingPhaseId || !editingPhaseTitle.trim()) return;
    const ok = await updatePhase(editingPhaseId, { title: editingPhaseTitle.trim() });
    if (ok) { setEditingPhaseId(null); setEditingPhaseTitle(""); }
  };

  const handleDeletePhase = async (id: string) => {
    const ok = await deletePhase(id);
    if (ok) toast.success("Фаза удалена"); else toast.error("Ошибка");
  };

  const handleUpdateKpi = async () => {
    if (!updatingKpi) return;
    const n = parseFloat(newKpiValue);
    if (isNaN(n)) return;
    const ok = await updateValue(updatingKpi.id, n);
    if (ok) { toast.success("KPI обновлён"); setUpdatingKpi(null); setNewKpiValue(""); }
  };

  const getPhaseProgress = (phaseId: string) => {
    const items = getByPhase(phaseId);
    return { done: items.filter(c => c.is_done).length, total: items.length };
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Обзор" },
    { id: "plan",     label: "План" },
    { id: "kpi",      label: "KPI" },
    { id: "risks",    label: "Риски" },
    { id: "files",    label: "Файлы" },
    { id: "data",     label: "Данные" },
  ];

  if (!project && projects.length > 0) {
    return (
      <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
        <Corridor />
        <main className="flex-1 flex items-center justify-center bg-bg">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-ink mb-3">Проект не найден</h1>
            <Link href="/projects" className="text-accent hover:text-accent-2 text-sm">← Все проекты</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
        <Corridor />
        <main className="flex-1 flex items-center justify-center bg-bg">
          <div className="text-ink-3 text-sm">Загрузка...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto bg-bg">
        {/* Page header */}
        <div className="border-b border-line px-8 pt-6 pb-0">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-ink-3 hover:text-ink text-sm mb-4 transition-colors">
            <ArrowLeft size={14} />Проекты
          </Link>

          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${categoryBadge[project.category] || categoryBadge.other}`}>
                  {project.category.toUpperCase()}
                </span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${statusBadge[project.status] || statusBadge.active}`}>
                  {statusLabel[project.status] || project.status}
                </span>
              </div>
              <h1 className="text-[24px] font-semibold tracking-tight text-ink">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-ink-3 mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {project.repo_url && (
                <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-line rounded text-sm text-ink-2 hover:text-ink hover:border-line-2 transition-colors">
                  <ExternalLink size={13} />GitHub
                </a>
              )}
              {project.prod_url && (
                <a href={project.prod_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-line rounded text-sm text-ink-2 hover:text-ink hover:border-line-2 transition-colors">
                  <ExternalLink size={13} />Prod
                </a>
              )}
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] text-ink-3 mb-1.5">
              <span>Прогресс чеклиста</span>
              <span className="text-ink font-mono">{progress.done}/{progress.total} · {progress.percentage}%</span>
            </div>
            <div className="h-[3px] bg-line rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2.5 text-[13px] font-medium transition-colors relative ${
                  tab === t.id ? "text-ink" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {t.label}
                {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-px bg-accent" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-8 py-6">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Прогресс" value={`${progress.percentage}%`} accent />
                <StatCard label="Активная фаза" value={phases.find(p => p.status === "active")?.title || "—"} small />
                <StatCard label="Выполнено задач" value={String(progress.done)} />
                <StatCard label="Активных рисков" value={String(unresolvedRisks.length)} danger={unresolvedRisks.length > 0} />
              </div>

              {unresolvedRisks.length > 0 && (
                <div>
                  <h2 className="text-[13px] font-semibold text-ink mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" />Активные риски
                  </h2>
                  <div className="space-y-2">
                    {unresolvedRisks.slice(0, 3).map(risk => (
                      <div key={risk.id} className="bg-panel border border-line rounded-lg p-4 flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getProbabilityColor(risk.probability)}`} />
                        <div>
                          <div className="text-sm font-medium text-ink">{risk.title}</div>
                          <div className="text-[12px] text-ink-3 mt-0.5">{risk.mitigation || risk.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PLAN ── */}
          {tab === "plan" && (
            <div className="space-y-6">
              {/* Edit mode toggle */}
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-ink-3">
                  {phases.length > 0 ? `${phases.length} фаз · ${progress.done}/${progress.total} задач` : ""}
                </div>
                <button
                  onClick={() => setPlanEditMode(!planEditMode)}
                  className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded border transition-colors ${
                    planEditMode
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "border-line text-ink-3 hover:text-ink hover:border-line-2"
                  }`}
                >
                  <Pencil size={12} />
                  {planEditMode ? "Готово" : "Редактировать план"}
                </button>
              </div>

              {/* Phase stepper */}
              {phases.length > 0 && (
                <div className="bg-panel border border-line rounded-lg p-5">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {phases.map((phase, idx) => {
                      const prog = getPhaseProgress(phase.id);
                      const done = phase.status === "completed";
                      const active = phase.status === "active";
                      return (
                        <div key={phase.id} className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                              done   ? "bg-green text-white" :
                              active ? "bg-accent text-white" :
                                       "bg-panel-2 text-ink-3 border border-line"
                            }`}>
                              {done ? <Check size={12} /> : idx + 1}
                            </div>
                            <div className={`text-[9px] font-mono ${active ? "text-accent" : "text-ink-3"}`}>
                              {prog.done}/{prog.total}
                            </div>
                          </div>
                          {idx < phases.length - 1 && (
                            <div className={`h-px w-8 ${done ? "bg-green" : "bg-line"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Phases + checklists */}
              {phases.length === 0 ? (
                <div className="text-center py-12 text-ink-3 text-sm">
                  Фазы не найдены.{" "}
                  {planEditMode && (
                    <button onClick={() => setAddingPhase(true)} className="text-accent hover:text-accent-2">Добавить первую</button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {phases.map(phase => {
                    const phaseItems = checklist.filter(c => c.phase_id === phase.id);
                    const prog = getPhaseProgress(phase.id);
                    const isExpanded = expandedPhases.has(phase.id);

                    return (
                      <div key={phase.id} className="bg-panel border border-line rounded-lg overflow-hidden">
                          {editingPhaseId === phase.id ? (
                          <div className="px-4 py-2 flex items-center gap-2">
                            <input
                              value={editingPhaseTitle}
                              onChange={(e) => setEditingPhaseTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSavePhase(); if (e.key === "Escape") setEditingPhaseId(null); }}
                              className="flex-1 bg-bg border border-accent/40 rounded px-2 py-1 text-sm text-ink outline-none"
                              autoFocus
                            />
                            <button onClick={handleSavePhase} className="text-[11px] px-2 py-1 bg-accent text-white rounded hover:bg-accent-2">Сохр.</button>
                            <button onClick={() => setEditingPhaseId(null)} className="text-[11px] text-ink-3 hover:text-ink">Отмена</button>
                          </div>
                        ) : (
                        <button
                          onClick={() => togglePhase(phase.id)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-panel-2 transition-colors text-left"
                        >
                          {isExpanded ? <ChevronDown size={14} className="text-ink-3 shrink-0" /> : <ChevronRight size={14} className="text-ink-3 shrink-0" />}
                          <span className="text-[13px] font-medium text-ink flex-1">
                            {phase.order_index}. {phase.title}
                          </span>
                          <span className={`font-mono text-[10px] ${prog.done === prog.total && prog.total > 0 ? "text-green" : "text-ink-3"}`}>
                            {prog.done}/{prog.total}
                          </span>
                          {prog.done === prog.total && prog.total > 0 && (
                            <Check size={13} className="text-green" />
                          )}
                          {planEditMode && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingPhaseId(phase.id); setEditingPhaseTitle(phase.title); }}
                                className="p-1 text-ink-3 hover:text-ink"
                              ><Pencil size={11} /></button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePhase(phase.id); }}
                                className="p-1 text-ink-3 hover:text-red"
                              ><Trash2 size={11} /></button>
                            </>
                          )}
                        </button>
                        )}

                        {isExpanded && (
                          <div className="border-t border-line px-4 pb-4 pt-3">
                            <div className="space-y-1 mb-3">
                              {phaseItems.map(item => (
                                <div key={item.id} className="group flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-panel-2 transition-colors">
                                  <button
                                    onClick={() => handleToggleItem(item)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      item.is_done ? "bg-accent border-accent text-white" : "border-line-2 hover:border-accent/50"
                                    }`}
                                  >
                                    {item.is_done && <Check size={10} />}
                                  </button>

                                  {editingItem?.id === item.id ? (
                                    <div className="flex-1 flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingItem(null); }}
                                        className="flex-1 bg-bg border border-line rounded px-2 py-0.5 text-sm text-ink outline-none focus:border-accent/50"
                                        autoFocus
                                      />
                                      <button onClick={handleSaveEdit} className="text-[11px] px-2 py-0.5 bg-accent text-white rounded hover:bg-accent-2">Сохр.</button>
                                      <button onClick={() => setEditingItem(null)} className="text-[11px] text-ink-3 hover:text-ink">Отмена</button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className={`flex-1 text-[13px] ${item.is_done ? "text-ink-3 line-through" : "text-ink"}`}>
                                        {item.title}
                                      </span>
                                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                        <button onClick={() => { setEditingItem(item); setEditTitle(item.title); }} className="p-1 text-ink-3 hover:text-ink">
                                          <Pencil size={11} />
                                        </button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-ink-3 hover:text-red">
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                              {phaseItems.length === 0 && (
                                <div className="py-2 text-[12px] text-ink-3 px-2">Нет пунктов</div>
                              )}
                            </div>

                            {/* Add item */}
                            {addingToPhase === phase.id ? (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="text"
                                  value={newItemTitle}
                                  onChange={e => setNewItemTitle(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") handleAddItem(phase.id); if (e.key === "Escape") { setAddingToPhase(null); setNewItemTitle(""); } }}
                                  placeholder="Название пункта..."
                                  className="flex-1 bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50"
                                  autoFocus
                                />
                                <button onClick={() => handleAddItem(phase.id)} className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2">Добавить</button>
                                <button onClick={() => { setAddingToPhase(null); setNewItemTitle(""); }} className="px-3 py-1.5 text-ink-3 hover:text-ink text-sm">Отмена</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingToPhase(phase.id)}
                                className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-accent transition-colors mt-1"
                              >
                                <Plus size={12} />Добавить пункт
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add phase */}
              {planEditMode && (
                <div className="mt-2">
                  {addingPhase ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={newPhaseTitle}
                        onChange={(e) => setNewPhaseTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddPhase(); if (e.key === "Escape") { setAddingPhase(false); setNewPhaseTitle(""); } }}
                        placeholder="Название фазы..."
                        className="flex-1 bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50"
                        autoFocus
                      />
                      <button onClick={handleAddPhase} className="px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2">Добавить</button>
                      <button onClick={() => { setAddingPhase(false); setNewPhaseTitle(""); }} className="px-3 py-1.5 text-ink-3 hover:text-ink text-sm">Отмена</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingPhase(true)}
                      className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-accent transition-colors px-4 py-2 border border-dashed border-line rounded-lg w-full"
                    >
                      <Plus size={13} />+ Добавить фазу
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── KPI ── */}
          {tab === "kpi" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {kpis.map(kpi => {
                  const prog = getProgress(kpi);
                  const barColor = getProgressColor(prog);
                  return (
                    <div key={kpi.id} className="bg-panel border border-line rounded-lg p-5">
                      <div className="text-[12px] text-ink-3 mb-2">{kpi.name}</div>
                      <div className="text-[22px] font-semibold text-ink mb-1">
                        {kpi.current_value.toLocaleString()}
                        {kpi.unit && <span className="text-[14px] text-ink-3 ml-1">{kpi.unit}</span>}
                        <span className="text-[14px] text-ink-3 mx-2">/</span>
                        <span className="text-[16px] text-ink-2">{kpi.target_value.toLocaleString()}</span>
                      </div>
                      <div className="h-[3px] bg-line rounded-full overflow-hidden mb-3">
                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(prog, 100)}%` }} />
                      </div>
                      <button
                        onClick={() => { setUpdatingKpi(kpi); setNewKpiValue(kpi.current_value.toString()); }}
                        className="text-[12px] text-accent hover:text-accent-2 transition-colors"
                      >
                        Обновить значение
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* KPI update modal */}
              {updatingKpi && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                  <div className="bg-panel border border-line rounded-lg p-5 w-80">
                    <div className="text-[14px] font-semibold text-ink mb-3">{updatingKpi.name}</div>
                    <input
                      type="number"
                      value={newKpiValue}
                      onChange={e => setNewKpiValue(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleUpdateKpi()}
                      className="w-full bg-bg border border-line rounded px-3 py-2 text-ink text-sm outline-none focus:border-accent/50 mb-3"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setUpdatingKpi(null)} className="flex-1 px-3 py-2 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">Отмена</button>
                      <button onClick={handleUpdateKpi} className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">Сохранить</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue chart */}
              {chartData.length > 0 && (
                <div className="bg-panel border border-line rounded-lg p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                      <TrendingUp size={15} className="text-accent" />
                      Финансовый прогноз
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-ink-3">Прогнозируемая прибыль</div>
                      <div className={`text-[16px] font-semibold ${totalProfit >= 0 ? "text-green" : "text-red"}`}>
                        ${totalProfit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgb(var(--color-ink-3))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "rgb(var(--color-ink-3))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                        <Tooltip
                          contentStyle={{ background: "rgb(var(--color-panel))", border: "1px solid rgb(var(--color-line))", borderRadius: "6px", fontSize: "12px" }}
                          labelStyle={{ color: "rgb(var(--color-ink-2))" }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="rgb(var(--color-accent))" strokeWidth={1.5} dot={false} name="Доход" />
                        <Line type="monotone" dataKey="costs" stroke="rgb(var(--color-ink-3))" strokeWidth={1.5} dot={false} name="Расходы" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-5 mt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                      <div className="w-3 h-px bg-accent" />Доход
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                      <div className="w-3 h-px bg-ink-3" />Расходы
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RISKS ── */}
          {tab === "risks" && (
            <div className="space-y-3">
              {risks.length === 0 && (
                <div className="text-center py-12 text-ink-3 text-sm">Рисков нет</div>
              )}
              {risks.map(risk => (
                <div
                  key={risk.id}
                  className={`bg-panel border border-line rounded-lg p-4 flex items-start gap-3 ${risk.is_resolved ? "opacity-40" : ""}`}
                >
                  <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${risk.is_resolved ? "text-ink-3" : "text-amber-400"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[13px] font-medium ${risk.is_resolved ? "line-through text-ink-3" : "text-ink"}`}>
                        {risk.title}
                      </span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded text-white ${getProbabilityColor(risk.probability)}`}>
                        {getProbabilityLabel(risk.probability)}
                      </span>
                    </div>
                    {risk.mitigation && (
                      <div className="text-[12px] text-ink-3">{risk.mitigation}</div>
                    )}
                  </div>
                  {!risk.is_resolved && (
                    <button
                      onClick={() => resolveRisk(risk.id).then(ok => ok && toast.success("Риск решён"))}
                      className="text-[12px] px-2.5 py-1 bg-panel-2 border border-line rounded text-ink-2 hover:bg-green/10 hover:text-green hover:border-green/30 transition-colors shrink-0"
                    >
                      Решён
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── FILES ── */}
          {tab === "files" && project && (
            <FilesTab projectId={project.id} />
          )}

          {/* ── DATA ── */}
          {tab === "data" && project && (
            <DataTab projectId={project.id} />
          )}

        </div>
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, danger, small }: {
  label: string; value: string; accent?: boolean; danger?: boolean; small?: boolean;
}) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <div className="text-[11px] text-ink-3 mb-1.5">{label}</div>
      <div className={`font-semibold ${small ? "text-[15px]" : "text-[22px]"} ${
        accent ? "text-accent" : danger ? "text-red" : "text-ink"
      }`}>
        {value}
      </div>
    </div>
  );
}

// ── FilesTab ──────────────────────────────────────────────────────────────────

function FileIcon({ type, size = 16 }: { type: string; size?: number }) {
  switch (type) {
    case "gdoc":    return <FileText size={size} />;
    case "gsheet":  return <Table size={size} />;
    case "gslides": return <Database size={size} />;
    case "gdrive":  return <HardDrive size={size} />;
    case "notion":  return <FileText size={size} />;
    case "figma":   return <Figma size={size} />;
    case "github":  return <Github size={size} />;
    case "vercel":  return <Globe size={size} />;
    default:        return <LinkIcon size={size} />;
  }
}

const FILE_ICON_COLORS: Record<string, string> = {
  gdoc:    "text-blue-400",
  gsheet:  "text-green",
  gslides: "text-amber-400",
  gdrive:  "text-blue-300",
  notion:  "text-ink-2",
  figma:   "text-purple-400",
  github:  "text-ink-2",
  vercel:  "text-ink-2",
  link:    "text-ink-3",
};

interface FilesFormState { title: string; url: string; tags: string; }
const emptyFilesForm: FilesFormState = { title: "", url: "", tags: "" };

function FilesTab({ projectId }: { projectId: string }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<FileLink | null>(null);
  const [form, setForm] = useState<FilesFormState>(emptyFilesForm);
  const { files, loading, addFile, updateFile, deleteFile } = useFileLinks(projectId);

  const filtered = files.filter((f) =>
    !search ||
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.url.toLowerCase().includes(search.toLowerCase())
  );

  const parseTags = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

  const openAdd = () => { setForm(emptyFilesForm); setEditTarget(null); setModal("add"); };
  const openEdit = (f: FileLink) => {
    setEditTarget(f);
    setForm({ title: f.title, url: f.url, tags: (f.tags || []).join(", ") });
    setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    if (modal === "add") {
      const ok = await addFile({ title: form.title.trim(), url: form.url.trim(), project_id: projectId, tags: parseTags(form.tags) });
      if (ok) { toast.success("Файл добавлен"); closeModal(); } else toast.error("Ошибка");
    } else if (modal === "edit" && editTarget) {
      const ok = await updateFile(editTarget.id, { title: form.title.trim(), url: form.url.trim(), tags: parseTags(form.tags) });
      if (ok) { toast.success("Обновлено"); closeModal(); } else toast.error("Ошибка");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteFile(id);
    if (ok) toast.success("Удалено"); else toast.error("Ошибка");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-panel border border-line rounded pl-8 pr-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50 placeholder:text-ink-3"
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors"
        >
          <Plus size={13} />Добавить
        </button>
      </div>

      {loading && <div className="text-ink-3 text-sm text-center py-8">Загрузка...</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-ink-3 text-sm text-center py-8">
          {files.length === 0 ? "Нет файлов. Добавьте первый!" : "Ничего не найдено"}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {filtered.map((f) => {
          const iconType = f.icon_type || "link";
          return (
            <div key={f.id} className="bg-panel border border-line rounded-lg p-4 group hover:border-line-2 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className={`mt-0.5 shrink-0 ${FILE_ICON_COLORS[iconType] || "text-ink-3"}`}>
                  <FileIcon type={iconType} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink truncate">{f.title}</div>
                  <div className="text-[11px] text-ink-3">{ICON_LABELS[iconType] || "Ссылка"}</div>
                </div>
              </div>
              {(f.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {f.tags!.map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-panel-2 text-ink-3 rounded">{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-line">
                <a
                  href={f.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-panel-2 border border-line rounded text-[12px] text-ink-2 hover:text-ink transition-colors"
                >
                  <ExternalLink size={11} />Открыть
                </a>
                <button onClick={() => openEdit(f)} className="p-1.5 bg-panel-2 border border-line rounded text-ink-3 hover:text-ink transition-colors">
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDelete(f.id)} className="p-1.5 bg-panel-2 border border-line rounded text-ink-3 hover:text-red transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-panel border border-line rounded-lg p-6 w-[400px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-ink">{modal === "edit" ? "Редактировать" : "Добавить ссылку"}</h2>
              <button onClick={closeModal} className="text-ink-3 hover:text-ink"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-ink-3 mb-1 block">Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Например: Дизайн в Figma"
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] text-ink-3 mb-1 block">URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                />
                {form.url && (
                  <div className="mt-1 text-[11px] text-ink-3">
                    Тип: <span className="text-ink-2">{ICON_LABELS[getIconType(form.url)]}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[12px] text-ink-3 mb-1 block">Теги (через запятую)</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="design, api, docs"
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={closeModal} className="flex-1 px-3 py-2 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">Отмена</button>
              <button onClick={handleSubmit} className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">
                {modal === "edit" ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DataTab ───────────────────────────────────────────────────────────────────

const COL_TYPE_LABELS: Record<string, string> = {
  text: "Текст", number: "Число", date: "Дата",
  checkbox: "Флаг", select: "Выбор", url: "URL",
};

function DataTab({ projectId }: { projectId: string }) {
  const { tables, loading: tablesLoading, createTable, deleteTable } = useCustomTables(projectId);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [newTableTitle, setNewTableTitle] = useState("");
  const [addingTable, setAddingTable] = useState(false);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<CustomColumn["type"]>("text");

  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0] || null;
  const activeId = selectedTable?.id ?? null;

  const { columns, rows, loading: dataLoading, addColumn, deleteColumn, addRow, updateCell, deleteRow } =
    useCustomTableData(activeId);

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) setSelectedTableId(tables[0].id);
  }, [tables, selectedTableId]);

  const handleCreateTable = async () => {
    if (!newTableTitle.trim()) return;
    const t = await createTable(newTableTitle.trim());
    if (t) { setSelectedTableId(t.id); setNewTableTitle(""); setAddingTable(false); }
    else toast.error("Ошибка при создании");
  };

  const handleDeleteTable = async (id: string) => {
    const ok = await deleteTable(id);
    if (ok) {
      if (selectedTableId === id) setSelectedTableId(null);
      toast.success("Таблица удалена");
    }
  };

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    const col = await addColumn(newColName.trim(), newColType);
    if (col) { setNewColName(""); setNewColType("text"); setAddingCol(false); }
    else toast.error("Ошибка");
  };

  const handleCellChange = useCallback(async (rowId: string, colId: string, value: unknown) => {
    await updateCell(rowId, colId, value);
  }, [updateCell]);

  if (tablesLoading) return <div className="text-ink-3 text-sm text-center py-8">Загрузка...</div>;

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Table list */}
      <div className="w-44 shrink-0">
        <div className="space-y-px mb-3">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 px-2 py-2 rounded cursor-pointer text-[13px] transition-colors ${
                activeId === t.id ? "bg-accent/10 text-accent" : "text-ink-2 hover:bg-panel hover:text-ink"
              }`}
              onClick={() => setSelectedTableId(t.id)}
            >
              <span className="flex-1 truncate">{t.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTable(t.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-3 hover:text-red transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        {addingTable ? (
          <div className="space-y-1">
            <input
              value={newTableTitle}
              onChange={(e) => setNewTableTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateTable(); if (e.key === "Escape") { setAddingTable(false); setNewTableTitle(""); } }}
              placeholder="Название..."
              className="w-full bg-panel border border-line rounded px-2 py-1 text-[12px] text-ink outline-none focus:border-accent/50"
              autoFocus
            />
            <div className="flex gap-1">
              <button onClick={handleCreateTable} className="flex-1 px-1.5 py-1 bg-accent text-white rounded text-[11px] hover:bg-accent-2">Создать</button>
              <button onClick={() => { setAddingTable(false); setNewTableTitle(""); }} className="px-1.5 py-1 text-ink-3 hover:text-ink text-[11px]">✕</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTable(true)}
            className="flex items-center gap-1 text-[12px] text-ink-3 hover:text-accent transition-colors"
          >
            <Plus size={12} />Новая таблица
          </button>
        )}
      </div>

      {/* Table editor */}
      <div className="flex-1 overflow-auto">
        {!selectedTable ? (
          <div className="text-ink-3 text-sm text-center py-12">Создайте таблицу</div>
        ) : dataLoading ? (
          <div className="text-ink-3 text-sm text-center py-8">Загрузка...</div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line">
                    {columns.map((col) => (
                      <th key={col.id} className="group text-left px-3 py-2 text-ink-3 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{col.name}</span>
                          <span className="text-[10px] text-ink-3/60 font-mono">{COL_TYPE_LABELS[col.type]}</span>
                          <button
                            onClick={() => deleteColumn(col.id).then(() => toast.success("Колонка удалена"))}
                            className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2">
                      {addingCol ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={newColName}
                            onChange={(e) => setNewColName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") { setAddingCol(false); setNewColName(""); } }}
                            placeholder="Колонка"
                            className="w-20 bg-bg border border-line rounded px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-accent/50"
                            autoFocus
                          />
                          <select
                            value={newColType}
                            onChange={(e) => setNewColType(e.target.value as CustomColumn["type"])}
                            className="bg-bg border border-line rounded px-1 py-0.5 text-[11px] text-ink outline-none"
                          >
                            {Object.entries(COL_TYPE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                          <button onClick={handleAddColumn} className="px-1.5 py-0.5 bg-accent text-white rounded text-[10px]">+</button>
                          <button onClick={() => { setAddingCol(false); setNewColName(""); }} className="text-ink-3 hover:text-ink"><X size={10} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingCol(true)}
                          className="flex items-center gap-1 text-ink-3 hover:text-accent transition-colors"
                        >
                          <Plus size={12} /><span className="text-[11px]">Колонка</span>
                        </button>
                      )}
                    </th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="group border-b border-line/50 hover:bg-panel/50 transition-colors">
                      {columns.map((col) => (
                        <td key={col.id} className="px-2 py-1">
                          <TableCell
                            col={col}
                            value={row.data[col.id]}
                            onChange={(v) => handleCellChange(row.id, col.id, v)}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1" />
                      <td className="px-1 py-1">
                        <button
                          onClick={() => deleteRow(row.id).then(() => toast.success("Строка удалена"))}
                          className="opacity-0 group-hover:opacity-100 p-1 text-ink-3 hover:text-red transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => addRow().then((r) => { if (!r) toast.error("Ошибка"); })}
              className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-accent transition-colors"
            >
              <Plus size={12} />Добавить строку
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TableCell({ col, value, onChange }: {
  col: CustomColumn;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const baseInput = "w-full bg-transparent border border-transparent hover:border-line focus:border-accent/50 rounded px-1.5 py-0.5 text-[12px] text-ink outline-none transition-colors";

  if (col.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-accent"
      />
    );
  }
  if (col.type === "date") {
    return (
      <input
        type="date"
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        className={baseInput}
      />
    );
  }
  if (col.type === "number") {
    return (
      <input
        type="number"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        onBlur={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${baseInput} w-24`}
      />
    );
  }
  if (col.type === "select" && col.options?.choices) {
    return (
      <select
        value={String(value || "")}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} cursor-pointer`}
      >
        <option value="">—</option>
        {col.options.choices.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }
  if (col.type === "url") {
    return (
      <div className="flex items-center gap-1">
        <input
          type="url"
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInput} flex-1`}
          placeholder="https://..."
        />
        {!!value && (
          <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-2">
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={String(value || "")}
      onChange={(e) => onChange(e.target.value)}
      className={baseInput}
      placeholder="—"
    />
  );
}
