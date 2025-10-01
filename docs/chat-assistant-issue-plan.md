# Dynamic Chat Assistant Issue Resolution Plan

> **Status:** The Chat Assistant widget has been removed from the marketing
> experience. This plan is retained for historical context should the feature
> return.

## Objectives

- Restore reliable status transitions for the Dynamic Capital AI assistant
  widget (`idle` → `syncing` → `connected` → `error`).
- Eliminate silent failures in history syncs and message sends.
- Provide clear fallbacks and observability so regressions surface quickly.

## Step-by-step Plan

### 1. Reproduce and document failures

- [ ] Capture console/network traces in staging and local builds while
      exercising:
  - [ ] Initial mount with/without prior history in `localStorage`.
  - [ ] Message send success and failure paths.
  - [ ] History fetch failure (simulate 5xx / timeout).
- [ ] Verify `syncStatus` transitions during each scenario and note mismatches
      between UI badges and actual state.
- [ ] Archive findings in an engineering notebook entry for traceability.

### 2. Fortify history bootstrap

- [ ] Update `useDynamicChat.fetchHistory` to surface fetch errors (reject
      promise with context).
- [ ] In `ChatAssistantWidget`, add `setSyncStatus("error")` when history sync
      fails, and show a toast so users understand why history is missing.
- [ ] Add integration test coverage that mocks a history failure and asserts the
      UI shows the reconnecting badge + fallback copy.

### 3. Harden message send pipeline

- [ ] Ensure `sendMessage` returns structured error objects (status code,
      request id) and log to an observability endpoint (e.g., Supabase log table
      or Sentry).
- [ ] In the widget, branch on known recoverable errors (validation, rate limit)
      vs. transport failures:
  - [ ] For recoverable issues, keep `syncStatus` at `idle` and display inline
        guidance.
  - [ ] For transport failures, reuse the fallback playbook and enter the
        `error` state.
- [ ] Add retry with exponential backoff for transient network errors before
      showing the fallback response.

### 4. Improve offline UX & recovery

- [ ] Persist the fallback assistant message separately so that once the
      connection is restored the UI can resume from the previous conversation
      instead of duplicating the fallback.
- [ ] Add a “Retry connection” CTA that triggers a history re-sync (sets
      `syncStatus` to `syncing` and calls `fetchHistory`).
- [ ] When a new assistant response arrives after an outage, automatically clear
      the `error` badge and toast a “Back online” confirmation.

### 5. Instrument & monitor

- [ ] Emit analytics events on each status change (`idle`, `syncing`,
      `connected`, `error`) with timestamps and session IDs.
- [ ] Dashboard the error-rate and average sync duration; set alerts when
      error-rate exceeds baseline.
- [ ] Establish a weekly regression review where the team inspects logs, open
      bugs, and user-reported issues.

### 6. Validation & rollout

- [ ] Run `npm run lint`, `npm run typecheck`, and targeted
      component/integration tests before merging.
- [ ] Ship to staging behind a feature flag; conduct smoke tests with the
      support desk.
- [ ] Roll out to production after 24 hours of stable telemetry; keep feature
      flag for rapid rollback.

## Exit Criteria

- [ ] Telemetry shows <1% error rate during message sends and history loads.
- [ ] Automated tests cover history failure, message send failure, and recovery
      paths.
- [ ] Support desk confirms fallback copy and retry controls behave as expected.
