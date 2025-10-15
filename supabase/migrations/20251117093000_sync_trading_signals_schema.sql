-- Align the signals table with manual authoring metadata while preserving the
-- automated TradingView → MT5 bridge columns.

alter table public.signals
  add column if not exists author_id uuid references public.users (id) on delete set null,
  add column if not exists asset text generated always as (symbol) stored,
  add column if not exists confidence numeric(5,2) check (confidence >= 0 and confidence <= 100),
  add column if not exists price numeric(18,6),
  add column if not exists stops jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists notes text;

update public.signals
set metadata = '{}'::jsonb
where metadata is null;
