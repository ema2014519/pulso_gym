alter table public.weekly_plans
  add column if not exists methodology jsonb;

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
