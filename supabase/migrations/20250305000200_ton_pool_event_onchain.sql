-- Extend ton_pool_events with on-chain verification metadata

alter table public.ton_pool_events
  add column if not exists on_chain_investor text,
  add column if not exists on_chain_amount_ton numeric(30,9),
  add column if not exists on_chain_block_seqno bigint,
  add column if not exists on_chain_timestamp timestamptz,
  add column if not exists verification_error text;

comment on column public.ton_pool_events.on_chain_investor is 'Normalized investor address observed on-chain.';
comment on column public.ton_pool_events.on_chain_amount_ton is 'TON amount confirmed on-chain.';
comment on column public.ton_pool_events.on_chain_block_seqno is 'Block sequence number of the confirmed transaction.';
comment on column public.ton_pool_events.on_chain_timestamp is 'Timestamp of the confirmed on-chain transaction.';
comment on column public.ton_pool_events.verification_error is 'Latest verification error details when on-chain checks fail.';
