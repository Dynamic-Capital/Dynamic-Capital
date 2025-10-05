# DEX Listings & Tonstarter Launchpad Status

## Snapshot

- **Last updated:** 2025-05-13 (synchronized with newest treasury sign-off and
  Tonstarter correspondence).
- **Scope:** Summarizes on-chain liquidity venues, Tonstarter launchpad
  milestones, and the launch-day execution plan for the Dynamic Capital Token
  (DCT).

## DEX Listings

| Venue & Pair           | Status                                                                                                                             | Evidence                                                                                   | Next Steps                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| STON.fi — DCT/TON pool | Live pool seeded with 12,000,000 DCT against 1,200,000 TON; treasury controls 78% of LP share.                                     | `_static/ton/dct-jetton/README.md` transcript captured 2025-05-10.                         | Execute launch-day health check (depth, spreads), publish screenshot in transparency room, continue weekly SOP reviews.                        |
| DeDust — DCT/USDT pool | Vault signed off; seeding window scheduled for launch day 14:00 UTC with 2,000,000 DCT at $0.10 bootstrap price (treasury 2-of-3). | `docs/tonstarter/liquidity-sop.md` launch plan + 2025-05-13 multisig dry-run log snapshot. | Initiate swap/LP add transaction at 13:55 UTC, confirm TX hash on Tonviewer, rebalance toward target 60/40 TON/USDT exposure before 16:00 UTC. |

## Launch-Day Execution Plan

| Time (UTC) | Action                                                                                                   | Owner                     | Dependencies                                                  | Deliverable                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 12:00      | Publish "Go for launch" notice in #treasury-ops with links to this briefing.                             | Launch Coordinator        | Final sign-off from treasury multisig and Tonstarter liaison. | Internal launch bulletin posted.                                                            |
| 12:30      | Final STON.fi pool verification: depth snapshot, swap test (1000 TON notional), fee accrual check.       | Market Ops                | Access to treasury signer wallet and DexScreener.             | Metrics logged in transparency sheet row 2025-05-13.                                        |
| 13:00      | Tonstarter update email confirming liquidity go-live window and transparency cadence.                    | Launch Coordinator        | Draft template in `docs/tonstarter/transparency-cadence.md`.  | Email sent; copy archived in `_static/ton/tonstarter/communications/2025-05-13.md`.         |
| 13:30      | Treasury warm-up call; confirm signer readiness and hardware wallets.                                    | Treasury Ops Lead         | Calendar invite + signer check-in responses.                  | Attendance noted in launch bulletin; fallback signer assigned if needed.                    |
| 13:55      | Initiate DeDust seeding transactions (add liquidity, set routing weights).                               | Treasury Signers (2-of-3) | Multisig session established; dry run validated.              | Tonviewer TX hash + screenshot archived.                                                    |
| 14:10      | Broadcast public announcement thread (Twitter, Telegram) with swap links.                                | Comms Lead                | Confirmed TX hash references from 13:55 task.                 | Cross-posted announcement links in marketing tracker.                                       |
| 15:00      | Post-launch monitoring: price impact check (<2% on 50k TON equivalent), arbitrage routes, TON gas log.   | Market Ops + Risk Analyst | Live DexScreener alerts; updated SOP.                         | Monitoring log appended to `docs/tonstarter/transparency-cadence.md`.                       |
| 16:00      | Tonstarter diligence sync note summarizing execution evidence and next 72h plan.                         | Launch Coordinator        | Inputs from Market Ops and Risk Analyst.                      | Note stored under `docs/tonstarter/launch-notes/2025-05-13.md`.                             |
| 18:00      | Treasury reconciliation: confirm LP token custody, update treasury dashboard balances, sign-off summary. | Treasury Ops Lead         | Access to multisig, accounting sheet template.                | Reconciliation worksheet filed under `dynamic_liquidity/treasury-balances/2025-05-13.xlsx`. |

## Tonstarter Launchpad Milestones

| Milestone                          | Status                                                                          | Evidence                                                                       | Follow-up                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Launch readiness checklist items   | Completed; all checklist rows marked "Verified" with no outstanding follow-ups. | `docs/tonstarter-launch-readiness.md` action table.                            | Reconfirm checklist at 11:30 UTC and sign in launch bulletin.                |
| Liquidity & transparency runbooks  | Finalized; liquidity SOP and transparency cadence published for audit review.   | `docs/tonstarter/liquidity-sop.md`, `docs/tonstarter/transparency-cadence.md`. | Execute cadence starting 2025-05-13 15:00 UTC with monitoring log updates.   |
| Tonstarter builder form submission | Submitted 2025-05-10 with confirmation ID `TONSTARTER-DF-2025-0510-DC`.         | `docs/tonstarter/builder-form-submission.md` log.                              | Send 2025-05-13 liquidity launch confirmation email and request review call. |

## Observations & Risks

1. **Pool monitoring automation:** Weekly reviews remain manual; DexScreener
   webhook automation stays a post-launch priority once day-one telemetry is
   captured.
2. **Liquidity diversification:** DeDust seeding hinges on signers being online
   at 13:55 UTC; contingency signer and backup hardware wallet are staged to
   prevent delays.
3. **Diligence cadence:** Transparency calendar began 2025-05-12; archive all
   launch artifacts (screenshots, TX hashes, monitoring logs) under the
   `_static/ton/` tree for Tonstarter audit traceability.
4. **Comms alignment:** Marketing copy references must match the final bootstrap
   price; comms lead to verify against the 13:55 execution recap before
   publishing.
