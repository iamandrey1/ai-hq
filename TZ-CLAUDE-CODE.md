
# ТЗ для Claude Code: AI HQ — финальная версия

## Контекст проекта

AI HQ — операционный центр для двух CEO (Andrey + Vova).

Стек: Next.js 15 + TypeScript + Tailwind + Supabase + Vercel.
Прод: https://ai-hq-wine.vercel.app
GitHub: github.com/iamandrey1/ai-hq
Supabase: https://supabase.com/dashboard/project/rhvpyhdqjkdnfdyjxyqg

UID для RLS:
- Andrey: 3023cc9b-ff38-4eb3-9479-b8eba70939ce
- Vova: 06302321-8e0f-4b45-a129-7ddd473ff825

## Проекты внутри AI HQ (5 штук)

- ai-hq — AI HQ (само приложение, в разработке)
- tg-network — TG-каналы (5 ниш, готов к старту)
- shopify-stores — Shopify-магазины (готов к старту)
- viral-factory — Viral-фабрика (месяц 3)
- crypto-compass — Крипто-Компас Pro (месяц 5)

## ЧАСТЬ 1: Дизайн-система (приоритет #1)

Стиль: Linear + Vercel + минимализм.

Цвета:
- Тёмная тема по умолчанию: фон #0A0A0A — #111111
- Светлая тема через переключатель в сайдбаре
- Акцентный цвет: один (предложить варианты — синий #3B82F6 или фиолетовый #8B5CF6)

Типографика: Inter или Geist.

Принципы:
- Минимум границ и теней — разделение через пространство
- Тонкие линии (1px, opacity 8%)
- Скругления 6-8px максимум
- Никаких градиентов на кнопках, никаких эмодзи в UI
- Графики: тонкие линии без заливок (акцент + серый)
- Анимации: только функциональные, 150-200ms
- Много пустого пространства

## ЧАСТЬ 2: Критичные баги

Баг 1: Имена редактируются самостоятельно
- Убрать ВСЕ хардкоды "Jo" в коде
- На /team и в сайдбаре: клик на имя → inline edit → сохраняется в profiles.full_name
- Каждый CEO редактирует только своё имя (RLS)
- Realtime: имя меняется → второй CEO видит мгновенно

Баг 2: Бюджет считается из БД
- На /budget показывается $461, должно быть $93
- Большая цифра = SUM(cost_monthly_usd) WHERE status='active'
- Удалить хардкод

Баг 3: Таб "План" наполняется из БД
- На /projects/[slug] → таб План пустой
- В БД есть: project_phases (21 запись), project_checklist (90 записей)
- Рендерить фазы по order_num → под каждой чеклист с галочками
- Прогресс-бар сверху (% выполненных)
- Клик галочки → is_done=true, done_at=now(), done_by=auth.uid()
- Realtime обоим CEO

Баг 4: Roadmap с полосами и графиком доходов
- У TG-каналов, Shopify, Viral нет полос на Gantt — заполнить start_week/end_week в project_phases
- Добавить line chart помесячного дохода из project_forecast (24 месяца)

Баг 5: Realtime для всего
- Карточки на /tasks двигаются, но Vova видит только после F5
- Подписки через supabase.channel() с optimistic updates
- На все таблицы: чат, чеклисты, бюджет, задачи, имена, KPI, прогресс

Баг 6: AI HQ как 5-я карточка
- На /projects сейчас 4 карточки, добавить 5-ю (slug='ai-hq', статус 'in_progress')
- Заполнить план/KPI/прогноз для AI HQ

## ЧАСТЬ 3: Бюджет — полное редактирование

- Кнопка "Добавить подписку" → модалка (service / category / cost / status / notes)
- Клик на строку → inline edit любого поля
- Удалить с подтверждением
- Группировка по category с сабтоталами
- Большая сумма сверху (live)
- График трат по месяцам
- Фильтр по статусу
- RLS: только Andrey + Vova
- Realtime

## ЧАСТЬ 4: Прогресс-трекинг

- Каждый пункт чеклиста = галочка
- Клик: is_done=true, done_at=now(), done_by=auth.uid()
- Прогресс проекта = COUNT(is_done=true) / COUNT(*) по чеклисту
- Показывается на /projects (карточки), /projects/[slug] (шапка), /office (виджет Сегодня)

## ЧАСТЬ 5: Главная страница /office

Сейчас: только чат.

Добавить блоки:
1. Шапка: приветствие "Доброе утро, Andrey" + время
2. Виджет "Сегодня": сколько галочек, задач закрыто, разбивка по CEO
3. Лента активности: последние 3 действия в формате "[Аватар] Vova ✓ Создал TG-канал — 2 часа назад"
4. Чат с Claude (как сейчас)
5. Быстрые ссылки: Бюджет / Задачи / Проекты / Файлы

Отдельная страница /activity:
- Лента всех действий за всё время (с пагинацией)
- Графики: по дням/неделям/месяцам
- Разбивка Andrey vs Vova
- Фильтры: проект, тип действия, период

Действия для логирования: галочка чеклиста, закрытие задачи, создание задачи, добавление/удаление подписки, создание/удаление записи в кастомной таблице, добавление/удаление файла.

Новая таблица БД (SQL покажи мне для выполнения в Supabase):

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action_type text NOT NULL,
  project_id uuid REFERENCES projects(id),
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX activity_log_user_id_idx ON activity_log(user_id);
CREATE INDEX activity_log_created_at_idx ON activity_log(created_at DESC);
CREATE INDEX activity_log_project_id_idx ON activity_log(project_id);

## ЧАСТЬ 6: Хранилище ссылок и документов

Страница /files + вкладка в каждом проекте.

Каждая карточка:
- Иконка по типу URL (Google Doc / Sheet / Notion / Figma / Drive / другое)
- Название (редактируется)
- Ссылка
- Проект (опционально)
- Кто добавил + когда
- Теги

Действия: добавить (модалка URL+название+проект+теги), клик открывает в новой вкладке, edit/delete, поиск + фильтры.

Новая таблица БД:

CREATE TABLE file_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  icon_type text,
  project_id uuid REFERENCES projects(id),
  tags text[],
  added_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX file_links_project_id_idx ON file_links(project_id);

RLS: оба CEO могут CRUD.

## ЧАСТЬ 7: Кастомные таблицы внутри проектов

Логика как в Notion:
- В каждом проекте — таб "Данные"
- Можно создать несколько таблиц (TikTok аккаунты, Telegram паблики и т.д.)
- Самим добавлять/удалять колонки
- Типы колонок: text / number / date / checkbox / select / url
- Inline edit ячеек, добавление/удаление строк
- Realtime

Новые таблицы БД (гибкая схема):

CREATE TABLE custom_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_num int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE custom_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES custom_tables(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  options jsonb,
  order_num int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE custom_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES custom_tables(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  order_num int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

RLS: оба CEO могут CRUD.

## ЧАСТЬ 8: Удалить ВСЕ хардкоды

Принцип: ничего не зашито в коде. Всё из БД.
Имена / суммы / проценты / статусы / категории / URL / роли — всё динамика.

## ЧАСТЬ 9: Технические требования

- TypeScript strict, без any
- Хуки в /lib/hooks/
- Supabase: только import { createClient } from '@/lib/supabase/client'
- Realtime через supabase.channel() в useEffect с cleanup
- Optimistic updates везде где возможно
- Loading + error states на каждом компоненте
- Tailwind, никаких inline styles

## ЧАСТЬ 10: НЕ делать без согласования

- НЕ менять схему БД (CREATE/DROP/ALTER) — сначала покажи SQL мне, я выполню в Supabase Dashboard
- НЕ удалять файлы
- НЕ добавлять зависимости в package.json — сначала спроси
- НЕ трогать .env

## Порядок работы

Шаг 0: Баг 1 (имена) — проверка пайплайна.

Затем по приоритету:
1. Дизайн-система
2. Баг 2 (бюджет $93)
3. Баг 3 (таб План)
4. Баг 4 (Roadmap)
5. Баг 5 (Realtime везде)
6. Баг 6 (AI HQ карточка)
7. Часть 3 (бюджет редактирование)
8. Часть 4 (прогресс-трекинг)
9. Часть 5 (/office + /activity)
10. Часть 6 (/files)
11. Часть 7 (кастомные таблицы)
12. Часть 8 (хардкоды-зачистка)

## Деплой

После каждого блока:
1. git add . && git commit -m "осмысленное сообщение"
2. git push origin main
3. Vercel деплоит автоматически
4. Проверка прода: https://ai-hq-wine.vercel.app
