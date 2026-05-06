"use client";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Project {
  id?: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  progress: number;
  repo_url?: string;
  prod_url?: string;
  status?: string;
}

interface ProjectModalProps {
  project?: Project | null;
  onClose: () => void;
  onSaved: () => void;
}

const categories = [
  { value: "crypto", label: "Крипто" },
  { value: "telegram", label: "Telegram" },
  { value: "shopify", label: "Shopify" },
  { value: "viral", label: "Viral" },
  { value: "other", label: "Другое" },
];

export function ProjectModal({ project, onClose, onSaved }: ProjectModalProps) {
  const [form, setForm] = useState<Project>({
    name: project?.name || "",
    slug: project?.slug || "",
    category: project?.category || "other",
    description: project?.description || "",
    progress: project?.progress || 0,
    repo_url: project?.repo_url || "",
    prod_url: project?.prod_url || "",
    status: project?.status || "active",
  });

  useEffect(() => {
    if (!project?.slug && form.name) {
      setForm(f => ({
        ...f,
        slug: f.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      }));
    }
  }, [form.name, project?.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Название обязательно");
      return;
    }

    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const supabase = createClient();

    if (project?.id) {
      const { error } = await supabase
        .from("projects")
        .update(form)
        .eq("id", project.id);
      if (error) {
        toast.error("Ошибка обновления");
        return;
      }
      toast.success("Проект обновлён");
    } else {
      const { error } = await supabase
        .from("projects")
        .insert({ ...form, slug });
      if (error) {
        toast.error("Ошибка создания");
        return;
      }
      toast.success("Проект создан");
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-display text-xl">
            {project?.id ? "Редактировать проект" : "Новый проект"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-panel-2 rounded-lg transition-colors">
            <X size={20} className="text-ink-3" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
              Название *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none transition-colors"
              placeholder="Крипто-Компас Pro"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none transition-colors"
              placeholder="crypto-compass"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
              Категория
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none transition-colors"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
              Описание
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none transition-colors resize-none"
              placeholder="Краткое описание проекта..."
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
              Прогресс: {form.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-ink-3 font-mono mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                Repo URL
              </label>
              <input
                type="text"
                value={form.repo_url || ""}
                onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
                className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none transition-colors"
                placeholder="github.com/..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">
                Prod URL
              </label>
              <input
                type="text"
                value={form.prod_url || ""}
                onChange={(e) => setForm({ ...form, prod_url: e.target.value })}
                className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none transition-colors"
                placeholder="example.com"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-panel border border-line rounded-lg text-ink text-sm hover:bg-panel-2 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
            >
              {project?.id ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
