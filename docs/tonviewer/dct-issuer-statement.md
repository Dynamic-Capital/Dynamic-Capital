# Dynamic Capital Token Issuer Statement

## Overview

Dynamic Capital attests that the Dynamic Capital Token (DCT) is the official
governance and utility token for the Dynamic Capital ecosystem. The token
contract resides at
`0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7` on the TON
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

## Escalation Evidence Refresh Workflow

- Run `npm run docs:export:issuer -- <YYYYMMDD>` to generate
  `exports/dct-issuer-statement-<YYYYMMDD>.pdf` with Pandoc (append `-- --force`
  to overwrite an existing export). Record the SHA-256 hash in the escalation
  log immediately after creation.
- Metadata digest
  `541fc6e557a10e703a1568da31b3a97078907cd1391cfae61e5d1df01227c3a5` confirmed
  against `metadata.json` prior to dispatch (regenerated 2025-10-12 10:14 UTC).
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
