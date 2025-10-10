-- Seed canonical TON mainnet configuration for the DCT subscription pipeline.
-- This migration creates a durable configuration table and records the
-- production addresses used by the Supabase edge functions when validating
-- payments and routing splits.

create table if not exists public.dct_app_config (
  id smallint primary key default 1,
  operations_wallet text not null,
  ton_intake_wallet text,
  dct_jetton_master text not null,
  dex_router text not null,
  ton_indexer_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dct_app_config_operations_wallet_chk
    check (char_length(operations_wallet) > 0),
  constraint dct_app_config_dct_master_chk
    check (char_length(dct_jetton_master) > 0),
  constraint dct_app_config_dex_router_chk
    check (char_length(dex_router) > 0)
);

create or replace function public.dct_app_config_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dct_app_config_set_updated_at on public.dct_app_config;
create trigger dct_app_config_set_updated_at
before update on public.dct_app_config
for each row execute procedure public.dct_app_config_touch_updated_at();

insert into public.dct_app_config as config (
  id,
  operations_wallet,
  ton_intake_wallet,
  dct_jetton_master,
  dex_router,
  ton_indexer_url
)
values (
  1,
  'UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G',
  -- Intake wallet defaults to the operations treasury multisig; update if a
  -- dedicated intake wallet is provisioned.
  'UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G',
  'UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G',
  'EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt',
  null
)
on conflict (id) do update
set
  operations_wallet = excluded.operations_wallet,
  ton_intake_wallet = excluded.ton_intake_wallet,
  dct_jetton_master = excluded.dct_jetton_master,
  dex_router = excluded.dex_router,
  ton_indexer_url = excluded.ton_indexer_url,
  updated_at = now();
