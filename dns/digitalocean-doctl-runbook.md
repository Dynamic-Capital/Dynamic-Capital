# DigitalOcean DNS configuration with doctl

This runbook documents how to reconcile the `dynamic-capital.ondigitalocean.app`
DNS zone with the repository snapshot using the DigitalOcean CLI (`doctl`). It
complements the App Platform spec sync tooling so operations engineers can
preview changes, import the managed zone file, and verify record state before
handing off to production.

## Prerequisites

- DigitalOcean personal access token with **Read** and **Write** permissions for
  Domains and App Platform.
- `doctl` installed and authenticated. The repository provides a helper:

  ```bash
  npm run doctl:install -- --token "$DIGITALOCEAN_TOKEN"
  ```

  The script downloads the latest release into `./.bin/doctl`, runs
  `doctl auth init`, and writes the active context to
  `~/.config/dynamic-capital/doctl` unless you override `--config-dir`.
- Node.js ≥ 18 to execute the sync helper (`npm` ships with the repo).
- Deno ≥ 1.42 if you plan to diff JSON plans with
  `scripts/configure-digitalocean-dns.ts`.
- Repository checkout on the commit that reflects the desired DNS snapshot (see
  [`dns/dynamic-capital.ondigitalocean.app.zone`](./dynamic-capital.ondigitalocean.app.zone)).

## 1. Confirm access and capture the current state

1. Ensure the correct `doctl` context is active:

   ```bash
   ./.bin/doctl auth list
   ./.bin/doctl auth switch --context dynamic-capital
   ```

   Replace `dynamic-capital` if your context is named differently.
2. Export the current zone state for comparison and rollback:

   ```bash
   ./.bin/doctl compute domain records list dynamic-capital.ondigitalocean.app \
     --output json > /tmp/dynamic-capital.ondigitalocean.app.before.json
   ```

   Keep this file until the change is validated so you can restore any records
   that should not be modified.

## 2. Review and edit the desired zone file

- The authoritative snapshot lives in
  [`dns/dynamic-capital.ondigitalocean.app.zone`](./dynamic-capital.ondigitalocean.app.zone).
  Update this file to reflect new A/CNAME/TXT records. Keep TTLs consistent with
  the defaults (`3600` for persistent records, `300` for verification tokens)
  unless a shorter propagation window is required.
- Document the rationale for material changes directly in the zone file using
  semicolon-prefixed comments so the history remains auditable.
- Mirror the same record set in
  [`dns/dynamic-capital.ondigitalocean.app.json`](./dynamic-capital.ondigitalocean.app.json)
  so dry-run tooling stays aligned with the zone snapshot.

## 3. Preview the import plan (optional but recommended)

You can run a dry plan to ensure `doctl` sees the expected diff before pushing
updates. The repository mirrors the zone snapshot in JSON form at
[`dns/dynamic-capital.ondigitalocean.app.json`](./dynamic-capital.ondigitalocean.app.json),
which the helper consumes:

```bash
deno run -A scripts/configure-digitalocean-dns.ts \
  --domain=dynamic-capital.ondigitalocean.app \
  --config=dns/dynamic-capital.ondigitalocean.app.json \
  --dry-run
```

- Supply `--state=/tmp/dynamic-capital.ondigitalocean.app.before.json` if you
  captured the prior state to avoid calling `doctl` again.
- Add `--context=<name>` when you need a non-default `doctl` context.
- The dry run prints records that would be created, updated, or pruned. No API
  calls are made while `--dry-run` is set.

## 4. Import the zone via the sync helper

The repository ships with `npm run doctl:sync-site`, which updates both the App
Platform spec and DNS zone. To import the zone without changing the spec, pass
`--apply-zone` and point it at the zone snapshot:

```bash
npm run doctl:sync-site -- \
  --app-id <APP_ID> \
  --site-url https://dynamic-capital-qazf2.ondigitalocean.app \
  --apply-zone \
  --zone dynamic-capital.ondigitalocean.app \
  --zone-file dns/dynamic-capital.ondigitalocean.app.zone
```

- `--app-id` must match the DigitalOcean App that fronts the TON gateway.
- `--site-url` is required by the helper even when you only plan to import the
  DNS zone. Use the origin URL that should remain canonical after the change.
- Append `--context <name>` if you authenticated multiple `doctl` contexts.
- To push spec changes at the same time, add `--apply`; otherwise the helper
  only imports the DNS zone.

When the command runs it prints the resolved zone file path and the underlying
`doctl compute domain records import` invocation.

If you prefer to call `doctl` directly (for example inside a CI job), invoke
`doctl compute domain records import` with the rendered zone file:

```bash
./.bin/doctl compute domain records import dynamic-capital.ondigitalocean.app \
  --zone-file dns/dynamic-capital.ondigitalocean.app.zone \
  ${DOCTL_CONTEXT:+--context "$DOCTL_CONTEXT"}
```

The `${DOCTL_CONTEXT:+...}` expansion passes a specific context only when the
`DOCTL_CONTEXT` environment variable is set, keeping the command compatible with
both interactive sessions and unattended automation.

## 5. Post-import verification

1. Inspect the records on DigitalOcean to confirm the import succeeded:

   ```bash
   ./.bin/doctl compute domain records list dynamic-capital.ondigitalocean.app \
     --output json | jq '.[].data'
   ```

2. Re-run any dependent health checks (for example, the TON gateway probes in
   [`dns/https-gateway-verification-2025-10-08.md`](./https-gateway-verification-2025-10-08.md)).
3. Update the operational logs with the change timestamp and transaction hash
   (if the update corresponds to a TON resolver change) in
   [`dns/ton-dns-operations-log.md`](./ton-dns-operations-log.md).
4. Archive the `/tmp/dynamic-capital.ondigitalocean.app.before.json` snapshot in
   case a rollback is required.

## 6. Rollback procedure

If a regression is detected after the import:

1. Restore the previous zone state using the JSON snapshot:

   ```bash
   jq -r '.[] | "\(.type) \(.name) \(.data)"' \
     /tmp/dynamic-capital.ondigitalocean.app.before.json
   ```

   Review the output to confirm the entries match expectations.
2. Re-apply the saved records:

   ```bash
   ./.bin/doctl compute domain records import dynamic-capital.ondigitalocean.app \
     --zone-file dns/dynamic-capital.ondigitalocean.app.zone
   ```

   Replace the zone file with the archived version if you reverted it in Git.
3. Re-run the verification probes and leave a note in the operations log to
   document the rollback.

## 7. Audit checklist

- [ ] Change recorded in `dns/ton-dns-operations-log.md` with timestamp,
      operator, and summary.
- [ ] Zone snapshot committed (`dns/dynamic-capital.ondigitalocean.app.zone`).
- [ ] Health checks or synthetic probes confirm the expected hosts respond.
- [ ] Rollback artefacts stored securely (`before.json`, relevant console logs).

Following this workflow keeps the DigitalOcean DNS zone aligned with the
repository state and preserves the audit trail required by governance.
