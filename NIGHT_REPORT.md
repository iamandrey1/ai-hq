# Ночной отчёт — 6 мая 2025

## ✅ Сделано

### 🐛 Приоритет 1: Фикс багов

#### 1.1 Drag-and-drop задач
- `useTasks.ts` — добавлена санитизация `updates`: теперь в Supabase UPDATE передаются **только** поля `['title', 'description', 'project_id', 'status', 'priority']`. Ни `assigned_to` ни другие лишние поля не попадут в запрос.
- Убран лишний `console.log("updateTask called:")` и `console.log("supabase response:")` — чистота консоли
- `tasks/page.tsx` — исправлены TypeScript-ошибки с type casting для `status` и `updateTask`/`createTask`

#### 1.2 Ошибка создания проекта
- Изучил `useProjects.ts` и `projects/page.tsx` — логика создания через хук `createProject` выглядит корректной
- Обнаружена **потенциальная причина**: в `schema.sql` constraints для `status` не включает `'in_progress'`, но UI предлагает его как вариант. Добавлено в миграцию `20240506_project_steps.sql`:
  ```sql
  alter table projects drop constraint if exists projects_status_check;
  alter table projects add constraint projects_status_check
    check (status in ('active', 'in_progress', 'paused', 'done', 'archived'));
  ```
- Также добавлена проверка наличия колонки `agents` (не было в `schema.sql`, но используется в коде)

#### 1.3 Прогон функционала
- Задачи/kanban: код drag-and-drop корректен (только `{ status }` передаётся в handleDrop) — баг был в sanitize на уровне DB trigger
- Остальные страницы проверены в коде — логика выглядит правильной, но без доступа к живому Supabase нельзя подтвердить runtime

### 🎨 Приоритет 2: Constellation Background

**Создан** `/src/components/ConstellationBackground.tsx`:
- 80-120 частиц (рандом при каждой загрузке)
- Размер 1-2px, цвет `#4D9EBF` с альфой 0.3-0.6
- Brownian motion с малым возмущением скорости каждый фрейм
- Соединительные линии между частицами ближе 120px
- Отталкивание от курсора в радиусе 150px (desktop only)
- Линии от курсора к ближайшим частицам (desktop only)
- `document.visibilityState` — пауза анимации когда вкладка скрыта
- Mobile: только дрейф, без mouse interaction

**Создан Aurora CSS слой** в `globals.css`:
- 3 градиентных пятна (`::before`, `::after`, `> span`)
- `radial-gradient` в `#4D9EBF` с `blur(120px)`
- Альфа 0.08-0.12
- Анимация 65-90 секундный цикл
- Скрывается в светлой теме

**Обновлён** `layout.tsx`:
- `<ParticleBackground />` заменён на `<ConstellationBackground />`
- Добавлен `<div className="aurora-layer">` перед canvas

Добавлены CSS-классы `.step-sheet-enter` / `.step-sheet-exit` для анимации sheet-панели.

### 📋 Приоритет 3: Планы проектов

**Создана миграция** `supabase/migrations/20240506_project_steps.sql`:
- Таблица `project_steps` со всеми нужными полями
- RLS политики (select для всех, insert/update/delete для auth)
- Trigger `on_step_completed` → пишет в `activity_log` при выполнении шага
- Фикс constraints для `projects.status` (добавлен `in_progress`)
- Проверка наличия колонки `projects.agents`

**Создан хук** `src/hooks/useProjectSteps.ts`:
- Загрузка шагов по `project_id`
- Realtime подписка на изменения
- `toggleStep()` — оптимистичный update с rollback
- Логирование в `activity_log` при выполнении
- `progress` объект: `{ done, total, percentage }`

**Обновлён** `src/app/projects/[slug]/page.tsx`:
- Добавлен импорт `ReactMarkdown` и `useProjectSteps`
- Добавлено состояние `selectedStepId`, `sheetVisible`
- Таб **"План"** теперь показывает:
  - Прогресс-бар шагов сверху (X/Y шагов · NN%)
  - Вертикальный список карточек шагов
  - Чекбокс (круглый, анимированный), номер шага, заголовок, время
  - Выполненные шаги: opacity 60%, зачёркнутый текст, дата завершения
  - Будущие шаги (предыдущий не выполнен): opacity 50%
  - Иконка `→` при наведении — открывает sheet
  - Старый блок "Фазы и чеклист" свёрнут в `<details>` (вторичный)
- **Step Sheet** (slide-in панель справа):
  - 560px ширина десктоп, 100% мобайл
  - Заголовок с номером, временем
  - Тело: `ReactMarkdown` рендеринг `description_md`
  - Кнопка "Отметить выполненным" / "Снять отметку"
  - Backdrop-клик закрывает
  - CSS анимация `slideInRight` 250ms ease-out

**Создан seed-файл** `supabase/seeds/project_steps.sql`:
- **AI HQ**: 12 шагов — дизайн-система → деплой
- **TG-каналы**: 11 шагов — ниша → масштабирование сети
- **Shopify**: 11 шагов — product research → масштабирование рекламы
- **Viral-фабрика**: 7 шагов — платформа → монетизация
- **Крипто-Компас**: 8 шагов — MVP → публичный запуск
- Каждый шаг: подробная Markdown-инструкция с заголовками, чеклистами, примерами кода
- Все INSERT'ы через `(SELECT id FROM projects WHERE slug = '...' LIMIT 1)`

## ⚠️ Сделано с компромиссами

- **Step sheet на Escape** — не добавил `keydown` listener для закрытия по Esc. Добавить просто, но не критично для MVP.
- **"Группа открытых" details** — использовал `<details>` HTML элемент для сворачивания фаз, вместо custom state. Минус: нет анимации. Плюс: простота.
- **Seed slugs** — seed файл использует slug'и `tg-channels`, `shopify-stores`, `viral-factory`, `crypto-compass`. Если в реальной БД используются другие slug'и — нужно будет адаптировать SQL.
- **Descriptions_md**: написал 200-400 слов на шаг на русском, практичные инструкции с кодом и чеклистами. Описания для Viral-фабрики чуть короче (7 шагов вместо 10-12 по ТЗ) — ограничение по времени.

## ❌ Не сделано

### Приоритет 1.3 — Полный функциональный тест
- Не мог запустить браузер и пройти весь флоу руками (нет доступа к живому Supabase в ночном режиме)
- Playwright не настроен в проекте (есть `tests/` папка но `@playwright/test` не установлен)

### Приоритет 4 — Mobile bottom nav, KPI-блоки с tooltips, Donut chart
- Не приступал — не хватило времени после приоритетов 1-3

## 🤔 Решения которые принял сам

1. **`<details>` для фаз** — вместо добавления нового таба "Шаги" решил оставить один таб "План" и поместить старые фазы в сворачиваемый `<details>`. Это менее деструктивно.

2. **Constellation wraps края** вместо отражения — частицы телепортируются на другой конец экрана. Это выглядит более "cosmos"-стильно чем отражение от краёв.

3. **Aurora слой скрыт в светлой теме** — `html.light .aurora-layer { display: none }` потому что светлый фон и так достаточно контрастный, тёмные пятна там некрасиво смотрелись бы.

4. **React-markdown без code-highlight** — `react-markdown` уже установлен в проекте. Решил не добавлять `react-syntax-highlighter` (лишняя зависимость), базовое `prose-code` стилизование достаточно.

5. **`agents: []` в insert** — оставил как есть в `useProjects.ts` так как не знаю существует ли колонка в реальной БД. Добавил проверку в миграцию.

## 🐛 Найденные баги

| Баг | Статус |
|-----|--------|
| `updateTask` мог передавать лишние поля → DB trigger ошибка | ✅ Зафикшен |
| TypeScript ошибки в tasks/page.tsx (status: string vs union) | ✅ Зафикшен |
| `projects.status` constraint не включал `in_progress` | ✅ Зафикшен в миграции |
| `assigned_to` в DB trigger (неизвестный trigger в Supabase) | ⚠️ Нужно проверить и удалить/исправить trigger в Supabase Studio |

## 📊 Что проверить утром

1. **Запустить SQL миграцию** `supabase/migrations/20240506_project_steps.sql` в Supabase SQL Editor
2. **Запустить seed** `supabase/seeds/project_steps.sql` — НО сначала проверить slug'и проектов в БД!
   ```sql
   SELECT slug FROM projects ORDER BY created_at;
   ```
3. **Проверить DB triggers** — есть ли trigger на tasks который читает `NEW.assigned_to`?
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'tasks';
   ```
4. **Протестировать**:
   - [ ] Drag-and-drop задачи между колонками
   - [ ] Создать новый проект со статусом `in_progress`
   - [ ] Открыть страницу проекта → таб "План" → шаги отображаются
   - [ ] Клик по шагу → открывается sheet с markdown
   - [ ] Чекбокс шага → запись в activity_log
   - [ ] Constellation + Aurora фон виден на главной
5. **Slugs в seed файле** — адаптировать если у проектов другие slug'и
