# DEX Listings & Tonstarter Launchpad Status

## Snapshot

- **Last updated:** 2025-05-10 (matching latest explorer transcripts and
  Tonstarter submission logs).
- **Scope:** Summarizes on-chain liquidity venues and Tonstarter launchpad
  milestones for the Dynamic Capital Token (DCT).

## DEX Listings

| Venue & Pair           | Status                                                                                                               | Evidence                                                           | Next Steps                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| STON.fi — DCT/TON pool | Live pool seeded with 12,000,000 DCT against 1,200,000 TON; treasury controls 78% of LP share.                       | `_static/ton/dct-jetton/README.md` transcript captured 2025-05-10. | Continue weekly depth/volume reviews per liquidity SOP.                                                    |
| DeDust — DCT/USDT pool | Scheduled for TGE day seeding with 2,000,000 DCT at $0.10 bootstrap price; execution owned by treasury ops multisig. | `docs/tonstarter/liquidity-sop.md` launch plan.                    | Seed pool at TGE, publish TX hashes in transparency report, rebalance to maintain 60/40 TON/USDT exposure. |

## Tonstarter Launchpad Milestones

| Milestone                          | Status                                                                          | Evidence                                                                       | Follow-up                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Launch readiness checklist items   | Completed; all checklist rows marked "Verified" with no outstanding follow-ups. | `docs/tonstarter-launch-readiness.md` action table.                            | Maintain documentation updates for ongoing diligence.                        |
| Liquidity & transparency runbooks  | Finalized; liquidity SOP and transparency cadence published for audit review.   | `docs/tonstarter/liquidity-sop.md`, `docs/tonstarter/transparency-cadence.md`. | Execute cadence once pools are live.                                         |
| Tonstarter builder form submission | Submitted 2025-05-10 with confirmation ID `TONSTARTER-DF-2025-0510-DC`.         | `docs/tonstarter/builder-form-submission.md` log.                              | Await Tonstarter diligence follow-up (within 3 business days of submission). |

## Observations & Risks

1. **Pool monitoring automation:** Weekly reviews are manual today; consider
   instrumenting alerts using the DexScreener API reference already documented
   for TON venues.
2. **Liquidity diversification:** DeDust pool execution remains a gating
   item—ensure treasury buffers and routing scripts are staged before TGE to
   avoid delays.
3. **Diligence cadence:** The transparency calendar starts 2025-05-12; keep
   transcripts in sync with `_static/ton/dct-jetton` snapshots to streamline
   Tonstarter review sessions.
