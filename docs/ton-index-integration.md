# TON Index Integration Guide

## Overview
- [`ton-index-go`](https://github.com/toncenter/ton-index-go) provides a REST API that mirrors the data served by Toncenter's hosted indexer.
- The project exposes `/api/v3/accountStates` and `/api/v3/transactions` endpoints, backed by a PostgreSQL database synchronised with TON blockchain data.
- This guide explains how to deploy the service and consume it inside Dynamic Capital's Python tooling via `TonIndexClient`.

## Deploying `ton-index-go`
### Local development with Docker Compose
1. Clone the repository and change into it:
   ```bash
   git clone https://github.com/toncenter/ton-index-go.git
   cd ton-index-go
   ```
2. Provide the required environment variables (see [Configuration](#configuration)). For secrets, place the PostgreSQL password in `private/postgres_password`.
3. Build and launch the stack:
   ```bash
   export IMAGE_TAG=local
   docker compose up --build
   ```
4. The API listens on `http://localhost:8081/api/v3`. Confirm the service is live:
   ```bash
   curl "http://localhost:8081/api/v3/accountStates?address=<wallet-address>"
   ```

### Production deployment with Ansible
1. Copy `ansible/config.yaml` and `ansible/inventory.yaml` into an encrypted `private/` folder and customise the hostnames plus database credentials.
2. Optionally adjust `services.api.additional_args` (for example, `-bind ":4100"`) to align with your ingress configuration.
3. Execute the systemd deployment playbook:
   ```bash
   ansible-playbook -e private/config.yaml systemd-deploy.yaml
   ```
4. The playbook provisions the API binary, configures systemd units for the API and metadata fetcher services, and reloads them on completion.

## Configuration
The container and systemd targets read their settings from environment variables. Populate them through your orchestrator or the Ansible inventory.

| Variable | Purpose |
| --- | --- |
| `POSTGRES_DIALECT` | Database driver (`postgresql` by default). |
| `POSTGRES_HOST`, `POSTGRES_PORT` | Location of the TON index PostgreSQL instance. |
| `POSTGRES_USER`, `POSTGRES_DBNAME` | Credentials and database name used by the API. |
| `POSTGRES_PASSWORD_FILE` | Path (inside the container) that holds the password secret. |
| `TON_INDEXER_API_ROOT_PATH` | Optional prefix for the served API routes (e.g., `/api/v3`). |
| `TON_INDEXER_API_TITLE` | Title exposed in the generated OpenAPI spec. |
| `TON_INDEXER_TON_HTTP_API_ENDPOINT` | TON HTTP RPC endpoint used for backfilling metadata. |
| `TON_INDEXER_IS_TESTNET` | Set to `true` when indexing testnet data. |

## Consuming the API from Dynamic Capital tooling
1. Install the async HTTP dependency if your environment does not already include it:
   ```bash
   pip install httpx
   ```
2. Instantiate `TonIndexClient` with the base URL of your deployment and, if required, the `X-Api-Key` issued by your gateway:
   ```python
   from dynamic_ton.ton_index_client import TonIndexClient

   ton_index = TonIndexClient(
       base_url="https://tonindexer.example.com/api/v3",
       api_key="<optional-api-key>",
   )
   ```
3. Provide the client to `TonDataCollector` to unlock the higher-level helpers:
   ```python
   from dynamic_ton.data_pipeline import TonDataCollector

   collector = TonDataCollector(ton_index_client=ton_index)

   states = await collector.fetch_account_states([
       "0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789",
   ])
   txs = await collector.fetch_transactions(account="0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789")
   ```
4. Both helpers return typed dataclasses (`TonIndexAccountStatesResult` and `TonIndexTransactionsResult`) that expose convenience properties such as `.balance_ton` and `.total_fees_ton`.

## Operational checklist
- Monitor PostgreSQL replication lag; stale data will propagate to the API responses.
- Keep the metadata fetcher service healthy—the API enriches responses with address-book and token metadata sourced from it.
- Expose the `/docs` path served by the API to inspect the generated Swagger UI when debugging client integrations.

## Recommended Next Steps
- Integrate the new client calls into your trading or analytics pipelines and persist any derived signals.
- Define SLOs around response latency and error rates so the deployment can be monitored alongside other TON infrastructure.
- Schedule regular upgrades of the `ton-index-go` binary to benefit from indexer fixes and new fields exposed by the upstream API.
