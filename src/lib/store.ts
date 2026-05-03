import { create } from "zustand";
import type { Message, Project, Agent, Task } from "@/types";

interface AppState {
  messages: Message[];
  addMessage: (msg: Omit<Message, "timestamp"> & { id?: string }) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
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

  projects: [
    {
      id: "1",
      slug: "crypto-compass",
      name: "Крипто-Компас Pro",
      category: "crypto",
      description: "SaaS для крипто-инвесторов. MVP-оболочка готова, идёт замена заглушек на реальные данные CoinGecko.",
      status: "active",
      progress: 22,
      repo_url: "https://github.com/iamandrey1/kripto-kompas1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agents: ["claude", "minimax"],
    },
    {
      id: "2",
      slug: "tg-network",
      name: "Сеть TG-каналов",
      category: "telegram",
      description: "5 ниш: крипто, психо-факты, AI-заработок, science-shorts, история. Автопостинг через Make.com.",
      status: "active",
      progress: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agents: ["claude", "chatgpt"],
    },
    {
      id: "3",
      slug: "shopify-stores",
      name: "Магазины DTC",
      category: "shopify",
      description: "Запуск через Shopify + dropshipping. Этап исследования ниш и поставщиков.",
      status: "active",
      progress: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agents: ["claude"],
    },
    {
      id: "4",
      slug: "viral-factory",
      name: "Viral-фабрика",
      category: "viral",
      description: "Reels/Shorts/TikTok с монетизацией и продвижением каналов. Контент-машина на Sora/ElevenLabs.",
      status: "active",
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agents: ["claude"],
    },
  ],
  setProjects: (projects) => set({ projects }),

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
