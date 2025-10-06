# Tonviewer Verification Escalation Log

| Date (UTC) | Owner | Action | Reference | Outcome |
| --- | --- | --- | --- | --- |
| 2025-10-03 | Operations | Submitted initial verification ticket with metadata bundle. | Ticket `TVR-4821` | Acknowledged by Tonviewer support; verification pending. |
| 2025-10-05 | Compliance | Delivered supplemental issuer documentation and proof-of-mint hash. | Email to support@tonviewer.com | Awaiting confirmation that documents were received. |
| 2025-10-06 | Analytics | Ran `check-tonviewer-status.ts` to confirm status and hash parity. | Script log | Jetton still unverified (`none`). Follow-up required. |
| 2025-10-07 | Operations | Escalated ticket with issuer statement PDF, metadata JSON, digest note, and verification log per checklist. | Email reply to support@tonviewer.com | Auto-response confirmed receipt; manual review pending. |
| 2025-10-08 | Compliance | Archived notarized KYC dossier and logged storage link `s3://dynamic-compliance/kyc/dct/2025-10-08/`. | Ticket `DCT-COMP-2025-118` | Archive verified; access recorded in escalation notes. |
| 2025-10-09 | Analytics | Logged verification status (`none`), scheduled 2025-10-10 script rerun, and added immediate logging guidance. | Tonviewer status report | Verification unchanged; rerun queued. |
| 2025-10-10 | Analytics | Executed scheduled script, captured log excerpt, and registered 2025-10-11 contingency escalation. | `check-tonviewer-status-20251010.log` | Verification still `none`; escalation prep continues. |
| 2025-10-11 | Operations | Prepared secondary escalation package using updated follow-up template; pending reviewer response. | Template checklist | Standing by for Tonviewer verdict before dispatch. |
| 2025-10-12 | Compliance | Reviewed compliance archive and confirmed attachments checklist completeness for Oct-07 dispatch. | `s3://dynamic-compliance/kyc/dct/2025-10-08/` | No gaps found; archive remains accessible. |

## Pending Follow-Ups

- 2025-10-11: Dispatch secondary escalation if no reviewer response arrives by 16:00 UTC.
- 2025-10-13: Perform progress check on Tonviewer status and refresh this log with any updates.
- 2025-10-14: Revalidate compliance archive access and extend presigned URL if escalation remains open.

## Attachments Checklist – 2025-10-07 Submission

| Artefact | Prepared | Verified | Logged | Notes |
| --- | --- | --- | --- | --- |
| Issuer statement export (`dct-issuer-statement-20251007.pdf`) | ✅ | ✅ | ✅ | Stored locally for dispatch and hash recorded in log. |
| Metadata JSON (`metadata.json`) | ✅ | ✅ | ✅ | Digest matched `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`. |
| Digest note (`metadata-digest.txt`) | ✅ | ✅ | ✅ | Upload path `s3://dynamic-compliance/kyc/dct/2025-10-08/hashes/metadata-digest.txt`. |
| Verification script log (`check-tonviewer-status-20251007.log`) | ✅ | ✅ | ✅ | Latest run captured at 2025-10-07 15:59 UTC with flag `none`. |
| Compliance archive link | ✅ | ✅ | ✅ | Presigned URL valid through 2025-10-14 00:00 UTC; access logged in ticket. |
