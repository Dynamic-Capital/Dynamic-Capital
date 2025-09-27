# Tonstarter Launch Readiness Guide

This guide consolidates the materials, on-chain prerequisites, and operational
playbooks required before submitting Dynamic Capital to Tonstarter's launchpad
program.

## Why Tonstarter Fits Dynamic Capital

- Dynamic Capital already operates a TON-native, Telegram-first subscription and
  treasury flow, matching Tonstarter's distribution strengths.
- Existing tokenomics and whitepaper collateral cover supply, vesting, buyback,
  and utility narratives aligned with Tonstarter's review criteria.
- Smart-contract guardrails (Jetton starter kit, multisig treasury, staking
  hooks) and TON Web3 infrastructure provide the technical assurances Tonstarter
  screens for.
- Liquidity operations are scoped for STON.fi and DeDust pools with defined
  depth and buyback policies that match Tonstarter's tracked venues.
- Compliance posture separates DCT utility rights from any investor share
  product, keeping the token application clean for launchpad review.

## Application Package

Prepare the following collateral before filling out the Tonstarter intake form:

### Documents

- One-pager overview of Dynamic Capital's mission and traction.
- Pitch deck focusing on product, team, metrics, and market.
- Tokenomics brief: allocations, cliffs, vesting, emissions, and utility matrix.
- Whitepaper export that mirrors the canonical
  `dynamic-capital-ton-whitepaper.md` structure.
- Roadmap with quarterly KPIs and highlighted utility unlocks (subscriptions,
  staking, governance).

### Links & Evidence

- Public stats dashboard covering investor network reach, TG bot distribution,
  and prior IDO engagement.
- Explorer references for the Jetton minter, resolver, and treasury multisig.
- Demo links or recordings showing subscription settlement, staking deposits,
  and treasury rebalancing.

## Smart-Contract & On-Chain Requirements

- Verify the DCT Jetton minter configuration: decimals (9), symbol, logo,
  ownership, and mint cap.
- Maintain testnet deployments for:
  - `SubscriptionManager` burn/split workflow.
  - Staking contract with TVL snapshot.
  - Treasury multisig with representative proposals.
- Confirm sale and claim (vesting/lock) contracts are audited or adopt
  Tonstarter's vesting modules if preferred.

## Liquidity & Market Operations

- Define liquidity seeding for launch day:
  - STON.fi TON:DCT pool depth with TON and DCT amounts.
  - DeDust USDT:DCT pool allocation for stablecoin exposure.
- Outline LP management policies: who manages LP keys, rebalance cadence, and
  fail-safes.
- Plan post-TGE buyback/burn cadence, tying back to subscription fee burns and
  DAO-capped treasury buybacks.

## Compliance & Governance

- Document team KYC readiness and jurisdictional stance (utility token vs. fund
  shares).
- Keep investor share economics segregated within a dedicated USDT pool service.
- Map audit timeline: auditor selection, scheduled window, and deliverables for
  Tonstarter due diligence.
- Reference treasury governance workflows (dual approvals, transparency cadence)
  and how updates will be communicated post-launch.

## Submission Workflow

1. Finalize collateral and on-chain verifications listed above.
2. Assemble a succinct "What we want" brief covering raise amount, round sizes,
   pricing bands, and requested support.
3. Submit the Tonstarter builder form at <https://forms.tonstarter.com/build>
   with:
   - Project summary and key metrics.
   - Links to explorer entries, dashboards, and demos.
   - Uploaded deck, tokenomics brief, and whitepaper export.
   - Selected assistance needs (IDO, fundraising, tokenomics help).
4. Prepare for follow-up diligence on traction, team, audits, and contract
   readiness.

## Sale Design Checklist

- Seed, private, and public round pricing tiers with vesting schedules per
  cohort.
- Whitelist and KYC policy for the public sale, including geography
  considerations.
- Allocation tables for team, community, staking rewards, and treasury.
- Claim portal readiness: cliff durations, linear unlock cadence, and support
  workflows.

## Launch Week Operations

- Coordinate marketing assets with Tonstarter's Telegram-first campaign
  guidelines.
- Publish STON.fi and DeDust pool links, plus GeckoTerminal URLs at TGE.
- Announce claim portal opening, treasury addresses, and transparency cadence
  (burns, buybacks, NAV reporting).
- Monitor liquidity depth and adjust LP positions per the management policy.

## Action Checklist

| Action                                                                                 | Claimed Completion Notes                                                      | Evidence Located in Repo                                                      | Audit Status       | Follow-up Required                                                                                                    |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Verify DCT Jetton minter configuration and publish explorer links                      | Shared STON.fi and TON explorer URLs in the diligence workspace on 2024-05-20 | No explorer permalinks or screenshots in `docs/` or `content/`                | Needs verification | Capture canonical explorer URLs and archive proofs in a shared repo location (e.g., `docs/onchain/jetton-minter.md`). |
| Finalize tokenomics tables across seed, private, public, staking, and treasury buckets | Locked revisions v3.2 in the Tonstarter data room                             | No tokenomics tables or CSVs committed; only references in external data room | Needs verification | Export the approved tables into the repo (redacted if required) and link them here for traceability.                  |
| Complete sale/claim contract audits or adopt Tonstarter's vesting tooling              | Integrated Tonstarter vesting module after internal audit sign-off            | No audit reports or vesting module commit references surfaced                 | Needs verification | Attach audit attestation or reference the commit hash / deployment notes demonstrating vesting module integration.    |
| Lock DEX preferences (STON.fi / DeDust) and document liquidity contributions           | Signed off on 60/40 TON/USDT split with treasury ops                          | No liquidity playbook or contribution sheet available                         | Needs verification | Add the liquidity management SOP to the repo and include the TON/USDT allocation math.                                |
| Draft the "What we want" request (raise amount, pricing, support needs)                | Shared one-pager covering targets and support asks                            | One-pager not stored alongside other investor materials                       | Needs verification | Commit a sanitized version of the one-pager or detail where it lives for future audits.                               |
| Submit the Tonstarter builder form with collateral and contact details                 | Confirmation received from Tonstarter                                         | No confirmation email or submission receipt archived                          | Needs verification | Save the confirmation (PDF or redacted screenshot) to `docs/tonstarter/` and note submission metadata.                |
| Schedule follow-up diligence sessions and maintain transparency updates post-TGE       | Calendar invites issued and comms cadence posted in the ops runbook           | No calendar export or ops cadence documentation checked in                    | Needs verification | Publish the cadence outline or calendar export to ensure recurring updates can be audited.                            |
