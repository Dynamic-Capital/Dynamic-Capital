# DEX Listings & Tonstarter Launchpad Status

## Snapshot

- **Last updated:** 2025-05-13 18:30 UTC (post-launch execution review).
- **Scope:** Summarizes on-chain liquidity venues, Tonstarter launchpad
  milestones, and the launch-day execution results for the Dynamic Capital Token
  (DCT).

## DEX Listings

| Venue & Pair           | Status                                                                                                                                     | Evidence                                                                                                             | Next Steps                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| STON.fi — DCT/TON pool | Live pool seeded with 12,000,000 DCT against 1,200,000 TON; launch-day health check logged 12:34 UTC (0.87% spread).                       | `_static/ton/dct-jetton/README.md` transcript captured 2025-05-10; transparency sheet row 2025-05-13 metrics export. | Automate DexScreener alert thresholds and append 24h post-launch observations to transparency cadence log.            |
| DeDust — DCT/USDT pool | Liquidity seeded 13:58 UTC with 2,000,000 DCT at $0.10 bootstrap price (treasury 2-of-3) and 40/60 TON/USDT rebalance finalized 15:42 UTC. | `docs/tonstarter/liquidity-sop.md` launch plan + Tonviewer TX `DCT-DEDUST-2025-0513-A1` noted in execution log.      | Monitor volume/price bands hourly for first 24h; prepare slipstream liquidity top-up scenario deck before 2025-05-15. |

## Launch-Day Execution Log

| Time (UTC) | Action                                                                                                   | Owner                     | Dependencies                                                  | Deliverable                                                                               | Status & Outcome                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 12:00      | Publish "Go for launch" notice in #treasury-ops with links to this briefing.                             | Launch Coordinator        | Final sign-off from treasury multisig and Tonstarter liaison. | Internal launch bulletin posted.                                                          | ✅ Posted 12:02 UTC; bulletin includes signer roster and Tonstarter CC list.                                 |
| 12:30      | Final STON.fi pool verification: depth snapshot, swap test (1000 TON notional), fee accrual check.       | Market Ops                | Access to treasury signer wallet and DexScreener.             | Metrics logged in transparency sheet row 2025-05-13.                                      | ✅ Completed 12:34 UTC; swap slippage 1.2%, fee accrual confirmed at 0.3% tier.                              |
| 13:00      | Tonstarter update email confirming liquidity go-live window and transparency cadence.                    | Launch Coordinator        | Draft template in `docs/tonstarter/transparency-cadence.md`.  | Email sent; copy archived in `_static/ton/tonstarter/communications/2025-05-13.md`.       | ✅ Sent 13:05 UTC; Tonstarter liaison acknowledged receipt at 13:12 UTC.                                     |
| 13:30      | Treasury warm-up call; confirm signer readiness and hardware wallets.                                    | Treasury Ops Lead         | Calendar invite + signer check-in responses.                  | Attendance noted in launch bulletin; fallback signer assigned if needed.                  | ✅ Call concluded 13:38 UTC; fallback signer greenlit and cold wallet tested.                                |
| 13:55      | Initiate DeDust seeding transactions (add liquidity, set routing weights).                               | Treasury Signers (2-of-3) | Multisig session established; dry run validated.              | Tonviewer TX hash + screenshot archived.                                                  | ✅ Liquidity added 13:58 UTC; hash filed under `_static/ton/dedust/tx/2025-05-13-add-liquidity.txt`.         |
| 14:10      | Broadcast public announcement thread (Twitter, Telegram) with swap links.                                | Comms Lead                | Confirmed TX hash references from 13:55 task.                 | Cross-posted announcement links in marketing tracker.                                     | ✅ Thread launched 14:11 UTC; engagement tracker updated with initial CTR snapshot.                          |
| 15:00      | Post-launch monitoring: price impact check (<2% on 50k TON equivalent), arbitrage routes, TON gas log.   | Market Ops + Risk Analyst | Live DexScreener alerts; updated SOP.                         | Monitoring log appended to `docs/tonstarter/transparency-cadence.md`.                     | ✅ Impact registered 1.6%; TON gas averaged 0.014 TON; no adverse arbitrage identified.                      |
| 16:00      | Tonstarter diligence sync note summarizing execution evidence and next 72h plan.                         | Launch Coordinator        | Inputs from Market Ops and Risk Analyst.                      | Note stored under `docs/tonstarter/launch-notes/2025-05-13.md`.                           | ✅ Note filed 16:07 UTC with evidence links and 24h monitoring owners confirmed.                             |
| 18:00      | Treasury reconciliation: confirm LP token custody, update treasury dashboard balances, sign-off summary. | Treasury Ops Lead         | Access to multisig, accounting sheet template.                | Reconciliation worksheet filed under `dynamic_liquidity/treasury-balances/2025-05-13.md`. | ✅ Recon complete 18:18 UTC; LP tokens parked in cold vault; dashboard refreshed with net TON balance delta. |

## Tonstarter Launchpad Milestones

| Milestone                          | Status                                                                                     | Evidence                                                                       | Follow-up                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Launch readiness checklist items   | Completed; checklist reconfirmed 11:35 UTC with no outstanding follow-ups.                 | `docs/tonstarter-launch-readiness.md` action table + launch bulletin addendum. | Prepare 72h performance digest for Tonstarter by 2025-05-16. |
| Liquidity & transparency runbooks  | Finalized; cadence executed with first monitoring entry logged 15:05 UTC.                  | `docs/tonstarter/liquidity-sop.md`, `docs/tonstarter/transparency-cadence.md`. | Schedule automation sprint kickoff for 2025-05-20 review.    |
| Tonstarter builder form submission | Submitted 2025-05-10 with confirmation ID `TONSTARTER-DF-2025-0510-DC`; launch email sent. | `docs/tonstarter/builder-form-submission.md` log + 2025-05-13 email archive.   | Coordinate review call agenda draft by 2025-05-14 12:00 UTC. |

## Observations & Risks

1. **Pool monitoring automation:** Manual DexScreener exports succeeded for
   launch, but webhook automation remains a priority—scope automation sprint and
   assign owner during 2025-05-20 review.
2. **Liquidity diversification:** DeDust pool live with desired mix; reassess
   TON/USDT balance after first 24h volume report to determine need for top-up
   or rebalance.
3. **Diligence cadence:** Transparency archive now includes TX hash,
   announcement thread, and monitoring log; continue filing artifacts under
   `_static/ton/` for Tonstarter audit traceability.
4. **Comms alignment:** Marketing copy matched bootstrap pricing; add automated
   price sanity check before future announcements to reduce manual verification
   load.
