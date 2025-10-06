# Tonviewer Escalation `TVR-4821` Follow-up Template

## Subject Line
`TVR-4821` – Dynamic Capital Jetton Verification Follow-up

## Email Body
1. **Greeting:** Address the Tonviewer support representative by name if available, otherwise use "Tonviewer Support Team".
2. **Context Recap:** Reference the original submission on 2025-10-03 and the 2025-10-07 escalation with metadata digest `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`.
3. **Evidence Summary:**
   - Export the issuer statement at `/docs/tonviewer/dct-issuer-statement.md` to PDF (or share the Markdown file if Tonviewer confirms acceptance) and include it as an attachment.
   - Attach `dynamic-capital-ton/contracts/jetton/metadata.json` alongside the SHA-256 digest text (`1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`).
   - Provide link to `s3://dynamic-compliance/kyc/dct/2025-10-08/` (read-only).
   - Include latest `check-tonviewer-status.ts` output snippet showing verification flag `none`.
4. **Requested Action:** Ask for confirmation of receipt and estimated verification timeline.
5. **Next Steps:** Notify that analytics will continue daily monitoring and provide contact channel for urgent clarifications.
6. **Signature:** Use the Operations escalation signature block from the Operations communications playbook.

## Attachments Checklist
- [ ] **Issuer statement export**
  - **Source:** `/docs/tonviewer/dct-issuer-statement.md`
  - **Format:** Export to PDF unless Tonviewer reconfirms Markdown is acceptable.
  - **Verification:** Open the exported file to confirm the issuer signature block renders correctly and matches the latest compliance revision.
  - **Logging:** Note the export timestamp and file hash in `/docs/tonviewer/tonviewer-escalation-log.md`.
- [ ] **Metadata JSON file**
  - **Source:** `dynamic-capital-ton/contracts/jetton/metadata.json`
  - **Format:** Attach the raw JSON file; do not compress unless Tonviewer explicitly asks for an archive.
  - **Verification:** Recalculate SHA-256 before dispatch and confirm it equals `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`.
  - **Logging:** Record the digest confirmation and any diffs observed during validation.
- [ ] **SHA-256 digest note**
  - **Source:** Include in the email body or as a plaintext attachment (`metadata-digest.txt`).
  - **Format:** `SHA-256 (metadata.json) = 1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4` with the calculation timestamp.
  - **Verification:** Capture the terminal output from the hash calculation and archive it under the compliance evidence folder.
  - **Logging:** Reference the hash command used and storage location for the output snippet.
- [ ] **Verification script excerpt**
  - **Source:** Latest run of `dynamic-capital-ton/apps/tools/check-tonviewer-status.ts`.
  - **Format:** Paste the relevant log lines (timestamp + verification flag) into the email body and attach the full log as `check-tonviewer-status-<YYYYMMDD>.log`.
  - **Verification:** Ensure the excerpt timestamp aligns with the `Verification Log Update` value in the status report.
  - **Logging:** Store the full log alongside the dispatch artefacts in the compliance archive and cite the path in the escalation log.
- [ ] **Compliance archive link**
  - **Source:** `s3://dynamic-compliance/kyc/dct/2025-10-08/`
  - **Format:** Provide as a read-only pre-signed URL valid for at least 7 days; confirm permissions before sending.
  - **Verification:** Review the S3 access control list and expiry to ensure Tonviewer can access without modification rights.
  - **Logging:** Record the generated link expiry and any access confirmations in ticket `DCT-COMP-2025-118`.

## Logging Instructions
- Update `/docs/tonviewer/tonviewer-escalation-log.md` with the dispatch timestamp and reference ID.
- Record any Tonviewer responses in the compliance ticket `DCT-COMP-2025-118` and sync with the analytics status report.
