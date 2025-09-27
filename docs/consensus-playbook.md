# Consensus Optimization Playbook

This playbook turns the reference formulas into actionable procedures for
operators who need to tune PoW, PoS, DPoS, PoA, or PoSpace networks. Each
section contains:

- **Readiness checklist** – baseline telemetry you should have before tuning.
- **Adjustment workflow** – ordered steps to rebalance security, performance,
  and economics.
- **Guardrail alerts** – thresholds that should trigger manual review.
- **Automation ideas** – scripts or dashboards that reduce human toil.

Use the cross-model routine below before diving into the mechanism-specific
playbooks.

## Universal Routine

1. **Define service SLOs**
   - Finality target (e.g., 99% of blocks final < 2 minutes)
   - Throughput (TPS or block gas target)
   - Cost ceilings (energy $/MWh, yield %, storage $/TB-month)
2. **Map threat model**
   - Identify likely adversary budgets and time horizons
   - Record operator churn rates and hardware/stake liquidity
3. **Collect current telemetry**
   - Consensus health (missed slots, orphaned blocks, vote participation)
   - Economic metrics (hash profitability, stake APR, storage ROI)
   - Concentration measures (Gini, HHI, Nakamoto coefficient)
4. **Prioritize levers**
   - Short-term knobs (confirmations, committee rotation, emission rate)
   - Long-term investments (hardware upgrades, governance changes)
5. **Schedule review cadence**
   - Weekly: incident review, alert triage
   - Monthly: parameter backtesting vs. on-chain data
   - Quarterly: threat model update, infrastructure audit

---

## Proof of Work (PoW) Playbook

### Readiness Checklist

- Real-time hash rate per pool and aggregate $H$
- Energy price feeds per site with $c_H$ updates < 1 hour
- Difficulty forecast tools (e.g., EMA of the last 2016 blocks)
- Monitoring for orphan/stale rate and block propagation latency

### Adjustment Workflow

1. **Estimate attack surface**
   - Compute $P_{\text{catch}}(q, z)$ for $q$ in {0.1, 0.2, 0.3}
   - Set confirmations $z$ so worst-case risk $\leq 10^{-5}$ for exchanges,
     $\leq 10^{-4}$ for retail
2. **Align difficulty response**
   - Run EMA backtest on retarget window; ensure >90% of samples keep
     $\tau \in [0.9, 1.1]$ target interval
   - If volatility high, lengthen averaging window; if sluggish, shorten but cap
     at 25% swing per retarget
3. **Optimize power procurement**
   - Rank sites by $\Pi_i = \frac{h_i}{H} \cdot \frac{R}{\tau} - c_H h_i$
   - Shut or throttle rigs with negative margin for >6 consecutive hours
   - Hedge via futures or demand-response programs when spot > 1.2× baseline
4. **Harden against 51% rentals**
   - Monitor hash rental markets; alert when rentable $q H$ > 0.35 $H$
   - Pre-arrange emergency difficulty increase or checkpointing if breach
     persists > 2 hours
5. **Stress-test propagation**
   - Inject synthetic load monthly; confirm block propagation < 3 seconds
   - Upgrade relay network or add compact block relays if >5% orphan rate

### Guardrail Alerts

- $P_{\text{catch}}(0.3, z) > 10^{-4}$
- Net profit margin < 5% for >48 hours
- Orphan rate > 4% per day

### Automation Ideas

- Lambda/Cloud Run job to recompute optimal $z$ hourly and update API docs
- Dashboard overlay with live $c_H$, $\Pi_i$, and $P_{\text{catch}}$ curves
- Auto-shutdown scripts tied to energy price or thermal sensor alerts

---

## Proof of Stake (PoS) Playbook

### Readiness Checklist

- Validator registry with stake $s_i$, uptime, slash history
- Telemetry for participation rate, missed attestations, network delay $\Delta$
- Reward schedule $R_e$ with governance upgrade history
- Monitoring for stake concentration (Gini, Nakamoto coefficient)

### Adjustment Workflow

1. **Benchmark participation**
   - Require 95%+ attestation rate; if lower, trigger validator outreach
   - Auto-disable validators with <50% uptime over last epoch window
2. **Tune rewards vs. dilution**
   - Plot $R_e/S$ over past quarter; keep inflation drift within ±50 bps
   - Introduce dynamic base reward: $R_e = R_0 + k(\text{participation}-p^*)$
3. **Rebalance slashing policy**
   - Simulate correlated failure (e.g., 15% validators offline)
   - Set slashing fraction $\alpha$ so honest losses < 0.5% stake at $f = 0.15$,
     malicious losses > 5%
4. **Shorten finality safely**
   - Measure message delay distribution; ensure 99th percentile < 0.5 $\Delta$
   - If satisfied, reduce round timers by 10–15% and monitor reorg depth
5. **Deter cartels**
   - Launch stake-weighted vote decay or quadratic rewards for decentralization
   - Promote staking pools with transparent delegation policies

### Guardrail Alerts

- Participation < 90% for two epochs
- Effective balance share of largest validator > 20%
- Finality delay > 2× target for any 10-minute window

### Automation Ideas

- On-chain contract that adjusts $R_e$ based on moving average participation
- PagerDuty alerts tied to slashing events > 0.1% total stake
- Delegation marketplace with auto-recommendations to rebalance stake

---

## Delegated Proof of Stake (DPoS) Playbook

### Readiness Checklist

- Vote database with time-decay metadata per holder
- Delegate uptime, missed block stats, and governance proposals
- Rotation cadence $\tau_c$ and next election schedule
- API for calculating HHI and vote turnout in real time

### Adjustment Workflow

1. **Maintain active set quality**
   - Require delegates to publish signed uptime proofs weekly
   - Auto-suspend delegates with >3 missed slots per day
2. **Refresh voter engagement**
   - Apply exponential decay: $v_i(t) = v_i(0)e^{-\lambda t}$ with half-life 14
     days; notify holders 48 hours before decay halves votes
   - Sponsor quarterly governance drills with simulated contentious proposals
3. **Scale throughput**
   - Measure average block utilization; if >80%, increase $B$ or reduce
     $\tau_{\text{block}}$ after benchmarking node CPU/network capacity
   - Stagger delegate schedule to avoid correlated downtime (e.g., geographic
     diversity constraints)
4. **Mitigate centralization**
   - Cap single custodian control to <15% vote share via governance policy
   - Incentivize proxy pools with audited transparency reports
5. **Crisis response**
   - Predefine emergency multisig (e.g., 5-of-7) to freeze malicious delegate
     payouts within 30 minutes of detection

### Guardrail Alerts

- HHI > 0.25 for 24 hours
- Vote turnout < 35% of circulating stake
- Delegate missed-slot streak > 5 consecutive

### Automation Ideas

- Cron job to recompute delegate ranks every hour and publish to community API
- Governance bot that suggests re-delegations when HHI crosses thresholds
- Incident runbook templates stored in public repo for rapid coordination

---

## Proof of Authority (PoA) Playbook

### Readiness Checklist

- Validator roster with legal entities, bonding collateral, jurisdiction
- Audit logs for governance actions (add/remove validator, rotate keys)
- Network telemetry: block propagation, view-change counts, latency $\Delta$
- Regulatory watchlist for jurisdictions hosting validators

### Adjustment Workflow

1. **Validate quorum resilience**
   - Ensure $N \geq 3f + 1$ with $f$ based on worst-case correlated failure
   - Conduct quarterly chaos drills removing $f$ validators; verify liveness
2. **Optimize view-change timers**
   - Collect empirical $\Delta$; set timeout = max($2\Delta$, 95th percentile)
   - After upgrades, shorten by 5–10% if failover remains clean
3. **Rotate identities securely**
   - Require dual-control key ceremonies with hardware modules
   - Publish notarized statements for every validator change
4. **Align incentives**
   - Recalculate collateral requirements annually using loss-given-breach
     models; target >3× estimated attack payoff
   - Institute insurance pool funded by validator fees for restitution
5. **Monitor legal risk**
   - Track jurisdictional shifts; if >40% validators in one country, initiate
     diversification plan within 60 days

### Guardrail Alerts

- View-change rate > 3 per hour
- Collateral coverage ratio < 200%
- Latency $\Delta$ > 1.5× baseline for 15 minutes

### Automation Ideas

- Smart contract registry enforcing quorum rules and logging rotations
- SIEM integrations for validator key events with on-call escalation
- Regulatory RSS feed parser to flag jurisdictional sanctions

---

## Proof of Space / Capacity (PoSpace) Playbook

### Readiness Checklist

- Plot inventory: committed space $x_i$, plot age, replication status
- Storage hardware telemetry (I/O throughput, failure rates)
- Challenge cadence statistics and response latency
- Market pricing for storage leases and electricity

### Adjustment Workflow

1. **Audit plot quality**
   - Sample verify plots weekly; target failure rate < 0.5%
   - Re-plot segments older than threshold (e.g., 90 days) or with bad nonce
     distribution
2. **Balance challenge cadence**
   - Increase challenge rate until honest I/O < 70% saturation while attacker
     plotting cost rises >25%
   - Pair with VDF parameters to maintain fairness
3. **Optimize storage spend**
   - Compare $c_S$ across providers; migrate when >15% cheaper options appear
   - Use erasure coding + replication to minimize downtime risk
4. **Secure sealing pipeline**
   - Implement hardware attestation for plot generation
   - Throttle API keys when plotting requests spike >3× baseline
5. **Plan for space churn**
   - Maintain buffer inventory (5–10% extra plots) to absorb hardware failure
   - Schedule rolling refresh to avoid synchronized replot storms

### Guardrail Alerts

- Plot verification failure > 1%
- Challenge response latency > 2× target
- Effective storage share of top farmer > 25%

### Automation Ideas

- Batch job to recompute farmer rewards and detect outliers nightly
- Alerting on challenge backlog growth via Prometheus + Alertmanager
- Inventory dashboard tracking plot age distribution with replot reminders

---

## Incident Response Template

1. **Detect** – Triggered by guardrail alert or anomaly detection.
2. **Diagnose** – Pull latest telemetry, identify impacted consensus layer.
3. **Stabilize** – Apply safe-mode parameters (e.g., increase confirmations,
   freeze delegate payouts, raise timeout).
4. **Communicate** – Issue status page update and notify governance forum.
5. **Recover** – Gradually revert temporary changes while monitoring.
6. **Postmortem** – Within 72 hours, document root cause, residual risk, and
   parameter adjustments.

Use this template consistently so that parameter shifts remain auditable.
