-- AI HQ Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (CEO users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  initials text,
  role text default 'ceo',
  created_at timestamptz default now()
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('crypto', 'telegram', 'shopify', 'viral', 'other')),
  description text,
  status text default 'active' check (status in ('active', 'paused', 'done', 'archived')),
  progress int default 0 check (progress >= 0 and progress <= 100),
  repo_url text,
  prod_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id uuid references projects(id) on delete set null,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages (Chat history)
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender text not null check (sender in ('claude', 'minimax', 'chatgpt', 'ceo')),
  sender_name text not null,
  content text not null,
  delegated_to text check (delegated_to in ('minimax', 'chatgpt', null)),
  user_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Chat sessions
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- API Usage tracking
create table api_usage (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  model text,
  tokens_used int default 0,
  cost_usd decimal(10, 4) default 0,
  user_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Row Level Security (RLS) policies

-- Enable RLS
alter table profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table messages enable row level security;
alter table chat_sessions enable row level security;
alter table api_usage enable row level security;

-- Profiles: Users can only see/edit their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Projects: All authenticated users can see all projects
create policy "Authenticated users can view all projects" on projects
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert projects" on projects
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update projects" on projects
  for update using (auth.role() = 'authenticated');

-- Tasks: Users see tasks they created or are assigned to
create policy "Users can view tasks" on tasks
  for select using (auth.role() = 'authenticated');

create policy "Users can insert tasks" on tasks
  for insert with check (auth.role() = 'authenticated');

create policy "Users can update tasks" on tasks
  for update using (auth.role() = 'authenticated');

--Messages: Users see their own messages
create policy "Users can view messages" on messages
  for select using (auth.role() = 'authenticated');

create policy "Users can insert messages" on messages
  for insert with check (auth.role() = 'authenticated');

-- Trigger to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, initials, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    upper(substring(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) from 1 for 2)),
    'ceo'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute procedure update_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute procedure update_updated_at();

create trigger chat_sessions_updated_at
  before update on chat_sessions
  for each row execute procedure update_updated_at();

-- Indexes for better performance
create index idx_projects_status on projects(status);
create index idx_projects_category on projects(category);
create index idx_tasks_status on tasks(status);
create index idx_tasks_project_id on tasks(project_id);
create index idx_messages_created_at on messages(created_at);
create index idx_messages_user_id on messages(user_id);
create index idx_api_usage_created_at on api_usage(created_at);
