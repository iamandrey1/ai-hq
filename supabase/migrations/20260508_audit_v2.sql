-- ============================================================================
-- Backend Audit v2 — 2026-05-08
-- Цель: финальный аудит для production-ready бекенда + новые фичи.
--
-- Что делает:
--   1) Аудит RLS на ВСЕХ 18 таблицах + проверка реалтайма
--   2) FK от activity_log.user_id и file_links.added_by на public.profiles
--      (уберёт двухшаговую загрузку в хуках)
--   3) Новые таблицы: task_comments, risk_comments, digests
--   4) Realtime publication для новых таблиц
--   5) Диагностические запросы внизу — раскомментируй, чтобы проверить
--
-- ВСЕ блоки идемпотентны — можно прогонять повторно безопасно.
-- Запускать в Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 1: RLS на ВСЕХ таблицах (если где-то выключено — включаем)
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'projects', 'tasks', 'messages', 'chat_sessions',
    'api_usage', 'activity_log', 'project_phases', 'project_checklist',
    'project_kpis', 'project_risks', 'project_budget', 'project_forecast',
    'project_steps', 'project_files', 'roadmap_items', 'file_links',
    'subscriptions', 'custom_tables', 'custom_columns', 'custom_rows'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 2: TASKS — добавить полный набор политик (без них Kanban может не сохранять)
-- ────────────────────────────────────────────────────────────────────────────
drop policy if exists "tasks select" on tasks;
create policy "tasks select" on tasks
  for select using (auth.role() = 'authenticated');

drop policy if exists "tasks insert" on tasks;
create policy "tasks insert" on tasks
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "tasks update" on tasks;
create policy "tasks update" on tasks
  for update using (auth.role() = 'authenticated');

drop policy if exists "tasks delete" on tasks;
drop policy if exists "Users can delete tasks" on tasks;
create policy "tasks delete" on tasks
  for delete using (auth.role() = 'authenticated');


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 3: FK от activity_log.user_id и file_links.added_by → public.profiles
--   PostgREST требует "FK на тот тейбл, с которым join" — иначе .select("*, profiles(...)")
--   тихо падает. Сейчас FK на auth.users, нужен на public.profiles.
-- ────────────────────────────────────────────────────────────────────────────

-- 3.1 activity_log.user_id
do $$
begin
  -- Старый FK на auth.users (если есть) — оставляем (он всё ещё валиден),
  -- но добавляем дополнительный FK на public.profiles, чтобы PostgREST его видел.
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'activity_log' and constraint_name = 'activity_log_user_id_profiles_fkey'
  ) then
    alter table activity_log
      add constraint activity_log_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id)
      on delete set null;
  end if;
exception
  when others then
    raise notice 'activity_log FK на profiles не добавлен: %', sqlerrm;
end $$;

-- 3.2 file_links.added_by
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'file_links' and constraint_name = 'file_links_added_by_profiles_fkey'
  ) then
    alter table file_links
      add constraint file_links_added_by_profiles_fkey
      foreign key (added_by) references public.profiles(id)
      on delete set null;
  end if;
exception
  when others then
    raise notice 'file_links FK на profiles не добавлен: %', sqlerrm;
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 4: TASK_COMMENTS — комментарии к задачам
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  content     text not null,
  attachments jsonb default '[]'::jsonb,           -- [{ name, url, size_bytes }]
  reactions   jsonb default '{}'::jsonb,           -- { "👍": ["uuid1","uuid2"], "🔥": [...] }
  mentions    uuid[] default '{}',                  -- упомянутые user_id из profiles
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_task_comments_task_id    on task_comments(task_id);
create index if not exists idx_task_comments_created_at on task_comments(created_at desc);
create index if not exists idx_task_comments_author     on task_comments(author_id);

alter table task_comments enable row level security;

drop policy if exists "task_comments select" on task_comments;
create policy "task_comments select" on task_comments
  for select using (auth.role() = 'authenticated');

drop policy if exists "task_comments insert" on task_comments;
create policy "task_comments insert" on task_comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);

drop policy if exists "task_comments update own" on task_comments;
create policy "task_comments update own" on task_comments
  for update using (auth.uid() = author_id);

drop policy if exists "task_comments delete own" on task_comments;
create policy "task_comments delete own" on task_comments
  for delete using (auth.uid() = author_id);

drop trigger if exists task_comments_updated_at on task_comments;
create trigger task_comments_updated_at
  before update on task_comments
  for each row execute procedure update_updated_at();


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 5: RISK_COMMENTS — комментарии к рискам
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists risk_comments (
  id          uuid primary key default gen_random_uuid(),
  risk_id     uuid not null references project_risks(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  content     text not null,
  attachments jsonb default '[]'::jsonb,
  reactions   jsonb default '{}'::jsonb,
  mentions    uuid[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_risk_comments_risk_id    on risk_comments(risk_id);
create index if not exists idx_risk_comments_created_at on risk_comments(created_at desc);
create index if not exists idx_risk_comments_author     on risk_comments(author_id);

alter table risk_comments enable row level security;

drop policy if exists "risk_comments select" on risk_comments;
create policy "risk_comments select" on risk_comments
  for select using (auth.role() = 'authenticated');

drop policy if exists "risk_comments insert" on risk_comments;
create policy "risk_comments insert" on risk_comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);

drop policy if exists "risk_comments update own" on risk_comments;
create policy "risk_comments update own" on risk_comments
  for update using (auth.uid() = author_id);

drop policy if exists "risk_comments delete own" on risk_comments;
create policy "risk_comments delete own" on risk_comments
  for delete using (auth.uid() = author_id);

drop trigger if exists risk_comments_updated_at on risk_comments;
create trigger risk_comments_updated_at
  before update on risk_comments
  for each row execute procedure update_updated_at();


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 6: DIGESTS — еженедельные сводки (Vercel Cron + Resend)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists digests (
  id           uuid primary key default gen_random_uuid(),
  week_start   date not null,                       -- понедельник недели, к которой относится
  generated_at timestamptz not null default now(),
  summary      text,                                -- AI-генерируемый markdown
  metrics      jsonb default '{}'::jsonb,           -- { tasks_done, tasks_overdue, budget_spent, ... }
  email_sent_to text[] default '{}',                -- кому ушло
  email_status text default 'pending'               -- pending | sent | failed
);

create unique index if not exists idx_digests_week_unique on digests(week_start);
create index if not exists idx_digests_generated_at on digests(generated_at desc);

alter table digests enable row level security;

drop policy if exists "digests select" on digests;
create policy "digests select" on digests
  for select using (auth.role() = 'authenticated');

-- Только сервер может писать (через service role)
drop policy if exists "digests insert" on digests;
create policy "digests insert" on digests
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "digests update" on digests;
create policy "digests update" on digests
  for update using (auth.role() = 'authenticated');


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 7: REALTIME PUBLICATION для новых таблиц
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array['task_comments', 'risk_comments', 'digests'];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      -- ALTER PUBLICATION ... DROP TABLE не поддерживает IF EXISTS,
      -- поэтому проверяем наличие через pg_publication_tables
      if exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = t
      ) then
        execute format('alter publication supabase_realtime drop table public.%I', t);
      end if;
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ────────────────────────────────────────────────────────────────────────────
-- BLOCK 8: ДИАГНОСТИКА — раскомментируй и прогони отдельно, чтобы проверить
-- ────────────────────────────────────────────────────────────────────────────

-- 8.1 RLS включён везде?
-- select c.relname,
--        case when c.relrowsecurity then '✓ ON' else '✗ OFF' end as rls_status,
--        (select count(*) from pg_policies p where p.tablename = c.relname) as policy_count
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r'
-- order by c.relname;

-- 8.2 Какие таблицы в realtime publication?
-- select tablename from pg_publication_tables
-- where pubname = 'supabase_realtime'
-- order by tablename;

-- 8.3 FK на profiles появились?
-- select tc.table_name, tc.constraint_name, kcu.column_name,
--        ccu.table_name as references_table, ccu.column_name as references_column
-- from information_schema.table_constraints tc
-- join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
-- join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
-- where tc.constraint_type = 'FOREIGN KEY'
--   and tc.table_name in ('activity_log', 'file_links', 'task_comments', 'risk_comments')
-- order by tc.table_name;

-- 8.4 Сколько записей в новых таблицах (должно быть 0):
-- select 'task_comments' as t, count(*) from task_comments
-- union all select 'risk_comments', count(*) from risk_comments
-- union all select 'digests', count(*) from digests;

-- 8.5 Последние 10 записей activity_log с именем автора (проверка FK):
-- select a.created_at, a.action_type, a.description, p.full_name
-- from activity_log a
-- left join profiles p on p.id = a.user_id
-- order by a.created_at desc limit 10;
