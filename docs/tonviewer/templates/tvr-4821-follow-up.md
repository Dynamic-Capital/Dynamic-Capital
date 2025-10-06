# Tonviewer Escalation `TVR-4821` Follow-up Template

## Subject Line
`TVR-4821` – Dynamic Capital Jetton Verification Follow-up

## Email Body
1. **Greeting:** Address the Tonviewer support representative by name if available, otherwise use "Tonviewer Support Team".
2. **Context Recap:** Reference the original submission on 2025-10-03 and the 2025-10-07 escalation with metadata digest `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4`.
3. **Evidence Summary:**
   - Re-attach `/docs/tonviewer/dct-issuer-statement.pdf`.
   - Provide link to `s3://dynamic-compliance/kyc/dct/2025-10-08/` (read-only).
   - Include latest `check-tonviewer-status.ts` output snippet showing verification flag `none`.
4. **Requested Action:** Ask for confirmation of receipt and estimated verification timeline.
5. **Next Steps:** Notify that analytics will continue daily monitoring and provide contact channel for urgent clarifications.
6. **Signature:** Use the Operations escalation signature block from the Operations communications playbook.

## Attachments Checklist
- [ ] Issuer statement PDF
- [ ] Metadata JSON file and SHA-256 digest text
- [ ] Latest verification log excerpt

## Logging Instructions
- Update `/docs/tonviewer/tonviewer-escalation-log.md` with the dispatch timestamp and reference ID.
- Record any Tonviewer responses in the compliance ticket `DCT-COMP-2025-118` and sync with the analytics status report.
