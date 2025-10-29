create table if not exists public.mt5_risk_adjustments (
  id uuid primary key default gen_random_uuid(),
  ticket text not null,
  account_login text,
  symbol text,
  desired_stop_loss numeric,
  desired_take_profit numeric,
  trailing_stop_distance numeric,
  status text not null default 'pending',
  status_message text,
  notes text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mt5_risk_adjustments_status
  on public.mt5_risk_adjustments (status, account_login);

create trigger set_updated_at before update on public.mt5_risk_adjustments
  for each row execute function public.set_updated_at();
