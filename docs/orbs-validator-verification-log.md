# Orbs Validator Verification Log

## Overview

This log captures Orbs network validator verification records supplied on 15
November 2022. Each entry documents the validator's base64-encoded public key,
network endpoint, and the verifying authority. The structured dataset lives at
[`data/orbs_validator_verifications.json`](../data/orbs_validator_verifications.json)
for downstream tooling.

## Automation

- Run `npm run orbs:verify-mainnet` to execute the connectivity and schema
  validation checks against the dataset. The command emits a console summary and
  persists detailed results to
  [`data/orbs_mainnet_verification_report.json`](../data/orbs_mainnet_verification_report.json)
  for audit trails.

## Verification records

| Status   | Public key (base64)                            | IP address | Verification date | Verifier |
| -------- | ---------------------------------------------- | ---------- | ----------------- | -------- |
| Verified | `edaMyPS3LRFd28UVd7qP6YK1Y/JWrW4+hT+ydMO8TRY=` | 3.3.3.3    | 2022-11-15        | orbs.com |
| Verified | `0fjyUVE88fJa2IgWpNjjz6O9TC8ftFoSwb+DI1HvFM8=` | 3.3.3.4    | 2022-11-15        | orbs.com |
| Verified | `1fWcZGowOI0gTHZyTPhTX2s3iBnMSdqsNqJYCWNj0A4=` | 3.3.3.5    | 2022-11-15        | orbs.com |

## Latest mainnet verification run

| Timestamp (UTC)          | Verifier DNS | Verifier HTTPS   | Notes                                                   |
| ------------------------ | ------------ | ---------------- | ------------------------------------------------------- |
| 2025-10-12T01:38:44.105Z | ✅           | ⚠️ `ENETUNREACH` | Domain resolves, but HTTPS probe failed from CI runner. |

| Public key (base64)                            | IP address | TCP:443        | TCP:80         | Additional context                        |
| ---------------------------------------------- | ---------- | -------------- | -------------- | ----------------------------------------- |
| `edaMyPS3LRFd28UVd7qP6YK1Y/JWrW4+hT+ydMO8TRY=` | 3.3.3.3    | ⚠️ ENETUNREACH | ⚠️ ENETUNREACH | Connectivity blocked from runner network. |
| `0fjyUVE88fJa2IgWpNjjz6O9TC8ftFoSwb+DI1HvFM8=` | 3.3.3.4    | ⚠️ ENETUNREACH | ⚠️ ENETUNREACH | Connectivity blocked from runner network. |
| `1fWcZGowOI0gTHZyTPhTX2s3iBnMSdqsNqJYCWNj0A4=` | 3.3.3.5    | ⚠️ ENETUNREACH | ⚠️ ENETUNREACH | Connectivity blocked from runner network. |

## Next steps

- Incorporate the records into validator governance dashboards and alerting
  pipelines.
- Track future verification events chronologically in this log, appending new
  entries to both the table and the JSON dataset.
