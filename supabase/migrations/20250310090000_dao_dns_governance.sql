-- DAO DNS governance schema for dynamiccapital.ton

create table if not exists public.dao_members (
  wallet text primary key,
  voting_power numeric(18,6) not null default 1,
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  display_name text,
  last_seen_at timestamptz
);

create index if not exists dao_members_active_idx
  on public.dao_members (active desc, joined_at desc);

comment on table public.dao_members is 'Addresses authorised to participate in Dynamic Capital DAO governance. Voting power gates DNS proposals.';
comment on column public.dao_members.wallet is 'TON wallet address or multisig identifier recognised by the DAO.';
comment on column public.dao_members.voting_power is 'Relative voting power granted to the member (1 == single standard vote).';

create table if not exists public.dns_proposals (
  id uuid primary key default gen_random_uuid(),
  domain text not null default 'dynamiccapital.ton',
  proposer text not null,
  proposed_record jsonb not null,
  votes_for numeric(18,6) not null default 0,
  votes_against numeric(18,6) not null default 0,
  quorum numeric(5,2) not null default 60,
  executed boolean not null default false,
  executed_at timestamptz,
  onchain_tx text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain, created_at)
);

create index if not exists dns_proposals_domain_idx
  on public.dns_proposals (domain, created_at desc);

comment on table public.dns_proposals is 'DAO-curated DNS payloads awaiting voting, execution, and verification.';
comment on column public.dns_proposals.proposed_record is 'JSON payload describing the DNS TXT record set authored by the proposer.';
comment on column public.dns_proposals.quorum is 'Quorum percentage (0-100) required for execution at the time of proposal creation.';

create table if not exists public.dns_proposal_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.dns_proposals(id) on delete cascade,
  voter text not null,
  support boolean not null,
  weight numeric(18,6) not null,
  cast_at timestamptz not null default now(),
  unique (proposal_id, voter)
);

create index if not exists dns_proposal_votes_proposal_idx
  on public.dns_proposal_votes (proposal_id, cast_at desc);

comment on table public.dns_proposal_votes is 'Vote ledger for DNS governance, storing voting weight snapshots to ensure auditable tallies.';
comment on column public.dns_proposal_votes.weight is 'Voting weight applied at time of vote (copied from dao_members).';

alter table public.dao_members enable row level security;
alter table public.dns_proposals enable row level security;
alter table public.dns_proposal_votes enable row level security;

create policy if not exists "Service role manages dao_members" on public.dao_members
  for all to service_role using (true) with check (true);

create policy if not exists "Service role manages dns_proposals" on public.dns_proposals
  for all to service_role using (true) with check (true);

create policy if not exists "Service role manages dns_proposal_votes" on public.dns_proposal_votes
  for all to service_role using (true) with check (true);

create policy if not exists "DAO viewers can read dns governance" on public.dns_proposals
  for select to authenticated using (true);

create policy if not exists "DAO viewers can read votes" on public.dns_proposal_votes
  for select to authenticated using (true);

create policy if not exists "DAO viewers can read member roster" on public.dao_members
  for select to authenticated using (active);
