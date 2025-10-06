# Tonviewer Status Report

## Run Context
- **Run Date (UTC):** 2025-10-09 16:02:41
- **Execution Command:** `$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/check-tonviewer-status.ts`
- **Jetton Address:** `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`
- **Tonviewer Page:** https://tonviewer.com/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7
- **Local Metadata Path:** dynamic-capital-ton/contracts/jetton/metadata.json
- **Local Metadata SHA-256:** `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`
- **Support Ticket Reference:** `TVR-4821`
- **Verification Log Update:** Recorded 2025-10-09 16:02 UTC (`none`)
- **Next Scheduled Run:** 2025-10-10 16:00 UTC

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
| Last Tonapi sync observed | 2025-10-09 16:01 UTC |

## Outstanding Actions

1. Await Tonviewer response to escalation `TVR-4821`; if no update arrives by 2025-10-11, prepare a second escalation.
2. Maintain parity checks between local metadata and Tonapi to document any deviation prior to Tonviewer response.

## Verification Follow-up Plan

| Action | Description | Owner | Target Date | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Support escalation | Submit a follow-up request through Tonviewer support referencing ticket `TVR-4821` and attach latest metadata hash. | Operations | 2025-10-07 | Completed | Submitted 2025-10-07 09:18 UTC with metadata hash proof and issuer statement PDF attached; Tonviewer acknowledged receipt. |
| Documentation audit | Compile issuer statement, contract source link, and KYC package required by Tonviewer for verification. | Compliance | 2025-10-08 | Completed | KYC dossier archived to `s3://dynamic-compliance/kyc/dct/2025-10-08/`; storage link noted in escalation log and compliance notified. |
| Status confirmation | Re-run `check-tonviewer-status.ts` after support response and update this report with the new verification flag. | Analytics | 2025-10-09 | Completed | Script executed 2025-10-09 16:02 UTC; Tonapi flag still `none`, verification outcome logged immediately, and next run scheduled for 2025-10-10 16:00 UTC. |

### Supporting Materials

- **Issuer statement:** `/docs/tonviewer/dct-issuer-statement.md`
- **Contract source reference:** `dynamic-capital-ton/contracts/jetton`
- **Compliance contact:** compliance@dynamic.capital
- **Escalation log:** `/docs/tonviewer/tonviewer-escalation-log.md`

## Recommended Next Steps

- Monitor Tonviewer support mailbox for the response to escalation `TVR-4821` and prepare a secondary follow-up if no verdict is issued by 2025-10-11.
- Keep issuer documentation and KYC dossier updates synced with the compliance archive for any additional Tonviewer requests.
- Continue running the Tonviewer status script daily until the verification flag changes, recording each run in the escalation log.
