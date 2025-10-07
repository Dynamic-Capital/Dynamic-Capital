# Dynamic Capital Liquidity Management Playbook

## 1. Objective

Maintain decentralized, transparent liquidity for the Dynamic Capital Token
(DCT) across TON-based DEXs while automating:

- Pool monitoring
- Buyback and burn mechanisms
- Rebalancing between STON.fi and DeDust
- Treasury growth tracking
- DAO-controlled parameters

## 2. Ecosystem Components

| Layer           | Platform | Purpose                                                         |
| --------------- | -------- | --------------------------------------------------------------- |
| Treasury Wallet | TON      | Holds DCT, TON, USDT — funds liquidity operations.              |
| STON.fi Pool    | TON DEX  | Primary DCT/TON pool focused on liquidity and visibility.       |
| DeDust Pool     | TON DEX  | Secondary DCT/TON pool optimized for deep liquidity.            |
| Supabase        | Backend  | Stores pool data, automation rules, and treasury logs.          |
| Edge Functions  | Supabase | Automate sync, rebalance, and buyback logic.                    |
| Admin Dashboard | Vercel   | Control panel for liquidity operations and DAO proposals.       |
| DAO Contract    | TON      | Future smart contract to approve and execute parameter changes. |

## 3. Liquidity Structure

- **Target Ratio:** 60% STON.fi / 40% DeDust.
- **Total LP Reserve (initial):** ≈ 105,000 DCT + 15 TON split across both
  pools.

| Pool            | Ratio | Purpose                              |
| --------------- | ----- | ------------------------------------ |
| STON.fi DCT/TON | 60%   | Price discovery and high visibility. |
| DeDust DCT/TON  | 40%   | Stability and deep market depth.     |

## 4. Price Logic

| Stage         | Price / DCT | Mechanism                    |
| ------------- | ----------- | ---------------------------- |
| Private Sale  | $0.02       | Internal VIP + Partners.     |
| IDO           | $0.05       | TONStarter Launch.           |
| Listing       | $0.10       | STON.fi / DeDust.            |
| Growth Target | $1–$5       | Buybacks + Treasury backing. |

## 5. Tokenomics Flow (Dynamic Liquidity Engine)

**Transaction Tax (Deflationary Model)**

- 50% → Burn
- 30% → Treasury
- 20% → Liquidity

**Automated Cycle**

1. User buys or sells DCT, triggering tax.
2. Treasury receives TON/USDT inflow (30%).
3. Supabase logs inflow, triggering an Edge Function.
4. Function splits inflow:
   - 20% → Add liquidity (STON.fi + DeDust).
   - 10% → Buy back DCT → burn (via Jetton).
5. Pool data synced hourly and dashboard updated.

## 6. Supabase Architecture

**Tables**

- `liquidity_pools`: defines DEX pools and parameters.
- `liquidity_positions`: current holdings, share %, and TVL.
- `automation_rules`: operational settings (buyback %, rebalance %).
- `treasury_flows`: all TON/USDT/DCT movements.
- `rebalances`: logs of pool rebalancing events.

**Core Functions**

| Function           | Task                                                       | Schedule |
| ------------------ | ---------------------------------------------------------- | -------- |
| `/sync-pool-stats` | Fetch STON.fi & DeDust pool data (TVL, price).             | Hourly   |
| `/buyback-burn`    | Buy DCT with TON/USDT and burn half of purchased DCT.      | Daily    |
| `/rebalance`       | Move LP between pools if weight deviates by more than 10%. | 6-hourly |
| `/liquidity-add`   | Add new liquidity from treasury inflows.                   | Weekly   |

## 7. Treasury Rules

- **Liquidity Split:** STON.fi 60% / DeDust 40%.
- **Buyback:**
  - 20% of all inflows used for DCT buybacks.
  - 50% of bought DCT automatically burned.
  - Remaining DCT returned to liquidity pools.
- **Rebalance Threshold:** Triggered when either pool deviates ±10% from target
  ratio.

## 8. Smart Contract Governance (DAO Upgrade Path)

| Function                     | Controlled by DAO                         |
| ---------------------------- | ----------------------------------------- |
| `setWeights(ston, dedust)`   | Adjust liquidity split.                   |
| `setPercents(buyback, burn)` | Adjust automation percentages.            |
| `setRouters(ston, dedust)`   | Update DEX endpoints.                     |
| `emergencyWithdraw()`        | DAO approval required.                    |
| `mint()`                     | Treasury → DAO-controlled minting policy. |

DAO proposals require ≥60% approval before execution. On approval, the smart
contract enacts the change.

## 9. Operations Workflow

1. **Add Liquidity**
   - Treasury converts portion of TON → DCT via DEX swap.
   - Deposit matching pair into STON.fi or DeDust.
   - Example: 6 TON + 56,287 DCT → STON.fi pool; 2 TON + 40,000 DCT → DeDust
     pool.
2. **Sync Data**
   - Supabase Edge runs `/sync-pool-stats` hourly.
   - Stores latest reserves, volume, and LP tokens.
3. **Execute Buyback**
   - Treasury inflows logged (mentorship payments, taxes).
   - `/buyback-burn` swaps TON → DCT and burns 50%.
4. **Rebalance Pools**
   - Triggered when STON.fi exceeds 65% or drops below 55% share.
   - Withdraw LP from overweight pool and deposit into underweight pool.
5. **DAO Oversight**
   - DAO votes monthly to adjust `buyback_pct`, `burn_pct`, or liquidity
     weights.
   - Supabase `automation_rules` updated through DAO action.

## 10. Security & Transparency

| Layer          | Protection                                                                               |
| -------------- | ---------------------------------------------------------------------------------------- |
| Supabase DB    | Row Level Security policies provide public read-only access; writes require service key. |
| Edge Functions | Secret-signed API keys only.                                                             |
| Wallet Keys    | Hardware wallet for cold storage; hot wallet holds less than 5% of treasury.             |
| Public Ledger  | Pool and treasury addresses visible on TON Explorer.                                     |
| Reporting      | Monthly reports auto-generated from `treasury_flows`.                                    |

## 11. Example Dashboard Metrics

| Metric           | Source                | Formula                                       |
| ---------------- | --------------------- | --------------------------------------------- |
| Pool TVL         | `/sync-pool-stats`    | STON.fi TVL + DeDust TVL.                     |
| Treasury Value   | `treasury_flows`      | Sum of inflows − outflows.                    |
| LP Share %       | `liquidity_positions` | `(Treasury LP / Total LP) × 100`.             |
| Burned DCT       | `buyback-burn` logs   | Total DCT burned over time.                   |
| Rebalance Events | `rebalances`          | Count of events and average drift percentage. |

## 12. Reporting Cycle

- **Daily:** Pool TVL and burn summary → Telegram mini-app.
- **Weekly:** Buyback results → Supabase log and marketing post.
- **Monthly:** DAO report PDF automatically generated and uploaded to reports
  bucket.

## 13. DAO Proposal Flow Example

**Proposal:** Increase buyback rate from 20% → 25% due to high treasury inflows.

1. DAO initiates vote.
2. If quorum (≥60%) passes, proposal executes `setPercents(25, 50)`.
3. Supabase updates `automation_rules.buyback_pct = 25`.
4. Next buyback cycle uses new rule automatically.

## 14. Automation Timeline

| Time    | Action                          |
| ------- | ------------------------------- |
| 00:00   | Buyback + burn.                 |
| 06:00   | Sync pool stats.                |
| 12:00   | Rebalance check.                |
| 18:00   | Pool sync.                      |
| Weekly  | Add liquidity from new inflows. |
| Monthly | DAO vote and treasury report.   |

## 15. Governance Philosophy

Dynamic Capital’s liquidity system blends automation and transparent governance:

- Automation ensures consistency.
- DAO oversight ensures transparency.
- Supabase provides verifiable data integrity.
- TON delivers public accountability.

This playbook formalizes the bridge between code, community, and capital.

## 16. Operational Audit Framework

Use this structured audit to validate the health of the liquidity engine and its
supporting infrastructure.

### 16.1 Scope Overview

- **Protocol Architecture:** Smart contract configuration, DEX integrations, and
  Supabase schema alignment.
- **Treasury Controls:** Wallet security posture, multisig coverage, and
  cold-storage thresholds.
- **Automation Stack:** Edge Function reliability, scheduling precision, and
  alerting coverage.
- **Data Integrity:** Supabase RLS policies, backup cadence, and telemetry
  validation.
- **Compliance & Reporting:** DAO vote provenance, tax treatment of burns, and
  public disclosures.

### 16.2 Audit Cadence

| Frequency | Responsible Party | Focus Areas                                                    | Deliverables                      |
| --------- | ----------------- | -------------------------------------------------------------- | --------------------------------- |
| Weekly    | Liquidity Ops     | Pool drift, treasury inflows, pending jobs.                    | Status report + backlog triage.   |
| Monthly   | Treasury Lead     | Buyback efficiency, burn ledger, governance queue.             | DAO report + Supabase snapshot.   |
| Quarterly | Security Council  | Smart contract diff review, wallet policy, RLS verification.   | Findings memo + remediation plan. |
| Annually  | External Auditor  | Full-stack review (contracts, Supabase, financial statements). | Assurance report shared publicly. |

### 16.3 Control Checklist

1. **Configuration Drift** — Compare deployed contract parameters to
   `automation_rules` and DAO-approved settings.
2. **Liquidity Split Compliance** — Verify pool weights remain within ±5% of the
   60/40 target outside of active rebalances.
3. **Treasury Reconciliation** — Match Supabase `treasury_flows` against
   on-chain transactions and wallet statements.
4. **Automation Reliability** — Confirm each Edge Function executed at the last
   scheduled interval and succeeded on retry.
5. **Incident Review** — Log any failed transactions, emergency withdrawals, or
   DAO overrides, including mitigation steps.

## 17. Back-to-Back Optimization Blueprint

Ensure consecutive liquidity operations execute smoothly with minimal idle
capital.

### 17.1 Sequential Runbook

1. **Pre-Run Validation (T−15 min)**
   - Lock configuration updates in Supabase (maintenance flag).
   - Snapshot pool metrics via `/sync-pool-stats` for baseline comparison.
2. **Rebalance Execution (T0)**
   - Prioritize rebalancing if deviation >8% to reduce compounding slippage.
   - Use atomic TON transactions when shifting LP between STON.fi and DeDust.
3. **Liquidity Augmentation (T+5 min)**
   - Deploy new liquidity in the underweight pool first to stabilize pricing.
   - Publish on-chain memo referencing Supabase job ID for traceability.
4. **Buyback and Burn (T+10 min)**
   - Execute `/buyback-burn` immediately after liquidity placement to capture
     refreshed market depth.
   - Verify burn receipt and record transaction hash in `treasury_flows`.
5. **Post-Run Sync (T+20 min)**
   - Trigger `/sync-pool-stats` and `/liquidity-add` (if queued) back-to-back to
     refresh dashboards and update automation backlog.
   - Clear maintenance flag and broadcast summary to DAO observers.

### 17.2 Concurrency Guardrails

- Enforce a single-flight lock per Edge Function to avoid overlapping
  executions.
- Queue manual interventions (e.g., emergency withdrawals) until the sequential
  runbook completes.
- Integrate alerting for any job exceeding a 3-minute execution window.

### 17.3 Efficiency Metrics

| Metric                     | Target                       | Collection Method                               |
| -------------------------- | ---------------------------- | ----------------------------------------------- |
| End-to-end cycle time      | ≤ 25 minutes                 | Supabase job timestamps.                        |
| TON utilization lag        | < 2 hours                    | Compare treasury inflow to first deployment tx. |
| Failed job retries         | 0 critical retries per cycle | Edge Function logs + PagerDuty.                 |
| Price impact per rebalance | < 1.5%                       | DEX execution analytics.                        |

## 18. Observability and Tooling Enhancements

- **Dashboards:** Expand the admin dashboard with widgets for sequential cycle
  timing, Edge Function queue depth, and contract parameter drift alerts.
- **Telemetry:** Stream Supabase function logs to a centralized log pipeline
  (e.g., Grafana Loki) for real-time anomaly detection.
- **Alerting:** Configure thresholds for liquidity imbalance, unprocessed
  buyback inflows beyond 6 hours, and DAO proposal expirations.
- **Testing:** Implement simulation suites that replay treasury inflows to
  stress-test back-to-back operation throughput.

## 19. Implementation Roadmap

| Phase              | Timeline  | Milestones                                                                                             |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------ |
| Phase 1: Stabilize | Weeks 1–2 | Deploy audit checklist, enable single-flight locks, and set maintenance flag procedure.                |
| Phase 2: Automate  | Weeks 3–5 | Add telemetry metrics, automate sequential runbook triggers, and integrate alerting.                   |
| Phase 3: Scale     | Weeks 6–8 | Conduct external audit dry-run, publish observability dashboards, and formalize DAO reporting cadence. |

Regular retrospectives after each phase ensure lessons feed back into automation
rules and DAO governance proposals.

## 20. Run Playbook Execution Protocol

Operationalize the liquidity system with an explicit command sequence each time
a cycle is initiated.

### 20.1 Control Room Checklist

- [ ] Confirm Supabase and Edge Function status pages are green.
- [ ] Verify TON RPC endpoints (STON.fi, DeDust) respond within <300 ms latency.
- [ ] Validate treasury wallet balances match the latest `treasury_flows`
      snapshot.
- [ ] Review DAO queue to ensure no pending proposal conflicts with planned
      parameters.
- [ ] Communicate run start time and owner in the operations Telegram channel.

### 20.2 Execution Timeline

| Minute | Action Owner     | Action                                                                 |
| ------ | ---------------- | ---------------------------------------------------------------------- |
| T−15   | Ops Lead         | Engage maintenance flag, pull baseline metrics, acknowledge alerts.    |
| T−10   | Treasury Analyst | Stage TON/DCT balances for rebalancing and buyback legs.               |
| T−05   | Automation SRE   | Arm single-flight locks, confirm retry queues are empty.               |
| T0     | Ops Lead         | Execute rebalance or skip if deviation ≤ threshold.                    |
| T+05   | Treasury Analyst | Deploy liquidity to target pool weights using staged balances.         |
| T+10   | Ops Lead         | Run `/buyback-burn`, capture transaction hashes, update burn ledger.   |
| T+15   | Automation SRE   | Trigger `/sync-pool-stats` and verify dashboards refresh successfully. |
| T+20   | Ops Lead         | Release maintenance flag, broadcast summary with metrics snapshot.     |

### 20.3 Metrics to Capture per Run

- **Liquidity Drift Correction:** Absolute difference between target and actual
  pool weights before and after the cycle.
- **TON Utilization Time:** Minutes from inflow detection to first deployment
  transaction.
- **Buyback Slippage:** Effective price paid vs. midpoint at execution time.
- **Automation Reliability:** Number of retries required per Edge Function and
  total execution duration.
- **Reporting Lag:** Minutes until dashboards reflect post-run state and DAO
  observers confirm receipt.

### 20.4 Post-Run Documentation

1. Upload execution log to Supabase with references to transaction hashes and
   Edge Function job IDs.
2. Append findings to the weekly liquidity ops status report.
3. File remediation tasks in the backlog for any breach of guardrails or SLA.
4. Confirm DAO observers acknowledged the broadcast within the agreed response
   window.

## 21. Incident Response Playbook

Activate this sequence if the run deviates from expected parameters.

1. **Stabilize:** Pause additional automation triggers, freeze new liquidity
   deployments, and notify stakeholders.
2. **Diagnose:** Review recent Edge Function logs, RPC health metrics, and
   contract event traces to isolate the root cause.
3. **Remediate:** Execute targeted fixes (e.g., rerun failed job, failover RPC,
   update Supabase entry) and document every intervention.
4. **Recover:** Resume the runbook once metrics return within tolerance and
   backlog tickets are created for follow-up analysis.
5. **Report:** Publish a post-incident memo detailing impact, timeline, and
   long-term corrective actions for DAO transparency.

## 22. Continuous Run Validation

Maintain operational readiness between cycles through routine validation.

- **Dry Runs:** Simulate the playbook weekly using staging wallets to test new
  automation rules before production deployment.
- **Telemetry Audits:** Compare Supabase logs against Grafana dashboards to
  ensure signal parity and alert accuracy.
- **DAO Alignment Reviews:** Cross-check upcoming proposals with the run
  schedule to avoid conflicting parameter changes during execution windows.
- **Knowledge Base Updates:** Refresh this playbook with lessons from each
  retrospective and include links to relevant status documents surfaced via the
  `playbook` CLI.
