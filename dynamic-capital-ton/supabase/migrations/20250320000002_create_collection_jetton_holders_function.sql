-- Create a helper to fetch accounts that hold a collection NFT and a specific jetton.
create or replace function public.get_collection_jetton_holders(
  collection_address text,
  jetton_address text
)
returns table(human_readable text)
language sql
stable
security definer
set search_path = public, blockchain, getmethods
as $$
  with collection_target as (
    select id
    from blockchain.accounts
    where human_readable = collection_address
    limit 1
  ),
  jetton_target as (
    select id
    from blockchain.accounts
    where human_readable = jetton_address
    limit 1
  ),
  owner_matches as (
    select distinct nft.owner_account_id
    from getmethods.get_nft_data nft
    join getmethods.get_wallet_data jetton
      on jetton.owner_account_id = nft.owner_account_id
    join collection_target
      on nft.collection_account_id = collection_target.id
    join jetton_target
      on jetton.jetton_account_id = jetton_target.id
  )
  select accounts.human_readable
  from blockchain.accounts accounts
  join owner_matches matches
    on matches.owner_account_id = accounts.id;
$$;
