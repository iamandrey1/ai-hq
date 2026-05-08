"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useFileLinks, FileLink, getIconType, ICON_LABELS } from "@/hooks/useFileLinks";
import { useProjects } from "@/hooks/useProjects";
import {
  Link as LinkIcon, Plus, Trash2, ExternalLink, Search, X, Pencil,
  FileText, Globe, Github, Figma, Database, Table, HardDrive,
} from "lucide-react";
import { toast } from "sonner";

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

const ICON_COLORS: Record<string, string> = {
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

interface FormState {
  title: string;
  url: string;
  project: string;
  tags: string;
}

const emptyForm: FormState = { title: "", url: "", project: "", tags: "" };

export default function FilesPage() {
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<FileLink | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { files, loading, addFile, updateFile, deleteFile } = useFileLinks();
  const { projects } = useProjects();

  const filtered = files.filter((f) => {
    if (search) {
      const q = search.toLowerCase();
      if (!f.title.toLowerCase().includes(q) && !f.url.toLowerCase().includes(q)) return false;
    }
    if (filterProject && f.project_id !== filterProject) return false;
    if (filterType && f.icon_type !== filterType) return false;
    return true;
  });

  const allTypes = [...new Set(files.map((f) => f.icon_type).filter(Boolean))] as string[];

  const openAdd = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setModal("add");
  };

  const openEdit = (f: FileLink) => {
    setEditTarget(f);
    setForm({
      title: f.title,
      url: f.url,
      project: f.project_id || "",
      tags: (f.tags || []).join(", "),
    });
    setModal("edit");
  };

  const closeModal = () => { setModal(null); setEditTarget(null); };

  const parseTags = (s: string) =>
    s.split(",").map((t) => t.trim()).filter(Boolean);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    if (modal === "add") {
      const ok = await addFile({
        title: form.title.trim(),
        url: form.url.trim(),
        project_id: form.project || null,
        tags: parseTags(form.tags),
      });
      if (ok) { toast.success("Файл добавлен"); closeModal(); }
      else toast.error("Ошибка при добавлении");
    } else if (modal === "edit" && editTarget) {
      const ok = await updateFile(editTarget.id, {
        title: form.title.trim(),
        url: form.url.trim(),
        project_id: form.project || null,
        tags: parseTags(form.tags),
      });
      if (ok) { toast.success("Обновлено"); closeModal(); }
      else toast.error("Ошибка");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteFile(id);
    if (ok) toast.success("Удалено");
    else toast.error("Ошибка");
  };

  return (
    <AppShell>
      <div className="bg-bg min-h-full">
        {/* Header */}
        <div className="border-b border-line px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[20px] font-semibold text-ink">Файлы и ссылки</h1>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors"
            >
              <Plus size={14} />Добавить
            </button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или URL..."
                className="w-full bg-panel border border-line rounded pl-8 pr-3 py-1.5 text-sm text-ink outline-none focus:border-accent/50 placeholder:text-ink-3"
              />
            </div>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-panel border border-line rounded px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/50"
            >
              <option value="">Все проекты</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {allTypes.length > 0 && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-panel border border-line rounded px-2 py-1.5 text-sm text-ink outline-none focus:border-accent/50"
              >
                <option value="">Все типы</option>
                {allTypes.map((t) => (
                  <option key={t} value={t}>{ICON_LABELS[t] || t}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="px-4 md:px-8 py-6">
          {loading && (
            <div className="text-ink-3 text-sm text-center py-12">Загрузка...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-ink-3 text-sm text-center py-12">
              {files.length === 0 ? "Нет файлов. Добавьте первый!" : "Ничего не найдено"}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((f) => {
              const iconType = f.icon_type || "link";
              return (
                <div
                  key={f.id}
                  className="bg-panel border border-line rounded-lg p-4 group hover:border-line-2 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`mt-0.5 shrink-0 ${ICON_COLORS[iconType] || "text-ink-3"}`}>
                      <FileIcon type={iconType} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate">{f.title}</div>
                      <div className="text-[11px] text-ink-3">{ICON_LABELS[iconType] || "Ссылка"}</div>
                    </div>
                  </div>

                  {f.project && (
                    <div className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent rounded font-mono inline-block mb-2">
                      {f.project.name}
                    </div>
                  )}

                  {(f.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {f.tags!.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-panel-2 text-ink-3 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2 pt-2 border-t border-line">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-panel-2 border border-line rounded text-[12px] text-ink-2 hover:text-ink transition-colors"
                    >
                      <ExternalLink size={11} />Открыть
                    </a>
                    <button
                      onClick={() => openEdit(f)}
                      className="p-1.5 bg-panel-2 border border-line rounded text-ink-3 hover:text-ink transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-1.5 bg-panel-2 border border-line rounded text-ink-3 hover:text-red transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-panel border border-line rounded-lg p-6 w-[420px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-ink">
                {modal === "edit" ? "Редактировать" : "Добавить файл / ссылку"}
              </h2>
              <button onClick={closeModal} className="text-ink-3 hover:text-ink">
                <X size={16} />
              </button>
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
                <label className="text-[12px] text-ink-3 mb-1 block">Проект (опционально)</label>
                <select
                  value={form.project}
                  onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                >
                  <option value="">Без проекта</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-ink-3 mb-1 block">Теги (через запятую)</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="design, backend, docs"
                  className="w-full bg-bg border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-accent/50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={closeModal}
                className="flex-1 px-3 py-2 bg-panel-2 border border-line rounded text-sm text-ink hover:bg-line transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent-2 transition-colors"
              >
                {modal === "edit" ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
