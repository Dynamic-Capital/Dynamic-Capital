# Third-party Attributions

This bridge builds on design patterns and queue conventions from the
[`abhidp/tradingview-to-metatrader5`](https://github.com/abhidp/tradingview-to-metatrader5)
project (commit `139a8595a353841dfe88771cfb54320d4489fe03`). The upstream code
is licensed under the MIT License. The Dynamic Capital fork introduces:

- Supabase ingestion instead of the original mitmproxy alert path.
- A Redis-backed reliable queue with health metrics for listener and worker.
- Supabase status updates for optimistic locking and execution telemetry.
- Documentation for securing credentials on Windows hosts.
