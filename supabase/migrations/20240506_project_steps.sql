-- Migration: project_steps
-- Пошаговые инструкции для проектов (более детальные, чем phases/checklist)

create table if not exists project_steps (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  order_index    int not null default 0,
  title          text not null,
  description_md text,
  estimated_time text,
  completed      boolean not null default false,
  completed_at   timestamptz,
  completed_by   uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_project_steps_project_id_order
  on project_steps(project_id, order_index);

alter table project_steps enable row level security;

create policy "users can read all steps"
  on project_steps for select using (true);

create policy "users can insert steps"
  on project_steps for insert with check (auth.role() = 'authenticated');

create policy "users can update steps"
  on project_steps for update using (auth.role() = 'authenticated');

create policy "users can delete steps"
  on project_steps for delete using (auth.role() = 'authenticated');

-- Trigger: при завершении шага пишем в activity_log
create or replace function log_step_completion()
returns trigger as $$
begin
  if NEW.completed = true and (OLD.completed = false or OLD.completed is null) then
    insert into activity_log (
      user_id,
      action_type,
      description,
      project_id,
      entity_type,
      entity_id,
      metadata
    ) values (
      auth.uid(),
      'step_completed',
      'Выполнил шаг: ' || NEW.title,
      NEW.project_id,
      'project_step',
      NEW.id::text,
      jsonb_build_object('step_title', NEW.title, 'order_index', NEW.order_index)
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace trigger on_step_completed
  after update on project_steps
  for each row execute function log_step_completion();

-- Also fix projects status check to include in_progress
alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('active', 'in_progress', 'paused', 'done', 'archived'));

-- Add agents column if not exists (used by the app)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'projects' and column_name = 'agents'
  ) then
    alter table projects add column agents text[] default '{}';
  end if;
end $$;
