-- Dynamic Capital Token (DCT) core schema
-- Creates dedicated tables for subscriptions, staking, and emissions tracking.

create extension if not exists pgcrypto;

create table if not exists public.dct_users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  wallet_address text not null unique,
  ton_domain text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dct_users_wallet_chk check (length(wallet_address) > 0)
);

create table if not exists public.dct_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dct_users(id) on delete cascade,
  plan text not null,
  ton_paid numeric(30,9) not null,
  operations_ton numeric(30,9) not null,
  auto_invest_ton numeric(30,9) not null,
  burn_ton numeric(30,9) not null,
  dct_bought numeric(30,9) not null,
  dct_auto_invest numeric(30,9) not null,
  dct_burned numeric(30,9) not null,
  tx_hash text not null,
  router_swap_id text,
  burn_tx_hash text,
  split_operations_pct smallint not null,
  split_auto_invest_pct smallint not null,
  split_burn_pct smallint not null,
  next_renewal_at timestamptz,
  notes jsonb,
  created_at timestamptz not null default now(),
  constraint dct_subscriptions_tx_hash_unique unique (tx_hash),
  constraint dct_subscriptions_split_bounds check (
    split_operations_pct between 0 and 100
    and split_auto_invest_pct between 0 and 100
    and split_burn_pct between 0 and 100
    and split_operations_pct + split_auto_invest_pct + split_burn_pct = 100
  )
);

create index if not exists dct_subscriptions_user_id_idx
  on public.dct_subscriptions (user_id, created_at desc);

create type public.dct_stake_status as enum ('active', 'unlocking', 'released', 'cancelled');

create table if not exists public.dct_stakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.dct_users(id) on delete cascade,
  subscription_id uuid references public.dct_subscriptions(id) on delete set null,
  dct_amount numeric(30,9) not null,
  multiplier numeric(10,4) not null default 1.0,
  weight numeric(30,9) not null,
  lock_months smallint,
  lock_until timestamptz,
  early_exit_penalty_bps smallint not null default 0,
  status public.dct_stake_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz,
  notes jsonb,
  constraint dct_stakes_positive_amount check (dct_amount > 0),
  constraint dct_stakes_positive_weight check (weight > 0)
);

create index if not exists dct_stakes_user_status_idx
  on public.dct_stakes (user_id, status, lock_until);

create table if not exists public.dct_emissions (
  epoch integer primary key,
  total_reward numeric(30,9) not null,
  decay_rate numeric(12,9),
  distributed_at timestamptz,
  notes jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dct_emission_events (
  id uuid primary key default gen_random_uuid(),
  epoch integer not null references public.dct_emissions(epoch) on delete cascade,
  stake_id uuid references public.dct_stakes(id) on delete set null,
  user_id uuid references public.dct_users(id) on delete set null,
  reward_amount numeric(30,9) not null,
  snapshot_weight numeric(30,9) not null,
  created_at timestamptz not null default now()
);

create index if not exists dct_emission_events_user_idx
  on public.dct_emission_events (user_id, epoch);

-- Trigger helpers to keep updated_at current
create or replace function public.dct_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dct_users_touch_updated_at
before update on public.dct_users
for each row execute procedure public.dct_touch_updated_at();

create trigger dct_stakes_touch_updated_at
before update on public.dct_stakes
for each row execute procedure public.dct_touch_updated_at();
