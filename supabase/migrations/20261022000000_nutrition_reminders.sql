create table if not exists public.nutrition_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  meal_index smallint not null check (meal_index between 0 and 2),
  meal_name text not null,
  meal_summary text not null default '',
  time_local time not null,
  timezone text not null,
  enabled boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id, weekday, meal_index)
);

create index if not exists nutrition_reminders_due_idx on public.nutrition_reminders (enabled, plan_id, weekday);
alter table public.nutrition_reminders enable row level security;

create policy "nutrition reminders are private"
  on public.nutrition_reminders for all
  using (auth.uid() = user_id and exists (select 1 from public.weekly_plans plan where plan.id = plan_id and plan.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.weekly_plans plan where plan.id = plan_id and plan.user_id = auth.uid()));

grant select, insert, update, delete on public.nutrition_reminders to authenticated;
