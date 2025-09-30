# TON Theme Pass Audit & Implementation Plan

## Current Repository State

- `dynamic-capital-ton/config.yaml` enumerates three Theme Pass entries (`Genesis`, `Growth`, `Community`) under `plannedMints`, but stops at the metadata URI level—no on-chain collection or item addresses are recorded.
- The contract deployment guide clarifies that `config.yaml` is the authoritative source for planned mint indices and URIs, reinforcing that additional NFT addresses must also live alongside this file for operational parity.
- Theme Pass logic is only exercised through higher-level branding utilities (`importDynamicBranding`, `normalizeThemePassTokens`) and unit tests, none of which track deployed TON collection/item addresses or mint outcomes.
- Smart-contract sources (`theme_collection.tact`) enforce DAO-only content management but lack any deployment manifest pointing at real NFT accounts, so downstream services cannot surface minted passes without manual coordination.
- Supabase schema seeds operational addresses for multisigs, master jettons, and routers, yet omits Theme Pass identifiers, leaving indexers and bots without a canonical storage slot for NFT linkage.

## Gaps & Risks

- **Operational blind spot:** Without capturing the live collection and item addresses, ops tooling cannot confirm whether a Tonviewer-discovered NFT belongs to the sanctioned Theme Pass program.
- **Indexing friction:** Lacking schema support or config fields prevents Supabase functions, bots, and Mini App experiences from resolving minted passes, undermining governance transparency.
- **Documentation drift:** External contributors or auditors must cross-reference out-of-band sources to reconcile deployed NFTs against the planned mint list, creating potential compliance discrepancies.

## Implementation Plan

1. **Extend configuration manifest**
   - Add `collectionAddress` and optional `itemAddress` fields to each Theme Pass entry in `dynamic-capital-ton/config.yaml` to document on-chain identifiers, keeping URI defaults intact for backward compatibility.
   - Update `dynamic-capital-ton/contracts/README.md` to reference the new fields when describing deployment and post-mint bookkeeping.
2. **Persist addresses in data layer**
   - Introduce a dedicated Supabase table (e.g., `theme_passes`) keyed by mint index with columns for collection/item addresses, priority, and metadata URI. Provide an initial seed migration aligned with the config defaults.
   - Wire up application services (bots/miniapp) that read Theme Pass metadata to pull from the new table or config schema, ensuring a single source of truth.
3. **Broaden validation & tests**
   - Expand `ThemePassSchema` (apps/web) to accept the new address fields while preserving optionality so pre-existing payloads continue to validate.
   - Add test coverage ensuring `importDynamicBranding` correctly merges resolved Theme Pass metadata and respects frozen entries when addresses are present.
4. **Automation & observability**
   - Create a lightweight CLI or script under `dynamic-capital-ton/apps` to sync on-chain collection/item data into Supabase, including sanity checks against Tonviewer responses.
   - Document the operational runbook (in `docs/tonstarter/` or a new SOP) covering verification steps, Tonviewer reconciliation, and alerting hooks for mismatched addresses.

## Suggested Verification Checklist

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `deno test dynamic-capital-ton/apps/tests`
