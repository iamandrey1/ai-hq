"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhases, Phase } from "@/hooks/useProjectPhases";
import { useProjectChecklist, ChecklistItem } from "@/hooks/useProjectChecklist";
import { useProjectKpis, Kpi } from "@/hooks/useProjectKpis";
import { useProjectForecast } from "@/hooks/useProjectForecast";
import { useProjectRisks, Risk } from "@/hooks/useProjectRisks";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  ArrowLeft, ExternalLink, ChevronDown, ChevronRight, Check, 
  Plus, Pencil, Trash2, TrendingUp, AlertTriangle, Target
} from "lucide-react";

type TabType = "overview" | "plan" | "kpi" | "risks" | "chat";

const categoryColors: Record<string, string> = {
  crypto: "bg-amber-500/20 text-amber-400",
  telegram: "bg-blue-500/20 text-blue-400",
  shopify: "bg-green-500/20 text-green-400",
  viral: "bg-red-500/20 text-red-400",
  other: "bg-gray-500/20 text-gray-400",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  paused: "bg-amber-500/20 text-amber-400",
  done: "bg-blue-500/20 text-blue-400",
  archived: "bg-gray-500/20 text-gray-400",
};

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [updatingKpi, setUpdatingKpi] = useState<Kpi | null>(null);
  const [newKpiValue, setNewKpiValue] = useState("");

  const project = projects.find((p) => p.slug === slug);
  
  const { phases, loading: phasesLoading } = useProjectPhases(project?.id || null);
  const { checklist, loading: checklistLoading, toggleItem, addItem, updateItem, deleteItem, progress, getByPhase } = useProjectChecklist(project?.id || null);
  const { kpis, loading: kpisLoading, updateValue, getProgress, getProgressColor } = useProjectKpis(project?.id || null);
  const { forecast, loading: forecastLoading, chartData, totalProfit } = useProjectForecast(project?.id || null);
  const { risks, loading: risksLoading, resolveRisk, getProbabilityColor, getProbabilityLabel, unresolvedRisks } = useProjectRisks(project?.id || null);

  // Auto-expand active phase
  useEffect(() => {
    if (phases.length > 0) {
      const activePhase = phases.find((p) => p.status === "active");
      if (activePhase) {
        setExpandedPhases(new Set([activePhase.id]));
      }
    }
  }, [phases]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
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

  const handleToggleItem = async (item: ChecklistItem) => {
    const success = await toggleItem(item);
    if (success) {
      toast.success(item.is_done ? "Отмечено как невыполненное" : "Выполнено!");
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !editTitle.trim()) return;
    const success = await updateItem(editingItem.id, { title: editTitle.trim() });
    if (success) {
      toast.success("Пункт обновлён");
      setEditingItem(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const success = await deleteItem(itemId);
    if (success) {
      toast.success("Пункт удалён");
    }
  };

  const handleUpdateKpi = async () => {
    if (!updatingKpi) return;
    const numValue = parseFloat(newKpiValue);
    if (isNaN(numValue)) return;
    const success = await updateValue(updatingKpi.id, numValue);
    if (success) {
      toast.success("KPI обновлён");
      setUpdatingKpi(null);
      setNewKpiValue("");
    }
  };

  const handleResolveRisk = async (riskId: string) => {
    const success = await resolveRisk(riskId);
    if (success) {
      toast.success("Риск помечен как решённый");
    }
  };

  const getPhaseProgress = (phaseId: string) => {
    const items = getByPhase(phaseId);
    const done = items.filter((c) => c.is_done).length;
    return { done, total: items.length };
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-obsidian-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink-1 mb-4">Проект не найден</h1>
          <Link href="/projects" className="text-amber-400 hover:text-amber-300">
            ← Вернуться к проектам
          </Link>
        </div>
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
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[project.category]}`}>
                  {project.category.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[project.status]}`}>
                  {project.status === "active" ? "Активный" : project.status === "paused" ? "На паузе" : project.status === "done" ? "Завершён" : "В архиве"}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-ink-1">{project.name}</h1>
              {project.description && (
                <p className="text-ink-2 mt-2">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {project.repo_url && (
                <a href={project.repo_url} target="_blank" rel="noopener noreferrer" 
                   className="p-2 bg-obsidian-3 hover:bg-obsidian-4 rounded-lg text-ink-2 hover:text-ink-1 transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
              {project.prod_url && (
                <a href={project.prod_url} target="_blank" rel="noopener noreferrer"
                   className="p-2 bg-obsidian-3 hover:bg-obsidian-4 rounded-lg text-ink-2 hover:text-ink-1 transition-colors">
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-obsidian-3 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-2">Прогресс проекта</span>
              <span className="text-lg font-mono text-amber-400">
                {progress.done} / {progress.total} ({progress.percentage}%)
              </span>
            </div>
            <div className="h-3 bg-obsidian-4 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line/30 bg-obsidian-2/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {(["overview", "plan", "kpi", "risks"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? "text-amber-400"
                    : "text-ink-3 hover:text-ink-1"
                }`}
              >
                {tab === "overview" && "Обзор"}
                {tab === "plan" && "План"}
                {tab === "kpi" && "KPI"}
                {tab === "risks" && "Риски"}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "overview" && <OverviewTab 
          project={project} 
          progress={progress} 
          activePhase={phases.find(p => p.status === "active")}
          unresolvedRisks={unresolvedRisks}
        />}
        
        {activeTab === "plan" && <PlanTab
          phases={phases}
          checklist={checklist}
          expandedPhases={expandedPhases}
          addingToPhase={addingToPhase}
          editingItem={editingItem}
          newItemTitle={newItemTitle}
          editTitle={editTitle}
          onTogglePhase={togglePhase}
          onToggleItem={handleToggleItem}
          onSetAddingToPhase={setAddingToPhase}
          onSetNewItemTitle={setNewItemTitle}
          onAddItem={handleAddItem}
          onSetEditingItem={setEditingItem}
          onSetEditTitle={setEditTitle}
          onSaveEdit={handleEditItem}
          onDeleteItem={handleDeleteItem}
          getPhaseProgress={getPhaseProgress}
        />}
        
        {activeTab === "kpi" && <KpiTab
          kpis={kpis}
          forecast={forecast}
          chartData={chartData}
          totalProfit={totalProfit}
          updatingKpi={updatingKpi}
          newKpiValue={newKpiValue}
          onSetUpdatingKpi={setUpdatingKpi}
          onSetNewKpiValue={setNewKpiValue}
          onUpdateKpi={handleUpdateKpi}
          getProgress={getProgress}
          getProgressColor={getProgressColor}
        />}
        
        {activeTab === "risks" && <RisksTab
          risks={risks}
          onResolve={handleResolveRisk}
          getProbabilityColor={getProbabilityColor}
          getProbabilityLabel={getProbabilityLabel}
        />}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ 
  project, 
  progress, 
  activePhase, 
  unresolvedRisks 
}: { 
  project: any; 
  progress: any; 
  activePhase?: Phase; 
  unresolvedRisks: Risk[]; 
}) {
  return (
    <div className="space-y-8">
      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-obsidian-3 rounded-xl p-4">
          <div className="text-ink-3 text-sm mb-1">Прогресс</div>
          <div className="text-3xl font-bold text-amber-400">{progress.percentage}%</div>
        </div>
        <div className="bg-obsidian-3 rounded-xl p-4">
          <div className="text-ink-3 text-sm mb-1">Активная фаза</div>
          <div className="text-lg font-semibold text-ink-1">{activePhase?.title || "—"}</div>
        </div>
        <div className="bg-obsidian-3 rounded-xl p-4">
          <div className="text-ink-3 text-sm mb-1">Выполнено задач</div>
          <div className="text-3xl font-bold text-green-400">{progress.done}</div>
        </div>
        <div className="bg-obsidian-3 rounded-xl p-4">
          <div className="text-ink-3 text-sm mb-1">Активных рисков</div>
          <div className="text-3xl font-bold text-red-400">{unresolvedRisks.length}</div>
        </div>
      </div>

      {/* Active risks preview */}
      {unresolvedRisks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-ink-1 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Активные риски
          </h2>
          <div className="space-y-3">
            {unresolvedRisks.slice(0, 3).map((risk) => (
              <div key={risk.id} className="bg-obsidian-3 rounded-lg p-4 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${getProbabilityColor(risk.probability)}`} />
                <div>
                  <div className="font-medium text-ink-1">{risk.title}</div>
                  <div className="text-sm text-ink-3">{risk.mitigation || risk.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Plan Tab Component
function PlanTab({
  phases, checklist, expandedPhases, addingToPhase, editingItem,
  newItemTitle, editTitle, onTogglePhase, onToggleItem,
  onSetAddingToPhase, onSetNewItemTitle, onAddItem,
  onSetEditingItem, onSetEditTitle, onSaveEdit, onDeleteItem, getPhaseProgress
}: any) {
  return (
    <div className="space-y-8">
      {/* Phase stepper */}
      <div className="bg-obsidian-3 rounded-xl p-6">
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {phases.map((phase: Phase, idx: number) => {
            const prog = getPhaseProgress(phase.id);
            const isCompleted = phase.status === "completed";
            const isActive = phase.status === "active";
            const isBlocked = phase.status === "blocked";
            
            return (
              <div key={phase.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCompleted ? "bg-green-500 text-white" :
                    isActive ? "bg-amber-500 text-white" :
                    isBlocked ? "bg-red-500 text-white" :
                    "bg-obsidian-4 text-ink-3"
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="text-xs text-ink-3 mt-1">{prog.done}/{prog.total}</div>
                </div>
                {idx < phases.length - 1 && (
                  <div className={`h-0.5 w-12 ${isCompleted ? "bg-green-500" : "bg-obsidian-4"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 overflow-x-auto">
          {phases.map((phase: Phase) => (
            <div key={phase.id} className={`text-center min-w-[80px] ${phase.status === "active" ? "text-amber-400" : "text-ink-3"}`}>
              <div className="text-xs font-medium truncate">{phase.title}</div>
              <div className="text-[10px] opacity-60">{phase.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist by phases */}
      <div className="space-y-4">
        {phases.map((phase: Phase) => {
          const phaseItems = checklist.filter((c: ChecklistItem) => c.phase_id === phase.id);
          const prog = getPhaseProgress(phase.id);
          const isExpanded = expandedPhases.has(phase.id);

          return (
            <div key={phase.id} className="bg-obsidian-3 rounded-xl overflow-hidden">
              <button
                onClick={() => onTogglePhase(phase.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-obsidian-4/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-ink-3" /> : <ChevronRight className="w-5 h-5 text-ink-3" />}
                  <span className="font-medium text-ink-1">
                    Фаза {phase.order_index}: {phase.title}
                  </span>
                  <span className={`text-sm ${prog.done === prog.total && prog.total > 0 ? "text-green-400" : "text-ink-3"}`}>
                    {prog.done}/{prog.total}
                  </span>
                </div>
                {prog.done === prog.total && prog.total > 0 && (
                  <Check className="w-5 h-5 text-green-400" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-line/30 p-4">
                  <div className="space-y-2 mb-4">
                    {phaseItems.map((item: ChecklistItem) => (
                      <div key={item.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-obsidian-4/30">
                        <button
                          onClick={() => onToggleItem(item)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            item.is_done 
                              ? "bg-green-500 border-green-500 text-white" 
                              : "border-ink-3 hover:border-amber-400"
                          }`}
                        >
                          {item.is_done && <Check className="w-3 h-3" />}
                        </button>
                        
                        {editingItem?.id === item.id ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => onSetEditTitle(e.target.value)}
                              className="flex-1 bg-obsidian-4 border border-line rounded px-2 py-1 text-ink-1"
                              autoFocus
                            />
                            <button onClick={onSaveEdit} className="px-2 py-1 bg-amber-500 text-obsidian-1 rounded text-sm">Сохранить</button>
                            <button onClick={() => onSetEditingItem(null)} className="px-2 py-1 text-ink-3 hover:text-ink-1">Отмена</button>
                          </div>
                        ) : (
                          <>
                            <span className={`flex-1 text-sm ${item.is_done ? "text-ink-3 line-through" : "text-ink-1"}`}>
                              {item.title}
                            </span>
                            {item.due_date && (
                              <span className="text-xs text-ink-3">{new Date(item.due_date).toLocaleDateString()}</span>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <button onClick={() => { onSetEditingItem(item); onSetEditTitle(item.title); }} className="p-1 hover:text-amber-400">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => onDeleteItem(item.id)} className="p-1 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {phase.status === "active" && (
                    addingToPhase === phase.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newItemTitle}
                          onChange={(e) => onSetNewItemTitle(e.target.value)}
                          placeholder="Название пункта..."
                          className="flex-1 bg-obsidian-4 border border-line rounded px-3 py-2 text-ink-1"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && onAddItem(phase.id)}
                        />
                        <button onClick={() => onAddItem(phase.id)} className="px-4 py-2 bg-amber-500 text-obsidian-1 rounded font-medium">Добавить</button>
                        <button onClick={() => { setAddingToPhase(null); onSetNewItemTitle(""); }} className="px-4 py-2 text-ink-3 hover:text-ink-1">Отмена</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingToPhase(phase.id)}
                        className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить пункт
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// KPI Tab Component
function KpiTab({
  kpis, forecast, chartData, totalProfit, updatingKpi, newKpiValue,
  onSetUpdatingKpi, onSetNewKpiValue, onUpdateKpi, getProgress, getProgressColor
}: any) {
  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        {kpis.map((kpi: Kpi) => {
          const prog = getProgress(kpi);
          const barColor = getProgressColor(prog);
          
          return (
            <div key={kpi.id} className="bg-obsidian-3 rounded-xl p-5">
              <div className="text-ink-3 text-sm mb-2">{kpi.name}</div>
              <div className="text-2xl font-bold text-ink-1 mb-3">
                {kpi.current_value.toLocaleString()}
                {kpi.unit && <span className="text-sm text-ink-3 ml-1">{kpi.unit}</span>}
                <span className="text-sm text-ink-3 mx-2">/</span>
                <span className="text-lg text-ink-2">{kpi.target_value.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-obsidian-4 rounded-full overflow-hidden mb-3">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(prog, 100)}%` }} />
              </div>
              <button
                onClick={() => { onSetUpdatingKpi(kpi); onSetNewKpiValue(kpi.current_value.toString()); }}
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                Обновить значение
              </button>
            </div>
          );
        })}
      </div>

      {/* Forecast chart */}
      {chartData.length > 0 && (
        <div className="bg-obsidian-3 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-ink-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Финансовый прогноз
            </h3>
            <div className="text-right">
              <div className="text-sm text-ink-3">Прогнозируемая прибыль</div>
              <div className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                ${totalProfit.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Simple bar chart */}
          <div className="flex items-end gap-4 h-48">
            {chartData.map((d: any, idx: number) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1">
                  <div className="bg-green-500/60 rounded-t" style={{ height: `${Math.max(d.revenue / Math.max(...chartData.map(c => c.revenue), 1) * 120, 4)}px` }} />
                  <div className="bg-red-500/60 rounded-t" style={{ height: `${Math.max(d.costs / Math.max(...chartData.map(c => c.costs), 1) * 120, 4)}px` }} />
                </div>
                <div className="text-xs text-ink-3">{d.month}</div>
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
      )}
    </div>
  );
}

// Risks Tab Component
function RisksTab({
  risks, onResolve, getProbabilityColor, getProbabilityLabel
}: any) {
  return (
    <div className="space-y-4">
      {risks.map((risk: Risk) => (
        <div
          key={risk.id}
          className={`bg-obsidian-3 rounded-xl p-5 ${risk.is_resolved ? "opacity-50" : ""}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${risk.is_resolved ? "text-ink-3" : "text-amber-400"}`} />
              <div>
                <h4 className={`font-medium ${risk.is_resolved ? "text-ink-3 line-through" : "text-ink-1"}`}>
                  {risk.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-ink-3">Вероятность:</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getProbabilityColor(risk.probability)} text-white`}>
                    {getProbabilityLabel(risk.probability)}
                  </span>
                </div>
              </div>
            </div>
            {!risk.is_resolved && (
              <button
                onClick={() => onResolve(risk.id)}
                className="px-3 py-1 bg-obsidian-4 hover:bg-green-500/20 text-ink-2 hover:text-green-400 rounded text-sm transition-colors"
              >
                Решён
              </button>
            )}
          </div>
          
          {risk.mitigation && (
            <div className="mt-3 ml-8">
              <div className="text-xs text-ink-3 mb-1">Митигация:</div>
              <div className="text-sm text-ink-2">{risk.mitigation}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Add simple getProbabilityColor to top since RisksTab is defined after useProjectRisks
function getProbabilityColor(probability: string) {
  switch (probability) {
    case "low": return "bg-green-500";
    case "medium": return "bg-amber-500";
    case "high": return "bg-red-500";
    default: return "bg-ink-3";
  }
}

function getProbabilityLabel(probability: string) {
  switch (probability) {
    case "low": return "Низкая";
    case "medium": return "Средняя";
    case "high": return "Высокая";
    default: return probability;
  }
}