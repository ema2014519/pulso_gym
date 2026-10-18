alter table public.profiles
  add column if not exists age smallint,
  add column if not exists biological_sex text,
  add column if not exists height_cm numeric(5,2),
  add column if not exists weight_kg numeric(5,2),
  add column if not exists activity_level text,
  add column if not exists session_minutes smallint,
  add column if not exists injuries text,
  add column if not exists medical_conditions text,
  add column if not exists medications text,
  add column if not exists allergies text,
  add column if not exists dietary_preference text,
  add column if not exists sleep_hours numeric(3,1),
  add column if not exists stress_level smallint;

alter table public.weekly_plans
  add column if not exists name text not null default 'Mi plan',
  add column if not exists status text not null default 'active',
  add column if not exists assessment_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists nutrition_targets jsonb;

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
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  insert into public.weekly_plans (user_id, name, goal, experience_level, rationale, safety_note, assessment_snapshot, nutrition_targets)
  values (auth.uid(), coalesce(nullif(plan_payload->>'name', ''), 'Mi plan'), plan_payload->>'goal', plan_payload->>'level', plan_payload->>'rationale', plan_payload->>'safetyNote', coalesce(plan_payload->'assessment', '{}'::jsonb), plan_payload->'nutrition')
  returning id into new_plan_id;

  for session_payload, session_position in select value, ordinality::integer from jsonb_array_elements(plan_payload->'sessions') with ordinality loop
    insert into public.planned_sessions (plan_id, day_name, context, focus, duration_minutes, position)
    values (new_plan_id, session_payload->>'day', session_payload->>'context', session_payload->>'focus', (session_payload->>'durationMinutes')::smallint, session_position)
    returning id into new_session_id;

    for exercise_payload, exercise_position in select value, ordinality::integer from jsonb_array_elements(session_payload->'exercises') with ordinality loop
      insert into public.session_exercises (session_id, name, home_alternative, sets, repetitions, rest_seconds, position)
      values (new_session_id, exercise_payload->>'name', exercise_payload->>'alternativeAtHome', (exercise_payload->>'sets')::smallint, exercise_payload->>'repetitions', (exercise_payload->>'restSeconds')::smallint, exercise_position);
    end loop;
  end loop;
  return new_plan_id;
end;
$$;
