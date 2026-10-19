-- Run this in the Supabase SQL editor after creating a project.
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  goal text not null,
  experience_level text not null,
  days_per_week smallint not null check (days_per_week between 2 and 5),
  home_equipment text[] not null default '{}',
  age smallint,
  biological_sex text,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  activity_level text,
  session_minutes smallint,
  injuries text,
  medical_conditions text,
  medications text,
  allergies text,
  dietary_preference text,
  sleep_hours numeric(3,1),
  stress_level smallint,
  accepted_safety_notice_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mi plan',
  status text not null default 'active' check (status in ('active', 'archived')),
  goal text not null,
  experience_level text not null,
  rationale text not null,
  safety_note text not null,
  assessment_snapshot jsonb not null default '{}'::jsonb,
  nutrition_targets jsonb,
  methodology jsonb,
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
  dose_completed text,
  load_kg numeric(6,2),
  effort smallint check (effort between 1 and 10),
  pain smallint check (pain between 0 and 10),
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_reminders (
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

create table public.treatment_reminders (
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

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null,
  exercise_name text not null,
  biological_sex text not null check (biological_sex in ('femenino', 'masculino')),
  prompt_version text not null default 'exercise-demo-v1',
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  sheet_path text,
  start_path text,
  end_path text,
  alt_text text not null default '',
  cues jsonb not null default '[]'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  attempts smallint not null default 0,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name, biological_sex, prompt_version)
);

alter table public.profiles enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.planned_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.workout_reminders enable row level security;
alter table public.treatment_reminders enable row level security;
alter table public.exercise_media enable row level security;

create policy "profiles are private" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "plans are private" on public.weekly_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions belong to user plan" on public.planned_sessions for all using (exists (select 1 from public.weekly_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "exercises belong to user plan" on public.session_exercises for all using (exists (select 1 from public.planned_sessions s join public.weekly_plans p on p.id = s.plan_id where s.id = session_id and p.user_id = auth.uid()));
create policy "logs belong to user plan" on public.exercise_logs for all using (exists (select 1 from public.session_exercises e join public.planned_sessions s on s.id = e.session_id join public.weekly_plans p on p.id = s.plan_id where e.id = session_exercise_id and p.user_id = auth.uid()));
create policy "push subscriptions are private" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout reminders are private" on public.workout_reminders for all using (auth.uid() = user_id and exists (select 1 from public.planned_sessions s join public.weekly_plans p on p.id = s.plan_id where s.id = session_id and s.plan_id = plan_id and p.user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.planned_sessions s join public.weekly_plans p on p.id = s.plan_id where s.id = session_id and s.plan_id = plan_id and p.user_id = auth.uid()));
create policy "treatment reminders are private" on public.treatment_reminders for all using (auth.uid() = user_id and exists (select 1 from public.weekly_plans p where p.id = plan_id and p.user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.weekly_plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "ready exercise media is readable" on public.exercise_media for select using (status = 'ready');

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.workout_reminders to authenticated;
grant select, insert, update, delete on public.treatment_reminders to authenticated;
grant select on public.exercise_media to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 6291456, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "generated exercise media is publicly readable" on storage.objects for select using (bucket_id = 'exercise-media');

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

  insert into public.weekly_plans (user_id, name, goal, experience_level, rationale, safety_note, assessment_snapshot, nutrition_targets, methodology)
  values (
    auth.uid(),
    coalesce(nullif(plan_payload->>'name', ''), 'Mi plan'),
    plan_payload->>'goal',
    plan_payload->>'level',
    plan_payload->>'rationale',
    plan_payload->>'safetyNote',
    coalesce(plan_payload->'assessment', '{}'::jsonb),
    plan_payload->'nutrition',
    plan_payload->'methodology'
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
