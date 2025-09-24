-- Feature flags + plugin registry + payment gateway event log

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.features enable row level security;

create index if not exists idx_features_enabled on public.features(enabled);

create trigger trg_features_updated
  before update on public.features
  for each row
  execute function public.update_updated_at_column();

create policy features_service_role_read
  on public.features
  for select
  using (auth.role() = 'service_role');

create policy features_service_role_write
  on public.features
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.plugins (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  type text not null,
  version text not null,
  description text,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plugins enable row level security;

create index if not exists idx_plugins_enabled on public.plugins(enabled);
create index if not exists idx_plugins_type on public.plugins(type);

create trigger trg_plugins_updated
  before update on public.plugins
  for each row
  execute function public.update_updated_at_column();

create policy plugins_service_role_read
  on public.plugins
  for select
  using (auth.role() = 'service_role');

create policy plugins_service_role_write
  on public.plugins
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.payment_gateway_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  reference text,
  status text not null default 'received' check (status in ('received','ignored','processing','processed','failed')),
  payload jsonb not null,
  headers jsonb not null default '{}'::jsonb,
  signature text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (gateway, reference)
);

alter table public.payment_gateway_events enable row level security;

create index if not exists idx_payment_gateway_events_status
  on public.payment_gateway_events(status, created_at desc);

create trigger trg_payment_gateway_events_updated
  before update on public.payment_gateway_events
  for each row
  execute function public.update_updated_at_column();

create policy payment_gateway_events_service_read
  on public.payment_gateway_events
  for select
  using (auth.role() = 'service_role');

create policy payment_gateway_events_service_write
  on public.payment_gateway_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
