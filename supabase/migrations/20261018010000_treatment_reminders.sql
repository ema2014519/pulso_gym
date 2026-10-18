create table if not exists public.treatment_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  phase_index smallint not null default 0 check (phase_index >= 0),
  exercise_index smallint not null check (exercise_index >= 0),
  exercise_name text not null,
  dose text not null default '',
  occurrence smallint not null check (occurrence >= 0),
  weekdays smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  time_local time not null,
  timezone text not null,
  enabled boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id, phase_index, exercise_index, occurrence),
  check (cardinality(weekdays) > 0 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[])
);

create index if not exists treatment_reminders_due_idx on public.treatment_reminders (enabled, plan_id);
alter table public.treatment_reminders enable row level security;

create policy "treatment reminders are private"
  on public.treatment_reminders for all
  using (auth.uid() = user_id and exists (select 1 from public.weekly_plans plan where plan.id = plan_id and plan.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.weekly_plans plan where plan.id = plan_id and plan.user_id = auth.uid()));

grant select, insert, update, delete on public.treatment_reminders to authenticated;
