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
