"use client";

import { Corridor } from "@/components/Corridor";
import { useProjects } from "@/hooks/useProjects";
import { ProjectModal } from "@/components/ProjectModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MoreVertical, Plus, Pencil, Archive, Trash2, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const categoryColors: Record<string, string> = {
  crypto: "bg-accent text-bg",
  telegram: "bg-blue text-ink",
  shopify: "bg-green text-bg",
  viral: "bg-red text-ink",
  other: "bg-ink-2 text-bg",
};

const categoryLabels: Record<string, string> = {
  crypto: "Crypto",
  telegram: "Telegram",
  shopify: "Shopify",
  viral: "Viral",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  active: "Активен",
  paused: "На паузе",
  done: "Готов",
  archived: "В архиве",
};

type FilterType = "all" | "active" | "archived";

export default function ProjectsPage() {
  const { projects, loading } = useProjects();
  const [filter, setFilter] = useState<FilterType>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [progressEdit, setProgressEdit] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (filter === "active") return p.status === "active";
    if (filter === "archived") return p.status === "archived";
    return p.status !== "archived";
  });

  const activeCount = projects.filter((p) => p.status === "active").length;
  const archivedCount = projects.filter((p) => p.status === "archived").length;

  const handleArchive = async (project: any) => {
    await supabase.from("projects").update({ status: "archived" }).eq("id", project.id);
    toast.success("Проект архивирован");
    setOpenMenu(null);
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await supabase.from("projects").delete().eq("id", confirmDelete.id);
      toast.success("Проект удалён");
      setConfirmDelete(null);
    }
  };

  const handleProgressUpdate = async () => {
    if (progressEdit) {
      await supabase.from("projects").update({ progress: progressEdit.progress }).eq("id", progressEdit.id);
      toast.success("Прогресс обновлён");
      setProgressEdit(null);
    }
  };

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
              Все <em style={{ fontStyle: "italic", color: "var(--accent)" }}>проекты</em>
            </h1>
            <p className="text-ink-3 text-sm">
              {activeCount} активных · {archivedCount} в архиве
            </p>
          </div>
          <button
            onClick={() => { setEditingProject(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
          >
            <Plus size={18} />
            Новый проект
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "active", "archived"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
                filter === f
                  ? "bg-accent text-bg"
                  : "bg-panel border border-line text-ink-2 hover:border-accent"
              }`}
            >
              {f === "all" ? "Все" : f === "active" ? "Активные" : "Архив"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-panel border border-line rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="font-display text-xl mb-2">Тут пока пусто</div>
            <div className="text-ink-3 text-sm mb-4">Создайте первый проект</div>
            <button
              onClick={() => { setEditingProject(null); setModalOpen(true); }}
              className="px-4 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
            >
              + Новый проект
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-panel border border-line rounded-xl p-5 relative overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              >
                <div
                  className={`absolute top-0 right-5 font-mono text-[9px] ${categoryColors[project.category] || categoryColors.other} px-2.5 py-1 rounded-b-md uppercase tracking-[0.12em] font-semibold`}
                >
                  {categoryLabels[project.category] || "Other"}
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === project.id ? null : project.id); }}
                    className="absolute top-0 left-0 p-1 hover:bg-panel-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical size={16} className="text-ink-3" />
                  </button>

                  {openMenu === project.id && (
                    <div ref={menuRef} className="absolute top-8 left-0 bg-panel-2 border border-line rounded-lg shadow-xl z-10 py-1 min-w-[160px]">
                      <button
                        onClick={() => { setEditingProject(project); setModalOpen(true); setOpenMenu(null); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors flex items-center gap-2"
                      >
                        <Pencil size={14} /> Редактировать
                      </button>
                      <button
                        onClick={() => { setProgressEdit({ id: project.id, progress: project.progress }); setOpenMenu(null); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors flex items-center gap-2"
                      >
                        Изменить прогресс
                      </button>
                      <button
                        onClick={() => handleArchive(project)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors flex items-center gap-2"
                      >
                        <Archive size={14} /> Архивировать
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(project); setOpenMenu(null); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors flex items-center gap-2 text-red"
                      >
                        <Trash2 size={14} /> Удалить
                      </button>
                    </div>
                  )}
                </div>

                <div className="font-display text-[19px] font-medium mb-1.5 mt-4">{project.name}</div>
                <div className="text-[12px] text-ink-3 mb-4 leading-relaxed line-clamp-2">{project.description}</div>

                <div className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.08em] mb-3">
                  {statusLabels[project.status]}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <div className="flex-1 mr-3">
                    <div className="flex justify-between font-mono text-[10px] text-ink-3 mb-1">
                      <span>Прогресс</span>
                      <b className="text-ink">{project.progress}%</b>
                    </div>
                    <div className="h-[3px] bg-line rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-accent-2 rounded"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {(project.repo_url || project.prod_url) && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-line">
                    {project.repo_url && (
                      <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[10px] text-accent hover:underline flex items-center gap-1">
                        GitHub <ExternalLink size={10} />
                      </a>
                    )}
                    {project.prod_url && (
                      <a href={project.prod_url} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[10px] text-green hover:underline flex items-center gap-1">
                        Prod <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <ProjectModal
          project={editingProject}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Удалить проект?"
          message={`Проект "${confirmDelete.name}" будет удалён навсегда.`}
          confirmText="Удалить"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {progressEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-display text-lg mb-4">Изменить прогресс</h3>
            <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-2">
              Прогресс: {progressEdit.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progressEdit.progress}
              onChange={(e) => setProgressEdit({ ...progressEdit, progress: parseInt(e.target.value) })}
              className="w-full accent-accent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setProgressEdit(null)}
                className="flex-1 px-4 py-2.5 bg-panel border border-line rounded-lg text-ink hover:bg-panel-2 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleProgressUpdate}
                className="flex-1 px-4 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
