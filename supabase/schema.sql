-- Run this in the Supabase SQL editor after creating a project.
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  goal text not null,
  experience_level text not null,
  days_per_week smallint not null check (days_per_week between 2 and 5),
  home_equipment text[] not null default '{}',
  accepted_safety_notice_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  experience_level text not null,
  rationale text not null,
  safety_note text not null,
  starts_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  day_name text not null,
  context text not null check (context in ('gimnasio', 'casa')),
  focus text not null,
  duration_minutes smallint not null,
  position smallint not null,
  completed_at timestamptz
);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.planned_sessions(id) on delete cascade,
  name text not null,
  home_alternative text not null,
  sets smallint not null,
  repetitions text not null,
  rest_seconds smallint not null,
  position smallint not null
);

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises(id) on delete cascade,
  set_number smallint not null,
  repetitions smallint,
  load_kg numeric(6,2),
  effort smallint check (effort between 1 and 10),
  pain smallint check (pain between 0 and 10),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.planned_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_logs enable row level security;

create policy "profiles are private" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "plans are private" on public.weekly_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions belong to user plan" on public.planned_sessions for all using (exists (select 1 from public.weekly_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "exercises belong to user plan" on public.session_exercises for all using (exists (select 1 from public.planned_sessions s join public.weekly_plans p on p.id = s.plan_id where s.id = session_id and p.user_id = auth.uid()));
create policy "logs belong to user plan" on public.exercise_logs for all using (exists (select 1 from public.session_exercises e join public.planned_sessions s on s.id = e.session_id join public.weekly_plans p on p.id = s.plan_id where e.id = session_exercise_id and p.user_id = auth.uid()));

-- A profile is created at sign-up so every authenticated user has a private
-- starting record. The onboarding flow replaces these defaults with its answers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, goal, experience_level, days_per_week)
  values (new.id, 'mejorar_salud', 'principiante', 3)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Persists a generated weekly plan, its sessions and exercises as one transaction.
create or replace function public.save_weekly_plan(plan_payload jsonb)
returns uuid
language plpgsql
security invoker set search_path = ''
as $$
declare
  new_plan_id uuid;
  new_session_id uuid;
  session_payload jsonb;
  exercise_payload jsonb;
  session_position integer;
  exercise_position integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.weekly_plans (user_id, goal, experience_level, rationale, safety_note)
  values (
    auth.uid(),
    plan_payload->>'goal',
    plan_payload->>'level',
    plan_payload->>'rationale',
    plan_payload->>'safetyNote'
  )
  returning id into new_plan_id;

  for session_payload, session_position in
    select value, ordinality::integer
    from jsonb_array_elements(plan_payload->'sessions') with ordinality
  loop
    insert into public.planned_sessions (plan_id, day_name, context, focus, duration_minutes, position)
    values (
      new_plan_id,
      session_payload->>'day',
      session_payload->>'context',
      session_payload->>'focus',
      (session_payload->>'durationMinutes')::smallint,
      session_position
    )
    returning id into new_session_id;

    for exercise_payload, exercise_position in
      select value, ordinality::integer
      from jsonb_array_elements(session_payload->'exercises') with ordinality
    loop
      insert into public.session_exercises (session_id, name, home_alternative, sets, repetitions, rest_seconds, position)
      values (
        new_session_id,
        exercise_payload->>'name',
        exercise_payload->>'alternativeAtHome',
        (exercise_payload->>'sets')::smallint,
        exercise_payload->>'repetitions',
        (exercise_payload->>'restSeconds')::smallint,
        exercise_position
      );
    end loop;
  end loop;

  return new_plan_id;
end;
$$;
