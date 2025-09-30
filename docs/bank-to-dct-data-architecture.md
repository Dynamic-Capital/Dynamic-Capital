# Bank-to-DCT Data Architecture

## Purpose

This document translates the conversion strategy into an end-to-end data
architecture that supports fiat receipt capture, automated reconciliation, token
settlement, and downstream analytics. It highlights the operational data store
(ODS) layer inside Supabase, the analytical warehouse footprint, and the control
planes that guarantee compliance and auditability.

## Architectural Layers

1. **Edge & Integration Layer**
   - Bank webhooks, manual review portal uploads, and TON/USDT swap callbacks.
   - Events ingested through Supabase Edge Functions with signature validation
     and payload hashing.
2. **Operational Data Store (Postgres/Supabase)**
   - Normalized schema for orders, payment signals, verification, and on-chain
     settlements.
   - Row Level Security (RLS) policies segregate customer data from ops/finance
     teams.
3. **Analytics & Warehouse Layer**
   - Nightly ELT from Supabase into the analytics warehouse (e.g., BigQuery or
     Snowflake) via managed pipelines (Fivetran/Supabase Log Drains).
   - Modeled marts for treasury, compliance, and product metrics.
4. **Observability & Audit Layer**
   - Immutable append-only logs with cryptographic sealing.
   - Scheduled reconciliations and anomaly detection metrics pushed to Grafana
     and PagerDuty.

## Entity Relationship Model

```
+----------------+     +---------------------+     +--------------------+
|   users        |     |     orders           |     | treasury_transfers |
|----------------|     |----------------------|     |--------------------|
| id (PK)        | 1  n| id (PK)              |1   1| id (PK)            |
| tier           |-----| user_id (FK->users)  |-----| order_id (FK)      |
| risk_flags     |     | amount_fiat          |     | tx_hash            |
+----------------+     | target_dct           |     | amount_dct         |
                       | reference_code (FK)  |     | network            |
                       | quote_hash           |     +--------------------+
                       | status               |               |
                       | expires_at           |               |
                       +----------+-----------+               |
                                  |1                              n
                                  |                               |
                                  v                               v
                         +-------------------+        +----------------------+
                         | payment_references|        | verification_logs    |
                         |-------------------|        |----------------------|
                         | reference_code PK |        | id PK               |
                         | order_id FK       |        | order_id FK         |
                         | status            |        | rule_name           |
                         | reserved_at       |        | result              |
                         +-------------------+        | reviewer_id         |
                                                      | notes               |
                                                      +----------------------+
```

Additional supporting tables:

- `receipt_uploads` – references storage bucket metadata and checksum values.
- `bank_events_raw` – immutable ledger of webhook payloads with verification
  signatures.
- `bank_events_normalized` – parsed view keyed by `reference_code` and
  transaction identifiers for reconciliation joins.
- `accounting_ledger` – double-entry ledger bridging fiat accounts and on-chain
  treasury balances.

## Supabase Schema Definition

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('tier_0', 'tier_1', 'tier_2')),
  risk_flags jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  amount_fiat numeric(18,2) not null,
  target_dct numeric(36,8) not null,
  status text not null check (status in (
    'draft','pending','awaiting_payment','verifying','settled','failed','cancelled'
  )),
  reference_code text unique not null,
  quote_hash text not null,
  expires_at timestamptz not null,
  pricing_locked_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table payment_references (
  reference_code text primary key,
  order_id uuid references orders(id),
  status text not null check (status in ('reserved','assigned','expired','consumed')),
  reserved_at timestamptz default now(),
  consumed_at timestamptz,
  unique (order_id)
);

create table receipt_uploads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  storage_path text not null,
  checksum_sha256 text not null,
  file_bytes bigint not null,
  uploaded_by uuid not null,
  uploaded_at timestamptz default now(),
  constraint receipt_unique_per_order unique (order_id, uploaded_by)
);

create table bank_events_raw (
  id bigint generated always as identity primary key,
  provider text not null,
  payload jsonb not null,
  signature text not null,
  received_at timestamptz default now(),
  hash_sha256 text not null unique
);

create table bank_events_normalized (
  id bigint generated always as identity primary key,
  raw_event_id bigint not null references bank_events_raw(id),
  reference_code text not null,
  sender_account text,
  sender_name text,
  amount_fiat numeric(18,2) not null,
  currency text not null,
  transaction_date timestamptz not null,
  status text not null,
  unique(reference_code, sender_account, transaction_date)
);

create table verification_logs (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id),
  rule_name text not null,
  result text not null check (result in ('pass','fail','manual_review')),
  reviewer_id uuid,
  notes text,
  created_at timestamptz default now()
);

create table treasury_transfers (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id),
  tx_hash text not null unique,
  signer_public_key text not null,
  amount_dct numeric(36,8) not null,
  fee_dct numeric(36,8) default 0,
  network text not null,
  settled_at timestamptz default now()
);

create table accounting_ledger (
  id bigint generated always as identity primary key,
  entry_type text not null check (entry_type in ('fiat','token','fee','adjustment')),
  reference_id uuid not null,
  reference_table text not null,
  debit numeric(36,8) default 0,
  credit numeric(36,8) default 0,
  currency text not null,
  memo text,
  occurred_at timestamptz default now()
);

create table audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create materialized view reconciliation_dashboard as
select
  o.id as order_id,
  o.status,
  o.amount_fiat,
  o.target_dct,
  o.reference_code,
  be.transaction_date,
  be.amount_fiat as bank_amount,
  tt.amount_dct,
  tt.tx_hash,
  greatest(o.updated_at, coalesce(tt.settled_at, o.updated_at)) as last_touch
from orders o
left join bank_events_normalized be on be.reference_code = o.reference_code
left join treasury_transfers tt on tt.order_id = o.id;
```

## Data Processing Pipelines

### Ingestion

- **Edge Function `ingest-bank-event`:** Validates headers, hashes payloads, and
  inserts into `bank_events_raw` with conflict handling for replays.
- **Manual Review UI:** Inserts metadata into `receipt_uploads` and enqueues a
  `verification_jobs` task (handled by Supabase Functions or external worker).
- **TON Settlement Listener:** Listens to treasury wallet events, enriches with
  gas costs, and upserts `treasury_transfers` rows.

### Reconciliation Workflow

1. `orders` with status `awaiting_payment` are matched against normalized bank
   events every 5 minutes via a background worker.
2. Matches trigger verification rule evaluation; results flow into
   `verification_logs` and update order status to `verifying`.
3. On success, settlement job creates `treasury_transfers` rows and posts
   double-entry lines in `accounting_ledger`.
4. Any mismatch moves the order to `manual_review` and notifies the operations
   queue through Supabase Realtime channels.

### Analytics Sync

- **Change Data Capture:** Supabase Log Drains export WAL changes to object
  storage. Fivetran/Snowpipe ingests into the warehouse hourly.
- **Data Modeling:** dbt project defines marts `mart_revenue`, `mart_liquidity`,
  and `mart_compliance_flags` built on top of staging tables.
- **BI/Reporting:** Looker/Metabase dashboards use the materialized mart tables
  with row-level filters for finance vs. compliance audiences.

## Security and Governance

- **Row-Level Security:**
  - Users can only select from `orders` where `user_id = auth.uid()`.
  - Operations role has read access to `orders`, `payment_references`, and
    `bank_events_normalized` via dedicated policies.
- **Secrets Management:** Bank API secrets stored in Supabase Vault; edge
  functions read via sealed secrets with rotation every 90 days.
- **Access Control:**
  - Finance role: write to `treasury_transfers`, read-only on `bank_events_raw`.
  - Compliance role: full read on audit and ledger tables.
  - Engineering role: manage schema migrations via migration pipelines.
- **Data Retention:**
  - `bank_events_raw` retained indefinitely with quarterly archival to cold
    storage.
  - Receipts older than 24 months moved to encrypted cold storage with hash
    references kept in `receipt_uploads`.
- **Backups:** Nightly logical backups via `pg_dump` and hourly WAL archival to
  cloud storage buckets with 35-day retention.

## Monitoring and Quality Controls

- **Reconciliation Metrics:** Delta between bank amounts and token settlements,
  flagged when deviation exceeds 0.5% or 100 MVR.
- **Throughput Dashboards:** Orders per hour, settlement latency, and manual
  review queue length.
- **Data Quality Tests:**
  - dbt tests for uniqueness of `reference_code`, non-null `tx_hash`, and valid
    status transitions.
  - Great Expectations suite validating currency codes and numeric ranges.
- **Alerts:** PagerDuty alerts for stalled reconciliation jobs, high manual
  review backlog, or repeated verification failures from the same account.

## Future Extensions

- **Multi-Currency Support:** Add `currency` fields to `orders` and convert
  using FX rate tables keyed by provider feeds.
- **Token Buyback Automation:** Extend `treasury_transfers` with `direction`
  flag to handle buybacks and integrate with on-chain DEX liquidity metrics.
- **Machine Learning Scoring:** Introduce `risk_scores` table storing model
  inferences for anomaly detection, including feature importance artifacts for
  compliance review.
