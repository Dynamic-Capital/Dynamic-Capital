-- Create tables for School of Pipsology curriculum
create table if not exists public.school_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  sequence integer not null,
  estimated_minutes integer,
  start_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.school_courses is 'Top-level School of Pipsology modules that group lessons and define curriculum order.';
comment on column public.school_courses.slug is 'URL-friendly identifier used for routing and linking.';
comment on column public.school_courses.summary is 'Short description displayed in course lists and previews.';
comment on column public.school_courses.sequence is 'Ordering index for the curriculum progression.';
comment on column public.school_courses.estimated_minutes is 'Approximate duration to complete the course content.';
comment on column public.school_courses.start_url is 'Canonical external URL where the course lessons begin.';

create index if not exists school_courses_sequence_idx on public.school_courses using btree (sequence);

create table if not exists public.school_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.school_courses(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  sequence integer not null,
  content_url text,
  estimated_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_lessons_course_slug_key unique (course_id, slug)
);

comment on table public.school_lessons is 'Individual lessons that belong to a School of Pipsology course.';
comment on column public.school_lessons.slug is 'URL-friendly identifier for the lesson.';
comment on column public.school_lessons.sequence is 'Ordering index of the lesson within its course.';
comment on column public.school_lessons.content_url is 'External URL that hosts the lesson content.';

create index if not exists school_lessons_course_sequence_idx on public.school_lessons using btree (course_id, sequence);

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.school_courses(id) on delete cascade,
  lesson_id uuid not null references public.school_lessons(id) on delete cascade,
  status text not null default 'completed',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_progress_user_lesson_key unique (user_id, lesson_id)
);

comment on table public.course_progress is 'Tracks which School of Pipsology lessons a user has completed.';
comment on column public.course_progress.status is 'State of the lesson for the user (completed, in-progress, etc.).';

create index if not exists course_progress_user_course_idx on public.course_progress using btree (user_id, course_id);

-- Row Level Security and policies
alter table public.school_courses enable row level security;
alter table public.school_courses force row level security;

create policy if not exists school_courses_service_manage on public.school_courses
  for all
  to service_role
  using (true)
  with check (true);

create policy if not exists school_courses_authenticated_read on public.school_courses
  for select
  to authenticated
  using (true);

create policy if not exists school_courses_anon_read on public.school_courses
  for select
  to anon
  using (true);

alter table public.school_lessons enable row level security;
alter table public.school_lessons force row level security;

create policy if not exists school_lessons_service_manage on public.school_lessons
  for all
  to service_role
  using (true)
  with check (true);

create policy if not exists school_lessons_authenticated_read on public.school_lessons
  for select
  to authenticated
  using (true);

create policy if not exists school_lessons_anon_read on public.school_lessons
  for select
  to anon
  using (true);

alter table public.course_progress enable row level security;
alter table public.course_progress force row level security;

create policy if not exists course_progress_service_manage on public.course_progress
  for all
  to service_role
  using (true)
  with check (true);

create policy if not exists course_progress_select_own on public.course_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists course_progress_insert_own on public.course_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists course_progress_update_own on public.course_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists course_progress_delete_own on public.course_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Update triggers
create or replace function public.set_school_courses_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists school_courses_set_updated_at on public.school_courses;
create trigger school_courses_set_updated_at
before update on public.school_courses
for each row execute function public.set_school_courses_updated_at();

create or replace function public.set_school_lessons_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists school_lessons_set_updated_at on public.school_lessons;
create trigger school_lessons_set_updated_at
before update on public.school_lessons
for each row execute function public.set_school_lessons_updated_at();

create or replace function public.set_course_progress_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists course_progress_set_updated_at on public.course_progress;
create trigger course_progress_set_updated_at
before update on public.course_progress
for each row execute function public.set_course_progress_updated_at();
