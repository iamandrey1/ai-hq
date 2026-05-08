"use client";

import { useState } from "react";
import { Plus, Trash2, TrendingUp, X, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import type { Kpi } from "@/hooks/useProjectKpis";

interface KpiTabProps {
  kpis: Kpi[];
  addKpi: (data: { name: string; current_value?: number; target_value?: number; unit?: string; description?: string }) => Promise<Kpi | null>;
  updateKpi: (id: string, data: Partial<Kpi>) => Promise<boolean>;
  deleteKpi: (id: string) => Promise<boolean>;
  getProgress: (kpi: Kpi) => number;
  chartData: { month: string; revenue: number; costs: number }[];
  totalProfit: number;
}

function KpiTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-ink-3 hover:text-ink-2"
      >
        <HelpCircle size={12} />
      </button>
      {show && (
        <div className="absolute left-full ml-2 top-0 bg-panel-2 border border-line rounded px-2 py-1 text-[11px] text-ink-2 whitespace-nowrap z-10 shadow-lg max-w-[200px] whitespace-normal">
          {text}
        </div>
      )}
    </div>
  );
}

export function KpiTab({ kpis, addKpi, updateKpi, deleteKpi, getProgress, chartData, totalProfit }: KpiTabProps) {
  const [updatingKpi, setUpdatingKpi] = useState<Kpi | null>(null);
  const [newKpiValue, setNewKpiValue] = useState("");
  const [kpiEditForm, setKpiEditForm] = useState({ name: "", target_value: "", unit: "", description: "" });
  const [addingKpi, setAddingKpi] = useState(false);
  const [kpiAddForm, setKpiAddForm] = useState({ name: "", current_value: "", target_value: "100", unit: "", description: "" });

  const handleUpdateKpi = async () => {
    if (!updatingKpi) return;
    const current = parseFloat(newKpiValue);
    if (isNaN(current)) return;
    const updates: Partial<Kpi> = { current_value: current };
    if (kpiEditForm.name.trim()) updates.name = kpiEditForm.name.trim();
    if (kpiEditForm.target_value) updates.target_value = parseFloat(kpiEditForm.target_value);
    if (kpiEditForm.unit.trim() !== undefined) updates.unit = kpiEditForm.unit.trim() || null;
    if (kpiEditForm.description.trim() !== undefined) updates.description = kpiEditForm.description.trim() || null;
    const ok = await updateKpi(updatingKpi.id, updates);
    if (ok) { toast.success("KPI обновлён"); setUpdatingKpi(null); setNewKpiValue(""); }
  };

  const handleAddKpi = async () => {
    if (!kpiAddForm.name.trim()) return;
    const r = await addKpi({
      name: kpiAddForm.name.trim(),
      current_value: parseFloat(kpiAddForm.current_value) || 0,
      target_value: parseFloat(kpiAddForm.target_value) || 100,
      unit: kpiAddForm.unit.trim() || undefined,
      description: kpiAddForm.description.trim() || undefined,
    });
    if (r) {
      toast.success("KPI добавлен");
      setAddingKpi(false);
      setKpiAddForm({ name: "", current_value: "", target_value: "100", unit: "", description: "" });
    } else {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setAddingKpi(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors"
        >
          <Plus size={13} />Добавить KPI
        </button>
      </div>

      {kpis.length === 0 && !addingKpi && (
        <div className="text-center py-12 text-ink-3 text-sm">KPI не добавлены. Нажмите «Добавить KPI».</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.map(kpi => {
          const prog = getProgress(kpi);
          return (
            <div key={kpi.id} className="bg-panel border border-line rounded-lg p-5 group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-ink-3">{kpi.name}</span>
                  {kpi.description && <KpiTooltip text={kpi.description} />}
                </div>
                <button
                  onClick={() => deleteKpi(kpi.id).then(ok => ok && toast.success("KPI удалён"))}
                  className="opacity-0 group-hover:opacity-100 p-1 text-ink-3 hover:text-red transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-[22px] font-semibold text-ink mb-1">
                {kpi.current_value.toLocaleString()}
                {kpi.unit && <span className="text-[14px] text-ink-3 ml-1">{kpi.unit}</span>}
                <span className="text-[14px] text-ink-3 mx-2">/</span>
                <span className="text-[16px] text-ink-2">{kpi.target_value.toLocaleString()}</span>
              </div>
              <div className="h-[3px] bg-line rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(prog, 100)}%`,
                    background: prog >= 70
                      ? "linear-gradient(90deg, rgb(var(--color-green)), #5abf8a)"
                      : prog >= 30
                      ? "linear-gradient(90deg, #d97706, #f59e0b)"
                      : "linear-gradient(90deg, rgb(var(--color-red)), #e06b70)",
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setUpdatingKpi(kpi);
                  setNewKpiValue(kpi.current_value.toString());
                  setKpiEditForm({ name: kpi.name, target_value: kpi.target_value.toString(), unit: kpi.unit || "", description: kpi.description || "" });
                }}
                className="text-[12px] text-accent hover:text-accent-2 transition-colors"
              >
                Редактировать
              </button>
            </div>
          );
        })}
      </div>

      {addingKpi && (
        <div className="bg-panel border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="text-[13px] font-medium text-ink">Новый KPI</div>
          <div>
            <label className="text-[11px] text-ink-3 mb-1 block">Название *</label>
            <input
              value={kpiAddForm.name}
              onChange={e => setKpiAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Например: MAU, Доход, Конверсия"
              className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Текущее</label>
              <input type="number" value={kpiAddForm.current_value} onChange={e => setKpiAddForm(f => ({ ...f, current_value: e.target.value }))}
                placeholder="0" className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Цель</label>
              <input type="number" value={kpiAddForm.target_value} onChange={e => setKpiAddForm(f => ({ ...f, target_value: e.target.value }))}
                placeholder="100" className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Единица</label>
              <input value={kpiAddForm.unit} onChange={e => setKpiAddForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="%  /  $  /  шт" className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-ink-3 mb-1 block">Подсказка (tooltip)</label>
            <input value={kpiAddForm.description} onChange={e => setKpiAddForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Описание метрики для tooltip"
              className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAddingKpi(false); setKpiAddForm({ name: "", current_value: "", target_value: "100", unit: "", description: "" }); }}
              className="flex-1 px-3 py-1.5 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">Отмена</button>
            <button onClick={handleAddKpi}
              className="flex-1 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">Добавить</button>
          </div>
        </div>
      )}

      {updatingKpi && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-panel border border-line rounded-lg p-5 w-[360px]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-semibold text-ink">Редактировать KPI</div>
              <button onClick={() => setUpdatingKpi(null)} className="text-ink-3 hover:text-ink"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Название</label>
                <input value={kpiEditForm.name} onChange={e => setKpiEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-ink-3 mb-1 block">Текущее значение</label>
                  <input type="number" value={newKpiValue} onChange={e => setNewKpiValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleUpdateKpi()}
                    className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="text-[11px] text-ink-3 mb-1 block">Цель</label>
                  <input type="number" value={kpiEditForm.target_value} onChange={e => setKpiEditForm(f => ({ ...f, target_value: e.target.value }))}
                    className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Единица измерения</label>
                <input value={kpiEditForm.unit} onChange={e => setKpiEditForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="%  /  $  /  шт"
                  className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Подсказка (tooltip)</label>
                <input value={kpiEditForm.description} onChange={e => setKpiEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setUpdatingKpi(null)} className="flex-1 px-3 py-2 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">Отмена</button>
              <button onClick={handleUpdateKpi} className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-panel border border-line rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <TrendingUp size={15} className="text-accent" />Финансовый прогноз
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
                <RechartsTooltip
                  contentStyle={{ background: "rgb(var(--color-panel))", border: "1px solid rgb(var(--color-line))", borderRadius: "6px", fontSize: "12px" }}
                  labelStyle={{ color: "rgb(var(--color-ink-2))" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="rgb(var(--color-accent))" strokeWidth={1.5} dot={false} name="Доход" />
                <Line type="monotone" dataKey="costs" stroke="rgb(var(--color-ink-3))" strokeWidth={1.5} dot={false} name="Расходы" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-3"><div className="w-3 h-px bg-accent" />Доход</div>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-3"><div className="w-3 h-px bg-ink-3" />Расходы</div>
          </div>
        </div>
      )}
    </div>
  );
}
