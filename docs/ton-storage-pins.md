# TON Storage Pin Registry

Use this registry to track TON Storage content hashes that must remain pinned
for production availability.

## Active pins

| Added on   | Operator    | Content hash                                                         | Artifact description                           | Notes                                                                                         |
| ---------- | ----------- | -------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 2025-10-10 | Dynamic Ops | bag:78c26d7594151335f3b137318ef151dab6b98106e784206841d307a4b8296695 | TON Site public asset bundle (apps/web/public) | Hash tracked via `scripts/verify/ton_storage.mjs`; update after publishing new gateway bundle |

## Archive

Move entries here once decommissioned.

| Removed on | Content hash | Reason               | Linked ticket                          |
| ---------- | ------------ | -------------------- | -------------------------------------- |
| YYYY-MM-DD | bag:<hash>   | superseded by v1.4.1 | https://github.com/dynamic-capital/... |
