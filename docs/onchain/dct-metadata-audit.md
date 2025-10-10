# Dynamic Capital Token Metadata Audit — Genesis Close Preparation

## Scope and approach

This audit reviews the source-controlled artifacts that define the Dynamic
Capital Token (DCT) identity before executing `closeGenesis`. The focus is on
the jetton metadata JSON, the on-chain configuration manifest, and the public
web descriptor to ensure every canonical field is aligned ahead of permanently
locking further minting authority.

## Canonical identity

| Field                 | Confirmed value                                                                                                                                                                                                              | Evidence                                                                                                                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name / symbol         | `Dynamic Capital Token` / `DCT`                                                                                                                                                                                              | `metadata.json` name and symbol entries; `config.yaml` token block; web descriptor imports metadata directly.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L2-L3】【F:dynamic-capital-ton/config.yaml†L1-L6】【F:apps/web/resources/token.ts†L3-L274】                                   |
| Decimals              | `9`                                                                                                                                                                                                                          | Declared in the jetton metadata and mirrored in the config manifest and UI schema checks.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L5-L6】【F:dynamic-capital-ton/config.yaml†L1-L6】【F:apps/web/resources/token.ts†L100-L134】                                                     |
| Jetton master address | `0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38`                                                                                                                                                         | Stored in the metadata JSON, `config.yaml`, and normalized by the web descriptor for explorer links.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L6-L28】【F:dynamic-capital-ton/config.yaml†L1-L14】【F:apps/web/resources/token.ts†L252-L324】                                        |
| Max supply            | `100,000,000`                                                                                                                                                                                                                | Captured in the metadata attributes array, `config.yaml`, and the UI descriptor invariant enforcing the cap before rendering supply stats.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L41-L53】【F:dynamic-capital-ton/config.yaml†L1-L24】【F:apps/web/resources/token.ts†L265-L346】 |
| Metadata endpoints    | HTTPS image, external URL, and comprehensive `sameAs` coverage spanning official domains, explorers, liquidity pools, treasury multisig, and routing wallets.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L7-L39】 |                                                                                                                                                                                                                                                                                                   |

## Treasury and governance alignment

- The operations multisig (`UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G`)
  is referenced consistently across the metadata attributes, config manifest,
  and shared mainnet address catalogue that the public UI consumes for
  highlighting treasury
  custody.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L51-L61】【F:dynamic-capital-ton/config.yaml†L8-L51】【F:shared/ton/mainnet-addresses.ts†L9-L40】【F:apps/web/resources/token.ts†L131-L346】
- The STON.fi router (`EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt`) and
  DeDust pool references present in `sameAs` match the contract manifest and the
  curated DEX pool list surfaced to users, confirming liquidity links remain in
  sync.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L18-L39】【F:dynamic-capital-ton/config.yaml†L8-L24】【F:shared/ton/mainnet-addresses.ts†L29-L40】【F:apps/web/resources/token.ts†L305-L409】
- Governance guardrails (48-hour timelock and immutable metadata standard) are
  documented within the metadata attributes and the deployment runbooks,
  ensuring the DAO multisig remains the single path for future parameter changes
  after
  `closeGenesis`.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L51-L64】【F:docs/onchain/close-genesis.md†L1-L43】

## Pre-close checklist

1. **Re-host checksum snapshot:** Publish the SHA-256 digest for `metadata.json`
   alongside the Tonviewer submission packet so third parties can match the
   repository artifact after closeout (use
   `apps/tools/check-tonviewer-status.ts` to compute it once Deno is
   available).【F:dynamic-capital-ton/apps/tools/check-tonviewer-status.ts†L38-L100】
2. **Explorer parity check:** Re-run the Tonviewer/Tonapi comparison tool and
   confirm the verification flag and remote metadata fields match the local JSON
   before finalizing genesis closure. Investigate any mismatch before
   proceeding.【F:dynamic-capital-ton/apps/tools/check-tonviewer-status.ts†L66-L117】
3. **Archive web descriptor snapshot:** Capture the rendered `/token` page
   (which imports the same metadata object) for the compliance evidence bundle
   to demonstrate consistent public disclosures at the moment `closeGenesis` is
   executed.【F:apps/web/resources/token.ts†L3-L346】
4. **Follow the `closeGenesis` runbook:** Once the above checks pass, craft the
   payload using `scripts/ton/close-genesis.ts` and submit it through Ton
   Console as documented, then record the transaction hash in the on-chain
   dossier.【F:docs/onchain/close-genesis.md†L1-L43】

With these confirmations logged, the Dynamic Capital Token metadata set is ready
for the genesis window to be closed without risking drift across explorers,
governance tooling, or the public interface.
