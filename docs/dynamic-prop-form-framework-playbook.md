# Dynamic Prop Form Framework Playbook

A field guide for launching, scaling, and governing the Dynamic Capital Proposal
Framework. This playbook translates the high-level governance vision into
actionable architecture, operations, and growth practices that ensure every
proposal is anchored in transparency, token-aligned incentives, and verifiable
execution.

## Table of Contents

<!-- TOC:START -->

- [1. Core Concept](#1-core-concept)
- [2. Core Components](#2-core-components)
- [3. Token-Gated Mechanics](#3-token-gated-mechanics)
- [4. System Blueprint](#4-system-blueprint)
- [5. Database Tables](#5-database-tables)
- [6. Smart Contract Modules](#6-smart-contract-modules)
- [7. Governance Lifecycle](#7-governance-lifecycle)
- [8. Roles & Access Control](#8-roles--access-control)
- [9. API Endpoints](#9-api-endpoints)
- [10. Form Schema Example](#10-form-schema-example)
- [11. Voting Modes](#11-voting-modes)
- [12. Security & Auditing](#12-security--auditing)
- [13. Deployment Roadmap](#13-deployment-roadmap)
- [14. Governance Parameters](#14-governance-parameters)
- [15. Example Proposal Flow](#15-example-proposal-flow)
- [16. Branding & UI Guidelines](#16-branding--ui-guidelines)
- [17. Expansion Modules](#17-expansion-modules)
- [18. Vision Alignment](#18-vision-alignment)

<!-- TOC:END -->

## 1. Core Concept

Dynamic governance anchored in DCT: every proposal, review, and execution step
is financially accountable to the token. Stake-weighted participation ensures
incentives stay aligned with treasury protection and long-term value creation.

- **North Star:** Deliver a transparent, modular governance engine where DCT is
  the mechanism for legitimacy, not just payment.
- **Accountability Loop:** Stake → Vote → Execute → Audit → Iterate. Each cycle
  surfaces insights for parameter tuning and product improvements.

## 2. Core Components

A cohesive stack that integrates UX, data, and blockchain execution.

- **Frontend:** Next.js web dashboard with a TON Mini-App experience for
  mobile-native actions. Use component-driven UI with deep links to on-chain
  verification.
- **Backend:** Supabase as the primary persistence layer (Postgres + Row Level
  Security) plus edge functions for deterministic workflows.
- **Blockchain:** TON smart contracts enforce proposal states, voting records,
  and treasury operations.
- **Token:** DCT Jetton powers staking, fees, rewards, and treasury denominated
  value.

## 3. Token-Gated Mechanics

Design token flows so every governance interaction leaves an economic trace.

- **Stake to Vote:** Participants must stake DCT to unlock voting rights,
  preventing low-effort spam and aligning with long-term incentives.
- **Proposal Bond:** Proposers lock a refundable bond sized by proposal impact.
  Returned on success; slashed on abuse.
- **Submission Tax:** A configurable fee (burn, treasury, or curator split)
  discourages frivolous drafts.
- **Voting Rewards:** Redistribute a portion of fees to active voters
  proportionate to stake and participation quality.

## 4. System Blueprint

A resilient pipeline that translates user intent into enforceable DAO actions.

1. **User Intake:** Dynamic Form Builder captures structured requirements with
   validation.
2. **Data Layer:** Supabase stores schemas, proposals, versions, and votes with
   auditable history.
3. **Edge Functions:** Serverless logic coordinates stake checks, bond
   accounting, and event notifications.
4. **On-Chain Registry:** TON Registry contract records canonical proposal
   metadata and status hashes.
5. **Vote Manager:** Smart contract tallies votes, enforces quorum/duration, and
   signals resolution.
6. **DAO Treasury:** Executor module releases or reallocates funds after
   successful proposals.

## 5. Database Tables

Model governance artifacts with normalized tables and versioning controls.

| Table               | Purpose                                                             | Key Fields                                                |
| ------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| `form_schemas`      | Stores JSON schemas, UI metadata, and conditional logic references. | `id`, `name`, `json_schema`, `ui_schema`, `version`       |
| `proposals`         | Canonical proposal record tied to on-chain registry entry.          | `id`, `slug`, `author_id`, `registry_address`, `state`    |
| `proposal_versions` | Append-only change history with reviewer notes.                     | `proposal_id`, `version`, `diff`, `status`, `reviewed_by` |
| `votes`             | On-chain vote receipts mirrored for analytics.                      | `proposal_id`, `voter_id`, `weight`, `choice`, `tx_hash`  |
| `stakes`            | Stake ledger tracking lockups, rewards, and slash events.           | `wallet`, `amount`, `lock_expiry`, `purpose`              |
| `settings`          | Configurable governance parameters (see Section 14).                | `key`, `value`, `updated_by`                              |
| `roles`             | Access control assignments and scope definitions.                   | `user_id`, `role`, `permissions`                          |

## 6. Smart Contract Modules

A composable TON contract suite that mirrors the data model and lifecycle.

- **ProposalRegistry:** Canonical store for proposal hashes, proposer identity,
  and lifecycle checkpoints.
- **VoteManager:** Handles stake verification, vote casting, tallying, and
  quorum checks with snapshotting.
- **Executor:** Bridges governance outcomes to treasury actions; enforces
  multi-step execution if needed.
- **Treasury:** Custodies DCT and other assets, applying distribution rules,
  refunds, or slashes on command.

## 7. Governance Lifecycle

A staged flow that blends off-chain coordination with on-chain guarantees.

1. **Draft:** Proposer configures a schema-driven form and outlines intent.
2. **Review:** Curators validate completeness, compliance, and budget
   assumptions.
3. **Ballot Creation:** Proposal hash registered on-chain; snapshot block and
   parameters locked.
4. **Voting:** Stake-gated participation with automated reminders and analytics
   dashboards.
5. **Resolution:** VoteManager finalizes outcome, triggering notifications and
   readiness checks.
6. **Execution:** Executor runs treasury actions, updates Supabase state, and
   archives immutable records.

## 8. Roles & Access Control

Map responsibilities to prevent centralization and streamline oversight.

- **Admin:** Defines parameters, manages roles, and performs emergency stops.
- **Curator:** Reviews drafts, approves ballot creation, and enforces quality
  standards.
- **Proposer:** Crafts proposals, posts bonds, and liaises with stakeholders.
- **Voter:** Stakes DCT, casts votes, and monitors proposal execution.
- **Observer:** Read-only access for community transparency and analytics
  contributors.

Rely on Supabase RLS policies and smart contract permissioning to align
on/off-chain authority.

## 9. API Endpoints

RESTful facade that powers the frontend, bots, and third-party integrations.

| Endpoint            | Method | Purpose                                                            |
| ------------------- | ------ | ------------------------------------------------------------------ |
| `/forms/create`     | `POST` | Register a new form schema or template variant.                    |
| `/proposals/create` | `POST` | Submit a draft proposal with bond metadata and attachments.        |
| `/proposals/:id`    | `GET`  | Retrieve proposal details, status, and audit trail.                |
| `/vote`             | `POST` | Submit a signed vote payload after TON transaction confirmation.   |
| `/execute`          | `POST` | Trigger Executor pipeline post-resolution with idempotency guards. |

## 10. Form Schema Example

Budget Request schema blueprint using JSON Schema with conditional logic.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Budget Request",
  "type": "object",
  "properties": {
    "proposal_title": { "type": "string", "minLength": 8 },
    "description": { "type": "string", "minLength": 64 },
    "budget_amount": { "type": "number", "minimum": 0 },
    "budget_currency": { "type": "string", "enum": ["DCT", "USDT", "TON"] },
    "milestones": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "deliverable": { "type": "string" },
          "release_condition": { "type": "string" },
          "amount": { "type": "number", "minimum": 0 }
        },
        "required": ["name", "deliverable", "amount"]
      },
      "minItems": 1
    },
    "requires_multisig": { "type": "boolean" },
    "multisig_details": {
      "type": "string",
      "minLength": 32
    }
  },
  "required": [
    "proposal_title",
    "description",
    "budget_amount",
    "budget_currency",
    "milestones"
  ],
  "allOf": [
    {
      "if": { "properties": { "requires_multisig": { "const": true } } },
      "then": { "required": ["multisig_details"] }
    }
  ]
}
```

Pair the schema with UI hints (stepper layout, milestone repeaters) stored in
`ui_schema`. Version schemas and map them to proposal categories for rapid
iteration.

## 11. Voting Modes

Offer multiple voting strategies tuned for proposal types.

- **Token Weighted:** Default mode—votes proportional to staked DCT.
- **Quadratic:** Dampens whale dominance by squaring stake weights.
- **Conviction:** Continuous-time accumulation rewarding consistent support.
- **Ranked:** Ordered preference ballots to surface consensus among multiple
  options.

Expose configuration in `settings` table with analytics to evaluate impact by
cohort.

## 12. Security & Auditing

Build verifiability into every layer to earn long-term trust.

- **Immutable Hashes:** Store content hashes in the ProposalRegistry to detect
  tampering.
- **Staking Snapshots:** Capture vote-weight snapshots at ballot creation to
  prevent stake re-use.
- **RLS Policies:** Enforce row-level access rules in Supabase for
  least-privilege operations.
- **IPFS Storage:** Pin attachments and evidence to IPFS for
  censorship-resistant archiving.
- **Audit Logs:** Stream Supabase changes to external storage (S3, BigQuery) for
  tamper-evident history.

## 13. Deployment Roadmap

Phase-based rollout to minimize risk while accelerating value delivery.

1. **Phase 1 – Setup:** Provision Supabase project, TON accounts, CI/CD, and
   baseline docs.
2. **Phase 2 – Contracts:** Deploy ProposalRegistry, VoteManager, Executor,
   Treasury with integration tests.
3. **Phase 3 – Mini-App:** Build and certify TON Mini-App, ensuring parity with
   web dashboard.
4. **Phase 4 – Treasury:** Connect treasury safes, set up accounting, and
   simulate execution scenarios.
5. **Phase 5 – DAO Launch:** Run genesis proposals, onboard stakeholders, and
   publish governance analytics.

## 14. Governance Parameters

Expose tunable levers in `settings` for adaptive governance.

| Parameter     | Description                                                   | Notes                                          |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `quorum`      | Minimum percentage of eligible stake required for resolution. | Define per voting mode.                        |
| `duration`    | Voting window in blocks or hours.                             | Supports extensions if quorum unmet.           |
| `bond`        | Default proposal bond as % of requested budget or fixed DCT.  | Adjust for category risk.                      |
| `fee_split`   | Distribution of submission tax across burn/treasury/curators. | Store as JSON percentages.                     |
| `voting_mode` | Active voting strategy.                                       | Token Weighted, Quadratic, Conviction, Ranked. |

Pair parameter updates with change proposals requiring supermajority approval.

## 15. Example Proposal Flow

A canonical end-to-end walkthrough.

1. **Stake:** User locks DCT to achieve proposer and voter eligibility
   thresholds.
2. **Submit:** Draft completed via Budget Request schema; bond and submission
   tax collected.
3. **Review:** Curator approves after diligence checks and milestone validation.
4. **Ballot:** Proposal hash registered; eligible stake snapshot captured;
   voting opens.
5. **Vote:** Community participates using configured voting mode; reminders sent
   via Mini-App and bots.
6. **Resolve:** VoteManager finalizes results; on success, bond refunded and
   execution scheduled.
7. **Execute:** Executor triggers treasury disbursements, updates Supabase
   state, and emits final audit log.

## 16. Branding & UI Guidelines

Deliver a cohesive identity across web, mobile, and blockchain touchpoints.

- **Theme:** “Dynamic Governance” with responsive layouts prioritizing clarity
  of proposal status and treasury health.
- **Colors:** Primary DCT Blue `#1C44C7`, accent gradient `#2A3B90 → #EC2127`,
  complementary neutrals for readability.
- **Typography:** Inter for body copy, Space Grotesk for headings and numerics.
  Enforce consistent scale via design tokens.
- **Components:** Modular cards for proposals, timeline components for lifecycle
  visualization, and token-gated call-to-action buttons.
- **Accessibility:** Maintain WCAG AA contrast, focus states, and keyboard
  navigation across dashboard and Mini-App.

## 17. Expansion Modules

Plan for future growth with modular add-ons.

- **Proposal Analytics:** Advanced dashboards tracking approval rates, voter
  cohorts, and treasury impact.
- **AI Drafting:** Assist proposers with schema-compliant drafts and budget
  benchmarks.
- **NFT Badges:** Gamified recognition for curators, top voters, and successful
  proposers.
- **Alerts Bot:** Cross-platform notifications for milestones, quorum progress,
  and treasury events.
- **Cross-Chain Voting:** Bridge vote attestations from partner ecosystems for
  federated governance.

## 18. Vision Alignment

The Dynamic Prop Form Framework reinforces Dynamic Capital’s commitment to
transparent governance, decentralized decision-making, and token-based
accountability. Keep feedback loops open with the community, refine incentives
as market conditions evolve, and maintain human oversight over automated
execution to preserve trust and resilience.
