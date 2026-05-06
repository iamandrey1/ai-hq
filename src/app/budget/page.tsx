"use client";

import { Corridor } from "@/components/Corridor";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Pencil, Pause, Play, Trash2, X } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  ai: "AI",
  content: "Контент",
  automation: "Автоматизация",
  hosting: "Хостинг",
  other: "Другое",
};

const categoryColors: Record<string, string> = {
  ai: "text-accent",
  content: "text-blue",
  automation: "text-green",
  hosting: "text-ink-2",
  other: "text-ink-3",
};

export default function BudgetPage() {
  const { subs, loading, total, byCategory, createSub, updateSub, deleteSub } = useSubscriptions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [form, setForm] = useState({
    service: "",
    category: "ai" as string,
    cost_monthly_usd: 0,
    status: "active" as string,
    notes: "",
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !openMenu?.startsWith("sub:")) {
        // Don't close if clicking on menu buttons
        if ((e.target as HTMLElement).closest('[data-menu]')) return;
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenu]);

  const handleSubmit = async () => {
    if (!form.service.trim()) {
      toast.error("Название сервиса обязательно");
      return;
    }
    if (editingSub?.id) {
      await updateSub(editingSub.id, form);
      toast.success("Подписка обновлена");
    } else {
      await createSub(form as any);
      toast.success("Подписка добавлена");
    }
    setModalOpen(false);
    setEditingSub(null);
    setForm({ service: "", category: "ai", cost_monthly_usd: 0, status: "active", notes: "" });
  };

  const handleStatusChange = async (sub: any, status: string) => {
    await updateSub(sub.id, { status });
    toast.success(`Статус: ${status === "paused" ? "На паузе" : status === "active" ? "Активна" : "Отменена"}`);
    setOpenMenu(null);
  };

  const handleEdit = (sub: any) => {
    setEditingSub(sub);
    setForm({ 
      service: sub.service, 
      category: sub.category, 
      cost_monthly_usd: Number(sub.cost_monthly_usd), 
      status: sub.status, 
      notes: sub.notes || "" 
    });
    setModalOpen(true);
    setOpenMenu(null);
  };

  const handleDelete = (sub: any) => {
    setConfirmDelete(sub);
    setOpenMenu(null);
  };

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Бюджет</em>
            </h1>
            <p className="text-ink-3 text-sm">Управление подписками и расходами</p>
          </div>
          <button
            onClick={() => { setEditingSub(null); setForm({ service: "", category: "ai", cost_monthly_usd: 0, status: "active", notes: "" }); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
          >
            <Plus size={18} />
            Добавить подписку
          </button>
        </div>

        {/* Total Budget Card */}
        <div className="bg-panel border border-line rounded-lg p-6 mb-6">
          <div className="flex items-start gap-8">
            {/* Left: numbers */}
            <div className="flex-1">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.15em] mb-2">Месячный расход</div>
                  <div className="font-display text-[48px] font-medium tracking-[-0.02em]">${total.toFixed(0)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.15em] mb-2">Активных</div>
                  <div className="font-display text-[24px] text-ink-2">{subs.filter(s => s.status === "active").length}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {(["ai", "content", "automation", "hosting"] as const).map(cat => {
                  const catTotal = byCategory[cat] || 0;
                  return (
                    <div key={cat} className="text-center">
                      <div className="font-mono text-[10px] text-ink-3 uppercase mb-1">{categoryLabels[cat]}</div>
                      <div className="font-display text-xl font-medium">${catTotal.toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: donut */}
            {total > 0 && (
              <div className="shrink-0 w-[200px]">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "AI", value: byCategory["ai"] || 0 },
                        { name: "Контент", value: byCategory["content"] || 0 },
                        { name: "Автоматизация", value: byCategory["automation"] || 0 },
                        { name: "Хостинг", value: byCategory["hosting"] || 0 },
                        { name: "Другое", value: byCategory["other"] || 0 },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {["#4D9EBF","#3D9970","#f59e0b","#8892A0","#C0444A"].map((c, i) => (
                        <Cell key={i} fill={c} opacity={0.85} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(v: number) => [`$${v.toFixed(0)}`, ""]}
                      contentStyle={{ background: "rgb(var(--color-panel-2))", border: "1px solid rgb(var(--color-line))", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-panel border border-line rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-line">
            <h2 className="font-display text-lg">Все подписки</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-6 py-3 text-left font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Сервис</th>
                <th className="px-6 py-3 text-left font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Категория</th>
                <th className="px-6 py-3 text-right font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">$/мес</th>
                <th className="px-6 py-3 text-center font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Статус</th>
                <th className="px-6 py-3 text-left font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Заметка</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-ink-3">Загрузка...</td></tr>
              ) : subs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-ink-3">Нет подписок. Добавьте первую.</td></tr>
              ) : subs.map(sub => (
                <tr key={sub.id} className="border-b border-line last:border-0 hover:bg-panel-2/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-sm">{sub.service}</td>
                  <td className="px-6 py-4">
                    <span className={`font-mono text-[10px] px-2 py-1 rounded ${categoryColors[sub.category]} bg-bg`}>
                      {categoryLabels[sub.category]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm">${Number(sub.cost_monthly_usd).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-mono text-[10px] px-2 py-1 rounded ${
sub.status === "active" ? "bg-green/20 text-green" :
                      sub.status === "paused" ? "bg-accent/20 text-accent" : "bg-line text-ink-3"
                    }`}>
                      {sub.status === "active" ? "Активна" : sub.status === "paused" ? "На паузе" : "Отменена"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-2 truncate max-w-[200px]">{sub.notes || "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(sub)}
                        className="p-1.5 hover:bg-panel rounded transition-colors"
                        title="Редактировать"
                      >
                        <Pencil size={14} className="text-ink-3 hover:text-ink-1" />
                      </button>
                      {sub.status === "active" ? (
                        <button
                          onClick={() => handleStatusChange(sub, "paused")}
                          className="p-1.5 hover:bg-panel rounded transition-colors"
                          title="На паузу"
                        >
                          <Pause size={14} className="text-ink-3 hover:text-ink-1" />
                        </button>
                      ) : sub.status === "paused" ? (
                        <button
                          onClick={() => handleStatusChange(sub, "active")}
                          className="p-1.5 hover:bg-panel rounded transition-colors"
                          title="Активировать"
                        >
                          <Play size={14} className="text-green hover:text-green-2" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(sub)}
                        className="p-1.5 hover:bg-panel rounded transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={14} className="text-ink-3 hover:text-red" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 className="font-display text-xl">{editingSub ? "Редактировать подписку" : "Новая подписка"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-panel-2 rounded-lg">
                <X size={20} className="text-ink-3" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Сервис *</label>
                <input
                  type="text"
                  value={form.service}
                  onChange={e => setForm({ ...form, service: e.target.value })}
                  className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                  placeholder="Anthropic Claude"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Категория</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="ai">AI</option>
                    <option value="content">Контент</option>
                    <option value="automation">Автоматизация</option>
                    <option value="hosting">Хостинг</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">$/мес</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost_monthly_usd}
                    onChange={e => setForm({ ...form, cost_monthly_usd: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Статус</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                >
                  <option value="active">Активна</option>
                  <option value="paused">На паузе</option>
                  <option value="cancelled">Отменена</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Заметка</label>
                <textarea
                  value={form.notes || ""}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none resize-none"
                  placeholder="API key для..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-panel border border-line rounded-lg text-ink hover:bg-panel-2 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
                >
                  {editingSub ? "Сохранить" : "Добавить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Удалить подписку?"
          message={`Подписка "${confirmDelete.service}" будет удалена.`}
          confirmText="Удалить"
          variant="danger"
          onConfirm={async () => { await deleteSub(confirmDelete.id); toast.success("Подписка удалена"); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}