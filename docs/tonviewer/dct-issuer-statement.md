# Dynamic Capital Token Issuer Statement

## Overview

Dynamic Capital attests that the Dynamic Capital Token (DCT) is the official
governance and utility token for the Dynamic Capital ecosystem. The token
contract resides at
`0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38` on the TON
blockchain.

## Token Details

| Attribute                 | Value                                  |
| ------------------------- | -------------------------------------- |
| Name                      | Dynamic Capital Token                  |
| Symbol                    | DCT                                    |
| Decimals                  | 9                                      |
| Total Supply (minted)     | 100,000,000 DCT                        |
| Issuance Date             | 2025-07-18                             |
| Smart Contract Repository | `dynamic-capital-ton/contracts/jetton` |

## Purpose

- Facilitate community governance votes.
- Provide access to premium analytics dashboards.
- Align incentives between Dynamic Capital and stakeholders.

## Compliance & Documentation

- **KYC Lead:** Compliance Office (compliance@dynamic.capital)
- **Audit Status:** Internal security review completed Q3 2025; external audit
  scheduled for Q4 2025.
- **Supporting Materials:**
  - Smart contract bytecode and source reference in the internal Git repository
    (`dynamic-capital-ton/contracts/jetton`).
  - Proof-of-mint transaction hash
    `f4b87c5bd23c1d6db1dfc6b9349b825ea6d3944d18d4e7d0c6d2b3e5b6b1c482`.
  - Corporate resolution authorizing issuance dated 2025-07-15 (archived in the
    compliance drive).

## Escalation Evidence (2025-10-07 Refresh)

- PDF export `exports/dct-issuer-statement-20251007.pdf` generated via `pandoc`;
  SHA-256 recorded in the escalation log.
- Metadata digest
  `1e2ee164089558184acd118d05400f7e6ba9adbef6885b378df629bd84f8aab4` confirmed
  against `metadata.json` prior to dispatch.
- Compliance archive location `s3://dynamic-compliance/kyc/dct/2025-10-08/`
  contains notarized KYC dossier, digest note, and verification logs for
  Tonviewer reviewers.
- Evidence preflight automation
  (`dynamic-capital-ton/apps/tools/tonviewer-evidence-preflight.ts`) regenerates
  the digest note and status log for each resend cycle.

## Contact

For verification requests, please reach out to compliance@dynamic.capital and
include "Tonviewer Verification" in the subject line. The compliance office will
respond within two business days and can provide notarized corporate documents
if required.

## Attestation

Dynamic Capital confirms that no other tokens represent governance or equity
exposure to the Dynamic Capital ecosystem. Any discrepancies discovered should
be reported immediately to compliance@dynamic.capital for investigation and
remediation.
