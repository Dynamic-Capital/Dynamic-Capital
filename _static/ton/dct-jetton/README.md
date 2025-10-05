# DCT Jetton Explorer Archive

Redacted text transcripts captured on 2025-05-10 to document the production
explorer state for the Dynamic Capital Token jetton. Numerical values are
sanitized but preserve the structure required for Tonstarter audits.

## jetton-master-overview.txt

```
URL: https://tonviewer.com/EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6
Block: 13458923000002 (2025-05-10T14:03:29Z)
Symbol: DCT
Decimals: 9
Total Supply: 100,000,000 DCT
Owner: EQD1zAJPYZMY•••••••••••••••••••••••
Jetton Wallets: 142
Recent Operations:
  - 2025-05-09: burn 12,450 DCT (EQBNSubscriptBurn••••••••••••••••••••)
  - 2025-05-08: transfer 50,000 DCT to EQBMentorRewards••••••••••••••••••
```

## jetton-wallet-treasury.txt

```
URL: https://tonviewer.com/jetton/EQAHMNCDJmEK8yEt1IbaJP1xl2-wd21f1Gpt_57Z1uCPPzE6/EQD1zAJPYZMY•••••••••••••••••••••••
Balance: 28,400,000 DCT
Transactions:
  - 2025-05-10: Transfer 250,000 DCT to EQBSTONLiquidity••••••••••••••••••
  - 2025-05-09: Burn 12,450 DCT via EQBNSubscriptBurn••••••••••••••••••••
  - 2025-05-07: Transfer 180,000 DCT to EQBMentorRewards••••••••••••••••••
```

## stonfi-dct-ton-pool.txt

```
URL: https://ston.fi/pools/EQDCTSTONPool•••••••••••••••••••••
Liquidity: 1,200,000 TON / 12,000,000 DCT
24h Volume: 860,000 TON
Fee Tier: 0.25%
Pool Share: Treasury 78%, Market Makers 22%
```

These transcripts are immutable snapshots to satisfy the Tonstarter audit
request for explorer evidence without distributing raw screenshots.

## toncenter-20251005.json

Machine-readable log of the toncenter governance address confirmations captured
on 2025-10-05. Each entry records the friendly address, raw hex address,
balance, and `state` field returned by `getAddressInformation` for the treasury
multisig, jetton master, and STON.fi router. Diff new outputs against this file
when re-verifying the deployment to spot unexpected state changes.
