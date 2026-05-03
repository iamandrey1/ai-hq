"use client";

import { Corridor } from "@/components/Corridor";
import { useState } from "react";

const budgetItems = [
  { name: "Anthropic Claude API", category: "AI", cost: 180, trend: "+12%", color: "text-accent" },
  { name: "Vercel Pro", category: "Infrastructure", cost: 120, trend: "+5%", color: "text-ink" },
  { name: "Supabase Pro", category: "Database", cost: 75, trend: "0%", color: "text-ink" },
  { name: "OpenAI API", category: "AI", cost: 45, trend: "+8%", color: "text-accent" },
  { name: "Make.com", category: "Automation", cost: 29, trend: "0%", color: "text-ink" },
  { name: "Domain & SSL", category: "Other", cost: 12, trend: "0%", color: "text-ink" },
];

const totalBudget = budgetItems.reduce((sum, item) => sum + item.cost, 0);

export default function BudgetPage() {
  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Бюджет</em>
          </h1>
          <p className="text-ink-3 text-sm">Расходы на AI и инфраструктуру</p>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-br from-panel to-panel-2 border border-line rounded-2xl p-6 mb-8">
          <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-2">
            Месячный расход
          </div>
          <div className="font-display text-[48px] font-medium tracking-[-0.02em] text-accent">
            ${totalBudget}
            <span className="text-[18px] text-ink-3 ml-2">/мес</span>
          </div>
          <div className="mt-2 text-ink-3 text-sm">
            На <span className="text-accent">${(totalBudget * 12).toLocaleString()}</span> в год при текущем использовании
          </div>
        </div>

        {/* Breakdown */}
        <div className="mb-6">
          <h2 className="font-display text-[22px] font-medium mb-4">
            Детализация <em style={{ fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>по сервисам</em>
          </h2>
          <div className="space-y-3">
            {budgetItems.map((item, i) => (
              <div
                key={i}
                className="bg-panel border border-line rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-panel-2 flex items-center justify-center">
                    <span className="font-mono text-[10px] text-ink-3 uppercase">{item.category.slice(0, 2)}</span>
                  </div>
                  <div>
                    <div className="font-medium text-[14px]">{item.name}</div>
                    <div className="font-mono text-[10px] text-ink-3 uppercase">{item.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-display text-xl font-medium ${item.color}`}>${item.cost}</div>
                  <div className={`font-mono text-[10px] ${item.trend !== "0%" ? "text-accent" : "text-ink-3"}`}>
                    {item.trend} к прошлому месяцу
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Chart Placeholder */}
        <div className="bg-panel border border-line rounded-xl p-6">
<div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-4">
            Распределение расходов
          </div>
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {budgetItems.map((item, i) => (
              <div
                key={i}
                className={`${i === 0 ? "bg-accent" : i === 1 ? "bg-blue" : i === 2 ? "bg-green" : i === 3 ? "bg-accent-2" : i === 4 ? "bg-[#4a7d5a]" : "bg-ink-3"}`}
                style={{ width: `${(item.cost / totalBudget) * 100}%` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 text-[10px]">
            {budgetItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-accent" : i === 1 ? "bg-blue" : "bg-green"}`} />
                <span className="text-ink-3">{item.name}: ${item.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
