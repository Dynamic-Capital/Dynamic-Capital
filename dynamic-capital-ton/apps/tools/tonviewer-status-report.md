# Tonviewer Status Report

## Run Context

- **Run Date (UTC):** 2025-10-10 16:02:11
- **Execution Command:**
  `$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/check-tonviewer-status.ts`
- **Jetton Address:**
  `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`
- **Tonviewer Page:**
  https://tonviewer.com/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7
- **Local Metadata Path:** dynamic-capital-ton/contracts/jetton/metadata.json
- **Local Metadata SHA-256:**
  `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`
- **Support Ticket Reference:** `TVR-4821`

## Metadata Comparison

| Field          | Local                                                                                                   | Tonapi                                                                                                  | Match |
| -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----- |
| Name           | Dynamic Capital Token                                                                                   | Dynamic Capital Token                                                                                   | ✅    |
| Symbol         | DCT                                                                                                     | DCT                                                                                                     | ✅    |
| Decimals       | 9                                                                                                       | 9                                                                                                       | ✅    |
| Image URL      | [Supabase asset](https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DCT-Mark.svg) | [Supabase asset](https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/miniapp/DCT-Mark.svg) | ✅    |
| Jetton Address | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`                                    | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`                                    | ✅    |

## Network Metrics

| Metric                            | Value                              |
| --------------------------------- | ---------------------------------- |
| Tonapi verification flag          | `none` (jetton remains unverified) |
| Reported total supply (raw)       | `100000000000000000`               |
| Reported total supply (human, Ð9) | `100,000,000` DCT                  |
| Holder count                      | `1` wallet                         |
| Last Tonapi sync observed         | 2025-10-06 15:56 UTC               |

## Verification Timeline Highlights

| Date       | Owner      | Activity                                                                                                                                         | Outcome                                                    |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 2025-10-07 | Operations | Dispatched escalation package with issuer statement PDF, metadata JSON, digest note, and status log generated via the evidence preflight script. | Auto-response received; awaiting reviewer acknowledgement. |
| 2025-10-08 | Compliance | Archived notarized KYC dossier at `s3://dynamic-compliance/kyc/dct/2025-10-08/` and logged presigned URL.                                        | Archive validated; access expires 2025-10-14 00:00 UTC.    |
| 2025-10-09 | Analytics  | Logged verification flag (`none`) and scheduled 2025-10-10 rerun; updated escalation log guidance.                                               | Status unchanged; rerun prepared.                          |
| 2025-10-10 | Analytics  | Executed rerun, captured log excerpt, and queued 2025-10-11 contingency escalation.                                                              | Verification still `none`; monitoring continues.           |

## Outstanding Actions

1. Hold secondary escalation for dispatch on 2025-10-11 16:00 UTC if Tonviewer
   remains silent.
2. Perform a progress check on 2025-10-13 and refresh the escalation log plus
   this report with any reviewer feedback.
3. Extend the compliance archive presigned URL on 2025-10-14 if the escalation
   is still unresolved.

## Verification Follow-up Plan

| Action                             | Description                                                                                                           | Owner      | Target Date | Status    | Notes                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | --------- | ------------------------------------------------------------------- |
| Secondary escalation (if required) | Send the prepared follow-up template referencing ticket `TVR-4821` and confirm attachments checklist before dispatch. | Operations | 2025-10-11  | Ready     | Evidence bundle staged; waiting on reviewer response window.        |
| Progress check                     | Execute `check-tonviewer-status.ts` and update reports with any change in verification flag.                          | Analytics  | 2025-10-13  | Scheduled | Command block reserved in runbook; alert set in monitoring channel. |
| Archive maintenance                | Renew presigned URL and confirm compliance archive integrity if the case remains open.                                | Compliance | 2025-10-14  | Planned   | AWS CLI reminder scheduled; no action needed before 2025-10-14.     |

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
  `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4` (validated
  2025-10-07 15:48 UTC).
- **Verification logs:** `logs/check-tonviewer-status-20251007.log`,
  `logs/check-tonviewer-status-20251010.log` (flag `none`).
- **Compliance archive:** Presigned URL covering
  `s3://dynamic-compliance/kyc/dct/2025-10-08/` valid until 2025-10-14 00:00
  UTC.

## Recommended Next Steps

- Operations to monitor Tonviewer queue through 2025-10-11 and dispatch
  secondary escalation if the reviewer remains silent.
- Analytics to execute the 2025-10-13 progress check and log any status change
  immediately.
- Compliance to reconfirm archive accessibility on 2025-10-14 and extend
  validity as required.
