# AI HQ — Резюме проекта для новой сессии

## Что сделано

### Проект
- **Название**: AI HQ — CEO operational dashboard
- **Стек**: Next.js 15 + TypeScript + Tailwind + Supabase + Vercel
- **Репозиторий**: https://github.com/iamandrey1/ai-hq
- **Деплой**: https://ai-hq-wine.vercel.app

### Страницы (маршруты)
- `/login` — вход через Supabase magic-link
- `/office` — главная страница (чат с Claude, проекты)
- `/projects` — сетка проектов (кликабельные карточки → `/projects/[slug]`)
- `/projects/[slug]` — детальная страница с табами: Обзор, План, KPI, Риски
- `/roadmap` — Gantt-диаграмма + финансовый прогноз
- `/tasks` — канбан-доска
- `/team` — AI-команда (CEO + AI-агенты)
- `/budget` — подписки и расходы
- `/settings` — настройки профиля

### Структура Supabase
Таблицы:
- `profiles` (id, full_name, initials, role)
- `projects` (id, slug, name, category, status, progress, repo_url, prod_url)
- `tasks` (id, title, status, priority, project_id)
- `subscriptions` (id, name, cost, category, billing_cycle)
- `messages` (id, sender, content, created_at)
- `project_phases` (id, project_id, title, status, order_index, start_week, end_week)
- `project_checklist` (id, project_id, phase_id, title, is_done, completed_at)
- `project_kpis` (id, project_id, name, current_value, target_value, unit)
- `project_forecast` (id, project_id, month_num, expected_revenue, expected_costs)
- `project_risks` (id, project_id, title, probability, mitigation, is_resolved)

### Хауки (src/hooks/)
- `useProfile.ts` — профиль пользователя
- `useProjects.ts` — список проектов
- `useTasks.ts` — задачи с realtime
- `useSubscriptions.ts` — подписки
- `useChatMessages.ts` — сообщения чата
- `useProjectPhases.ts` — фазы проекта
- `useProjectChecklist.ts` — чеклист с toggle/add/edit/delete + realtime
- `useProjectKpis.ts` — KPI с update
- `useProjectForecast.ts` — прогноз для графиков
- `useProjectRisks.ts` — риски с resolve

### Компоненты (src/components/)
- `Corridor.tsx` — сайдбар с навигацией
- `Office.tsx` — центральная панель (проекты, приветствие)
- `Cabinet.tsx` — чат с Claude
- `ProjectModal.tsx` — модалка CRUD проектов
- `ConfirmDialog.tsx` — диалог подтверждения
- `PlanRenderer.tsx` — markdown рендерер

### Паттерны импорта Supabase
```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

**ВАЖНО**: НЕ использовать `@/lib/supabase` напрямую — только через `client.ts`!

### Версии
- **V4**: CRUD для проектов, задач, подписок
- **V5**: Markdown рендеринг планов
- **V6**: Интерактивные страницы проектов с чеклистом, KPI, рисками, roadmap

## Текущий статус
Деплой работает, Supabase подключён, realtime работает.

## Что нужно сделать в новой сессии
1. Продолжить разработку по ТЗ
2. Исправлять ошибки билда локально перед пушем
3. При проблемах с Supabase импортом — использовать `createClient` из `@/lib/supabase/client`

## Файлы проекта
Локально: `/Users/ven/.minimax-agent/projects/ai-hq/`

## Контекст
Это операционный центр для CEO (Jo и Андрей). Чат с Claude получает задачи, AI агенты работают. Realtime позволяет двум CEO видеть изменения друг друга без перезагрузки.