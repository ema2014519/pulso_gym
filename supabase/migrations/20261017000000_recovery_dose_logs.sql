alter table public.exercise_logs
  add column if not exists dose_completed text;

comment on column public.exercise_logs.dose_completed is
  'Dosis realmente completada cuando el ejercicio usa tiempo, distancia o una pauta textual en lugar de repeticiones.';
