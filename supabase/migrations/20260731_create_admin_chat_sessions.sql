-- One lightweight, private active chat session for every approved dashboard account.
-- Run this file once in the Supabase SQL Editor before deploying the dashboard.

create table if not exists public.admin_chat_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_chat_sessions enable row level security;

drop policy if exists "Admins can read their own chat session" on public.admin_chat_sessions;
create policy "Admins can read their own chat session"
  on public.admin_chat_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can create their own chat session" on public.admin_chat_sessions;
create policy "Admins can create their own chat session"
  on public.admin_chat_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Admins can update their own chat session" on public.admin_chat_sessions;
create policy "Admins can update their own chat session"
  on public.admin_chat_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can delete their own chat session" on public.admin_chat_sessions;
create policy "Admins can delete their own chat session"
  on public.admin_chat_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_admin_chat_sessions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_chat_sessions_updated_at on public.admin_chat_sessions;
create trigger set_admin_chat_sessions_updated_at
  before update on public.admin_chat_sessions
  for each row
  execute function public.set_admin_chat_sessions_updated_at();
