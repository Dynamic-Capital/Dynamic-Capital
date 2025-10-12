-- Dynamic Capital Supabase schema
-- Users & wallets
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  telegram_id text unique not null,
  created_at timestamptz default now()
);

create table if not exists wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  address text unique not null,
  public_key text,
  created_at timestamptz default now()
);

alter table if not exists wallets
  add constraint wallets_user_id_key unique (user_id);

-- TON Connect sessions
create table if not exists ton_connect_sessions (
  id uuid default gen_random_uuid() primary key,
  telegram_id text not null,
  payload text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  wallet_address text,
  wallet_public_key text,
  wallet_app_name text,
  proof_signature text,
  proof_timestamp timestamptz,
  created_at timestamptz default now()
);

create index if not exists ton_connect_sessions_telegram_idx
  on ton_connect_sessions(telegram_id);

create index if not exists ton_connect_sessions_payload_idx
  on ton_connect_sessions(payload);

-- Subscriptions
create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete set null,
  plan text not null,
  ton_paid numeric not null,
  tx_hash text unique not null,
  dct_bought numeric default 0,
  dct_burned numeric default 0,
  ops_ton numeric default 0,
  status text default 'completed',
  created_at timestamptz default now()
);

-- Staking
create table if not exists stakes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  dct_amount numeric not null,
  lock_until timestamptz,
  weight numeric default 1.0,
  status text default 'active',
  created_at timestamptz default now()
);

-- Emissions
create table if not exists emissions (
  epoch int primary key,
  total_reward numeric not null,
  distributed_at timestamptz
);

-- Config
create table if not exists app_config (
  id int primary key default 1,
  operations_pct int not null default 60,
  autoinvest_pct int not null default 30,
  buyback_burn_pct int not null default 10,
  min_ops_pct int not null default 40,
  max_ops_pct int not null default 75,
  min_invest_pct int not null default 15,
  max_invest_pct int not null default 45,
  min_burn_pct int not null default 5,
  max_burn_pct int not null default 20,
  ops_treasury text not null,
  dct_master text not null,
  dex_router text not null
);

-- Transaction logs
create table if not exists tx_logs (
  id uuid default gen_random_uuid() primary key,
  kind text not null,
  ref_id uuid,
  amount numeric,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- Theme mint tracking
create table if not exists theme_pass_mints (
  id uuid default gen_random_uuid() primary key,
  mint_index int not null unique,
  name text not null,
  status text not null default 'pending',
  initiator text,
  note text,
  content_uri text,
  priority int,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now()
);

create index if not exists theme_pass_mints_status_idx
  on theme_pass_mints(status);

-- Seed default config
insert into app_config (id, operations_pct, autoinvest_pct, buyback_burn_pct,
                        min_ops_pct, max_ops_pct, min_invest_pct, max_invest_pct,
                        min_burn_pct, max_burn_pct, ops_treasury, dct_master, dex_router)
values (1, 60, 30, 10, 40, 75, 15, 45, 5, 20,
        -- Tonstarter mainnet addresses.
        'UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G',
        'EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y',
        'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt')
on conflict (id) do update set
  operations_pct = excluded.operations_pct,
  autoinvest_pct = excluded.autoinvest_pct,
  buyback_burn_pct = excluded.buyback_burn_pct,
  min_ops_pct = excluded.min_ops_pct,
  max_ops_pct = excluded.max_ops_pct,
  min_invest_pct = excluded.min_invest_pct,
  max_invest_pct = excluded.max_invest_pct,
  min_burn_pct = excluded.min_burn_pct,
  max_burn_pct = excluded.max_burn_pct,
  ops_treasury = excluded.ops_treasury,
  dct_master = excluded.dct_master,
  dex_router = excluded.dex_router;
