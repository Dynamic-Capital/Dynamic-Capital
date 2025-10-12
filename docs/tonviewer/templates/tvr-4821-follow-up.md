# Tonviewer Escalation `TVR-4821` Follow-up Template

## Subject Line

`TVR-4821` – Dynamic Capital Jetton Verification Follow-up

## Email Body Outline

1. **Greeting** – Address the assigned Tonviewer reviewer; if unknown use
   "Tonviewer Support Team".
2. **Context Recap** – Reference the original verification submission on
   2025-10-03 and the 2025-10-07 escalation that bundled the refreshed metadata
   digest `541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5`
   (revalidated 2025-10-12 10:14 UTC).
3. **Evidence Summary** – Confirm that the issuer statement export, metadata
   JSON, digest note, verification script log, and compliance archive link are
   attached or linked (see checklist below).
4. **Requested Action** – Ask for confirmation of receipt plus an estimated
   verification timeline and highlight any additional artefacts Tonviewer still
   requires.
5. **Next Steps** – Note that analytics will continue daily monitoring and
   provide the escalation contact alias for urgent follow-ups.
6. **Signature** – Use the Operations escalation signature block from the
   communications playbook.

## Attachments Checklist

For each artefact, confirm it is **prepared**, **verified**, and **logged**
before dispatching the message. Track completion directly in the escalation log
entry for 2025-10-07 or any subsequent resend.

### Preflight Automation

- [ ] Run the evidence preflight script to regenerate the metadata digest note
      and the latest Tonviewer status log before validating attachments.
- [ ] Review the JSON summary emitted by the script and confirm the
      `digestMatches` flag is `true`.
- [ ] Capture the `statusExitCode`/`statusWarning` fields from the script output
      (code `3` is expected until Tonviewer verifies) and quote any warning in
      the follow-up email.

> **Command reference**
>
> ```sh
> $(bash scripts/deno_bin.sh) run -A \
>   dynamic-capital-ton/apps/tools/tonviewer-evidence-preflight.ts \
>   --write-note evidence/metadata-digest.txt \
>   --log logs/check-tonviewer-status-<YYYYMMDD>.log
> ```

### Issuer Statement Export

- [ ] **Prepared** – Export `/docs/tonviewer/dct-issuer-statement.md` to PDF
      (unless Tonviewer reconfirms Markdown acceptance) and name it
      `dct-issuer-statement-<YYYYMMDD>.pdf`.
- [ ] **Verified** – Open the PDF to confirm the issuer signature block and
      metadata digest section render correctly.
- [ ] **Logged** – Capture export timestamp, filename, and SHA-256 hash in
      `/docs/tonviewer/tonviewer-escalation-log.md` and compliance ticket
      `DCT-COMP-2025-118`.

> **Command reference**
>
> ```sh
> npm run docs:export:issuer -- <YYYYMMDD>
> ```
>
> Append `-- --force` to overwrite an existing export for the same date.

### Metadata JSON

- [ ] **Prepared** – Stage `dynamic-capital-ton/contracts/jetton/metadata.json`
      for attachment without compression.
- [ ] **Verified** – Confirm the preflight script output reports
      `digestMatches: true` for the metadata file, matching
      `541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5`
      (revalidated 2025-10-12 10:14 UTC).
- [ ] **Logged** – Record the digest output and validation timestamp (from the
      script summary) in the escalation log and compliance ticket.

> **Fallback command**
>
> ```sh
> sha256sum dynamic-capital-ton/contracts/jetton/metadata.json
> ```

### Digest Note

- [ ] **Prepared** – Use the preflight script to create
      `evidence/metadata-digest.txt` containing the digest line and generated
      timestamp.
- [ ] **Verified** – Open the file and ensure the digest line matches the
      expected hash and the timestamp reflects the current run.
- [ ] **Logged** – Upload the digest note (or terminal output) to
      `s3://dynamic-compliance/kyc/dct/2025-10-08/hashes/` and reference the
      object key in the log.

> **Fallback command**
>
> ```sh
> mkdir -p evidence && \
>   sha256sum dynamic-capital-ton/contracts/jetton/metadata.json | \
>   tee evidence/metadata-digest.txt
> ```

### Verification Script Excerpt

- [ ] **Prepared** – Confirm the preflight script wrote
      `logs/check-tonviewer-status-<YYYYMMDD>.log` with the latest execution
      output.
- [ ] **Verified** – Ensure the excerpt quoted in the email shows the most
      recent timestamp and verification flag (`none` until Tonviewer confirms).
- [ ] **Logged** – Upload the log to
      `s3://dynamic-compliance/kyc/dct/2025-10-08/logs/` and record the object
      key in the escalation log.

> **Fallback command**
>
> ```sh
> mkdir -p logs && \
>   $(bash scripts/deno_bin.sh) run -A \
>     dynamic-capital-ton/apps/tools/check-tonviewer-status.ts | \
>   tee logs/check-tonviewer-status-<YYYYMMDD>.log
> ```

### Compliance Archive Link

- [ ] **Prepared** – Generate a read-only presigned URL for
      `s3://dynamic-compliance/kyc/dct/2025-10-08/` that remains valid for at
      least seven days.
- [ ] **Verified** – Confirm ACL and expiry reflect read-only access before
      sharing externally.
- [ ] **Logged** – Note the generated link, expiry timestamp, and any access
      confirmations in ticket `DCT-COMP-2025-118` and the escalation log.

> **Command reference**
>
> ```sh
> aws s3 presign s3://dynamic-compliance/kyc/dct/2025-10-08/ --expires-in 604800
> ```

## Logging Reminders

- Update `/docs/tonviewer/tonviewer-escalation-log.md` with the dispatch
  timestamp, attachments checklist status, and reviewer responses.
- Sync compliance ticket `DCT-COMP-2025-118` and the Tonviewer status report
  once feedback is received.
