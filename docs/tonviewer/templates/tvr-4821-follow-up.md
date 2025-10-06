# Tonviewer Escalation `TVR-4821` Follow-up Template

## Subject Line

`TVR-4821` – Dynamic Capital Jetton Verification Follow-up

## Email Body

1. **Greeting:** Address the Tonviewer support representative by name if
   available, otherwise use "Tonviewer Support Team".
2. **Context Recap:** Reference the original submission on 2025-10-03 and the
   2025-10-07 escalation with metadata digest
   `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`.
3. **Evidence Summary:**
   - Export the issuer statement at `/docs/tonviewer/dct-issuer-statement.md` to
     PDF (or share the Markdown file if Tonviewer confirms acceptance) and
     include it as an attachment.
   - Attach `dynamic-capital-ton/contracts/jetton/metadata.json` alongside the
     SHA-256 digest text
     (`1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`).
   - Provide link to `s3://dynamic-compliance/kyc/dct/2025-10-08/` (read-only).
   - Include latest `check-tonviewer-status.ts` output snippet showing
     verification flag `none`.
4. **Requested Action:** Ask for confirmation of receipt and estimated
   verification timeline.
5. **Next Steps:** Notify that analytics will continue daily monitoring and
   provide contact channel for urgent clarifications.
6. **Signature:** Use the Operations escalation signature block from the
   Operations communications playbook.

## Attachments Checklist

For each artifact, mark the three checkboxes to confirm the item is
**prepared**, **verified**, and **logged** before dispatching the escalation
package. Use the callouts for quick reference to the commands and evidence
destinations.

### Issuer statement export

- [ ] **Prepared** – Export `/docs/tonviewer/dct-issuer-statement.md` to PDF
      (unless Tonviewer reconfirms Markdown acceptance) and name the file
      `dct-issuer-statement-<YYYYMMDD>.pdf`.
- [ ] **Verified** – Open the PDF to confirm the issuer signature block renders
      correctly and matches the latest compliance revision.
- [ ] **Logged** – Record the export timestamp, filename, and SHA-256 hash in
      `/docs/tonviewer/tonviewer-escalation-log.md`.

> **Command reference:**

```sh
mkdir -p exports && \
  pandoc docs/tonviewer/dct-issuer-statement.md \
  -o exports/dct-issuer-statement-<YYYYMMDD>.pdf
```

### Metadata JSON file

- [ ] **Prepared** – Stage `dynamic-capital-ton/contracts/jetton/metadata.json`
      for attachment without compression.
- [ ] **Verified** – Run
      `sha256sum dynamic-capital-ton/contracts/jetton/metadata.json` and confirm
      the output equals
      `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`.
- [ ] **Logged** – Paste the digest output and validation timestamp into the
      escalation log entry for the dispatch.

> **Command reference:**

```sh
sha256sum dynamic-capital-ton/contracts/jetton/metadata.json
```

### SHA-256 digest note

- [ ] **Prepared** – Create `metadata-digest.txt` containing
      `SHA-256 (metadata.json) = 1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`
      and the calculation timestamp.
- [ ] **Verified** – Cross-check the digest note against the command output
      captured above.
- [ ] **Logged** – Archive the terminal output under
      `s3://dynamic-compliance/kyc/dct/2025-10-08/hashes/` and link the object
      key in the escalation log.

> **Command reference:**

```sh
mkdir -p evidence && \
  sha256sum dynamic-capital-ton/contracts/jetton/metadata.json | \
  tee evidence/metadata-digest.txt
```

### Verification script excerpt

- [ ] **Prepared** – Execute
      `$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/check-tonviewer-status.ts`
      and save the log as `check-tonviewer-status-<YYYYMMDD>.log`.
- [ ] **Verified** – Ensure the excerpt shown in the email includes the latest
      timestamp and verification flag (`none` until Tonviewer confirms).
- [ ] **Logged** – Upload the full log to
      `s3://dynamic-compliance/kyc/dct/2025-10-08/logs/` and reference the
      object key plus timestamp in the escalation log.

> **Command reference:**

```sh
mkdir -p logs && \
  $(bash scripts/deno_bin.sh) run -A \
    dynamic-capital-ton/apps/tools/check-tonviewer-status.ts | \
  tee logs/check-tonviewer-status-<YYYYMMDD>.log
```

### Compliance archive link

- [ ] **Prepared** – Generate a read-only pre-signed URL for
      `s3://dynamic-compliance/kyc/dct/2025-10-08/` that remains valid for at
      least 7 days.
- [ ] **Verified** – Review the S3 ACL and expiry to confirm Tonviewer receives
      view-only access.
- [ ] **Logged** – Record the generated link, expiry timestamp, and any access
      confirmations in ticket `DCT-COMP-2025-118` and the escalation log.

> **Command reference:**

```sh
aws s3 presign s3://dynamic-compliance/kyc/dct/2025-10-08/ --expires-in 604800
```

## Logging Instructions

- Update `/docs/tonviewer/tonviewer-escalation-log.md` with the dispatch
  timestamp and reference ID.
- Record any Tonviewer responses in the compliance ticket `DCT-COMP-2025-118`
  and sync with the analytics status report.
