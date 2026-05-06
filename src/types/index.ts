// AI HQ Type Definitions

export interface Profile {
  id: string;
  full_name: string;
  initials: string;
  role: "ceo" | "agent" | "admin";
  last_seen?: string | null;
  created_at: string;
}

export interface RoadmapItem {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "done";
  target_date: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  category: "crypto" | "telegram" | "shopify" | "viral" | "other";
  description: string;
  status: "active" | "in_progress" | "paused" | "done" | "archived";
  progress: number;
  repo_url?: string;
  prod_url?: string;
  created_at: string;
  updated_at: string;
  agents?: string[];
}

export interface Message {
  id: string;
  sender: "claude" | "minimax" | "chatgpt" | "ceo";
  senderName: string;
  content: string;
  timestamp: Date;
  delegated?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  createdAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: "idle" | "busy" | "queue";
}
