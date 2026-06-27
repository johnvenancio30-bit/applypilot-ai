create extension if not exists pgcrypto;

create table if not exists public.application_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  score integer not null check (score >= 0 and score <= 100),
  status text not null check (status in ('Draft', 'Ready', 'Applied', 'Follow Up')),
  analysis jsonb not null default '{}'::jsonb,
  approved_bullets jsonb not null default '[]'::jsonb,
  cover_letter_opening text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.application_records enable row level security;

drop policy if exists "Users can read own applications" on public.application_records;
create policy "Users can read own applications"
  on public.application_records
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own applications" on public.application_records;
create policy "Users can insert own applications"
  on public.application_records
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own applications" on public.application_records;
create policy "Users can update own applications"
  on public.application_records
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own applications" on public.application_records;
create policy "Users can delete own applications"
  on public.application_records
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_application_records_updated_at on public.application_records;
create trigger set_application_records_updated_at
  before update on public.application_records
  for each row
  execute function public.set_updated_at();

create index if not exists application_records_user_updated_idx
  on public.application_records (user_id, updated_at desc);
