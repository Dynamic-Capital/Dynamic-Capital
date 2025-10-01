-- CRM drip automation primitives and reply tracking support.

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  sequence_key text not null default 'default',
  status text not null default 'active',
  current_step integer not null default 0,
  max_steps integer not null default 3,
  cadence_hours integer not null default 24,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint crm_leads_email_unique unique (email)
);

alter table if exists public.crm_leads
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists sequence_key text default 'default',
  add column if not exists status text default 'active',
  add column if not exists current_step integer default 0,
  add column if not exists max_steps integer default 3,
  add column if not exists cadence_hours integer default 24,
  add column if not exists last_sent_at timestamptz,
  add column if not exists next_send_at timestamptz,
  add column if not exists replied_at timestamptz,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table if exists public.crm_leads
  alter column sequence_key set default 'default',
  alter column status set default 'active',
  alter column current_step set default 0,
  alter column max_steps set default 3,
  alter column cadence_hours set default 24,
  alter column metadata set default '{}'::jsonb;

create index if not exists crm_leads_status_next_idx
  on public.crm_leads (status, next_send_at);

create unique index if not exists crm_leads_email_lower_idx
  on public.crm_leads (lower(email));

create index if not exists crm_leads_sequence_idx
  on public.crm_leads (sequence_key, current_step);

create index if not exists crm_leads_replied_at_idx
  on public.crm_leads (replied_at);

create or replace function public.set_crm_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_crm_leads_updated_at on public.crm_leads;
create trigger set_crm_leads_updated_at
before update on public.crm_leads
for each row execute function public.set_crm_leads_updated_at();

create table if not exists public.crm_drip_templates (
  id uuid primary key default gen_random_uuid(),
  sequence_key text not null,
  step integer not null,
  subject text not null,
  body text not null,
  delay_hours integer not null default 24,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_drip_templates_unique unique (sequence_key, step)
);

create index if not exists crm_drip_templates_sequence_idx
  on public.crm_drip_templates (sequence_key, step);

create or replace function public.set_crm_drip_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_crm_drip_templates_updated_at on public.crm_drip_templates;
create trigger set_crm_drip_templates_updated_at
before update on public.crm_drip_templates
for each row execute function public.set_crm_drip_templates_updated_at();

insert into public.crm_drip_templates (sequence_key, step, subject, body, delay_hours)
values
  (
    'default',
    1,
    'Welcome to Dynamic Capital',
    'Salaam {{first_name}},\n\nThanks for connecting with Dynamic Capital. Our desk bridges signals, execution, and prayerful discipline so you can focus on the trades that matter. Reply to this email if you would like a tailored walkthrough.',
    24
  ),
  (
    'default',
    2,
    'How the desk keeps your playbook on track',
    'Hi {{first_name}},\n\nOur analysts publish a daily macro brief and send execution-ready alerts directly to Telegram. Would you like me to shortlist the top three plays for your strategy? Reply with your preferred asset class and we will prepare it.',
    48
  ),
  (
    'default',
    3,
    'Ready for a quick desk call?',
    'Salaam {{first_name}},\n\nWe keep a few 15-minute desk calls each day for serious traders. If you''d like to see the VIP workflow or discuss account funding, reply with a good time and we will lock it in.',
    72
  )
on conflict (sequence_key, step) do nothing;
