"use client";

import ReactMarkdown from "react-markdown";
import { AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import type { Phase } from "@/hooks/useProjectPhases";
import type { Risk } from "@/hooks/useProjectRisks";

interface OverviewTabProps {
  progress: { done: number; total: number; percentage: number };
  phases: Phase[];
  unresolvedRisks: Risk[];
  getProbabilityColor: (p: Risk["probability"]) => string;
  aiSummary: string | null;
  aiSummaryLoading: boolean;
  refreshAiSummary: (id: string) => void;
  projectId: string;
}

function StatCard({ label, value, accent, danger, small }: {
  label: string; value: string; accent?: boolean; danger?: boolean; small?: boolean;
}) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <div className="text-[11px] text-ink-3 mb-1">{label}</div>
      <div className={`font-semibold ${small ? "text-[14px]" : "text-[20px]"} ${accent ? "text-accent" : danger ? "text-red" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

export function OverviewTab({
  progress, phases, unresolvedRisks, getProbabilityColor,
  aiSummary, aiSummaryLoading, refreshAiSummary, projectId,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Прогресс" value={`${progress.percentage}%`} accent />
        <StatCard label="Активная фаза" value={phases.find(p => p.status === "active")?.title || "—"} small />
        <StatCard label="Выполнено задач" value={String(progress.done)} />
        <StatCard label="Активных рисков" value={String(unresolvedRisks.length)} danger={unresolvedRisks.length > 0} />
      </div>

      {(aiSummary || aiSummaryLoading) && (
        <div className="bg-panel border border-accent/20 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <span className="text-[13px] font-medium text-ink">AI Brief</span>
            </div>
            <button
              onClick={() => refreshAiSummary(projectId)}
              disabled={aiSummaryLoading}
              className="text-[11px] text-ink-3 hover:text-ink flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={aiSummaryLoading ? "animate-spin" : ""} />
              Обновить
            </button>
          </div>
          {aiSummaryLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-line rounded animate-pulse w-3/4" />
              <div className="h-3 bg-line rounded animate-pulse w-1/2" />
            </div>
          ) : aiSummary ? (
            <div className="text-[13px] text-ink-2 leading-relaxed prose-sm">
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      )}

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
  );
}
