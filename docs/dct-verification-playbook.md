# Dynamic Capital Token (DCT) Verification Playbook

## Purpose

Use this runbook when you need to confirm that a Dynamic Capital Token (DCT)
balance, transfer, or mint shown in a wallet screenshot (for example, Tonkeeper)
maps back to the canonical on-chain deployment. The steps below gather the
contract fingerprint, supply controls, and treasury references that regulators,
partners, or community reviewers expect before treating a screenshot as
evidence.

## Canonical fingerprint

| Signal                | Expected value                                                       | Where to verify                                   |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| Jetton master address | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7` | Token metadata JSON and Tonviewer jetton page     |
| Name / symbol         | `Dynamic Capital Token` / `DCT`                                      | Tonkeeper asset sheet, metadata JSON              |
| Decimals              | `9`                                                                  | Wallet token info dialog, Tonviewer decimal field |
| Hard-cap metadata     | Max supply attribute `100000000`                                     | Metadata attributes and Tonviewer supply widget   |
| Official links        | `https://dynamic.capital/token` and Tonviewer jetton URL             | Wallet → View in explorer → Links tab             |

All five values must match the metadata artifact tracked in source control
before you accept a wallet capture as production
evidence.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L1-L28】

### Source-controlled artifacts to reference during review

- `dynamic-capital-ton/config.yaml` — establishes the cap, canonical jetton
  address, governance timelock, and the operations multisig wallet that signs
  treasury movements.【F:dynamic-capital-ton/config.yaml†L1-L31】
- `dynamic-capital-ton/contracts/jetton/metadata.json` — frozen metadata served
  to wallets and explorers; the `attributes` array is the canonical source for
  decimals and hard-cap
  claims.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L1-L28】
- `apps/web/resources/token.ts` — front-end descriptor that must surface the
  same master address and treasury wallet to the public site, ensuring UI
  screenshots match the on-chain
  deployment.【F:apps/web/resources/token.ts†L182-L241】

## Step-by-step verification

1. **Open the jetton details from the wallet.** In Tonkeeper, tap the DCT
   position → **View jetton** → **Open in explorer**. Confirm that the explorer
   shows the jetton master address listed above and the `ton.jetton.v1`
   standard. A mismatch means the screenshot references a spoofed jetton and
   should be
   rejected.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L2-L28】
2. **Validate hard-cap and decimals.** On the explorer page, check that
   `Total supply` displays `100,000,000` with 9 decimals. Cross-reference this
   with the deployment checklist to ensure the contract enforces the immutable
   cap and decimals (see `maxSupply()`, `decimals()`, and `name()/symbol()`
   requirements).【F:docs/dct-jetton-starter-kit.md†L15-L22】
3. **Confirm the mint falls inside genesis allocations.** If the wallet shows a
   100,000,000 DCT receipt, trace the transaction hash from the explorer and
   make sure it is tagged as a genesis mint that matches the allocation table
   (Ecosystem & Staking, Investor Pool, etc.). Any mint after genesis must be
   routed through governance and the operations multisig, so a full-supply
   transfer outside those addresses is a red
   flag.【F:docs/dct-jetton-starter-kit.md†L26-L35】
4. **Check circulating float expectations.** Compare the circulating amount
   implied by the wallet (sum the confirmed balances that left genesis
   addresses) to the 13% launch float documented in the tokenomics brief. Large
   deviations require a treasury reconciliation before the screenshot can be
   published or used in
   reporting.【F:docs/dynamic-capital-ton-whitepaper.md†L34-L50】
5. **Verify treasury custody.** When the wallet claims to be the operations or
   treasury account, match its TON-friendly address to the
   `OPERATIONS_TREASURY_WALLET` configuration and to the token hub highlights
   surfaced in the public app. Reject evidence if the wallet ID differs from the
   configured treasury
   destination.【F:docs/env.md†L23-L34】【F:apps/web/resources/token.ts†L198-L238】
6. **Inspect mint governance trail when applicable.** For post-genesis
   emissions, load the Ton Console Jetton Minter audit log (or rerun the webhook
   script) to confirm a signed mint request exists, that it targeted the
   canonical master contract, and that the mintable flag was re-disabled
   afterward. Capture the Ton Console transaction hash and governance approval
   reference in the evidence
   bundle.【F:docs/ton-console-jetton-minting.md†L6-L82】
7. **Archive evidence.** Save the explorer URLs, transaction hashes, and
   governance artifacts (multisig proposal ID, Ton Console audit entry)
   alongside the screenshot. Note any anomalies (e.g., paused transfers or
   unexpected supply deltas) so compliance can track remediation.

## API quick checks

Use a TON API endpoint to pull the jetton metadata and confirm the master
address, decimals, cap, and embedded links match the repository artifacts.

```bash
curl -s "https://tonapi.io/v2/jettons/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7" \
  | jq '{address:.address,name:.name,symbol:.symbol,decimals:.decimals,maxSupply:.max_supply,site:.metadata.externalUrl}'
```

Reviewers must store the JSON excerpt in the evidence bundle when the response
confirms the canonical values.

## Quick review checklist

- [ ] Jetton master address, name, symbol, and decimals match the canonical
      metadata artifact.
- [ ] Supply figures align with the immutable cap and documented genesis
      allocations.
- [ ] The wallet belongs to an approved allocation bucket or treasury address.
- [ ] Transaction hashes and Ton Console logs corroborate any mint or burn shown
      in the screenshot.
- [ ] Evidence bundle stored in the compliance archive with notes on anomalies.
