-- MT5 trade heartbeat log for external terminals
create table if not exists public.mt5_trade_logs (
  id uuid primary key default gen_random_uuid(),
  mt5_ticket_id bigint not null,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  volume numeric(14, 2),
  open_price numeric(18, 8),
  profit numeric(18, 2),
  account_login text,
  opened_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mt5_ticket_id)
);

alter table public.mt5_trade_logs enable row level security;
alter table public.mt5_trade_logs replica identity full;

create index if not exists idx_mt5_trade_logs_symbol_time
  on public.mt5_trade_logs(symbol, received_at desc);

create trigger trg_mt5_trade_logs_updated
  before update on public.mt5_trade_logs
  for each row
  execute function public.update_updated_at_column();

create policy mt5_trade_logs_service_read
  on public.mt5_trade_logs
  for select
  using (auth.role() = 'service_role');

create policy mt5_trade_logs_service_write
  on public.mt5_trade_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
