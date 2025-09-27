create table if not exists public.onchain_balances (
    id bigserial primary key,
    chain_id text not null,
    address text not null,
    token_address text,
    token_symbol text not null,
    token_decimals integer not null default 0,
    balance numeric(30, 12) not null,
    usd_value numeric(30, 12),
    observed_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists onchain_balances_chain_idx on public.onchain_balances (chain_id);
create index if not exists onchain_balances_address_idx on public.onchain_balances (address);
create unique index if not exists onchain_balances_unique on public.onchain_balances (chain_id, address, token_address, observed_at);

create table if not exists public.onchain_activity (
    id bigserial primary key,
    chain_id text not null,
    address text not null,
    tx_hash text not null,
    direction text not null,
    counterparty text,
    token_symbol text,
    amount numeric(30, 12) not null,
    status text not null default 'confirmed',
    block_number text,
    block_timestamp timestamptz,
    fee numeric(30, 12),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create unique index if not exists onchain_activity_unique on public.onchain_activity (chain_id, tx_hash, address);
create index if not exists onchain_activity_chain_idx on public.onchain_activity (chain_id);

create table if not exists public.onchain_metrics (
    id bigserial primary key,
    provider text not null,
    metric text not null,
    value numeric(30, 12) not null,
    unit text,
    observed_at timestamptz not null default now(),
    tags jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create unique index if not exists onchain_metrics_unique on public.onchain_metrics (provider, metric, observed_at);
