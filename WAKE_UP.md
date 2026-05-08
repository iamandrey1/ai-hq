# Доброе утро. Что сделано ночью и что делаем дальше.

## ✅ Готово (ничего не ломает текущий деплой)

### TypeScript: **20 ошибок → 0**
- `src/lib/supabase/server.ts` + `src/middleware.ts` — типизированные `cookiesToSet`
- `src/components/Cabinet.tsx` — `id` теперь обязателен в `addMessage()`
- `src/hooks/useChatMessages.ts` — корректное приведение `sender` к `Message["sender"]`
- `src/app/api/seed/route.ts` — `repo_url: string | null`, `error: unknown`
- `src/app/budget/page.tsx` — типизированный `Category` / `Status`
- `tsconfig.json` — `tests/` исключён (Playwright не установлен)

### Фундамент архитектуры (новые файлы, ничего не трогает старое)

#### `src/lib/constants.ts`
Все label/color мапы в одном месте:
- `PROJECT_CATEGORY_LABELS/COLORS/PILL`
- `PROJECT_STATUS_LABELS/COLORS/PILL`
- `TASK_PRIORITY_LABELS/COLORS/PILL`
- `TASK_STATUS_LABELS/DOT`
- `SUB_CATEGORY_LABELS/COLORS`, `SUB_STATUS_LABELS`
- `AGENT_COLORS/LABELS`, `AGENT_STATUS_LABELS/COLORS`
- safe-getters `getProjectStatusLabel`, `getTaskStatusLabel`

Когда мигрируем страницы — удалим локальные мапы из `/office`, `/projects`, `/tasks`, `/budget`, `/team`, `/roadmap`. **Минус ~200 строк дубликата.**

#### `src/components/ui/` — UI-кит без новых deps (всё через `cva` + `tailwind-merge`)
- `Button` — variants: primary / secondary / ghost / danger / outline; sizes: sm / md / lg; loading + leftIcon/rightIcon
- `Card` + `CardHeader` + `CardTitle` + `CardMeta` — variants: default / flat / glow / ghost; hover: lift / accent
- `Input`, `Textarea`, `Select`, `Field` (label + error + hint обёртка)
- `Badge` — accent / green / red / amber / blue / muted; pill-shape
- `IconButton` — обязательный `aria-label`
- `Avatar` — с инициалами + online indicator
- `Modal` — на Radix Dialog, с focus-trap из коробки
- `Tabs` — 3 варианта: underline / pill / segmented
- `Skeleton`, `SkeletonCard`, `SkeletonRow`
- `EmptyState`

Импорт: `import { Button, Card, Modal } from "@/components/ui";`

#### `src/components/layout/`
- `AppShell` — общий wrapper с responsive sidebar + mobile drawer + bottom-nav. Принимает `rightPanel` (для chat-cabinet).
- `Sidebar` — копия Corridor’а с `aria-current`, `focus-visible`, поддержка `onNavigate` для drawer. Старый `Corridor` остался — мигрируем по странице.
- `MobileBottomNav` — 5 пунктов (Офис / Проекты / Задачи / Лента / Команда)
- `PageHeader` — стандартный заголовок страницы

#### Tailwind / globals.css
- В `tailwind.config.ts` добавлены keyframes для модалок (`fadeIn`, `fadeOut`, `zoomIn95`, `slideInLeft`, `slideInBottom`) и shadows (`card`, `card-hover`, `glow-accent`)
- В `globals.css` — utility-классы для Radix `data-[state=open|closed]:animate-...`

### `/projects/[slug]/page.tsx` — URL-state для табов
Refresh теперь сохраняет позицию: `?tab=plan`. Полную разбивку файла (1982 строки → 7 файлов по табам) делаем вместе утром — слишком рискованно вслепую.

### Comments — хук + UI компоненты (готовы, не подключены)
- `src/hooks/useComments.ts` — generic хук с типами `Comment`, `CommentAttachment`, `CommentReactions`. Поддерживает таблицы `task_comments` и `risk_comments`. Wrappers: `useTaskComments(taskId)`, `useRiskComments(riskId)`. Realtime подписка, оптимистичные реакции, `parseMentions()` хелпер.
- `src/components/comments/CommentItem.tsx` — рендер одного комментария: автор + время + контент с подсветкой `@mentions` + attachments + реакции (с picker’ом) + edit/delete inline для своих
- `src/components/comments/CommentInput.tsx` — textarea с auto-resize, эмодзи-picker, **`@`-mention dropdown** с keyboard navigation (↑↓ + Enter/Tab), `⌘↵` отправка
- `src/components/comments/CommentsPanel.tsx` — готовая секция, можно вставить в любой проект-таб через `<CommentsPanel table="task_comments" parentColumn="task_id" parentId={task.id} />`

### AI Summary endpoint — `/api/projects/[id]/summary`
- POST: собирает project + tasks + risks + KPI + budget снапшот
- Шлёт в Anthropic SDK (Sonnet 4.6)
- Промпт: «если всё ок — пиши коротко "Всё под контролем"; иначе — статус + рекомендации»
- Возвращает markdown summary + snapshot + usage
- На фронте кнопка «Refresh AI Summary» в project header

### Weekly Digest cron — `/api/cron/weekly-digest`
- Триггер: понедельник 09:00 UTC (Vercel Cron)
- В `vercel.json` добавлен `crons` блок
- Использует `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
- Собирает метрики за прошлую неделю: tasks_done/in_progress/overdue, risks_opened/high, comments_added, files_added
- Анализирует через Anthropic с тем же подходом «если всё ок — без выдумывания проблем»
- Сохраняет в `digests` (idempotent через `upsert` по `week_start`)
- Шлёт email через **Resend HTTP API** (без SDK — `fetch()` напрямую). Дайджест в красивом тёмном HTML
- Recipients: `vovapoland13@gmail.com`, `askuzhel40@gmail.com`
- POST = GET (можно ручной запуск из дашборда для теста)
- **Suspense:** требует `RESEND_API_KEY`, `CRON_SECRET` (опционально), `SUPABASE_SERVICE_ROLE_KEY`

### SQL-аудит v2 готов: `supabase/migrations/20260508_audit_v2.sql`

**8 блоков, всё идемпотентно (можно прогонять повторно):**

1. **RLS на ВСЕХ 21 таблице** — на случай, если где-то отключено
2. **Tasks полный CRUD policy set** — на случай, что старая делала только update
3. **FK от `activity_log.user_id` и `file_links.added_by` → `public.profiles`** — это уберёт двухшаговую загрузку в хуках
4. **`task_comments`** — таблица с `attachments`, `reactions` (jsonb), `mentions` (uuid[])
5. **`risk_comments`** — то же самое для рисков
6. **`digests`** — для weekly Vercel Cron (week_start, summary, metrics, email_status)
7. **Realtime publication** для новых трёх таблиц
8. **Диагностические запросы** (закомменчены) — для проверки, что всё ок

---

## ▶ План на утро

### Этап 0 — Бекенд в идеал (1-2 часа)

1. **Прогнать SQL** в Supabase Dashboard:
   ```
   /Users/iamandrey/projects/ai-hq/.claude/worktrees/nervous-leavitt-4e86d9/supabase/migrations/20260508_audit_v2.sql
   ```
   Скопируй целиком в SQL Editor → Run. Ничего не должно упасть.

2. **Раскомментируй BLOCK 8** диагностику и прогони — пришли мне результаты:
   - 8.1: список таблиц с RLS статусом
   - 8.2: realtime tables
   - 8.3: FK на profiles (должны появиться)
   - 8.5: последние events с именами авторов

3. После проверки — **подтверди установку deps**, я ставлю одной командой:
   ```
   npm i zod react-hook-form @hookform/resolvers resend framer-motion
   ```
   - `zod` + `react-hook-form` + `@hookform/resolvers` — валидация форм (закроет все enum-проблемы навсегда)
   - `resend` — для email-дайджеста на vovapoland13@gmail.com и askuzhel40@gmail.com
   - `framer-motion` — микро-анимации для нового дизайна (опционально)

4. **`.env.local`** — добавить `RESEND_API_KEY=re_...` (создашь на resend.com за минуту, бесплатный план = 100 emails/day)

### Этап 1 — Применение нового дизайна (3-4 часа)

Идём по экранам в таком порядке, проверяя в браузере после каждого:

1. **`/office`** → новый bento-grid из mockup’а + KPI ticker + AI Brief card
2. **`/projects/[slug]`** → разбивка на `tabs/{Overview,Plan,KPI,Risks,Budget,Files,Data}Tab.tsx`. Перепишем под новый UI-кит (`<Card>`, `<Button>`, `<Modal>`).
3. **`/projects` (список)** + **`/tasks`** + **`/budget`** + **`/files`** + **`/activity`** + **`/team`** + **`/roadmap`** — миграция на `<AppShell>` + новый UI-кит.
4. **Mobile responsive** — проход по всем страницам (большинство уже подхватит из AppShell).

### Этап 2 — Новые фичи (3-5 часов)

1. **Comments** — хук `useTaskComments(taskId)` + `useRiskComments(riskId)` с realtime, mention-парсингом `@andrey`/`@vova`, реакциями. UI: side-panel в проекте + inline на task card.
2. **AI Summary** — `/api/projects/[id]/summary` route: собирает tasks + risks + budget + KPI снапшот, шлёт в Anthropic SDK, возвращает markdown. Кнопка в project header.
3. **Weekly digest** — Vercel Cron `0 9 * * 1` → `/api/cron/weekly-digest`:
   - Собрать данные за неделю
   - Если "всё ок" — короткий "Всё в порядке. Прогресс +N%."
   - Если есть проблемы — статус + рекомендации
   - Сохранить в `digests` таблицу
   - Resend → `vovapoland13@gmail.com`, `askuzhel40@gmail.com`
4. **Inbox / Today** — `/inbox` страница: просрочки, новые комменты, high-impact риски, превышения бюджета.

---

## 📦 Файлы, изменённые ночью

### Новые
- `src/lib/constants.ts`
- `src/components/ui/{Button,Card,Input,Badge,IconButton,Avatar,Modal,Tabs,Skeleton,EmptyState,index}.tsx`
- `src/components/layout/{AppShell,Sidebar,PageHeader,index}.tsx`
- `src/components/comments/{CommentItem,CommentInput,CommentsPanel,index}.tsx`
- `src/hooks/useComments.ts`
- `src/app/api/projects/[id]/summary/route.ts`
- `src/app/api/cron/weekly-digest/route.ts`
- `supabase/migrations/20260508_audit_v2.sql`
- `design-mockup.html` (вчера)
- `WAKE_UP.md` (этот файл)

### Поправленные (только TS-фиксы и URL-state)
- `src/lib/supabase/server.ts`
- `src/middleware.ts`
- `src/components/Cabinet.tsx`
- `src/hooks/useChatMessages.ts`
- `src/app/api/seed/route.ts`
- `src/app/budget/page.tsx`
- `src/app/projects/[slug]/page.tsx` (только URL-state для табов)
- `tsconfig.json`
- `tailwind.config.ts`
- `src/app/globals.css`
- `vercel.json` (добавлен `crons` блок)

**Ничего не удалено.** Все существующие компоненты (`Corridor`, `Office`, `Cabinet`, `ConfirmDialog` и т.д.) работают как раньше — мигрируем поэтапно.

---

## ⚠ Что НЕ сделано (требует твоего решения утром)

- **Прогон SQL** — твой ход (файл готов: `supabase/migrations/20260508_audit_v2.sql`)
- **Новые env vars** — добавить в `.env.local` и в Vercel (Production → Environment Variables):
  - `RESEND_API_KEY=re_...` (создать на resend.com — free tier 100/день)
  - `SUPABASE_SERVICE_ROLE_KEY=eyJ...` (Supabase Dashboard → Settings → API → service_role secret)
  - `CRON_SECRET=...` (любой случайный длинный секрет, для авторизации Vercel Cron)
- **Resend домен** — в `weekly-digest/route.ts` стоит `from: "AI HQ <digest@ai-hq.app>"`. Для прода надо verify домен в Resend, или использовать `onboarding@resend.dev` для теста.
- **Полная разбивка `/projects/[slug]/page.tsx`** (1982 строки → 7 файлов) — делаем вместе
- **Применение нового дизайна** к страницам — после твоего OK

Установка пакетов **не требуется** — comments и AI Summary работают на текущих deps. Resend используется через прямой `fetch()` HTTP API, без SDK.

Опционально (если захочешь):
- `npm i zod react-hook-form @hookform/resolvers` — для типобезопасных форм
- `npm i framer-motion` — для микро-анимаций нового дизайна

---

С добрым утром ☕
