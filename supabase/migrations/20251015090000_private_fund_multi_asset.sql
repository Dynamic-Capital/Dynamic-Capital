-- TON allocator integration & multi-asset accounting

create table if not exists public.ton_pool_events (
  id uuid primary key default gen_random_uuid(),
  deposit_id text not null,
  investor_key text not null,
  ton_tx_hash text not null,
  usdt_amount numeric(18,2) not null check (usdt_amount > 0),
  dct_amount numeric(30,9) not null check (dct_amount > 0),
  fx_rate numeric(18,8) not null check (fx_rate > 0),
  valuation_usdt numeric(18,2) not null check (valuation_usdt > 0),
  proof_payload jsonb not null,
  event_payload jsonb not null,
  observed_at timestamptz not null default now(),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz
);

create unique index if not exists ton_pool_events_ton_tx_hash_unique on public.ton_pool_events (ton_tx_hash);
create unique index if not exists ton_pool_events_deposit_unique on public.ton_pool_events (deposit_id);
create index if not exists ton_pool_events_verified_idx on public.ton_pool_events (verified_at desc);

alter table public.investor_deposits
  add column if not exists dct_amount numeric(30,9),
  add column if not exists entry_fx_rate numeric(18,8) not null default 1,
  add column if not exists valuation_usdt numeric(18,2) not null default 0,
  add column if not exists ton_event_id uuid,
  add column if not exists ton_tx_hash text;

alter table public.investor_withdrawals
  add column if not exists ton_tx_hash text;

alter table public.investor_deposits
  add constraint investor_deposits_ton_event_fkey foreign key (ton_event_id) references public.ton_pool_events(id) on delete set null;

create unique index if not exists investor_deposits_ton_tx_hash_unique on public.investor_deposits (ton_tx_hash) where ton_tx_hash is not null;

update public.investor_deposits
set valuation_usdt = case when valuation_usdt = 0 then amount_usdt else valuation_usdt end,
    entry_fx_rate = 1
where valuation_usdt = 0;

create table if not exists public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  price_usd numeric(18,8) not null check (price_usd > 0),
  quote_currency text not null default 'USDT',
  signature text not null,
  signed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists price_snapshots_symbol_signed_idx on public.price_snapshots (symbol, signed_at desc);

alter table public.ton_pool_events enable row level security;
alter table public.price_snapshots enable row level security;

create policy if not exists "Service role manages ton_pool_events" on public.ton_pool_events
  for all to service_role using (true) with check (true);

create policy if not exists "Service role manages price_snapshots" on public.price_snapshots
  for all to service_role using (true) with check (true);

create policy if not exists "Authenticated view ton_pool_events" on public.ton_pool_events
  for select to authenticated using (true);

create policy if not exists "Authenticated view price_snapshots" on public.price_snapshots
  for select to authenticated using (true);

create or replace function public.notify_ton_pool_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_notify('ton_pool_events', coalesce(p_event_id::text, ''));
end;
$$;

comment on table public.ton_pool_events is 'Normalized TON allocator deposit events with proof metadata.';
comment on table public.price_snapshots is 'Oracle-provided DCT price marks for USD valuation.';
