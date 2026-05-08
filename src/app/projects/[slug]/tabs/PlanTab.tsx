"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Check, Plus, Pencil, Trash2, X, Clock } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { Phase } from "@/hooks/useProjectPhases";
import type { ChecklistItem } from "@/hooks/useProjectChecklist";
import type { ProjectStep } from "@/hooks/useProjectSteps";

interface StepsProgress { done: number; total: number; percentage: number }

interface PlanTabProps {
  steps: ProjectStep[];
  stepsProgress: StepsProgress;
  toggleStep: (step: ProjectStep) => Promise<boolean>;
  phases: Phase[];
  addPhase: (title: string) => Promise<Phase | null>;
  updatePhase: (id: string, data: Partial<Phase>) => Promise<boolean>;
  deletePhase: (id: string) => Promise<boolean>;
  checklist: ChecklistItem[];
  progress: { done: number; total: number; percentage: number };
  getByPhase: (phaseId: string) => ChecklistItem[];
  toggleItem: (item: ChecklistItem) => Promise<boolean>;
  addItem: (phaseId: string, title: string) => Promise<ChecklistItem | null>;
  updateItem: (id: string, data: Partial<ChecklistItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
}

export function PlanTab({
  steps, stepsProgress, toggleStep,
  phases, addPhase, updatePhase, deletePhase,
  checklist, progress, getByPhase,
  toggleItem, addItem, updateItem, deleteItem,
}: PlanTabProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [planEditMode, setPlanEditMode] = useState(false);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseTitle, setEditingPhaseTitle] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

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

  const getPhaseProgress = (phaseId: string) => {
    const items = getByPhase(phaseId);
    return { done: items.filter(c => c.is_done).length, total: items.length };
  };

  const handleToggleItem = async (item: ChecklistItem) => {
    const ok = await toggleItem(item);
    if (ok) toast.success(item.is_done ? "Отмечено как невыполненное" : "Выполнено!");
  };

  const handleAddItem = async (phaseId: string) => {
    if (!newItemTitle.trim()) return;
    const result = await addItem(phaseId, newItemTitle.trim());
    if (result) { toast.success("Пункт добавлен"); setNewItemTitle(""); setAddingToPhase(null); }
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

  const selectedStep = steps.find(s => s.id === selectedStepId);

  return (
    <div className="space-y-5">
      {/* Steps progress bar */}
      {steps.length > 0 && (
        <div className="bg-panel border border-line rounded-lg px-5 py-4">
          <div className="flex items-center justify-between text-[12px] mb-2.5">
            <span className="text-ink-3">{stepsProgress.done} / {stepsProgress.total} шагов</span>
            <span className="font-mono text-accent font-medium">{stepsProgress.percentage}%</span>
          </div>
          <div className="h-[4px] bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700"
              style={{ width: `${stepsProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps list */}
      {steps.length > 0 ? (
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const isCompleted = step.completed;
            const prevDone = idx === 0 || steps[idx - 1].completed;
            const isFuture = !prevDone && !isCompleted;
            return (
              <div
                key={step.id}
                className={`group bg-panel border rounded-lg px-5 py-4 flex items-center gap-4 transition-all duration-200 ${
                  isCompleted ? "border-line opacity-60" : isFuture ? "border-line opacity-50" : "border-line hover:border-accent/30"
                }`}
              >
                <button
                  onClick={async () => {
                    const ok = await toggleStep(step);
                    if (ok) toast.success(step.completed ? "Шаг отменён" : "Шаг выполнен!");
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isCompleted ? "bg-accent border-accent text-white" : "border-line-2 hover:border-accent/60"
                  }`}
                >
                  {isCompleted && <Check size={12} strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-ink-3 shrink-0">
                      {String(step.order_index).padStart(2, "0")}
                    </span>
                    <span className={`text-[14px] font-medium leading-snug ${isCompleted ? "line-through text-ink-3" : "text-ink"}`}>
                      {step.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-7">
                    {step.estimated_time && (
                      <span className="flex items-center gap-1 text-[11px] text-ink-3">
                        <Clock size={10} />{step.estimated_time}
                      </span>
                    )}
                    {isCompleted && step.completed_at && (
                      <span className="text-[10px] text-ink-3 font-mono">
                        {new Date(step.completed_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
                {step.description_md && (
                  <button
                    onClick={() => { setSelectedStepId(step.id); setSheetVisible(true); }}
                    className="shrink-0 p-2 rounded-lg text-ink-3 hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Открыть инструкцию"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-ink-3 text-sm">
          Шаги для этого проекта не найдены.<br />
          <span className="text-[12px]">Добавьте шаги через SQL или заполните таблицу project_steps.</span>
        </div>
      )}

      {/* Phases section */}
      <details className="group">
        <summary className="cursor-pointer flex items-center gap-2 text-[12px] text-ink-3 hover:text-ink-2 transition-colors select-none list-none py-1">
          <ChevronRight size={13} className="group-open:rotate-90 transition-transform" />
          Фазы и чеклист ({phases.length} фаз · {progress.done}/{progress.total} пунктов)
        </summary>
        <div className="mt-3 space-y-4 pl-4 border-l border-line">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-ink-3">{phases.length} фаз</div>
            <button
              onClick={() => setPlanEditMode(!planEditMode)}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded border transition-colors ${
                planEditMode ? "bg-accent/10 border-accent/40 text-accent" : "border-line text-ink-3 hover:text-ink hover:border-line-2"
              }`}
            >
              <Pencil size={10} />{planEditMode ? "Готово" : "Редактировать"}
            </button>
          </div>

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
                          done ? "bg-green text-white" : active ? "bg-accent text-white" : "bg-panel-2 text-ink-3 border border-line"
                        }`}>
                          {done ? <Check size={12} /> : idx + 1}
                        </div>
                        <div className={`text-[9px] font-mono ${active ? "text-accent" : "text-ink-3"}`}>
                          {prog.done}/{prog.total}
                        </div>
                      </div>
                      {idx < phases.length - 1 && <div className={`h-px w-8 ${done ? "bg-green" : "bg-line"}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                          onChange={e => setEditingPhaseTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleSavePhase(); if (e.key === "Escape") setEditingPhaseId(null); }}
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
                        <span className="text-[13px] font-medium text-ink flex-1">{phase.order_index}. {phase.title}</span>
                        <span className={`font-mono text-[10px] ${prog.done === prog.total && prog.total > 0 ? "text-green" : "text-ink-3"}`}>
                          {prog.done}/{prog.total}
                        </span>
                        {prog.done === prog.total && prog.total > 0 && <Check size={13} className="text-green" />}
                        {planEditMode && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingPhaseId(phase.id); setEditingPhaseTitle(phase.title); }}
                              className="p-1 text-ink-3 hover:text-ink"
                            ><Pencil size={11} /></button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDeletePhase(phase.id); }}
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
                                  <span className={`flex-1 text-[13px] ${item.is_done ? "text-ink-3 line-through" : "text-ink"}`}>{item.title}</span>
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                    <button onClick={() => { setEditingItem(item); setEditTitle(item.title); }} className="p-1 text-ink-3 hover:text-ink"><Pencil size={11} /></button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-ink-3 hover:text-red"><Trash2 size={11} /></button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {phaseItems.length === 0 && <div className="py-2 text-[12px] text-ink-3 px-2">Нет пунктов</div>}
                        </div>
                        {addingToPhase === phase.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input
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

          {planEditMode && (
            <div className="mt-2">
              {addingPhase ? (
                <div className="flex items-center gap-2">
                  <input
                    value={newPhaseTitle}
                    onChange={e => setNewPhaseTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddPhase(); if (e.key === "Escape") { setAddingPhase(false); setNewPhaseTitle(""); } }}
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
      </details>

      {/* Step instruction sheet */}
      {sheetVisible && selectedStep && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSheetVisible(false)} />
          <div className="step-sheet-enter fixed top-0 right-0 h-full w-full max-w-[560px] bg-panel border-l border-line z-50 flex flex-col shadow-2xl">
            <div className="flex items-start gap-3 px-6 py-5 border-b border-line">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-ink-3">Шаг {selectedStep.order_index}</span>
                  {selectedStep.estimated_time && (
                    <span className="flex items-center gap-1 text-[11px] text-ink-3">
                      <Clock size={10} />{selectedStep.estimated_time}
                    </span>
                  )}
                </div>
                <h2 className="text-[17px] font-semibold text-ink leading-snug">{selectedStep.title}</h2>
              </div>
              <button
                onClick={() => setSheetVisible(false)}
                className="p-1.5 text-ink-3 hover:text-ink hover:bg-panel-2 rounded-lg transition-colors shrink-0 mt-0.5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {selectedStep.description_md ? (
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-ink prose-headings:font-semibold
                  prose-p:text-ink-2 prose-p:leading-relaxed
                  prose-li:text-ink-2
                  prose-code:text-accent prose-code:bg-panel-2 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:font-mono
                  prose-pre:bg-panel-2 prose-pre:border prose-pre:border-line
                  prose-strong:text-ink
                  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                  prose-hr:border-line">
                  <ReactMarkdown>{selectedStep.description_md}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-ink-3 text-sm">Инструкция не добавлена.</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-line">
              <button
                onClick={async () => {
                  const ok = await toggleStep(selectedStep);
                  if (ok) { toast.success(selectedStep.completed ? "Шаг отменён" : "Шаг выполнен!"); setSheetVisible(false); }
                }}
                className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedStep.completed ? "bg-panel-2 border border-line text-ink hover:bg-line" : "bg-accent text-white hover:bg-accent-2"
                }`}
              >
                {selectedStep.completed ? "Снять отметку" : "Отметить выполненным"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
