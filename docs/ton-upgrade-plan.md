# TON Upgrade Validation Plan

## Current State

- **Installed package:** `ton@13.9.0`
- **Transitive vulnerability:** `axios@0.25.0` bundled within the `ton` tarball
  introduces three known high-severity advisories.
- **Latest published TON release inspected:** `ton@13.9.0` (no vendor patch for
  the bundled axios version as of the audit).

Command evidence:

```bash
npm audit --omit=dev
```

## Upgrade Strategy

1. **Dependency override spike**
   - Prototype an `overrides` entry that forces `ton` to consume `axios@^1.7.7`.
   - Execute `npm install --package-lock-only` to capture the new lockfile graph
     in an isolated branch.
   - Run the following regression suite to ensure the patched axios client does
     not break TON workflows:
     - `npm run lint`
     - `npm run typecheck`
     - `npm run test`
     - `npm run ton:site-status`
   - Roll back if TON's HTTP client rejects the newer axios API surface (track
     in issue `SEC-1087`).

2. **Monitor upstream changelog**
   - Subscribe to TON release notes and watch for a vendor patch that replaces
     axios or upgrades to `>=1.7.x`.
   - If an upstream fix ships first, prefer vendor resolution instead of an
     override to minimize drift from official support.

3. **Fail-safe rollout**
   - Land the override (or vendor patch) behind a feature flag targeting staging
     nodes.
   - Observe TON RPC success rates, latency, and webhook callback health for 48
     hours.
   - Promote to production with a post-deploy smoke test using
     `npm run ton:mainnet-status`.

## Timeline & Owners

| Phase                       | Owner                        | Target Date | Status  |
| --------------------------- | ---------------------------- | ----------- | ------- |
| Override spike & regression | @dynamic-capital/maintainers | 2025-01-10  | Pending |
| Upstream monitoring         | @dynamic-capital/maintainers | Continuous  | Active  |
| Production rollout          | @dynamic-capital/maintainers | 2025-01-15  | Pending |

## Risks & Mitigations

- **Risk:** TON SDK request signing may rely on axios 0.x interceptors.
  - **Mitigation:** Capture signed request fixtures before the override and diff
    serialized payloads after the upgrade.
- **Risk:** Override drift makes future TON upgrades harder.
  - **Mitigation:** Document override rationale in the repository and create a
    periodic reminder (via `ops-sync`) to verify upstream status.

## Decision Log

- 2024-12-27 — Recorded npm audit evidence and scheduled override evaluation for
  the maintainers guild.
