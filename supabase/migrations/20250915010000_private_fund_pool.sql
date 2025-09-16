-- Private Fund Pool schema

-- Enums for cycle and transaction state
create type public.fund_cycle_status as enum ('active', 'pending_settlement', 'settled');
create type public.investor_withdrawal_status as enum ('pending', 'approved', 'denied', 'fulfilled');
create type public.private_pool_deposit_type as enum ('external', 'reinvestment', 'carryover', 'adjustment');

-- Investors mapped to profiles (auth users)
create table public.investors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

-- Monthly fund cycle metadata
create table public.fund_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_month smallint not null check (cycle_month between 1 and 12),
  cycle_year integer not null check (cycle_year >= 2020),
  status public.fund_cycle_status not null default 'active',
  profit_total_usdt numeric(18,2) not null default 0,
  investor_payout_usdt numeric(18,2) not null default 0,
  reinvested_total_usdt numeric(18,2) not null default 0,
  performance_fee_usdt numeric(18,2) not null default 0,
  payout_summary jsonb not null default '[]'::jsonb,
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_year, cycle_month)
);

-- Deposit ledger per investor and cycle
create table public.investor_deposits (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  cycle_id uuid not null references public.fund_cycles(id) on delete cascade,
  amount_usdt numeric(18,2) not null check (amount_usdt > 0),
  tx_hash text,
  deposit_type public.private_pool_deposit_type not null default 'external',
  notes text,
  created_at timestamptz not null default now()
);

create unique index investor_deposits_tx_hash_unique on public.investor_deposits (tx_hash) where tx_hash is not null;
create index investor_deposits_investor_idx on public.investor_deposits (investor_id);
create index investor_deposits_cycle_idx on public.investor_deposits (cycle_id);

-- Withdrawal requests and settlements
create table public.investor_withdrawals (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  cycle_id uuid not null references public.fund_cycles(id) on delete cascade,
  amount_usdt numeric(18,2) not null check (amount_usdt > 0),
  net_amount_usdt numeric(18,2),
  reinvested_amount_usdt numeric(18,2),
  status public.investor_withdrawal_status not null default 'pending',
  requested_at timestamptz not null default now(),
  notice_expires_at timestamptz not null default (now() + interval '7 days'),
  fulfilled_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investor_withdrawals_investor_idx on public.investor_withdrawals (investor_id);
create index investor_withdrawals_cycle_idx on public.investor_withdrawals (cycle_id);
create index investor_withdrawals_status_idx on public.investor_withdrawals (status);

-- Share tracking per cycle
create table public.investor_shares (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  cycle_id uuid not null references public.fund_cycles(id) on delete cascade,
  share_percentage numeric(10,6) not null default 0,
  contribution_usdt numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_id, cycle_id)
);

create index investor_shares_cycle_idx on public.investor_shares (cycle_id);
create index investor_shares_investor_idx on public.investor_shares (investor_id);

-- Enable RLS
alter table public.investors enable row level security;
alter table public.fund_cycles enable row level security;
alter table public.investor_deposits enable row level security;
alter table public.investor_withdrawals enable row level security;
alter table public.investor_shares enable row level security;

-- Helper to check admin role
create or replace function public.is_profile_admin(profile_id uuid)
returns boolean
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.role = 'admin'
  );
$$;

-- Investors policies
create policy "Investors view own record" on public.investors
for select to authenticated
using (profile_id = auth.uid());

create policy "Admins manage investors" on public.investors
for all to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

create policy "Service role manages investors" on public.investors
for all to service_role
using (true)
with check (true);

-- Fund cycles policies
create policy "Authenticated view fund cycles" on public.fund_cycles
for select to authenticated
using (true);

create policy "Admins manage fund cycles" on public.fund_cycles
for all to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

create policy "Service role manages fund cycles" on public.fund_cycles
for all to service_role
using (true)
with check (true);

-- Investor deposit policies
create policy "Investors view own deposits" on public.investor_deposits
for select to authenticated
using (
  investor_id in (
    select inv.id from public.investors inv where inv.profile_id = auth.uid()
  )
);

create policy "Admins view deposits" on public.investor_deposits
for select to authenticated
using (public.is_profile_admin(auth.uid()));

create policy "Service role manages deposits" on public.investor_deposits
for all to service_role
using (true)
with check (true);

-- Investor withdrawal policies
create policy "Investors view own withdrawals" on public.investor_withdrawals
for select to authenticated
using (
  investor_id in (
    select inv.id from public.investors inv where inv.profile_id = auth.uid()
  )
);

create policy "Admins manage withdrawals" on public.investor_withdrawals
for all to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

create policy "Service role manages withdrawals" on public.investor_withdrawals
for all to service_role
using (true)
with check (true);

-- Investor share policies
create policy "Investors view own shares" on public.investor_shares
for select to authenticated
using (
  investor_id in (
    select inv.id from public.investors inv where inv.profile_id = auth.uid()
  )
);

create policy "Admins view shares" on public.investor_shares
for select to authenticated
using (public.is_profile_admin(auth.uid()));

create policy "Service role manages shares" on public.investor_shares
for all to service_role
using (true)
with check (true);

-- Seed an active cycle if none exists
insert into public.fund_cycles (cycle_month, cycle_year)
select extract(month from now())::int, extract(year from now())::int
where not exists (
  select 1 from public.fund_cycles where status = 'active'
);
