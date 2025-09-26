# Tribute Contracts Integration Checklist

Use this checklist to plan and execute a Tribute DAO governance integration
inside the Dynamic Capital stack.

## Pre-integration Planning

- [ ] Clarify the DAO governance workflows to expose (e.g., share/loot
      membership, proposal queues, Guild Bank treasury controls).
- [ ] Document the target EVM network(s) and deployment strategy for Tribute
      contracts.
- [ ] Identify stakeholders for approvals, sign-offs, and multisig ownership.

## Contract Deployment & Configuration

- [ ] Deploy or fork the required Tribute contracts to the selected network.
- [ ] Record contract addresses, governance tokens, voting parameters, and
      multisig owners.
- [ ] Store configuration values securely (environment variables or Supabase
      seed data) without committing secrets.

## Supabase Data Modeling

- [ ] Design Supabase tables for members, proposals, votes, and executed
      actions.
- [ ] Mirror existing schema patterns (ledgers, lifecycle statuses, admin-only
      flows) for consistency.
- [ ] Define row-level security rules aligned with Dynamic Capital conventions.

## Event Ingestion & Edge Functions

- [ ] Implement an edge function or webhook listener that verifies the upstream
      source (Alchemy/Infura secret or custom relayer).
- [ ] Normalize Tribute contract events and persist them in Supabase tables.
- [ ] Trigger stored procedures or RPC calls to recompute proposal state and
      notifications.

## Integration Layer & Frontend Updates

- [ ] Create reusable helpers under `apps/web/integrations/tribute` for contract
      interactions and data access.
- [ ] Build Next.js pages/components that query Supabase for proposals, votes,
      and treasury data.
- [ ] Ensure UI follows existing Tailwind and component composition patterns.

## Automation & Notifications

- [ ] Schedule follow-up work (e.g., grace-period timers, execution
      transactions) using the queue in `queue/index.ts`.
- [ ] Connect Supabase events to Telegram and broadcast functions for
      member/admin alerts.
- [ ] Validate that automations have retries, backoff, and optional persistence
      configured.

## Testing & Validation

- [ ] Run repository quality gates (`npm run format`, `npm run lint`,
      `npm run typecheck`, and relevant tests).
- [ ] Execute end-to-end dry runs covering proposal creation, voting, and
      execution flows.
- [ ] Confirm Supabase data integrity and notification delivery in staging
      before production rollout.
