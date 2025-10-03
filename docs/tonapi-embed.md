# TonAPI Embed Service Integration Guide

## Overview

TonAPI Embed is a self-hosted indexer tailored for organizations that manage
TON- and Jetton-based deposits and withdrawals at scale. It consumes data
straight from one or more TON liteserver or archive nodes, verifies proofs, and
exposes a REST API so centralized exchanges, custodians, and payment processors
can reconcile balances, monitor transfers, and orchestrate withdrawals.

## Core Capabilities

- **Unified transfer history** – Normalizes inbound and outbound TON and Jetton
  transfers into a single feed with sender/recipient metadata, LT, transaction
  hash, and optional message comments.
- **Jetton awareness** – Tracks Jetton deposits by mapping wallet contracts to
  their master contracts and reporting balances in minimum indivisible units
  with the correct decimal semantics.
- **Self-hosted proof validation** – Connects to trusted or untrusted
  liteservers and archive nodes, re-checking proofs before emitting data.
- **Flexible API surface** – Ships with REST endpoints for balances, transfer
  lookups, address enrolment, domain resolution, and service health.
- **Historical backfill** – Replays transfers from the time a deposit smart
  contract was created, requiring archive node access for long-lived wallets.

## Infrastructure & Dependencies

| Component              | Purpose                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| Liteserver node        | Provides network access for current chain data and proof verification.   |
| Archive node           | Supplies historical ledger data needed for deep backfills.               |
| Deposit smart contract | Wallet or Jetton-specific contract that actually holds customer funds.   |
| Private key store      | Holds wallet signing keys for withdrawal flows (optional, per customer). |

> **Note:** Private keys are only required when extending the service with
> withdrawal orchestration. Deposit tracking operates in a read-only mode.

## Key Terminology

- **Message** – Atomic packet of data exchanged between smart contracts on TON.
- **Transaction** – Low-level operation that processes inbound messages, can
  emit outbound messages, and mutates an account state.
- **Transfer** – Higher-level abstraction that represents the movement of assets
  between deposit smart contracts. One transfer may involve multiple messages or
  transactions under the hood.
- **Deposit address** – TON address that accepts funds on behalf of customers.
  It may differ from the smart contract that ultimately stores Jetton balances.
- **Minimum indivisible units** – NanoTON for TON or Jetton-specific smallest
  denominations. Convert to human-readable amounts using the Jetton `decimals`
  parameter.
- **LT (logical time)** – Monotonically increasing counter for ordering
  transactions on a given account.

## REST API Reference

| Endpoint                                        | Description                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /account/{address}/history`                | Paginated TON transfer history for a deposit address.                                   |
| `GET /jetton/{jetton}/{address}/history`        | Paginated Jetton transfer history referencing the master contract and wallet.           |
| `GET /account/{address}/history/{hash}`         | Retrieves a specific TON transfer by transaction hash.                                  |
| `GET /jetton/{jetton}/{address}/history/{hash}` | Retrieves a specific Jetton transfer by transaction hash.                               |
| `GET /account/{address}`                        | Latest TON balance, masterchain seqno, and last seen LT for the deposit smart contract. |
| `GET /jetton/{jetton}/{address}`                | Latest Jetton balance and synchronization pointers for the associated wallet.           |
| `POST /account/{address}`                       | Registers a new TON deposit smart contract for tracking.                                |
| `POST /jetton/{jetton}/{address}`               | Registers a Jetton wallet and its owner for tracking.                                   |
| `GET /resolve/{domain}`                         | Resolves TON DNS (NFT-based) domain names to smart contract addresses.                  |
| `GET /status`                                   | Reports service health plus synchronization lag versus the latest masterchain block.    |

### Transfer Payload Fields

Each history endpoint returns structured payloads that include:

- Sender and recipient addresses.
- Jetton master address (when applicable).
- Amount in minimum indivisible units (nanoTON or Jetton-specific).
- Unix timestamp.
- Logical time (LT).
- Transaction hash (unique transfer identifier).
- Optional message comment text.
- Network fee paid in TON.

### Balance Response Fields

The balance endpoints respond with:

- Current balance in minimum indivisible units.
- Masterchain block `seqno` used as the synchronization point.
- Last observed transaction LT.
- Last processed transaction LT (the most recent transfer already persisted in
  history tables).

## Integration Workflow

1. **Provision node access** – Connect TonAPI Embed to at least one liteserver
   node and, when historical replay is required, an archive node.
2. **Register deposit addresses** – Call the appropriate `POST /account` or
   `POST /jetton` endpoint for every wallet or Jetton deposit contract you need
   to monitor. For Jettons, the owner wallet is automatically enrolled so fees
   can be attributed correctly.
3. **Consume transfer history** – Poll the history endpoints using pagination to
   ingest deposits and withdrawals into your settlement or compliance systems.
4. **Track balances** – Query the balance endpoints to reconcile ledger states
   and confirm the service is synchronized with the latest masterchain block.
5. **Monitor health** – Scrape `/status` to verify indexing lag, node
   connectivity, and overall service health. Integrate alerts when lag exceeds
   your SLA.
6. **Extend for withdrawals (optional)** – Implement custom logic atop the
   withdrawal scaffolding provided by TonAPI Embed to craft, sign, and submit
   outbound TON or Jetton messages.

## Operational Considerations

- **Centralized vs. individual deposits** – Centralized deposit addresses often
  require memos/comments for attribution. Individual addresses eliminate memo
  handling but increase operational overhead.
- **Fee variability** – TON transaction fees depend on payload size, gas usage,
  and network conditions. Budget buffers in treasury systems instead of assuming
  a fixed fee schedule.
- **Security** – Treat liteserver credentials, node endpoints, and optional
  private keys as sensitive secrets. Apply rate limiting and observability
  around `/status` to spot indexing regressions early.
- **Scalability** – Horizontal scaling is primarily bound by node throughput and
  how quickly the service can page through historical transfers. Ensure archive
  node access before onboarding long-lived deposit contracts.

## Quick Links

- Demo instance: <https://demo-embed.tonapi.io/>
- Swagger file: Refer to the published schema for exact request/response models.
- Swagger UI: Explore endpoints interactively via the hosted documentation.

Use this guide to plug TonAPI Embed into Dynamic Capital’s broader TON treasury
stack, ensuring deposits, withdrawals, and compliance checks stay in sync with
canonical chain data.
