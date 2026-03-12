-- Run this in Supabase SQL Editor.

create table if not exists public.task_categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at bigint not null
);

create unique index if not exists task_categories_user_name_idx
  on public.task_categories(user_id, name);

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text not null default '',
  category_id text not null references public.task_categories(id) on delete restrict,
  scheduled_at timestamptz not null,
  repeatable boolean not null default false,
  done boolean not null default false,
  created_at bigint not null
);

create index if not exists tasks_user_created_at_idx
  on public.tasks(user_id, created_at desc);

create index if not exists tasks_user_scheduled_at_idx
  on public.tasks(user_id, scheduled_at asc);

alter table public.task_categories enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "task_categories_select_own" on public.task_categories;
drop policy if exists "task_categories_insert_own" on public.task_categories;
drop policy if exists "task_categories_update_own" on public.task_categories;
drop policy if exists "task_categories_delete_own" on public.task_categories;

create policy "task_categories_select_own"
  on public.task_categories for select
  using (auth.uid() = user_id);

create policy "task_categories_insert_own"
  on public.task_categories for insert
  with check (auth.uid() = user_id);

create policy "task_categories_update_own"
  on public.task_categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "task_categories_delete_own"
  on public.task_categories for delete
  using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);
