<!-- deno-fmt-ignore-file -->

# Test Execution Report — 2026-05-28

## Overview

- **Initiated By:** GPT-5.3-Codex project refresh
- **Purpose:** Re-establish current project health after a long pause and replace stale status placeholders.
- **Environment Notes:** Node.js v20.20.2, npm 11.4.2, Deno resolved through `scripts/deno_bin.sh` when the shell did not expose `deno` directly.

## Results

- **Lint:** `npm run lint` passed after installing workspace dependencies with `npm install --legacy-peer-deps`.
- **Typecheck:** `npm run typecheck` passed.
- **Tests:** `npm run test` passed after fixes with 173 tests passed, 0 failed, and 1 ignored.

## Fixes Applied During Refresh

1. Removed a duplicate beneficiary helper import that prevented the Telegram bot module from importing.
2. Exported `sendMessage`, `sendMiniAppLink`, `serveWebhook`, and `getSupabase` seams used by existing tests.
3. Guarded Telegram bot auto-serving in tests with `__SUPABASE_SKIP_AUTO_SERVE__` to avoid duplicate `Deno.serve` port binds.
4. Restored header-based Telegram webhook validation alongside the legacy query-secret path.
5. Updated receipt endpoint tests to include the required internal bot secret for explicit `telegram_id` fallback submissions.
6. Forced local server smoke tests to bypass the HTTP proxy for loopback requests.

## Audit Notes

- `npm audit --audit-level=critical` currently exits non-zero and reports 57 vulnerabilities (2 low, 29 moderate, 25 high, 1 critical). Several suggested remediations require breaking upgrades or upstream dependency changes, so the audit backlog should be triaged separately instead of applying `npm audit fix --force` blindly.

## Follow-Up Actions

1. Review and prioritize the dependency audit backlog reported by npm after dependency installation.
2. Keep release/status docs synchronized with the project updater so roadmap and feature registry entries do not regress to placeholders.
3. Consider reducing Telegram bot import side effects further so test-only imports do not emit production startup logs.
