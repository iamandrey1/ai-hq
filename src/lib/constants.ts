// AI HQ — единые мапы лейблов и цветов.
// Используются вместо локальных Record<string,string> в страницах.

import type { Project, Task } from "@/types";

// ───────────────────────────────────────────────────────────────
// PROJECT
// ───────────────────────────────────────────────────────────────

export const PROJECT_CATEGORY_LABELS: Record<Project["category"], string> = {
  crypto: "Crypto",
  telegram: "Telegram",
  shopify: "Shopify",
  viral: "Viral",
  other: "Other",
};

export const PROJECT_CATEGORY_COLORS: Record<Project["category"], string> = {
  crypto: "text-amber-400 bg-amber-400/10",
  telegram: "text-blue bg-blue/10",
  shopify: "text-green bg-green/10",
  viral: "text-red bg-red/10",
  other: "text-ink-3 bg-ink-3/10",
};

export const PROJECT_STATUS_LABELS: Record<Project["status"], string> = {
  active: "Активен",
  in_progress: "В разработке",
  paused: "На паузе",
  done: "Завершён",
  archived: "В архиве",
};

export const PROJECT_STATUS_COLORS: Record<Project["status"], string> = {
  active: "text-green",
  in_progress: "text-accent",
  paused: "text-amber-400",
  done: "text-blue",
  archived: "text-ink-3",
};

// Для современного pill-стиля (см. design-mockup.html)
export const PROJECT_STATUS_PILL: Record<Project["status"], string> = {
  active:
    "bg-green/10 text-green border-green/25",
  in_progress:
    "bg-accent/10 text-accent border-accent/25",
  paused:
    "bg-amber-400/10 text-amber-400 border-amber-400/25",
  done:
    "bg-blue/10 text-blue border-blue/25",
  archived:
    "bg-ink-3/10 text-ink-3 border-ink-3/25",
};

// ───────────────────────────────────────────────────────────────
// TASK
// ───────────────────────────────────────────────────────────────

export const TASK_PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const TASK_PRIORITY_COLORS: Record<Task["priority"], string> = {
  low: "text-ink-3",
  medium: "text-accent",
  high: "text-red",
};

export const TASK_PRIORITY_PILL: Record<Task["priority"], string> = {
  low: "bg-ink-3/12 text-ink-3",
  medium: "bg-accent/12 text-accent",
  high: "bg-red/12 text-red",
};

export const TASK_STATUS_LABELS: Record<Task["status"], string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export const TASK_STATUS_DOT: Record<Task["status"], string> = {
  todo: "bg-line-2",
  in_progress: "bg-accent animate-pulse-slow",
  done: "bg-green",
};

// ───────────────────────────────────────────────────────────────
// SUBSCRIPTION (budget)
// ───────────────────────────────────────────────────────────────

export type SubCategory = "ai" | "content" | "automation" | "hosting" | "other";
export type SubStatus = "active" | "paused" | "cancelled";

export const SUB_CATEGORY_LABELS: Record<SubCategory, string> = {
  ai: "AI",
  content: "Контент",
  automation: "Автоматизация",
  hosting: "Хостинг",
  other: "Другое",
};

export const SUB_CATEGORY_COLORS: Record<SubCategory, string> = {
  ai: "text-accent",
  content: "text-blue",
  automation: "text-green",
  hosting: "text-ink-2",
  other: "text-ink-3",
};

export const SUB_STATUS_LABELS: Record<SubStatus, string> = {
  active: "Активна",
  paused: "На паузе",
  cancelled: "Отменена",
};

// ───────────────────────────────────────────────────────────────
// AGENT (Claude / MiniMax / ChatGPT / CEO)
// ───────────────────────────────────────────────────────────────

export type AgentId = "claude" | "minimax" | "chatgpt" | "ceo";

export const AGENT_COLORS: Record<AgentId, string> = {
  claude: "bg-accent text-white",
  minimax: "bg-blue text-white",
  chatgpt: "bg-green text-white",
  ceo: "bg-ink-3 text-white",
};

export const AGENT_LABELS: Record<AgentId, string> = {
  claude: "CL",
  minimax: "MM",
  chatgpt: "GP",
  ceo: "CE",
};

export type AgentStatus = "busy" | "idle" | "queue";

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  busy: "Занят",
  idle: "Свободен",
  queue: "В очереди",
};

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  busy: "text-accent bg-accent/10",
  idle: "text-green bg-green/10",
  queue: "text-blue bg-blue/10",
};

// ───────────────────────────────────────────────────────────────
// LAYOUT TOKENS
// ───────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 240;
export const CABINET_WIDTH = 380;

// ───────────────────────────────────────────────────────────────
// SAFE GETTER UTILS
// ───────────────────────────────────────────────────────────────

export function getProjectStatusLabel(s?: string): string {
  return PROJECT_STATUS_LABELS[s as Project["status"]] ?? s ?? "—";
}

export function getProjectCategoryLabel(c?: string): string {
  return PROJECT_CATEGORY_LABELS[c as Project["category"]] ?? c ?? "—";
}

export function getTaskStatusLabel(s?: string): string {
  return TASK_STATUS_LABELS[s as Task["status"]] ?? s ?? "—";
}
