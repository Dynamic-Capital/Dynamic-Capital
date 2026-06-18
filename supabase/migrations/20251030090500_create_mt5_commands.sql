create table if not exists public.mt5_commands (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  account_login text,
  command_type text not null,
  symbol text not null,
  side text,
  volume numeric,
  price numeric,
  stop_loss numeric,
  take_profit numeric,
  trailing_stop numeric,
  ticket text,
  comment text,
  status text not null default 'queued',
  status_message text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mt5_commands_status_account
  on public.mt5_commands (status, account_login);

create index if not exists idx_mt5_commands_created_at
  on public.mt5_commands (created_at desc);

create trigger set_updated_at before update on public.mt5_commands
  for each row execute function public.set_updated_at();
