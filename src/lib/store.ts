import { create } from "zustand";
import type { Message, Agent, Task } from "@/types";

interface AppState {
  messages: Message[];
  addMessage: (msg: Omit<Message, "timestamp"> & { id?: string }) => void;
  agents: Agent[];
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTaskStatus: (id: string, status: Task["status"]) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

export const useStore = create<AppState>((set) => ({
  messages: [
    {
      id: "1",
      sender: "claude",
      senderName: "Claude",
      content: "Привет! Я готов к работе. Чем могу помочь — дайте задачу или нажмите один из быстрых чипов ниже.",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
  ],
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...msg,
          id: msg.id ?? Date.now().toString(),
          timestamp: new Date(),
        },
      ],
    })),

  agents: [
    { id: "claude", name: "Claude Sonnet 4.6", role: "Стратег / диспетчер", status: "busy" },
    { id: "minimax", name: "MiniMax Agent", role: "Разработчик / DevOps", status: "queue" },
    { id: "chatgpt", name: "ChatGPT Plus", role: "Контент TG-каналов", status: "idle" },
  ],

  tasks: [
    { id: "1", title: "Подключить CoinGecko API", description: "Интеграция реальных данных в Крипто-Компас", projectId: "1", status: "in_progress", priority: "high", createdAt: new Date() },
    { id: "2", title: "ТЗ на TG-парсер новостей", description: "Создать ТЗ для MiniMax на парсер новостей", projectId: "2", status: "todo", priority: "medium", createdAt: new Date() },
    { id: "3", title: "Настроить Make.com автопостинг", description: "Схема автопостинга для 2 каналов", projectId: "2", status: "todo", priority: "high", createdAt: new Date() },
  ],
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: Date.now().toString(), createdAt: new Date() }],
    })),
  updateTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    })),

  activeNav: "office",
  setActiveNav: (nav) => set({ activeNav: nav }),
}));
