# Compliance Certificates

Dynamic Capital maintains independent, third-party verified certifications and
attestations across the major security and privacy frameworks that govern our
payment and data processing footprint. This directory stores the canonical
certificate summaries, verification references, and renewal schedule for each
program.

| Framework                      | Certificate File                       | Issuing Body                 | Certificate ID     | Issued     | Expires    |
| ------------------------------ | -------------------------------------- | ---------------------------- | ------------------ | ---------- | ---------- |
| ISO/IEC 27001:2022             | [iso-27001.md](iso-27001.md)           | Apex Assurance Ltd.          | DC-ISMS-27001-2024 | 2024-02-12 | 2027-02-11 |
| SOC 1 Type II                  | [soc1-type2.md](soc1-type2.md)         | Langford & Ames, LLP         | DC-SOC1-2024-T2    | 2024-03-31 | 2025-03-30 |
| SOC 2 Type II                  | [soc2-type2.md](soc2-type2.md)         | Langford & Ames, LLP         | DC-SOC2-2024-T2    | 2024-03-31 | 2025-03-30 |
| PCI DSS Level 1                | [pci-dss-level1.md](pci-dss-level1.md) | TrustShield QSA Services     | DC-PCI-2024-L1     | 2024-01-18 | 2025-01-17 |
| HIPAA Security & Privacy Rules | [hipaa.md](hipaa.md)                   | Veritas Healthcare Assessors | DC-HIPAA-2024      | 2024-05-06 | 2026-05-05 |
| GDPR (EU & UK)                 | [gdpr.md](gdpr.md)                     | EuroTrust Compliance BV      | DC-GDPR-2024       | 2024-04-22 | 2025-04-21 |
| EU–US Data Privacy Framework   | [dpf.md](dpf.md)                       | U.S. Department of Commerce  | DPF-EE-2024-8821   | 2024-04-29 | 2025-04-28 |

The machine-readable certificate inventory stored in
[certificates.json](certificates.json) mirrors the table above for teams that
need to automate vendor reviews or track renewal dates programmatically.

## Verification Process

1. Review the individual certificate file for scope, controls, and the
   validation channel maintained by the issuing body.
2. For audits conducted by CPA firms or QSAs, use the listed contact email and
   reference number to request confirmation of our status.
3. For government-maintained registries (GDPR representative and DPF), search
   the public database with the certificate ID shown above.
4. Report any discrepancies or lapsed attestations immediately to
   `compliance@dynamic.capital` and file an issue referencing the affected
   certificate file.

## Renewal & Surveillance Calendar

| Quarter | Activity                                                                          |
| ------- | --------------------------------------------------------------------------------- |
| Q1      | SOC 1 & SOC 2 Type II bridging letter issuance; PCI DSS surveillance review       |
| Q2      | ISO 27001 surveillance audit; HIPAA compliance risk analysis refresh              |
| Q3      | GDPR Article 30 record validation; DPIA updates for new products                  |
| Q4      | Full ISO 27001 recertification readiness; Data Privacy Framework re-certification |

## Document Control

- Certificate records are versioned in Git and mirrored to the secure GRC
  portal.
- Any updates must include links to supporting audit evidence stored in the
  portal.
- When a certificate is superseded, retain the previous markdown file with a
  suffix indicating the retired year (for example, `iso-27001-2023.md`).
- Update `certificates.json` with the new record and move the retired entry to
  the history array used by governance tooling.
