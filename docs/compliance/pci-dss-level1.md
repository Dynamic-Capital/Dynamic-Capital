---
standard: PCI DSS v4.0 Level 1 Service Provider
certificate_id: DC-PCI-2024-L1
issuer: TrustShield QSA Services
issued: 2024-01-18
expires: 2025-01-17
status: Active
---

# PCI DSS v4.0 Attestation of Compliance (AOC)

**Merchant/Service Provider:** Dynamic Capital, Inc. \\ **Qualified Security
Assessor (QSA):** TrustShield QSA Services, QSA Company No. 21245

TrustShield QSA Services has performed an onsite assessment of Dynamic Capital,
Inc. in accordance with the Payment Card Industry Data Security Standard (PCI
DSS) v4.0. Dynamic Capital has been found to be compliant with the PCI DSS
requirements for a Level 1 Service Provider.

## Assessed Services

- Tokenized card-on-file payment orchestration for exchange partners.
- Settlement and reconciliation workflows processed via the Dynamic Capital
  payment hub.
- Management of secure payment data environments hosted on AWS, DigitalOcean,
  and Supabase.

## Noted Compensating Controls

| Requirement | Control                      | Description                                                                                                     |
| ----------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 3.4.1       | Transparent tokenization     | Cardholder data is immediately tokenized using FIPS 140-2 validated modules; clear data never persists in logs. |
| 6.4.3       | Secure development lifecycle | Mandatory code review and automated SAST (ESLint, Semgrep) integrated into CI/CD pipelines.                     |
| 10.2.1      | Centralized logging          | SIEM correlation through Datadog with immutable storage replication every 5 minutes.                            |

## Network Segmentation

Dynamic Capital maintains separate CDE, DMZ, and corporate networks. All ingress
traffic to the CDE terminates at the reverse proxy layer hardened according to
Appendix A3 of PCI DSS v4.0. Penetration testing reports (PT-2024-PCI) are
available in the secure portal.

## Verification Instructions

- Reference number: `DC-PCI-2024-L1`
- Contact: `support@trustshieldqsa.com`
- Phone: +1 (646) 555-7301
- TrustShield verification portal: <https://portal.trustshieldqsa.com/verify>

The signed Attestation of Compliance (AOC) and Responsibility Matrix are
archived at `grc/pci/2024/DC-PCI-2024-L1.zip`.
