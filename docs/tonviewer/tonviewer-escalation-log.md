# Tonviewer Verification Escalation Log

| Date (UTC) | Owner      | Action                                                                                                    | Reference                                     | Outcome                                             |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| 2025-10-03 | Operations | Submitted initial verification ticket with metadata bundle.                                               | Ticket `TVR-4821`                             | Acknowledged by Tonviewer support; verification pending. |
| 2025-10-05 | Compliance | Delivered supplemental issuer documentation and proof-of-mint hash.                                      | Email to support@tonviewer.com                | Awaiting confirmation that documents were received. |
| 2025-10-06 | Analytics  | Ran `check-tonviewer-status.ts` to confirm status and hash parity.                                        | Script log                                    | Jetton still unverified (`none`). Follow-up required. |
| 2025-10-07 | Operations | Escalated ticket with issuer statement PDF, metadata JSON, digest note, and verification log generated via the evidence preflight script. | Email reply to support@tonviewer.com          | Auto-response confirmed receipt; manual review pending. |
| 2025-10-08 | Compliance | Archived notarized KYC dossier and logged storage link `s3://dynamic-compliance/kyc/dct/2025-10-08/`.   | Ticket `DCT-COMP-2025-118`                    | Archive verified; access recorded in escalation notes. |
| 2025-10-09 | Analytics  | Logged verification status (`none`), scheduled 2025-10-10 script rerun, and refreshed logging guidance.   | Tonviewer status report                       | Verification unchanged; rerun queued.                |
| 2025-10-10 | Analytics  | Executed scheduled script, captured log excerpt, and registered contingency escalation for 2025-10-11.    | `check-tonviewer-status-20251010.log`         | Verification still `none`; escalation prep continues. |
| 2025-10-11 | Operations | Prepared secondary escalation package using updated follow-up template; awaiting reviewer response.      | Template checklist                            | Standing by for Tonviewer verdict before dispatch. |
| 2025-10-12 | Compliance | Reviewed compliance archive, confirmed attachments checklist completeness, and documented the new preflight automation. | `s3://dynamic-compliance/kyc/dct/2025-10-08/` | No gaps found; archive remains accessible.          |
| 2025-10-12 | Analytics  | Ran unscheduled verification sweep at 09:45 UTC and archived `check-tonviewer-status-20251012.log` in the escalation bundle. | Script log                                    | Flag still `none`; Tonapi now reports 30 holders; escalation window shifted to 2025-10-13 16:00 UTC. |
| 2025-10-12 | Operations | Confirmed evidence preflight script output, regenerated digest note, and filed the JSON summary showing `digestMatches: true` with `statusExitCode` `3`. | `logs/check-tonviewer-status-20251012.log`, preflight JSON (2025-10-12T10:19Z) | Digest note refreshed; Tonviewer remains unverified (`statusWarning` captured). |

## Pending Follow-Ups

- 2025-10-13 16:00 UTC: Dispatch secondary escalation if Tonviewer remains silent.
- 2025-10-13: Execute scheduled progress check and update this log with any status change.
- 2025-10-14: Revalidate compliance archive access and extend the presigned URL if escalation remains open.

## Attachments Checklist – 2025-10-07 Submission

| Artefact                                                        | Prepared | Verified | Logged | Notes                                                                                         |
| --------------------------------------------------------------- | -------- | -------- | ------ | --------------------------------------------------------------------------------------------- |
| Issuer statement export (`dct-issuer-statement-20251007.pdf`)   | ✅       | ✅       | ✅     | Stored locally for dispatch and hash recorded in log.                                        |
| Metadata JSON (`metadata.json`)                                 | ✅       | ✅       | ✅     | Digest matched `541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5` (preflight output). |
| Digest note (`metadata-digest.txt`)                             | ✅       | ✅       | ✅     | Upload path `s3://dynamic-compliance/kyc/dct/2025-10-08/hashes/metadata-digest.txt` (preflight script). |
| Verification script log (`check-tonviewer-status-20251007.log`) | ✅       | ✅       | ✅     | Captured 2025-10-07 15:59 UTC with flag `none`; stored in `logs/`.                           |
| Compliance archive link                                         | ✅       | ✅       | ✅     | Presigned URL valid through 2025-10-14 00:00 UTC; access logged in ticket.                    |


## Evidence Preflight Summary – 2025-10-12

```json
{
  "metadataPath": "/workspace/Dynamic-Capital/dynamic-capital-ton/contracts/jetton/metadata.json",
  "digest": "541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5",
  "expectedDigest": "541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5",
  "expectedDigestSource": "cli",
  "digestMatches": true,
  "digestNote": "evidence/metadata-digest.txt",
  "statusLog": "logs/check-tonviewer-status-20251012.log",
  "statusExitCode": 3,
  "statusWarning": "⚠️ Tonviewer/Tonapi still report the jetton as unverified. Follow up on the submitted ticket.",
  "generatedAt": "2025-10-12T10:19:04.722Z"
}
```
