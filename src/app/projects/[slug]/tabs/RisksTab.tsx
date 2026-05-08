"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import type { Risk } from "@/hooks/useProjectRisks";

interface RisksTabProps {
  risks: Risk[];
  unresolvedRisks: Risk[];
  addRisk: (data: { title: string; description?: string; probability: Risk["probability"]; impact?: string; mitigation?: string }) => Promise<Risk | null>;
  resolveRisk: (id: string) => Promise<boolean>;
  updateRisk: (id: string, data: Partial<Risk>) => Promise<boolean>;
  deleteRisk: (id: string) => Promise<boolean>;
  getProbabilityColor: (p: Risk["probability"]) => string;
  getProbabilityLabel: (p: Risk["probability"]) => string;
}

type RiskForm = { title: string; description: string; probability: Risk["probability"]; impact: string; mitigation: string };
const emptyForm: RiskForm = { title: "", description: "", probability: "medium", impact: "medium", mitigation: "" };

export function RisksTab({ risks, unresolvedRisks, addRisk, resolveRisk, updateRisk, deleteRisk, getProbabilityColor, getProbabilityLabel }: RisksTabProps) {
  const [addingRisk, setAddingRisk] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [riskForm, setRiskForm] = useState<RiskForm>(emptyForm);
  const [riskEditForm, setRiskEditForm] = useState<RiskForm>(emptyForm);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const handleAddRisk = async () => {
    if (!riskForm.title.trim()) return;
    const r = await addRisk({
      title: riskForm.title.trim(),
      description: riskForm.description.trim() || undefined,
      probability: riskForm.probability,
      impact: riskForm.impact || undefined,
      mitigation: riskForm.mitigation.trim() || undefined,
    });
    if (r) { toast.success("Риск добавлен"); setAddingRisk(false); setRiskForm(emptyForm); }
    else toast.error("Ошибка");
  };

  const openEditRisk = (r: Risk) => {
    setEditingRisk(r);
    setRiskEditForm({ title: r.title, description: r.description || "", probability: r.probability, impact: r.impact || "medium", mitigation: r.mitigation || "" });
  };

  const handleUpdateRisk = async () => {
    if (!editingRisk) return;
    const ok = await updateRisk(editingRisk.id, {
      title: riskEditForm.title.trim(),
      description: riskEditForm.description.trim() || null,
      probability: riskEditForm.probability,
      impact: riskEditForm.impact || null,
      mitigation: riskEditForm.mitigation.trim() || null,
    });
    if (ok) { toast.success("Риск обновлён"); setEditingRisk(null); }
    else toast.error("Ошибка");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-ink-3">
          {unresolvedRisks.length > 0 ? `${unresolvedRisks.length} активных рисков` : "Нет активных рисков"}
        </div>
        <button
          onClick={() => setAddingRisk(true)}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 bg-accent text-white rounded hover:bg-accent-2 transition-colors"
        >
          <Plus size={12} />Добавить риск
        </button>
      </div>

      {risks.length === 0 && !addingRisk && (
        <div className="text-center py-12 text-ink-3 text-sm">Рисков нет</div>
      )}

      <div className="space-y-2">
        {risks.map(risk => (
          <div key={risk.id} className="space-y-0">
            <div className={`bg-panel border border-line rounded-lg p-4 flex items-start gap-3 group ${risk.is_resolved ? "opacity-40" : ""} ${selectedRiskId === risk.id ? "border-accent/40 rounded-b-none" : ""}`}>
              <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${risk.is_resolved ? "text-ink-3" : "text-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[13px] font-medium ${risk.is_resolved ? "line-through text-ink-3" : "text-ink"}`}>{risk.title}</span>
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded text-white ${getProbabilityColor(risk.probability)}`}>
                    {getProbabilityLabel(risk.probability)}
                  </span>
                  {risk.impact && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-panel-2 text-ink-3">
                      Влияние: {risk.impact === "low" ? "Низкое" : risk.impact === "medium" ? "Среднее" : "Высокое"}
                    </span>
                  )}
                </div>
                {risk.description && <div className="text-[12px] text-ink-3 mb-0.5">{risk.description}</div>}
                {risk.mitigation && <div className="text-[12px] text-ink-2">→ {risk.mitigation}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSelectedRiskId(prev => prev === risk.id ? null : risk.id)}
                  className={`p-1.5 text-ink-3 hover:text-accent transition-all ${selectedRiskId === risk.id ? "text-accent" : "opacity-0 group-hover:opacity-100"}`}
                  title="Обсуждение"
                >
                  <MessageSquare size={12} />
                </button>
                {!risk.is_resolved && (
                  <button
                    onClick={() => resolveRisk(risk.id).then(ok => ok && toast.success("Риск решён"))}
                    className="text-[12px] px-2.5 py-1 bg-panel-2 border border-line rounded text-ink-2 hover:bg-green/10 hover:text-green hover:border-green/30 transition-colors"
                  >
                    Решён
                  </button>
                )}
                <button onClick={() => openEditRisk(risk)} className="p-1.5 opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink transition-all">
                  <Pencil size={12} />
                </button>
                <button onClick={() => deleteRisk(risk.id).then(ok => ok && toast.success("Удалено"))} className="p-1.5 opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {selectedRiskId === risk.id && (
              <div className="border border-t-0 border-accent/40 rounded-b-lg overflow-hidden">
                <CommentsPanel table="risk_comments" parentColumn="risk_id" parentId={risk.id} title="Обсуждение риска" subtitle={risk.title} />
              </div>
            )}
          </div>
        ))}
      </div>

      {addingRisk && (
        <div className="bg-panel border border-accent/30 rounded-lg p-4 space-y-3">
          <div className="text-[13px] font-medium text-ink">Новый риск</div>
          <input value={riskForm.title} onChange={e => setRiskForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Название риска..."
            className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" autoFocus />
          <input value={riskForm.description} onChange={e => setRiskForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Описание (опционально)"
            className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Вероятность</label>
              <select value={riskForm.probability} onChange={e => setRiskForm(f => ({ ...f, probability: e.target.value as Risk["probability"] }))}
                className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50">
                <option value="low">Низкая</option>
                <option value="medium">Средняя</option>
                <option value="high">Высокая</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-ink-3 mb-1 block">Влияние</label>
              <select value={riskForm.impact} onChange={e => setRiskForm(f => ({ ...f, impact: e.target.value }))}
                className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50">
                <option value="low">Низкое</option>
                <option value="medium">Среднее</option>
                <option value="high">Высокое</option>
              </select>
            </div>
          </div>
          <input value={riskForm.mitigation} onChange={e => setRiskForm(f => ({ ...f, mitigation: e.target.value }))}
            placeholder="Митигация / план действий"
            className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
          <div className="flex gap-2">
            <button onClick={() => { setAddingRisk(false); setRiskForm(emptyForm); }}
              className="flex-1 px-3 py-1.5 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">Отмена</button>
            <button onClick={handleAddRisk}
              className="flex-1 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">Добавить</button>
          </div>
        </div>
      )}

      {editingRisk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-panel border border-line rounded-lg p-5 w-[400px]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-semibold text-ink">Редактировать риск</div>
              <button onClick={() => setEditingRisk(null)} className="text-ink-3 hover:text-ink"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Название</label>
                <input value={riskEditForm.title} onChange={e => setRiskEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" autoFocus />
              </div>
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Описание</label>
                <input value={riskEditForm.description} onChange={e => setRiskEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-ink-3 mb-1 block">Вероятность</label>
                  <select value={riskEditForm.probability} onChange={e => setRiskEditForm(f => ({ ...f, probability: e.target.value as Risk["probability"] }))}
                    className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50">
                    <option value="low">Низкая</option>
                    <option value="medium">Средняя</option>
                    <option value="high">Высокая</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-ink-3 mb-1 block">Влияние</label>
                  <select value={riskEditForm.impact} onChange={e => setRiskEditForm(f => ({ ...f, impact: e.target.value }))}
                    className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50">
                    <option value="low">Низкое</option>
                    <option value="medium">Среднее</option>
                    <option value="high">Высокое</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-ink-3 mb-1 block">Митигация</label>
                <input value={riskEditForm.mitigation} onChange={e => setRiskEditForm(f => ({ ...f, mitigation: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingRisk(null)} className="flex-1 px-3 py-2 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">Отмена</button>
              <button onClick={handleUpdateRisk} className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
