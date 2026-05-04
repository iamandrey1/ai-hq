export interface Message {
  id?: string;
  full_name: string;
  initials: string;
  role: "ceo" | "guest";
  created_at: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  category: "crypto" | "telegram" | "shopify" | "viral" | "other";
  description: string;
  status: "active" | "paused" | "done" | "archived";
  progress: number;
  repo_url?: string;
  prod_url?: string;
  created_at: string;
  updated_at: string;
  agents: AgentType[];
}

export type AgentType = "claude" | "minimax" | "chatgpt";
export type AgentStatus = "busy" | "idle" | "queue";

export interface Agent {
  id: AgentType;
  name: string;
  role: string;
  status: AgentStatus;
}

export interface Message {
  id: string;
  sender: "claude" | "minimax" | "ceo";
  senderName: string;
  content: string;
  timestamp: Date;
  delegated?: AgentType;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  createdAt: Date;
}
