# Tonviewer Status Report

## Run Context
- **Run Date (UTC):** 2025-10-06 15:49:32
- **Execution Command:** `$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/check-tonviewer-status.ts`
- **Jetton Address:** `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`
- **Tonviewer Page:** https://tonviewer.com/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7
- **Local Metadata Path:** dynamic-capital-ton/contracts/jetton/metadata.json
- **Local Metadata SHA-256:** `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`

## Metadata Comparison

| Field | Local | Tonapi | Match |
| --- | --- | --- | --- |
| Name | Dynamic Capital Token | Dynamic Capital Token | ✅ |
| Symbol | DCT | DCT | ✅ |
| Decimals | 9 | 9 | ✅ |
| Image URL | [Supabase asset](https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DCTMark.png) | [Supabase asset](https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DCTMark.png) | ✅ |
| Jetton Address | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7` | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7` | ✅ |

## Network Metrics

| Metric | Value |
| --- | --- |
| Tonapi verification flag | `none` (jetton remains unverified) |
| Reported total supply (raw) | `100000000000000000` |
| Reported total supply (human, Ð9) | `100,000,000` DCT |
| Holder count | `1` wallet |

## Outstanding Actions

1. Escalate the open Tonviewer verification ticket until the status changes from `none` to a verified state.
2. Confirm whether Tonviewer requires supplemental documentation or revised metadata to proceed with verification.
3. Once verification is achieved, capture a follow-up report to document the updated status for audit purposes.
