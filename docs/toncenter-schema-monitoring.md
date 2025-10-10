# TONCenter Schema Monitoring Playbook

## Overview

The scheduled **TONCenter Schema Audit** workflow validates account action
payloads against our `TonActionRecord` expectations. The new JSON export lets us
monitor results consistently and capture evidence when the upstream schema
evolves.

## Reviewing Workflow Results

- The GitHub Action writes a structured `schema-report.json` artifact on every
  run and appends a summary to the workflow run page.
- Inspect the **Actions → TONCenter Schema Audit** run, open the job, and review
  the step summary for a per-account breakdown of record counts and unknown
  fields.
- Download the `toncenter-schema-report` artifact for the exact JSON payload if
  deeper debugging is required.

## Responding to Schema Drift Alerts

- The summariser step now exits with a non-zero status whenever `has_drift` is
  true. GitHub therefore highlights the run as failed and sends standard
  workflow failure notifications.
- When drift is reported, extract the `unknown_fields` section for the affected
  account(s) and update the TON action parsing helpers before re-running the
  audit locally.

## Adjusting the Account Watchlist

- Update the watchlist by editing the multiline `TONCENTER_SCHEMA_ACCOUNTS`
  value inside `.github/workflows/toncenter-schema-audit.yml`.
- The 2025-10-09 refresh expanded coverage to the following additional
  production accounts while ownership classification is being confirmed:

  | Account                                            | Status | Coverage note                                      |
  | -------------------------------------------------- | ------ | -------------------------------------------------- |
  | `EQDyAmBSxP1-D--D9GBazb0-MNmZ8ecttc_njImeEzt_heIA` | Active | Auxiliary liquidity routing (pending attribution). |
  | `EQDz0wQL6EEdgbPkFgS7nNmywzr468AvgLyhH7PIMALxPB6G` | Active | Awaiting tonviewer label review before escalation. |
  | `EQDz5SDaF1B8jGEfthlLjVzkByQPbG-FStBVEHAFmS_3wZ-O` | Active | Monitor settlement and emissions side-flows.       |
  | `EQD1BCRMqIkSzt3XpWGORH_HvX5lHNbpDDtvzCGdDoArGYQn` | Active | Candidate treasury satellite wallet.               |
  | `EQD1mjivKNskrad8FQV8UtNAC6ayMB5bgv6rYmhOcSKPLjZc` | Active | Track potential staking or lockbox disbursements.  |
  | `EQD2dUSfVIJVT77aBEIjXBe_Z1oj9Kwh40TngDmTEol0l68b` | Active | Validate swap routing activity as data surfaces.   |
  | `EQD5xwKMuP4X39iy7Ta79x9QBB4U0pds25eEfuLS6O5icwgy` | Active | Flag high-volume transfers for confirmation.       |
  | `EQD6JaMgi4nf1YpdSyYV5SoIvYPhDNqdUGrgZeRJbjMqJxKD` | Active | Temporary watch while ownership tracing completes. |
  | `EQD6Tv6Kbqp-RYPl_T9Rum_pixdFX71IC83doVRu0fIqv50d` | Active | Trace contract interactions for schema inference.  |
  | `EQD7y8d1ImET4WqHclpIJVED2WHKCXb4U3riNV6spyWmzuya` | Active | Observe derivative routing or bridging flows.      |
  | `EQD9flc1cUiQA-gpEx9J9AsVmRp-VbjP4z4eTLZ5fsfvTGFi` | Active | Capture cross-program transfers and log anomalies. |
  | `EQD-mBBkUdiPEbkdli268DKsQxNMyPNHD7aDMSwliXG57SFy` | Active | Hold until schema deltas stabilise.                |
- For ad-hoc investigations, run the CLI locally:
  ```bash
  python -m dynamic_ton.schema_guard_runner --account <ACCOUNT> --limit 50 --include-accounts \
    --output-json local-schema-report.json --output-include-records --allow-drift
  ```
- Commit any permanent watchlist changes so the scheduled workflow stays aligned
  with the accounts you care about.

## Managing Credentials

- The workflow reads `TONCENTER_API_KEY` from repository secrets. Rotate the key
  via **Settings → Secrets and variables → Actions** and the job will
  automatically pick up the new value.
- For local audits, export `TONCENTER_API_KEY` before invoking the CLI if the
  account set requires elevated rate limits.

## Recommended Next Steps

- Review the workflow results after the next scheduled run to confirm the JSON
  export is available and the summary renders as expected.
- Maintain a short list of high-value wallets in the watchlist to keep
  monitoring costs low while still covering critical contracts.

## Verification Snapshots

### 2025-10-06

The scheduled audit helper was executed locally with the current watchlist to
validate the JSON export and summary renderer. The `render_summary_markdown`
helper now emits a **Run overview** section that consolidates the account count,
fetch limit, total records, and drift status for quick scanning before the
per-account breakdown.

| Account                                            | Records Fetched | Unknown Fields |
| -------------------------------------------------- | --------------: | -------------- |
| `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` |               4 | None           |
| `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` |               5 | None           |
| `UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G` |               5 | None           |

The run completed without detecting schema drift, so no watchlist changes are
required at this time.

### 2025-10-07

A follow-up audit was executed with
`python -m dynamic_ton.schema_guard_runner
--limit 20 --include-accounts --output-json local-schema-report.json
--allow-drift`
after exporting the latest DCT watchlist via the `TONCENTER_SCHEMA_ACCOUNTS`
environment variable. The generated JSON artifact contained summaries for all
three tracked contracts and the GitHub Actions summary renderer produced the
expected **Run overview** totals.

| Account                                            | Records Fetched | Unknown Fields |
| -------------------------------------------------- | --------------: | -------------- |
| `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` |               4 | None           |
| `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` |              20 | None           |
| `UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G` |               8 | None           |

The follow-up run completed without drift and confirmed that the summary markup
remains stable, so no changes to the watchlist are required.
