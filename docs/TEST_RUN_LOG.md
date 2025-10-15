# Test Run Log

## 2025-10-02

- Ran `npm run test` to validate the workspace after refreshing dependencies.

## 2025-10-15

- Executed `npm run test` from the repository root to verify Deno tests succeed with `DENO_TLS_CA_STORE=system`.
- Executed `npm run test` within `apps/web` to confirm the combined Deno and Vitest suites pass using the system CA store.
