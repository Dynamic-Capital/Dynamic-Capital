# Tonviewer Status Report

## Run Context

- **Run Date (UTC):** 2025-10-12 10:14:26
- **Execution Command:**
  `$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/check-tonviewer-status.ts`
- **Jetton Address:**
  `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`
- **Tonviewer Page:**
  https://tonviewer.com/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7
- **Local Metadata Path:** dynamic-capital-ton/contracts/jetton/metadata.json
- **Local Metadata SHA-256:**
  `541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5`
- **Support Ticket Reference:** `TVR-4821`

## Metadata Comparison

| Field          | Local                                                                                                   | Tonapi                                                                                                  | Match |
| -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----- |
| Name           | Dynamic Capital Token                                                                                   | Dynamic Capital Token                                                                                   | ✅    |
| Symbol         | DCT                                                                                                     | DCT                                                                                                     | ✅    |
| Decimals       | 9                                                                                                       | 9                                                                                                       | ✅    |
| Image URL      | [Supabase asset](https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DCTMark.png) | [Supabase asset](https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DCTMark.png) | ✅    |
| Jetton Address | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`                                    | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`                                    | ✅    |

## Network Metrics

| Metric                            | Value                              |
| --------------------------------- | ---------------------------------- |
| Tonapi verification flag          | `none` (jetton remains unverified) |
| Reported total supply (raw)       | `99998500000000000`                |
| Reported total supply (human, Ð9) | `99,998,500` DCT                   |
| Holder count                      | `30` wallets                       |
| Last Tonapi sync observed         | Not provided (Tonapi response omitted timestamp). |

## Verification Timeline Highlights

| Date       | Owner      | Activity                                                                                                   | Outcome                                                    |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 2025-10-07 | Operations | Dispatched escalation package with issuer statement PDF, metadata JSON, digest note, and status log generated via the evidence preflight script. | Auto-response received; awaiting reviewer acknowledgement. |
| 2025-10-08 | Compliance | Archived notarized KYC dossier at `s3://dynamic-compliance/kyc/dct/2025-10-08/` and logged presigned URL. | Archive validated; access expires 2025-10-14 00:00 UTC.    |
| 2025-10-09 | Analytics  | Logged verification flag (`none`) and scheduled 2025-10-10 rerun; refreshed escalation log guidance.      | Status unchanged; rerun prepared.                          |
| 2025-10-10 | Analytics  | Executed rerun, captured log excerpt, and queued 2025-10-11 contingency escalation.                       | Verification still `none`; monitoring continues.           |
| 2025-10-12 | Analytics  | Ran unscheduled verification sweep at 09:45 UTC and archived log under `check-tonviewer-status-20251012.log`. | Flag remains `none`; Tonapi now reports 30 holders; escalation bundle kept staged. |

## Outstanding Actions

1. Hold secondary escalation window and dispatch the follow-up on 2025-10-13 16:00 UTC if Tonviewer remains silent.
2. Execute the scheduled 2025-10-13 progress check (`check-tonviewer-status.ts`) and refresh this report with any change in the verification flag.
3. Extend the compliance archive presigned URL on 2025-10-14 if the escalation is still unresolved.

## Verification Follow-up Plan

| Action                             | Description                                                                                         | Owner      | Target Date | Status    | Notes                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | ----------- | --------- | ----------------------------------------------------------------- |
| Secondary escalation (if required) | Send the prepared follow-up template referencing ticket `TVR-4821` and confirm attachments checklist before dispatch. | Operations | 2025-10-13  | Ready     | Waiting through 2025-10-13 16:00 UTC before triggering the send. |
| Progress check                     | Execute `check-tonviewer-status.ts` and update reports with any change in verification flag.        | Analytics  | 2025-10-13  | Scheduled | 2025-10-12 sweep logged as pre-check; main run still queued.     |
| Archive maintenance                | Renew presigned URL and confirm compliance archive integrity if the case remains open.              | Compliance | 2025-10-14  | Planned   | AWS CLI reminder scheduled; no action needed before 2025-10-14.  |

### Supporting Materials

- **Issuer statement:** `/docs/tonviewer/dct-issuer-statement.md`
- **Contract source reference:** `dynamic-capital-ton/contracts/jetton`
- **Compliance contact:** compliance@dynamic.capital
- **Escalation log:** `/docs/tonviewer/tonviewer-escalation-log.md`
- **Evidence preflight script:**
  `dynamic-capital-ton/apps/tools/tonviewer-evidence-preflight.ts`

## Escalation Evidence Snapshot

- **Issuer statement export:** `exports/dct-issuer-statement-20251007.pdf`
  (SHA-256 recorded in escalation log).
- **Metadata JSON digest:**
  `541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5` (validated 2025-10-12 10:14 UTC).
- **Verification logs:** `logs/check-tonviewer-status-20251007.log`,
  `logs/check-tonviewer-status-20251010.log`, `logs/check-tonviewer-status-20251012.log` (flag `none`).
- **Compliance archive:** Presigned URL covering
  `s3://dynamic-compliance/kyc/dct/2025-10-08/` valid until 2025-10-14 00:00 UTC.

## Recommended Next Steps

- Operations to hold the follow-up template until 2025-10-13 16:00 UTC and dispatch it if Tonviewer still has not acknowledged the ticket.
- Analytics to perform the scheduled 2025-10-13 sweep and capture any change in the Tonviewer verification flag.
- Compliance to reconfirm archive accessibility on 2025-10-14 and extend validity as required.
