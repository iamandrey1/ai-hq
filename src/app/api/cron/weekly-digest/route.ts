import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient as createServerSbClient, type SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Digest — Vercel Cron (понедельник, 09:00)
//
// vercel.json должен содержать:
//   { "crons": [{ "path": "/api/cron/weekly-digest", "schedule": "0 9 * * 1" }] }
//
// Авторизация: Vercel Cron шлёт `Authorization: Bearer <CRON_SECRET>`. Если
// CRON_SECRET не выставлен — endpoint публичный (для локального теста).
//
// Шаги:
//   1. Собрать activity за прошлую неделю (понедельник 00:00 — воскресенье 23:59)
//   2. Метрики: tasks_done, tasks_overdue, budget_spent, risks_opened, risks_resolved
//   3. Если "всё ок" — короткий статус. Иначе — статус + рекомендации.
//   4. Сохранить в `digests`, отправить email на vovapoland13@gmail.com и askuzhel40@gmail.com
//
// ─────────────────────────────────────────────────────────────────────────────

const RECIPIENTS = ["vovapoland13@gmail.com", "askuzhel40@gmail.com"];

const SYSTEM_PROMPT = `Ты — стратегический аналитик AI HQ. Сейчас понедельник, нужно подготовить
краткий еженедельный дайджест для двух CEO компании.

Формат:
**Неделя ${"{{week}}"}**
**Статус:** одно-два предложения о том, как прошла неделя в целом.
**Что сделано:** короткий список ключевых выполненных задач.
**Что в работе:** что движется, на чём стоит сосредоточиться.
**Внимание:** только если есть реальные проблемы (просрочки, открытые high-impact риски, превышение бюджета).
**Рекомендации:** 1-3 пункта на следующую неделю.

Правила:
- Если неделя прошла без проблем — пиши "Всё под контролем" и не выдумывай "Внимание".
- Цифры — ТОЛЬКО из переданных данных.
- Тон — дружелюбный коллега, не корпоратив.
- На русском, кратко.`;

interface DigestMetrics {
  tasks_done: number;
  tasks_done_titles: string[];
  tasks_in_progress: number;
  tasks_in_progress_titles: string[];
  tasks_overdue: number;
  tasks_overdue_titles: string[];
  risks_opened: number;
  risks_opened_titles: string[];
  risks_high_impact_open: number;
  risks_high_impact_titles: string[];
  budget_spent_week: number;
  comments_added: number;
  files_added: number;
}

function startOfPreviousWeek(now = new Date()): Date {
  const d = new Date(now);
  // Find Monday of previous week
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const daysToLastMonday = ((dow + 6) % 7) + 7;
  d.setUTCDate(d.getUTCDate() - daysToLastMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function gatherMetrics(supabase: SupabaseClient, since: Date, until: Date): Promise<DigestMetrics> {
  const sinceISO = since.toISOString();
  const untilISO = until.toISOString();

  const [tasksDoneRes, tasksInProgRes, tasksOverdueRes, risksOpenedRes, risksHighRes, activityRes, filesRes] = await Promise.all([
    supabase.from("tasks").select("title, updated_at").eq("status", "done").gte("updated_at", sinceISO).lte("updated_at", untilISO),
    supabase.from("tasks").select("title").eq("status", "in_progress"),
    supabase.from("tasks").select("title, due_date").neq("status", "done").lte("due_date", untilISO).not("due_date", "is", null),
    supabase.from("project_risks").select("title, impact, created_at").gte("created_at", sinceISO).lte("created_at", untilISO),
    supabase.from("project_risks").select("title, impact").eq("resolved", false).gte("impact", 7),
    supabase.from("activity_log").select("action_type").gte("created_at", sinceISO).lte("created_at", untilISO),
    supabase.from("file_links").select("title, created_at").gte("created_at", sinceISO).lte("created_at", untilISO),
  ]);

  const activity = (activityRes.data as { action_type: string }[] | null) ?? [];
  const tasksDone = (tasksDoneRes.data as { title: string }[] | null) ?? [];
  const tasksInProg = (tasksInProgRes.data as { title: string }[] | null) ?? [];
  const tasksOverdue = (tasksOverdueRes.data as { title: string }[] | null) ?? [];
  const risksOpened = (risksOpenedRes.data as { title: string }[] | null) ?? [];
  const risksHigh = (risksHighRes.data as { title: string }[] | null) ?? [];

  return {
    tasks_done: tasksDone.length,
    tasks_done_titles: tasksDone.map(t => t.title).slice(0, 10),
    tasks_in_progress: tasksInProg.length,
    tasks_in_progress_titles: tasksInProg.map(t => t.title).slice(0, 5),
    tasks_overdue: tasksOverdue.length,
    tasks_overdue_titles: tasksOverdue.map(t => t.title).slice(0, 5),
    risks_opened: risksOpened.length,
    risks_opened_titles: risksOpened.map(r => r.title),
    risks_high_impact_open: risksHigh.length,
    risks_high_impact_titles: risksHigh.map(r => r.title),
    budget_spent_week: 0, // TODO: подсчитать из subscriptions / project_budget когда нужно
    comments_added: activity.filter(a => a.action_type?.includes("comment")).length,
    files_added: ((filesRes.data as unknown[] | null) ?? []).length,
  };
}

function buildPrompt(metrics: DigestMetrics, weekLabel: string): string {
  const lines = [
    `Неделя: ${weekLabel}`,
    "",
    `## Задачи`,
    `- Закрыто за неделю: ${metrics.tasks_done}${metrics.tasks_done_titles.length > 0 ? ` — ${metrics.tasks_done_titles.map(t => `«${t}»`).join(", ")}` : ""}`,
    `- В работе сейчас: ${metrics.tasks_in_progress}${metrics.tasks_in_progress_titles.length > 0 ? ` — ${metrics.tasks_in_progress_titles.map(t => `«${t}»`).join(", ")}` : ""}`,
    `- Просрочено: ${metrics.tasks_overdue}${metrics.tasks_overdue_titles.length > 0 ? ` — ${metrics.tasks_overdue_titles.map(t => `«${t}»`).join(", ")}` : ""}`,
    "",
    `## Риски`,
    `- Открыто новых за неделю: ${metrics.risks_opened}${metrics.risks_opened_titles.length > 0 ? ` — ${metrics.risks_opened_titles.map(t => `«${t}»`).join(", ")}` : ""}`,
    `- Открытых high-impact (≥7): ${metrics.risks_high_impact_open}${metrics.risks_high_impact_titles.length > 0 ? ` — ${metrics.risks_high_impact_titles.map(t => `«${t}»`).join(", ")}` : ""}`,
    "",
    `## Активность`,
    `- Комментариев: ${metrics.comments_added}`,
    `- Файлов добавлено: ${metrics.files_added}`,
  ];
  return lines.join("\n");
}

async function sendEmail(to: string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  // Use Resend HTTP API directly (no SDK dependency until npm install resend)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AI HQ <digest@ai-hq.app>", // ← заменить на verified-домен в Resend
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text };
  }
  return { ok: true };
}

function summaryToHtml(summary: string, weekLabel: string): string {
  const body = summary
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0A0A0B; color: #ECECEE; padding: 24px;">
<div style="max-width: 600px; margin: 0 auto; background: #141417; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 28px;">
  <div style="font-size: 12px; color: #8B8B92; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 8px;">AI HQ · Weekly Digest</div>
  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 20px;">${weekLabel}</h1>
  <div style="font-size: 14px; line-height: 1.65; color: #ECECEE;"><p>${body}</p></div>
  <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #5C5C63;">
    Сгенерировано ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Warsaw" })}<br/>
    <a href="https://ai-hq-wine.vercel.app/activity" style="color: #4D9EBF; text-decoration: none;">Посмотреть детали в дашборде →</a>
  </div>
</div>
</body></html>`;
}

export async function GET(request: NextRequest) {
  // Vercel Cron auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Use service role for cron (bypasses RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: "Supabase service credentials missing" }, { status: 500 });
  }
  const supabase = createServerSbClient(supabaseUrl, serviceKey);

  const weekStart = startOfPreviousWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const weekLabel = `${weekStart.getUTCDate()}–${weekEnd.getUTCDate()} ${weekStart.toLocaleDateString("ru-RU", { month: "long" })}`;
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  // Idempotency: skip if already generated this week
  const existing = await supabase.from("digests").select("id, summary, email_status").eq("week_start", weekStartIso).maybeSingle();
  if (existing.data?.email_status === "sent") {
    return Response.json({ ok: true, status: "skipped", reason: "already sent for this week" });
  }

  // Gather metrics
  const metrics = await gatherMetrics(supabase, weekStart, weekEnd);

  // Generate summary via Anthropic
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userPrompt = buildPrompt(metrics, weekLabel);

  const aiResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: SYSTEM_PROMPT.replace("{{week}}", weekLabel),
    messages: [{ role: "user", content: userPrompt }],
  });

  const summary = aiResponse.content
    .filter(c => c.type === "text")
    .map(c => (c as { type: "text"; text: string }).text)
    .join("\n");

  // Save digest row first (idempotent upsert)
  const digestRow = {
    week_start: weekStartIso,
    summary,
    metrics: metrics as unknown as Record<string, unknown>,
    email_sent_to: RECIPIENTS,
    email_status: "pending" as const,
  };
  await supabase.from("digests").upsert(digestRow, { onConflict: "week_start" });

  // Send email
  const html = summaryToHtml(summary, weekLabel);
  const emailResult = await sendEmail(RECIPIENTS, `AI HQ · Weekly Digest · ${weekLabel}`, html);

  await supabase
    .from("digests")
    .update({ email_status: emailResult.ok ? "sent" : "failed" })
    .eq("week_start", weekStartIso);

  return Response.json({
    ok: emailResult.ok,
    week: weekLabel,
    metrics,
    email: emailResult,
    summary_preview: summary.slice(0, 200) + "...",
  });
}

// Allow manual POST trigger from dashboard for testing
export const POST = GET;
