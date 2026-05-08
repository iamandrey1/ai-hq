import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — стратегический аналитик AI HQ для двух сооснователей.
Твоя задача — взглянуть на снимок проекта и дать краткий, честный статус-репорт.

Формат ответа:
**Статус:** одно-два предложения о текущем положении проекта.
**Рекомендации:**
1. Конкретное действие, обоснованное данными.
2. ...
3. ...

Правила:
- Если по данным всё в порядке — пиши коротко: "Всё под контролем. Прогресс соответствует плану." Не выдумывай проблемы.
- Если есть явный риск или отставание — указывай его прямо, без воды.
- Не используй markdown заголовки # — только **жирный** текст для меток.
- Цифры (даты, проценты, суммы) — обязательно из переданных данных, ничего не выдумывай.
- Не более 4 рекомендаций. Лучше 2 точных, чем 5 размытых.
- Тон — дружелюбный коллега, не корпоративный отчёт.
- На русском.`;

interface ProjectSnapshot {
  project: { name: string; description: string; status: string; progress: number };
  tasks: Array<{ title: string; status: string; priority: string; updated_at?: string }>;
  risks: Array<{ title: string; probability: string; impact: number; resolved: boolean; mitigation?: string }>;
  kpis: Array<{ name: string; current_value: number; target_value: number; unit: string }>;
  budget: { spent: number; total: number; items_count: number };
}

function buildUserPrompt(snap: ProjectSnapshot): string {
  const lines: string[] = [];

  lines.push(`## Проект: ${snap.project.name}`);
  if (snap.project.description) lines.push(snap.project.description);
  lines.push(`Статус: ${snap.project.status} · Прогресс: ${snap.project.progress}%`);
  lines.push("");

  lines.push(`## Задачи (всего ${snap.tasks.length})`);
  const todo = snap.tasks.filter(t => t.status === "todo");
  const inProg = snap.tasks.filter(t => t.status === "in_progress");
  const done = snap.tasks.filter(t => t.status === "done");
  lines.push(`- В очереди: ${todo.length}`);
  lines.push(`- В работе: ${inProg.length}`);
  lines.push(`- Готово: ${done.length}`);
  if (inProg.length > 0) {
    lines.push(`Сейчас в работе: ${inProg.slice(0, 5).map(t => `«${t.title}» (${t.priority})`).join(", ")}`);
  }
  const highPrio = todo.filter(t => t.priority === "high");
  if (highPrio.length > 0) {
    lines.push(`Высокий приоритет в очереди: ${highPrio.length} (${highPrio.slice(0, 3).map(t => `«${t.title}»`).join(", ")})`);
  }
  lines.push("");

  const openRisks = snap.risks.filter(r => !r.resolved);
  lines.push(`## Риски (открытых: ${openRisks.length})`);
  if (openRisks.length === 0) {
    lines.push("Нет открытых рисков.");
  } else {
    openRisks.slice(0, 5).forEach(r => {
      lines.push(`- «${r.title}» — вероятность ${r.probability}, impact ${r.impact}/10${r.mitigation ? ` · план: ${r.mitigation}` : ""}`);
    });
  }
  lines.push("");

  if (snap.kpis.length > 0) {
    lines.push(`## KPI`);
    snap.kpis.forEach(k => {
      const pct = k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0;
      lines.push(`- ${k.name}: ${k.current_value} / ${k.target_value} ${k.unit} (${pct}%)`);
    });
    lines.push("");
  }

  lines.push(`## Бюджет`);
  if (snap.budget.total > 0) {
    const pct = Math.round((snap.budget.spent / snap.budget.total) * 100);
    lines.push(`Потрачено $${snap.budget.spent} из $${snap.budget.total} (${pct}%) · позиций: ${snap.budget.items_count}`);
  } else {
    lines.push("Бюджет не задан.");
  }

  return lines.join("\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const { id: projectId } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch project + related data in parallel
    const [projectRes, tasksRes, risksRes, kpisRes, budgetRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("tasks").select("title, status, priority, updated_at").eq("project_id", projectId),
      supabase.from("project_risks").select("title, probability, impact, resolved, mitigation").eq("project_id", projectId),
      supabase.from("project_kpis").select("name, current_value, target_value, unit").eq("project_id", projectId),
      supabase.from("project_budget").select("amount, status").eq("project_id", projectId),
    ]);

    if (projectRes.error || !projectRes.data) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const budgetItems = budgetRes.data ?? [];
    const snap: ProjectSnapshot = {
      project: {
        name: projectRes.data.name,
        description: projectRes.data.description ?? "",
        status: projectRes.data.status,
        progress: projectRes.data.progress ?? 0,
      },
      tasks: tasksRes.data ?? [],
      risks: risksRes.data ?? [],
      kpis: kpisRes.data ?? [],
      budget: {
        spent: budgetItems.filter(b => b.status === "spent").reduce((s, b) => s + Number(b.amount ?? 0), 0),
        total: budgetItems.reduce((s, b) => s + Number(b.amount ?? 0), 0),
        items_count: budgetItems.length,
      },
    };

    const userPrompt = buildUserPrompt(snap);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const summary = response.content
      .filter(c => c.type === "text")
      .map(c => (c as { type: "text"; text: string }).text)
      .join("\n");

    return Response.json({
      summary,
      generated_at: new Date().toISOString(),
      snapshot: snap,
      usage: response.usage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ai-summary]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
