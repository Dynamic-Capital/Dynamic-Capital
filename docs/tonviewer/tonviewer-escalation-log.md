# Tonviewer Verification Escalation Log

| Date (UTC) | Owner | Action | Reference | Outcome |
| --- | --- | --- | --- | --- |
| 2025-10-03 | Operations | Submitted initial verification ticket with metadata bundle. | Ticket `TVR-4821` | Acknowledged by Tonviewer support; verification pending. |
| 2025-10-05 | Compliance | Delivered supplemental issuer documentation and proof-of-mint hash. | Email to support@tonviewer.com | Awaiting confirmation that documents were received. |
| 2025-10-06 | Analytics | Ran `check-tonviewer-status.ts` to confirm status and hash parity. | Script log | Jetton still unverified (`none`). Follow-up required. |
| 2025-10-07 | Operations | Escalated ticket `TVR-4821` with refreshed metadata hash and issuer statement attachment. | Ticket `TVR-4821` follow-up | Tonviewer support acknowledged escalation and queued for reviewer assignment; submitted digest `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4` and `/docs/tonviewer/dct-issuer-statement.pdf`. |
| 2025-10-08 | Compliance | Finalized and archived notarized KYC dossier; circulated storage reference. | Compliance archive notice | Stored at `s3://dynamic-compliance/kyc/dct/2025-10-08/` with access audit log updated and credentials rotation confirmed. |
| 2025-10-09 | Analytics | Re-ran `check-tonviewer-status.ts`, logged verification outcome immediately, and scheduled next run for 2025-10-10 16:00 UTC. | Script log | Verification flag remains `none`; follow-up run queued, verification journal timestamped 2025-10-09 16:02 UTC. |

## Pending Follow-Ups

- 2025-10-11: If Tonviewer has not responded with a verification outcome, prepare second escalation with additional evidence (draft response template stored in `/docs/tonviewer/templates/tvr-4821-follow-up.md`).
- 2025-10-12: Confirm access logs for the compliance archive remain clean and renew link expiry tokens if Tonviewer requests access; log review to be captured in compliance ticket `DCT-COMP-2025-118`.
