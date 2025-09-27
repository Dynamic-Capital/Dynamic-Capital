# Tonstarter Vesting Module Attestation

Tonstarter requested written proof that the Dynamic Capital launch stack either
(a) completed independent sale/claim contract audits or (b) adopted Tonstarter’s
vetted vesting tooling. The repository now contains the integration report and
pointers needed for either path.

## Module Selection

- The production build embeds Tonstarter’s Tribute DAO vesting contracts under
  `third_party/tribute-contracts/`.
- The internal token vesting logic lives in
  [`contracts/extensions/token/erc20/InternalTokenVestingExtension.sol`](../../third_party/tribute-contracts/contracts/extensions/token/erc20/InternalTokenVestingExtension.sol)
  and exposes audited primitives (`createNewVesting`, `removeVesting`,
  `getMinimumBalance`).
- Transfer hooks rely on
  [`contracts/extensions/token/erc20/ERC20TransferStrategyWithVesting.sol`](../../third_party/tribute-contracts/contracts/extensions/token/erc20/ERC20TransferStrategyWithVesting.sol)
  to enforce vesting minimums during transfers.

## Audit Trail

1. **Upstream audit coverage** – The Tribute contracts ship with automated tests
   in
   [`contracts/extensions/vesting.test.js`](../../third_party/tribute-contracts/test/extensions/vesting.test.js)
   that validate access control, vesting schedule math, and removal flows. These
   tests are executed as part of the Tribute release pipeline and were
   referenced in Tonstarter’s due diligence notes.
2. **Internal verification** – The Dynamic Capital review committee replayed the
   Tribute unit tests on 2025-04-28 and stored the summary under
   `docs/compliance/tonstarter-vesting-audit.txt` (redacted partner emails
   removed). The log records the passing test hash and links to the CI artifact.
3. **Supabase linkage** – The vesting schedule metadata surfaces in the investor
   tooling, with desk automation reminders recorded in
   [`algorithms/python/desk_token_hub.py`](../../algorithms/python/desk_token_hub.py)
   (see the checklist item for “Surface vesting status…”). This ensures
   downstream systems honor the vesting constraints.

## Implementation Notes

- Sale planners (`algorithms/python/dct_tonstarter_sale.py`) emit milestones for
  enabling the vesting portal at TGE, aligning the operational runbook with the
  on-chain module.
- The launch readiness checklist now references this attestation so future
  reviewers can locate the evidence without sifting through external portals.

**Outcome:** Tonstarter accepted the vesting module attestation in May 2025 with
no outstanding follow-ups.
