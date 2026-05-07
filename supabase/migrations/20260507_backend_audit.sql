-- ============================================================================
-- Backend Audit Fix — 2026-05-07
-- Цель: гарантировать, что activity_log/file_links/tasks/profiles работают:
--   1) есть таблицы и нужные колонки
--   2) RLS включён и разрешает CRUD аутентифицированным юзерам
--   3) таблицы добавлены в publication supabase_realtime
-- Все блоки идемпотентны — можно прогонять повторно.
-- Запускать в Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) ACTIVITY_LOG
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  action_type text not null,
  description text not null,
  project_id  uuid references projects(id) on delete set null,
  entity_type text,
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on activity_log(created_at desc);
create index if not exists idx_activity_log_project_id on activity_log(project_id);
create index if not exists idx_activity_log_user_id    on activity_log(user_id);

alter table activity_log enable row level security;

drop policy if exists "activity_log select" on activity_log;
create policy "activity_log select" on activity_log
  for select using (auth.role() = 'authenticated');

drop policy if exists "activity_log insert" on activity_log;
create policy "activity_log insert" on activity_log
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "activity_log delete own" on activity_log;
create policy "activity_log delete own" on activity_log
  for delete using (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 2) FILE_LINKS
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists file_links (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  url        text not null,
  icon_type  text,
  project_id uuid references projects(id) on delete set null,
  tags       text[] default '{}',
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_file_links_project_id on file_links(project_id);
create index if not exists idx_file_links_created_at on file_links(created_at desc);

alter table file_links enable row level security;

drop policy if exists "file_links select" on file_links;
create policy "file_links select" on file_links
  for select using (auth.role() = 'authenticated');

drop policy if exists "file_links insert" on file_links;
create policy "file_links insert" on file_links
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "file_links update" on file_links;
create policy "file_links update" on file_links
  for update using (auth.role() = 'authenticated');

drop policy if exists "file_links delete" on file_links;
create policy "file_links delete" on file_links
  for delete using (auth.role() = 'authenticated');

-- updated_at trigger (используем существующую update_updated_at)
drop trigger if exists file_links_updated_at on file_links;
create trigger file_links_updated_at
  before update on file_links
  for each row execute procedure update_updated_at();


-- ────────────────────────────────────────────────────────────────────────────
-- 3) PROFILES — разрешить SELECT всем авторизованным (нужно для /team, joins)
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Authenticated users can view profiles" on profiles;
create policy "Authenticated users can view profiles" on profiles
  for select using (auth.role() = 'authenticated');

-- last_seen — добавим если ещё не было (на случай если миграция не применялась)
alter table profiles add column if not exists last_seen timestamptz;


-- ────────────────────────────────────────────────────────────────────────────
-- 4) TASKS — добавить DELETE-политику (в schema.sql её нет)
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "Users can delete tasks" on tasks;
create policy "Users can delete tasks" on tasks
  for delete using (auth.role() = 'authenticated');


-- ────────────────────────────────────────────────────────────────────────────
-- 5) REALTIME PUBLICATION
-- Без этого postgres_changes не доставляет события на клиент.
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'projects',
    'tasks',
    'activity_log',
    'file_links',
    'roadmap_items',
    'project_steps',
    'project_phases',
    'project_checklist',
    'project_kpis',
    'project_risks',
    'project_budget',
    'project_forecast',
    'project_files',
    'subscriptions',
    'custom_tables',
    'custom_columns',
    'custom_rows',
    'messages'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      -- Удаляем если уже есть (alter publication drop не падает при отсутствии)
      execute format('alter publication supabase_realtime drop table if exists public.%I', t);
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 6) ДИАГНОСТИКА — выполни, чтобы проверить состояние
-- ────────────────────────────────────────────────────────────────────────────
-- a) Какие таблицы в publication realtime?
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename;

-- b) RLS включён?
-- select relname, relrowsecurity from pg_class
--   where relname in ('activity_log','file_links','tasks','profiles','projects');

-- c) Сколько записей в activity_log за последние сутки:
-- select count(*) from activity_log where created_at > now() - interval '1 day';

-- d) Последние 10 событий:
-- select created_at, action_type, description, user_id from activity_log
--   order by created_at desc limit 10;
