create table if not exists jetton_minter_runs (
  id uuid default gen_random_uuid() primary key,
  network text not null default 'testnet' check (network in ('mainnet', 'testnet')),
  status text not null default 'pending',
  initiator text,
  note text,
  tx_hash text,
  target_supply numeric,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  constraint jetton_minter_runs_network_key unique (network)
);

create index if not exists jetton_minter_runs_status_idx
  on jetton_minter_runs(status, network);
