create table if not exists public.mt5_account_heartbeats (
  id uuid primary key default gen_random_uuid(),
  account_login text not null,
  status text not null default 'alive',
  balance numeric,
  equity numeric,
  free_margin numeric,
  raw_payload jsonb not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mt5_account_heartbeats_account_time
  on public.mt5_account_heartbeats (account_login, received_at desc);

create trigger set_updated_at before update on public.mt5_account_heartbeats
  for each row execute function public.set_updated_at();
