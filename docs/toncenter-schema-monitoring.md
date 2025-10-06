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
helper now emits a **Run overview** section that consolidates the account
count, fetch limit, total records, and drift status for quick scanning before
the per-account breakdown.

| Account | Records Fetched | Unknown Fields |
| --- | ---: | --- |
| `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` | 4 | None |
| `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` | 5 | None |
| `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | 5 | None |

The run completed without detecting schema drift, so no watchlist changes are
required at this time.

### 2025-10-07

A follow-up audit was executed with `python -m dynamic_ton.schema_guard_runner
--limit 20 --include-accounts --output-json local-schema-report.json
--allow-drift` after exporting the latest DCT watchlist via the
`TONCENTER_SCHEMA_ACCOUNTS` environment variable. The generated JSON artifact
contained summaries for all three tracked contracts and the GitHub Actions
summary renderer produced the expected **Run overview** totals.

| Account | Records Fetched | Unknown Fields |
| --- | ---: | --- |
| `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` | 4 | None |
| `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` | 20 | None |
| `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | 8 | None |

The follow-up run completed without drift and confirmed that the summary markup
remains stable, so no changes to the watchlist are required.
