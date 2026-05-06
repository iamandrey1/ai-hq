# Отчёт по задачам

## Задача 1: Фикс онлайн-статуса на /team

**Проблема:** страница `/team` хардкодила бейдж "Online" для всех CEO вне зависимости от реального статуса.

**Решение:**
- Добавлено поле `last_seen timestamptz` в таблицу `profiles` (миграция `20240507_add_last_seen_to_profiles.sql`)
- Добавлен хелпер `isOnline(lastSeen?)` в `src/lib/utils.ts` — возвращает `true` если `last_seen < 5 минут назад`
- `src/types/index.ts` — добавлено поле `last_seen?: string | null` в интерфейс `Profile`
- `src/app/team/page.tsx` — бейдж теперь показывает Online/Offline на основе `isOnline(p.last_seen)`
- `src/components/Corridor.tsx` — статусная точка теперь использует ту же `isOnline(p.last_seen)` вместо Presence channel `onlineIds`; `useOnlinePresence()` сохранён для heartbeat (обновляет `last_seen` каждые 30 секунд)

**Единая логика:** и sidebar, и `/team` теперь используют `isOnline()` из `src/lib/utils.ts`.

**Миграция для запуска:**
```sql
-- supabase/migrations/20240507_add_last_seen_to_profiles.sql
alter table profiles add column if not exists last_seen timestamptz;
```

---

## Задача 2: Редактируемый Roadmap

**Что сделано:**
- Создана миграция `supabase/migrations/20240507_roadmap_items.sql` с таблицей, индексами, RLS-политиками и тригером `updated_at`
- Добавлен интерфейс `RoadmapItem` в `src/types/index.ts`
- Страница `/roadmap` расширена новой секцией «Вехи» с полным CRUD

**UI секции «Вехи»:**
- Вертикальный таймлайн с цветными точками по статусу
- Карточки: название, бейдж статуса, описание, дата, проект
- Фильтр по проекту (select dropdown)
- Кнопка «Добавить» → модалка (Radix Dialog)
- Hover на карточке → кнопки редактирования и удаления
- Удаление с подтверждением через `ConfirmDialog`
- Realtime подписка на `roadmap_items`
- Статусы: Запланировано (серый), В работе (`#4D9EBF`), Готово (зелёный)

**Миграция для запуска:**
```sql
-- supabase/migrations/20240507_roadmap_items.sql
-- (запустить полностью через SQL Editor)
```

---

## Файлы изменены

| Файл | Тип |
|------|-----|
| `supabase/migrations/20240507_add_last_seen_to_profiles.sql` | Новый |
| `supabase/migrations/20240507_roadmap_items.sql` | Новый |
| `src/types/index.ts` | Изменён |
| `src/lib/utils.ts` | Изменён |
| `src/app/team/page.tsx` | Изменён |
| `src/components/Corridor.tsx` | Изменён |
| `src/app/roadmap/page.tsx` | Переписан |
