alter table public.leads
  add column if not exists sequence_step integer default 1;

alter table public.leads
  alter column sequence_step set not null;

alter table public.leads
  add column if not exists next_send_at timestamptz default now();

update public.leads
set sequence_step = coalesce(sequence_step, 1)
where sequence_step is null;

update public.leads
set next_send_at = now()
where next_send_at is null;

alter table public.templates
  add column if not exists step integer default 1;

alter table public.templates
  alter column step set not null;
