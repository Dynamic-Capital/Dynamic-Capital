-- Persist DynamicTonEngine execution plans

create table if not exists public.ton_execution_plans (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  payload jsonb not null,
  plan jsonb not null,
  ton_price_source text,
  ton_price_usd numeric(18,8),
  has_high_priority_actions boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ton_execution_plans_generated_idx
  on public.ton_execution_plans (generated_at desc);

alter table public.ton_execution_plans enable row level security;

create policy if not exists "Service role manages ton_execution_plans" on public.ton_execution_plans
  for all to service_role using (true) with check (true);

comment on table public.ton_execution_plans is 'Serialized execution plans produced by the TON operations engine.';
