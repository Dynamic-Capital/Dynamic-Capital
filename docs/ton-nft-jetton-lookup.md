# TON NFT and Jetton Cross-Ownership Query

## Purpose

Use this query when you need to identify TON accounts that simultaneously hold
an NFT from a specific collection and a balance of a particular jetton. It
cross-references the `getmethods.get_nft_data` and `getmethods.get_wallet_data`
materialized views and returns the human-readable wallet addresses.

## SQL Reference

```sql
SELECT a.human_readable
FROM blockchain.accounts AS a
JOIN (
  SELECT DISTINCT nft.owner_account_id
  FROM getmethods.get_nft_data AS nft
  JOIN getmethods.get_wallet_data AS jetton
    ON jetton.owner_account_id = nft.owner_account_id
  WHERE nft.collection_account_id = (
    SELECT id
    FROM blockchain.accounts
    WHERE human_readable = 'EQDvRFMYLdxmvY3Tk-cfWMLqDnXF_EclO2Fp4wwj33WhlNFT'
  )
    AND jetton.jetton_account_id = (
      SELECT id
      FROM blockchain.accounts
      WHERE human_readable = 'EQCcLAW537KnRg_aSPrnQJoyYjOZkzqYp6FVmRUvN1crSazV'
    )
) AS t ON a.id = t.owner_account_id;
```

## How It Works

1. Filter `getmethods.get_nft_data` to the NFT collection of interest by
   matching its `collection_account_id` to the human-readable address of the
   collection contract.
2. Filter `getmethods.get_wallet_data` to the jetton master contract you want to
   track via `jetton_account_id`.
3. Intersect the owners of those two assets to capture wallets that hold both
   the NFT and the jetton.
4. Join the resulting owner IDs back to `blockchain.accounts` to surface the
   human-readable TON addresses for downstream reporting.

## Customization Tips

- Replace the collection address in the first subquery with the NFT collection
  you want to analyze.
- Swap the jetton address in the second subquery to match the jetton master
  contract you care about.
- Extend the outer `SELECT` with additional account metadata (for example,
  `last_transaction_lt`) if you need operational context.
- Add `ORDER BY` or `LIMIT` clauses to control result ordering or pagination
  when exporting to dashboards.
