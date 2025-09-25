-- Adds dynamic pricing metadata to subscription plans and promotions.

begin;

alter table public.subscription_plans
  add column if not exists dynamic_price_usdt numeric(12,2),
  add column if not exists pricing_formula text,
  add column if not exists last_priced_at timestamptz,
  add column if not exists performance_snapshot jsonb;

create index if not exists idx_subscription_plans_last_priced
  on public.subscription_plans (last_priced_at desc nulls last);

alter table public.promotions
  add column if not exists auto_created boolean not null default false,
  add column if not exists generated_via text,
  add column if not exists performance_snapshot jsonb;

commit;
