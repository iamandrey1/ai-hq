"use client";

import { Corridor } from "@/components/Corridor";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, MoreVertical, Pencil, Trash2, X, GripVertical } from "lucide-react";
import { useState, useEffect, useRef, DragEvent } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const priorityColors: Record<string, string> = {
  low: "text-ink-3",
  medium: "text-accent",
  high: "text-red",
};

const priorityLabels: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

const statusColors: Record<string, string> = {
  todo: "bg-line-2",
  in_progress: "bg-accent animate-pulse-slow",
  done: "bg-green",
};

const statusLabels: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export default function TasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    priority: "medium" as string,
    status: "todo" as string,
  });
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

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Название задачи обязательно");
      return;
    }
    if (editingTask?.id) {
      await updateTask(editingTask.id, form);
      toast.success("Задача обновлена");
    } else {
      await createTask(form as any);
      toast.success("Задача создана");
    }
    setModalOpen(false);
    setEditingTask(null);
    setForm({ title: "", description: "", project_id: "", priority: "medium", status: "todo" });
  };

  const handleStatusChange = async (task: any, status: string) => {
    await updateTask(task.id, { status });
    toast.success(`Статус: ${statusLabels[status as keyof typeof statusLabels]}`);
    setOpenMenu(null);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: DragEvent, task: any) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: DragEvent, column: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedTask && draggedTask.status !== targetStatus) {
      await updateTask(draggedTask.id,{ status: targetStatus });
      toast.success(`Задача перемещена в "${statusLabels[targetStatus as keyof typeof statusLabels]}"`);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.name;
  };

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Corridor />
      <main className="flex-1 overflow-y-auto px-10 py-8 pb-16 relative bg-bg">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-[32px] font-medium tracking-[-0.01em] mb-2">
              <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Задачи</em>
            </h1>
            <p className="text-ink-3 text-sm">
              {tasks.length} задач · {todoTasks.length} в очереди · перетаскивай для смены статуса
            </p>
          </div>
          <button
            onClick={() => { setEditingTask(null); setForm({ title: "", description: "", project_id: "", priority: "medium", status: "todo" }); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-2 transition-colors"
          >
            <Plus size={18} />
            Новая задача
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-3 gap-6">
          {/* Todo */}
          <div
            onDragOver={(e) => handleDragOver(e, "todo")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "todo")}
            className={`rounded-xl p-4 transition-all ${dragOverColumn === "todo" ? "bg-accent/10 ring-2 ring-accent/30" : "bg-panel"}`}
          >
            <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColors.todo}`} />
              К выполнению
              <span className="ml-auto bg-panel-2 px-2 py-0.5 rounded-full">{todoTasks.length}</span>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {loading ? (
                <div className="bg-panel border border-line rounded-lg h-24 animate-pulse" />
              ) : todoTasks.length === 0 ? (
                <div className="text-center py-8 text-ink-3 text-sm">Нет задач</div>
              ) : todoTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectName={getProjectName(task.project_id)}
                  onStatusChange={handleStatusChange}
                  onEdit={() => { setEditingTask(task); setForm({ title: task.title, description: task.description || "", project_id: task.project_id || "", priority: task.priority, status: task.status }); setModalOpen(true); setOpenMenu(null); }}
                  onDelete={() => { setConfirmDelete(task); setOpenMenu(null); }}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedTask?.id === task.id}
                />
              ))}
            </div>
          </div>

          {/* In Progress */}
          <div
            onDragOver={(e) => handleDragOver(e, "in_progress")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "in_progress")}
            className={`rounded-xl p-4 transition-all ${dragOverColumn === "in_progress" ? "bg-accent/10 ring-2 ring-accent/30" : "bg-panel"}`}
          >
            <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColors.in_progress}`} />
              В работе
              <span className="ml-auto bg-accent/20 text-accent px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {inProgressTasks.length === 0 ? (
                <div className="text-center py-8 text-ink-3 text-sm">Нет задач</div>
              ) : inProgressTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectName={getProjectName(task.project_id)}
                  onStatusChange={handleStatusChange}
                  onEdit={() => { setEditingTask(task); setForm({ title: task.title, description: task.description || "", project_id: task.project_id || "", priority: task.priority, status: task.status }); setModalOpen(true); setOpenMenu(null); }}
                  onDelete={() => { setConfirmDelete(task); setOpenMenu(null); }}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedTask?.id === task.id}
                />
              ))}
            </div>
          </div>

          {/* Done */}
          <div
            onDragOver={(e) => handleDragOver(e, "done")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "done")}
            className={`rounded-xl p-4 transition-all ${dragOverColumn === "done" ? "bg-accent/10 ring-2 ring-accent/30" : "bg-panel"}`}
          >
            <div className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColors.done}`} />
              Готово
              <span className="ml-auto bg-green/20 text-green px-2 py-0.5 rounded-full">{doneTasks.length}</span>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {doneTasks.length === 0 ? (
                <div className="text-center py-8 text-ink-3 text-sm">Нет задач</div>
              ) : doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectName={getProjectName(task.project_id)}
                  onStatusChange={handleStatusChange}
                  onEdit={() => { setEditingTask(task); setForm({ title: task.title, description: task.description || "", project_id: task.project_id || "", priority: task.priority, status: task.status }); setModalOpen(true); setOpenMenu(null); }}
                  onDelete={() => { setConfirmDelete(task); setOpenMenu(null); }}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedTask?.id === task.id}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 className="font-display text-xl">{editingTask ? "Редактировать задачу" : "Новая задача"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-panel-2 rounded-lg">
                <X size={20} className="text-ink-3" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Название *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                  placeholder="Интеграция API"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none resize-none"
                  placeholder="Описание задачи..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Проект</label>
                  <select
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="">Без проекта</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
              </div>
              {editingTask && (
                <div>
                  <label className="block text-xs font-mono text-ink-3 uppercase tracking-wider mb-1.5">Статус</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-bg border border-line rounded-lg px-4 py-2.5 text-ink text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="todo">К выполнению</option>
                    <option value="in_progress">В работе</option>
                    <option value="done">Готово</option>
                  </select>
                </div>
              )}
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
                  {editingTask ? "Сохранить" : "Создать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Удалить задачу?"
          message={`Задача "${confirmDelete.title}" будет удалена.`}
          confirmText="Удалить"
          variant="danger"
          onConfirm={async () => { await deleteTask(confirmDelete.id); toast.success("Задача удалена"); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function TaskCard({ task, projectName, onStatusChange, onEdit, onDelete, onDragStart, onDragEnd, isDragging }: any) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      className={`bg-panel border border-line rounded-lg p-4 cursor-grab active:cursor-grabbing group relative transition-all ${
        isDragging ? "opacity-50 scale-95" : "hover:border-accent/30"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <GripVertical size={14} className="text-ink-3 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 mt-0.5" />
        <span className={`font-mono text-[14px] ${task.status === "done" ? "text-green" : priorityColors[task.priority]}`}>
          {task.status === "todo" ? "○" : task.status === "in_progress" ? "◐" : "●"}
        </span>
        <span className={`text-[14px] font-medium flex-1 ${task.status === "done" ? "line-through opacity-60" : ""}`}>
          {task.title}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === task.id ? null : task.id); }}
          className="p-1 hover:bg-panel-2 rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={14} className="text-ink-3" />
        </button>
      </div>
      {task.description && (
        <p className="text-[12px] text-ink-3 leading-relaxed mb-2 line-clamp-2 ml-6">{task.description}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap ml-6">
        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
          task.priority === "high" ? "bg-red/20 text-red" :
          task.priority === "medium" ? "bg-accent/20 text-accent" : "bg-panel-2 text-ink-3"
        }`}>
          {priorityLabels[task.priority]}
        </span>
        {projectName && (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-panel-2 text-ink-2 truncate max-w-[100px]">
            {projectName}
          </span>
        )}
      </div>

      {openMenu === task.id && (
        <div className="absolute top-full right-0 mt-1 bg-panel-2 border border-line rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
          {task.status !== "in_progress" && (
            <button onClick={() => { onStatusChange(task, "in_progress"); setOpenMenu(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors">
              В работу
            </button>
          )}
          {task.status !== "done" && (
            <button onClick={() => { onStatusChange(task, "done"); setOpenMenu(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors">
              Готово
            </button>
          )}
          {task.status === "done" && (
            <button onClick={() => { onStatusChange(task, "todo"); setOpenMenu(null); }} className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors">
              Вернуть
            </button>
          )}
          <button onClick={onEdit} className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors flex items-center gap-2">
            <Pencil size={14} /> Редактировать
          </button>
          <button onClick={onDelete} className="w-full px-3 py-2 text-left text-sm hover:bg-panel transition-colors flex items-center gap-2 text-red">
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      )}
    </div>
  );
}