# Tonstarter Launch Liquidity SOP

This standard operating procedure documents how Dynamic Capital seeds and
maintains liquidity for the DCT token across STON.fi and DeDust on launch week.

## Allocation Summary

- **STON.fi DCT/TON Pool**
  - Contribution: 3,000,000 DCT paired with TON at the $0.10 bootstrap price
    target.
  - Source of funds: Liquidity Provision bucket (60% allocation) with TON side
    purchased via treasury desk swaps.
  - Owners: Treasury Ops multisig signers listed in
    `dynamic-capital-ton/config.yaml`.
- **DeDust DCT/USDT Pool**
  - Contribution: 2,000,000 DCT paired with USDT at the $0.10 bootstrap price
    target.
  - Source of funds: Liquidity Provision bucket (40% allocation) with USDT drawn
    from hedging reserves.
  - Owners: Same multisig signers with mirrored execution policy.

## Execution Timeline

| Day    | Action                                                              | Owner                        | Notes                                                                                                                     |
| ------ | ------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| T-3    | Finalize pool parameters and publish addresses in investor channel. | Treasury Ops                 | Verify router + treasury addresses in [`docs/onchain/jetton-minter.md`](../onchain/jetton-minter.md).                     |
| T-1    | Seed STON.fi pool and confirm DexScreener listing.                  | Liquidity PM                 | Capture transcript in `_static/ton/dct-jetton/stonfi-dct-ton-pool.txt`.                                                   |
| T      | Seed DeDust pool immediately after TGE announcement.                | Treasury Ops                 | Publish TX hashes in daily transparency update.                                                                           |
| T+1    | Rebalance to maintain 60/40 TON/USDT exposure.                      | Liquidity PM                 | Follow Treasury hedging guardrails from [`docs/dynamic-capital-ton-whitepaper.md`](../dynamic-capital-ton-whitepaper.md). |
| Weekly | Review pool depth, volume, and LP rewards.                          | Treasury Ops + Market Making | Log findings in liquidity dashboard and share summary with community.                                                     |

## Risk Controls

1. **Slippage guard** – Maximum 0.75% slippage during pool seeding transactions;
   enforced via STON.fi CLI parameters and DeDust router configuration.
2. **Inventory buffers** – Maintain ≥15% of Liquidity Provision tokens in
   reserve for volatility spikes.
3. **Transparency cadence** – Publish pool balances and recent TX hashes in the
   Friday transparency report (see
   [`docs/tonstarter/transparency-cadence.md`](./transparency-cadence.md)).
4. **Incident response** – If liquidity depth falls below $500k aggregated,
   trigger the Dynamic Market Maker playbook in
   [`docs/dct-dynamic-market-maker.md`](../dct-dynamic-market-maker.md).

## Ownership & Access

- **Primary signers** – Treasury Lead, Liquidity PM, Compliance Officer.
- **Backup signers** – CTO and Head of Risk (read-only monitoring privileges
  with emergency execution rights).
- **Tooling** – Multisig transactions coordinated through Tonkeeper desktop;
  confirmations logged in the treasury ops Notion board.

The SOP meets Tonstarter’s requirement for a documented liquidity contribution
plan and is referenced by the launch readiness checklist.
