"use client";

import { Corridor } from "@/components/Corridor";
import { useProjects } from "@/hooks/useProjects";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Link from "next/link";
import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types/index";

const categoryColors: Record<string, string> = {
  crypto:   "text-amber-400 bg-amber-400/10",
  telegram: "text-blue bg-blue/10",
  shopify:  "text-green bg-green/10",
  viral:    "text-red bg-red/10",
  other:    "text-ink-3 bg-ink-3/10",
};

const categoryLabels: Record<string, string> = {
  crypto: "Crypto", telegram: "Telegram",
  shopify: "Shopify", viral: "Viral", other: "Other",
};

const statusLabels: Record<string, string> = {
  active: "Активен", in_progress: "В разработке",
  paused: "На паузе", done: "Завершён", archived: "В архиве",
};

const statusColors: Record<string, string> = {
  active: "text-green", in_progress: "text-accent",
  paused: "text-amber-400", done: "text-blue", archived: "text-ink-3",
};

type ProjectForm = {
  name: string; slug: string; description: string;
  category: Project["category"]; status: Project["status"];
  repo_url: string; prod_url: string;
};

const emptyForm: ProjectForm = {
  name: "", slug: "", description: "",
  category: "other", status: "active",
  repo_url: "", prod_url: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 50);
}

export default function ProjectsPage() {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [confirmDel, setConfirmDel] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModal("add");
  };

  const openEdit = (p: Project, e: React.MouseEvent) => {
    e.preventDefault();
    setEditTarget(p);
    setForm({
      name: p.name, slug: p.slug, description: p.description,
      category: p.category, status: p.status,
      repo_url: p.repo_url || "", prod_url: p.prod_url || "",
    });
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: f.slug || slugify(name) }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Название и slug обязательны");
      return;
    }
    setSaving(true);
    if (modal === "add") {
      const p = await createProject({
        name: form.name.trim(), slug: form.slug.trim(),
        description: form.description.trim(),
        category: form.category, status: form.status,
        repo_url: form.repo_url.trim() || undefined,
        prod_url: form.prod_url.trim() || undefined,
      });
      if (p) { toast.success("Проект создан"); closeModal(); }
      else toast.error("Ошибка создания");
    } else if (editTarget) {
      const ok = await updateProject(editTarget.id, {
        name: form.name.trim(), slug: form.slug.trim(),
        description: form.description.trim(),
        category: form.category, status: form.status,
        repo_url: form.repo_url.trim() || undefined,
        prod_url: form.prod_url.trim() || undefined,
      });
      if (ok) { toast.success("Обновлено"); closeModal(); }
      else toast.error("Ошибка обновления");
    }
    setSaving(false);
  };

  const handleDelete = async (p: Project) => {
    const ok = await deleteProject(p.id);
    if (ok) toast.success("Проект удалён"); else toast.error("Ошибка");
    setConfirmDel(null);
  };

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 bg-bg">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-ink mb-1">Проекты</h1>
            <p className="text-sm text-ink-3">
              {loading ? "Загрузка..." : `${projects.length} проектов · ${projects.filter(p => p.status === "active" || p.status === "in_progress").length} активных`}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
          >
            <Plus size={15} />Добавить проект
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-panel border border-line rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <Link
                  href={`/projects/${project.slug}`}
                  className="block bg-panel border border-line rounded-lg p-5 transition-all duration-150 hover:border-accent/30 hover:-translate-y-px no-underline h-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${categoryColors[project.category] || categoryColors.other}`}>
                      {categoryLabels[project.category] || project.category}
                    </span>
                    <span className={`font-mono text-[10px] ${statusColors[project.status] || statusColors.active}`}>
                      {statusLabels[project.status] || project.status}
                    </span>
                  </div>

                  <div className="text-[16px] font-semibold text-ink mb-1.5">{project.name}</div>
                  <div className="text-[12px] text-ink-3 mb-4 leading-relaxed line-clamp-2">
                    {project.description || "Нет описания"}
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between font-mono text-[10px] text-ink-3 mb-1.5">
                      <span>Прогресс</span>
                      <span className="text-ink">{project.progress}%</span>
                    </div>
                    <div className="h-[3px] bg-line rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${project.progress}%`,
                          background: "linear-gradient(90deg, rgb(var(--color-accent)), rgb(var(--color-accent-2)))",
                        }}
                      />
                    </div>
                  </div>

                  {(project.repo_url || project.prod_url) && (
                    <div className="flex gap-3 mt-3 pt-3 border-t border-line">
                      {project.repo_url && (
                        <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[10px] text-ink-3 hover:text-accent transition-colors"
                          onClick={e => e.stopPropagation()}>GitHub →</a>
                      )}
                      {project.prod_url && (
                        <a href={project.prod_url} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[10px] text-ink-3 hover:text-green transition-colors"
                          onClick={e => e.stopPropagation()}>Prod →</a>
                      )}
                    </div>
                  )}
                </Link>

                {/* Edit / Delete overlay */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => openEdit(project, e)}
                    className="p-1.5 bg-panel-2 border border-line rounded text-ink-3 hover:text-ink hover:border-accent/30 transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); setConfirmDel(project); }}
                    className="p-1.5 bg-panel-2 border border-line rounded text-ink-3 hover:text-red hover:border-red/30 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 className="text-[15px] font-semibold text-ink">
                {modal === "add" ? "Новый проект" : "Редактировать проект"}
              </h2>
              <button onClick={closeModal} className="text-ink-3 hover:text-ink"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1 block">Название *</label>
                <input
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="AI HQ"
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1 block">Slug *</label>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder="ai-hq"
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1 block">Описание</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Краткое описание проекта..."
                  rows={2}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1 block">Категория</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as Project["category"] }))}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                  >
                    {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1 block">Статус</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as Project["status"] }))}
                    className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                  >
                    {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1 block">GitHub URL</label>
                <input
                  value={form.repo_url}
                  onChange={e => setForm(f => ({ ...f, repo_url: e.target.value }))}
                  placeholder="https://github.com/..."
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-ink-3 uppercase tracking-wider mb-1 block">Prod URL</label>
                <input
                  value={form.prod_url}
                  onChange={e => setForm(f => ({ ...f, prod_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 px-3 py-2 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors">
                  Отмена
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-2 transition-colors disabled:opacity-50"
                >
                  {saving ? "Сохранение..." : modal === "add" ? "Создать" : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Удалить проект?"
          message={`Проект "${confirmDel.name}" и все его данные будут удалены.`}
          confirmText="Удалить"
          variant="danger"
          onConfirm={() => handleDelete(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
