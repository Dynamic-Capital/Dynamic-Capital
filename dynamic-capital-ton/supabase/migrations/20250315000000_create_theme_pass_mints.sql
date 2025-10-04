create table if not exists theme_pass_mints (
  id uuid default gen_random_uuid() primary key,
  mint_index int not null,
  network text not null default 'testnet' check (network in ('mainnet', 'testnet')),
  name text not null,
  status text not null default 'pending',
  initiator text,
  note text,
  content_uri text,
  priority int,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  constraint theme_pass_mints_mint_network_key unique (mint_index, network)
);

create index if not exists theme_pass_mints_status_idx
  on theme_pass_mints(status, network);
