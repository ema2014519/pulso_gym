create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  session_id uuid not null references public.planned_sessions(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  time_local time not null,
  timezone text not null,
  minutes_before smallint not null default 15 check (minutes_before between 0 and 180),
  enabled boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create index if not exists workout_reminders_due_idx
  on public.workout_reminders (enabled, weekday);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
alter table public.workout_reminders enable row level security;

create policy "push subscriptions are private"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout reminders are private"
  on public.workout_reminders for all
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.planned_sessions session
      join public.weekly_plans plan on plan.id = session.plan_id
      where session.id = session_id
        and session.plan_id = plan_id
        and plan.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.planned_sessions session
      join public.weekly_plans plan on plan.id = session.plan_id
      where session.id = session_id
        and session.plan_id = plan_id
        and plan.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.workout_reminders to authenticated;
