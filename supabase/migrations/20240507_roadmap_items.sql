-- Migration: roadmap_items
-- Вехи проектов с CRUD и realtime

create table if not exists roadmap_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  title       text not null,
  description text,
  status      text default 'planned' check (status in ('planned', 'in_progress', 'done')),
  target_date date,
  order_index int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_roadmap_items_project_id on roadmap_items(project_id);
create index if not exists idx_roadmap_items_status on roadmap_items(status);
create index if not exists idx_roadmap_items_order on roadmap_items(order_index);

alter table roadmap_items enable row level security;

create policy "Authenticated users can select roadmap_items" on roadmap_items
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert roadmap_items" on roadmap_items
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update roadmap_items" on roadmap_items
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete roadmap_items" on roadmap_items
  for delete using (auth.role() = 'authenticated');

create trigger roadmap_items_updated_at
  before update on roadmap_items
  for each row execute procedure update_updated_at();
