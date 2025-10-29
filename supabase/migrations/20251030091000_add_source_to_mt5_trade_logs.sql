alter table public.mt5_trade_logs
  add column if not exists source text not null default 'mt5';

create index if not exists idx_mt5_trade_logs_source
  on public.mt5_trade_logs (source);
