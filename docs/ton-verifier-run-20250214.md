# TON Site Verification Run — 2025-02-14

## Overview

- **Command:** `bash scripts/verify/ton_site.sh`
- **Purpose:** Validate the Dynamic Capital TON site configuration, ADNL
  identity, resolver contract, and public gateway availability.
- **Timestamp:** 2025-02-14

## Key Findings

- Configuration loaded successfully from `dns/dynamiccapital.ton.json`.
- ADNL address
  `0:65f3bcd1730c1cdde82a75b0331ee8b5c28203f1ab1e7467347ae7b937feb239` passed
  format validation.
- Public key decoded to the expected 32-byte Ed25519 value.
- Resolver `EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo` matched TON DNS
  lookup and metadata.
- TON API primary fetch path failed, but the curl fallback succeeded with
  HTTP 200.
- Gateway checks served HTML content via `https://ton.site/dynamiccapital.ton`,
  though alternate mirrors returned 503 due to DNS resolution failures.

## Follow-ups

- Investigate 503 responses from alternate TON Site gateways
  (`ton-gateway.dynamic-capital.ondigitalocean.app`, `tonsite.io`,
  `resolve.tonapi.io`, `toncdn.io`, `tonsite.link`).
- Monitor uptime of the primary `ton.site` gateway and confirm the `/lander`
  redirect chain remains expected.
