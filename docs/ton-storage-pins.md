# TON Storage Pin Registry

Use this registry to track TON Storage content hashes that must remain pinned
for production availability.

## Active pins

| Added on   | Operator    | Content hash                                                         | Artifact description                           | Notes                                                                                         |
| ---------- | ----------- | -------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 2025-10-06 | Dynamic Ops | bag:9da7628952ce0cd02234e7195285beb9afdcff649349a5f870315c0b159dba96 | TON Site public asset bundle (apps/web/public) | Hash tracked via `scripts/verify/ton_storage.mjs`; update after publishing new gateway bundle |

## Archive

Move entries here once decommissioned.

| Removed on | Content hash | Reason               | Linked ticket                          |
| ---------- | ------------ | -------------------- | -------------------------------------- |
| YYYY-MM-DD | bag:<hash>   | superseded by v1.4.1 | https://github.com/dynamic-capital/... |
