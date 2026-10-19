create table if not exists public.exercise_media (
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

alter table public.exercise_media enable row level security;

drop policy if exists "ready exercise media is readable" on public.exercise_media;
create policy "ready exercise media is readable"
  on public.exercise_media for select
  using (status = 'ready');

grant select on public.exercise_media to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 6291456, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "generated exercise media is publicly readable" on storage.objects;
create policy "generated exercise media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'exercise-media');

