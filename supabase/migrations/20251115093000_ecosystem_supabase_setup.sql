-- Dynamic Capital ecosystem Supabase scaffolding
-- Creates user, payment verification, mentorship scoring, and signal broadcast primitives.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  wallet text not null,
  email text,
  role text not null default 'member',
  dct_balance numeric(24,8) not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_wallet_not_blank check (char_length(trim(wallet)) > 0)
);

alter table public.users
  add constraint users_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users (id)
  on delete set null;

create unique index if not exists users_wallet_unique
  on public.users ((lower(wallet)));

create unique index if not exists users_email_unique
  on public.users ((lower(email)))
  where email is not null;

drop trigger if exists set_updated_at on public.users;
create trigger set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.users force row level security;

create policy if not exists users_service_all on public.users
  for all
  to service_role
  using (true)
  with check (true);

create policy if not exists users_select_self on public.users
  for select
  to authenticated
  using (
    auth.uid() is not null and (
      auth.uid() = id or auth.uid() = auth_user_id
    )
  );

create policy if not exists users_insert_self on public.users
  for insert
  to authenticated
  with check (
    auth.uid() is not null and (
      auth.uid() = id or auth.uid() = auth_user_id
    )
  );

create policy if not exists users_update_self on public.users
  for update
  to authenticated
  using (
    auth.uid() is not null and (
      auth.uid() = id or auth.uid() = auth_user_id
    )
  )
  with check (
    auth.uid() is not null and (
      auth.uid() = id or auth.uid() = auth_user_id
    )
  );

alter table public.payments
  add column if not exists ecosystem_user_id uuid,
  add column if not exists wallet text,
  add column if not exists tx_hash text,
  add column if not exists amount_ton numeric(24,9),
  add column if not exists verified boolean not null default false,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_source text,
  add column if not exists verification_metadata jsonb;

alter table public.payments
  add constraint if not exists payments_ecosystem_user_id_fkey
  foreign key (ecosystem_user_id) references public.users (id)
  on delete set null;

create index if not exists payments_wallet_idx
  on public.payments ((lower(wallet)))
  where wallet is not null;

create unique index if not exists payments_tx_hash_unique
  on public.payments (tx_hash)
  where tx_hash is not null;

create table if not exists public.mentorship_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  score numeric(6,2) not null check (score >= 0 and score <= 100),
  source text not null default 'heuristic',
  rationale text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mentorship_scores_user_idx
  on public.mentorship_scores (user_id, created_at desc);

alter table public.mentorship_scores enable row level security;
alter table public.mentorship_scores force row level security;

create policy if not exists mentorship_scores_service_all on public.mentorship_scores
  for all
  to service_role
  using (true)
  with check (true);

create policy if not exists mentorship_scores_select_self on public.mentorship_scores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = mentorship_scores.user_id
        and (
          auth.uid() = u.id
          or auth.uid() = u.auth_user_id
        )
    )
  );

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.users (id) on delete set null,
  asset text not null,
  direction text not null,
  confidence numeric(5,2) not null check (confidence >= 0 and confidence <= 100),
  price numeric(18,6),
  stops jsonb,
  metadata jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists signals_created_idx
  on public.signals (created_at desc);

create index if not exists signals_asset_idx
  on public.signals ((upper(asset)));

alter table public.signals enable row level security;
alter table public.signals force row level security;

create policy if not exists signals_service_all on public.signals
  for all
  to service_role
  using (true)
  with check (true);

create policy if not exists signals_read_authenticated on public.signals
  for select
  to authenticated
  using (true);

create policy if not exists signals_insert_mentors on public.signals
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users u
      where u.id = coalesce(signals.author_id, auth.uid())
        and (
          u.role in ('mentor', 'admin', 'operator', 'strategist')
          or auth.uid() = u.auth_user_id
          or auth.uid() = u.id
        )
    )
  );
