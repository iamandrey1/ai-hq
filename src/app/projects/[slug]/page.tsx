"use client";
import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useProjectChecklist } from "@/hooks/useProjectChecklist";
import { useProjectKpis } from "@/hooks/useProjectKpis";
import { useProjectForecast } from "@/hooks/useProjectForecast";
import { useProjectRisks } from "@/hooks/useProjectRisks";
import { useProjectSteps } from "@/hooks/useProjectSteps";
import { useFileLinks, FileLink, getIconType, ICON_LABELS } from "@/hooks/useFileLinks";
import { useCustomTables, useCustomTableData, CustomColumn } from "@/hooks/useCustomTable";
import { useProjectBudget, BudgetItem } from "@/hooks/useProjectBudget";
import { AppShell } from "@/components/layout/AppShell";
import { CommentsPanel } from "@/components/comments";
import { OverviewTab } from "./tabs/OverviewTab";
import { KpiTab } from "./tabs/KpiTab";
import { RisksTab } from "./tabs/RisksTab";
import { PlanTab } from "./tabs/PlanTab";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink,
  Plus, Pencil, Trash2,
  Link as LinkIcon, Search, X, FileText, Github, Figma, Globe, Table, HardDrive, Database,
  Sparkles, RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";

type Tab = "overview" | "plan" | "kpi" | "risks" | "budget" | "files" | "data";

const TAB_VALUES: Tab[] = ["overview", "plan", "kpi", "risks", "budget", "files", "data"];
const isValidTab = (v: string | null): v is Tab =>
  v !== null && (TAB_VALUES as string[]).includes(v);

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

  // Tab state synced with ?tab=... query param so refresh keeps position
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const tab: Tab = isValidTab(tabParam) ? tabParam : "overview";
  const setTab = useCallback((next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);
  // AI Summary
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const refreshAiSummary = useCallback(async (projectId: string) => {
    setAiSummaryLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/summary`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiSummary(data.summary ?? null);
    } catch {
      toast.error("Не удалось получить AI Summary");
    } finally {
      setAiSummaryLoading(false);
    }
  }, []);

  const project = projects.find(p => p.slug === slug);

  // Pass slug directly — hook resolves UUID internally to avoid race condition
  const { phases, projectId, addPhase, updatePhase, deletePhase } = useProjectPhases(slug);
  // Once projectId is resolved by useProjectPhases, use it for all other hooks
  const resolvedId = projectId ?? project?.id ?? null;
  const { steps, toggleStep, progress: stepsProgress } = useProjectSteps(resolvedId);
  const { checklist, toggleItem, addItem, updateItem, deleteItem, progress, getByPhase } = useProjectChecklist(resolvedId);
  const { kpis, addKpi, updateKpi, deleteKpi, getProgress } = useProjectKpis(resolvedId);
  const { chartData, totalProfit } = useProjectForecast(resolvedId);
  const { risks, addRisk, resolveRisk, updateRisk, deleteRisk, getProbabilityColor, getProbabilityLabel, unresolvedRisks } = useProjectRisks(resolvedId);
  const { items: budgetItems, loading: budgetLoading, totalBudget, totalSpent, addItem: addBudgetItem, updateItem: updateBudgetItem, deleteItem: deleteBudgetItem } = useProjectBudget(resolvedId);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Обзор" },
    { id: "plan",     label: "План",   count: checklist.length },
    { id: "kpi",      label: "KPI",    count: kpis.length },
    { id: "risks",    label: "Риски",  count: unresolvedRisks.length },
    { id: "budget",   label: "Бюджет", count: budgetItems.length },
    { id: "files",    label: "Файлы" },
    { id: "data",     label: "Данные" },
  ];

  // Deterministic icon-badge palette per project
  const palette = [
    "from-accent to-[#2E7AA0]",
    "from-purple-400 to-[#7C5DD8]",
    "from-green to-[#16A34A]",
    "from-pink-400 to-[#DB2777]",
    "from-amber-400 to-[#D97706]",
  ];
  const projectInitials = (name: string) => {
    const words = name.trim().split(/\s+/).slice(0, 2);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };
  const paletteIndex = project ? Math.abs(
    project.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  ) % palette.length : 0;
  const projectGradient = palette[paletteIndex];

  if (!project && projects.length > 0) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center bg-bg min-h-full">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-ink mb-3">Проект не найден</h1>
            <Link href="/projects" className="text-accent hover:text-accent-2 text-sm">← Все проекты</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center bg-bg min-h-full">
          <div className="text-ink-3 text-sm">Загрузка...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="bg-bg min-h-full">
        {/* Page header */}
        <div className="border-b border-line px-4 md:px-8 pt-6 pb-0">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-ink-3 hover:text-ink text-sm mb-4 transition-colors">
            <ArrowLeft size={14} />Проекты
          </Link>

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-[10px] bg-gradient-to-br ${projectGradient} grid place-items-center text-[13px] font-bold text-white shrink-0`}>
                {projectInitials(project.name)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${categoryBadge[project.category] || categoryBadge.other}`}>
                    {project.category.toUpperCase()}
                  </span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${statusBadge[project.status] || statusBadge.active}`}>
                    {statusLabel[project.status] || project.status}
                  </span>
                </div>
                <h1 className="text-[22px] font-semibold tracking-tight text-ink leading-tight">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-ink-3 mt-1">{project.description}</p>
                )}
              </div>
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
              <button
                onClick={() => refreshAiSummary(project.id)}
                disabled={aiSummaryLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded text-sm text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
              >
                {aiSummaryLoading
                  ? <RefreshCw size={13} className="animate-spin" />
                  : <Sparkles size={13} />}
                AI Brief
              </button>
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
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2.5 text-[13px] font-medium transition-colors relative whitespace-nowrap ${
                  tab === t.id ? "text-ink" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {t.label}
                {typeof t.count === "number" && t.count > 0 && (
                  <span className="ml-1.5 font-mono text-[10px] text-ink-3">{t.count}</span>
                )}
                {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-px bg-accent" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-4 md:px-8 py-6">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <div>
                <OverviewTab
                  progress={progress}
                  phases={phases}
                  unresolvedRisks={unresolvedRisks}
                  getProbabilityColor={getProbabilityColor}
                  aiSummary={aiSummary}
                  aiSummaryLoading={aiSummaryLoading}
                  refreshAiSummary={refreshAiSummary}
                  projectId={project.id}
                />
              </div>
              <aside className="hidden lg:block sticky top-4 self-start">
                {unresolvedRisks.length > 0 ? (
                  <CommentsPanel
                    table="risk_comments"
                    parentColumn="risk_id"
                    parentId={unresolvedRisks[0].id}
                    title="Обсуждение"
                    subtitle={`Risk · ${unresolvedRisks[0].title}`}
                  />
                ) : (
                  <div className="bg-panel border border-line rounded-lg p-5 text-center">
                    <div className="text-[13px] text-ink-2 font-medium mb-1">Нет открытых рисков</div>
                    <div className="text-[11px] text-ink-3">
                      Когда появится риск — здесь откроется обсуждение по нему.
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}

          {/* ── PLAN ── */}
          {tab === "plan" && (
            <PlanTab
              steps={steps}
              stepsProgress={stepsProgress}
              toggleStep={toggleStep}
              phases={phases}
              addPhase={addPhase}
              updatePhase={updatePhase}
              deletePhase={deletePhase}
              checklist={checklist}
              progress={progress}
              getByPhase={getByPhase}
              toggleItem={toggleItem}
              addItem={addItem}
              updateItem={updateItem}
              deleteItem={deleteItem}
            />
          )}

          {/* ── KPI ── */}
          {tab === "kpi" && (
            <KpiTab
              kpis={kpis}
              addKpi={addKpi}
              updateKpi={updateKpi}
              deleteKpi={deleteKpi}
              getProgress={getProgress}
              chartData={chartData}
              totalProfit={totalProfit}
            />
          )}

          {/* ── RISKS ── */}
          {tab === "risks" && (
            <RisksTab
              risks={risks}
              unresolvedRisks={unresolvedRisks}
              addRisk={addRisk}
              resolveRisk={resolveRisk}
              updateRisk={updateRisk}
              deleteRisk={deleteRisk}
              getProbabilityColor={getProbabilityColor}
              getProbabilityLabel={getProbabilityLabel}
            />
          )}

          {/* ── BUDGET ── */}
          {tab === "budget" && project && (
            <BudgetTab
              projectId={project.id}
              items={budgetItems}
              loading={budgetLoading}
              totalBudget={totalBudget}
              totalSpent={totalSpent}
              onAdd={addBudgetItem}
              onUpdate={updateBudgetItem}
              onDelete={deleteBudgetItem}
            />
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
      </div>

    </AppShell>
  );
}

// ── BudgetTab ─────────────────────────────────────────────────────────────────

const DEFAULT_COLORS = ["#4D9EBF", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

interface BudgetTabProps {
  projectId: string;
  items: BudgetItem[];
  loading: boolean;
  totalBudget: number;
  totalSpent: number;
  onAdd: (data: { category: string; amount: number; spent?: number; color?: string }) => Promise<BudgetItem | null>;
  onUpdate: (id: string, updates: Partial<Pick<BudgetItem, "category" | "amount" | "spent" | "color">>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

function BudgetTab({ projectId, items, loading, totalBudget, totalSpent, onAdd, onUpdate, onDelete }: BudgetTabProps) {
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState({ category: "", amount: "", spent: "", color: DEFAULT_COLORS[0] });
  const [editForm, setEditForm] = useState({ category: "", amount: "", spent: "", color: "" });

  const handleAdd = async () => {
    if (!form.category.trim()) return;
    const r = await onAdd({
      category: form.category.trim(),
      amount: parseFloat(form.amount) || 0,
      spent: parseFloat(form.spent) || 0,
      color: form.color,
    });
    if (r) {
      toast.success("Статья добавлена");
      setAddingItem(false);
      setForm({ category: "", amount: "", spent: "", color: DEFAULT_COLORS[0] });
    } else {
      toast.error("Ошибка");
    }
  };

  const openEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setEditForm({ category: item.category, amount: String(item.amount), spent: String(item.spent), color: item.color });
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const ok = await onUpdate(editingItem.id, {
      category: editForm.category.trim(),
      amount: parseFloat(editForm.amount) || 0,
      spent: parseFloat(editForm.spent) || 0,
      color: editForm.color,
    });
    if (ok) { toast.success("Обновлено"); setEditingItem(null); }
    else toast.error("Ошибка");
  };

  const pieData = items.filter(i => i.amount > 0).map(i => ({ name: i.category, value: Number(i.amount), fill: i.color }));
  const remaining = totalBudget - totalSpent;
  const pct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  if (loading) return <div className="text-ink-3 text-sm text-center py-8">Загрузка...</div>;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {items.length > 0 && (
        <div className="bg-panel border border-line rounded-lg p-5">
          <div className="flex items-start gap-8">
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-[11px] text-ink-3 mb-1">Бюджет</div>
                  <div className="text-[22px] font-semibold text-ink">${totalBudget.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-3 mb-1">Потрачено</div>
                  <div className={`text-[22px] font-semibold ${pct > 90 ? "text-red" : pct > 70 ? "text-amber-400" : "text-green"}`}>
                    ${totalSpent.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-3 mb-1">Остаток</div>
                  <div className={`text-[22px] font-semibold ${remaining < 0 ? "text-red" : "text-ink"}`}>
                    ${remaining.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="h-[4px] bg-line rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: pct > 90 ? "rgb(var(--color-red))" : pct > 70 ? "#f59e0b" : "rgb(var(--color-accent))",
                  }}
                />
              </div>
              <div className="text-[11px] text-ink-3 mt-1">{pct}% использовано</div>
            </div>
            {pieData.length > 0 && (
              <div className="shrink-0">
                <PieChart width={140} height={140}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={0.9} />)}
                  </Pie>
                </PieChart>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setAddingItem(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors"
        >
          <Plus size={13} />Добавить статью
        </button>
      </div>

      {items.length === 0 && !addingItem && (
        <div className="text-center py-12 text-ink-3 text-sm">
          Бюджет не заполнен. Нажмите «Добавить статью».
        </div>
      )}

      {/* Budget items table */}
      {items.length > 0 && (
        <div className="bg-panel border border-line rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 text-left text-[11px] font-mono text-ink-3 uppercase">Категория</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-mono text-ink-3 uppercase">Бюджет</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-mono text-ink-3 uppercase">Потрачено</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-mono text-ink-3 uppercase">%</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const used = item.amount > 0 ? Math.round((Number(item.spent) / Number(item.amount)) * 100) : 0;
                return (
                  <tr key={item.id} className="border-b border-line/50 last:border-0 hover:bg-panel-2/40 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-ink font-medium">{item.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">${Number(item.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(item.spent).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono text-[11px] ${used > 90 ? "text-red" : used > 70 ? "text-amber-400" : "text-green"}`}>
                        {used}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => openEdit(item)} className="p-1 text-ink-3 hover:text-ink">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => onDelete(item.id).then(ok => ok && toast.success("Удалено"))} className="p-1 text-ink-3 hover:text-red">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form */}
      {addingItem && (
        <div className="bg-panel border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="text-[13px] font-medium text-ink">Новая статья бюджета</div>
          <div>
            <label className="text-[11px] text-ink-3 mb-1 block">Категория *</label>
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="Разработка, Маркетинг, Инфраструктура..."
              className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50"
              autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Бюджет ($)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Потрачено ($)</label>
              <input type="number" value={form.spent} onChange={e => setForm(f => ({ ...f, spent: e.target.value }))}
                placeholder="0"
                className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Цвет</label>
              <div className="flex gap-1 flex-wrap">
                {DEFAULT_COLORS.slice(0, 6).map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-5 h-5 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-1 ring-accent scale-110" : ""}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAddingItem(false); setForm({ category: "", amount: "", spent: "", color: DEFAULT_COLORS[0] }); }}
              className="flex-1 px-3 py-1.5 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">
              Отмена
            </button>
            <button onClick={handleAdd}
              className="flex-1 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-panel border border-line rounded-lg p-5 w-[380px]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-semibold text-ink">Редактировать статью</div>
              <button onClick={() => setEditingItem(null)} className="text-ink-3 hover:text-ink"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Категория</label>
                <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-ink-3 mb-1 block">Бюджет ($)</label>
                  <input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="text-[11px] text-ink-3 mb-1 block">Потрачено ($)</label>
                  <input type="number" value={editForm.spent} onChange={e => setEditForm(f => ({ ...f, spent: e.target.value }))}
                    className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Цвет</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DEFAULT_COLORS.map(c => (
                    <button key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))}
                      className={`w-5 h-5 rounded-full transition-all ${editForm.color === c ? "ring-2 ring-offset-1 ring-accent scale-110" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingItem(null)} className="flex-1 px-3 py-2 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">Отмена</button>
              <button onClick={handleUpdate} className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">Сохранить</button>
            </div>
          </div>
        </div>
      )}
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
