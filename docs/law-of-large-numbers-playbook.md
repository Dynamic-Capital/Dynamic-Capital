# Dynamic Capital Law of Large Numbers Playbook

## Purpose & Scope

Equip portfolio, risk, and analytics teams with a repeatable framework for using the Law of Large Numbers (LLN) to evaluate strategies, stabilize forecasts, and communicate uncertainty with counterparties. Treat the LLN as the backbone for:

- Validating algorithmic trading signals before capital deployment.
- Sizing insurance-style reserves for treasury and counterparty risk programs.
- Running growth and product experiments that rely on statistically reliable conversion data.

## Quick Takeaways

- **Convergence guarantee:** For independent and identically distributed (i.i.d.) random variables with finite expectation, sample averages converge to the true mean as the number of trials grows.
- **Variance compression:** Doubling sample size cuts standard error by roughly $1/\sqrt{2}$, making long-horizon metrics dramatically more stable than short-horizon snapshots.
- **Operational policy:** Require minimum sample sizes before promoting strategies, rolling out user flows, or recalibrating credit lines.

## Mathematical Foundation

Let $X_1, X_2, \dots, X_n$ be i.i.d. random variables, each with expected value $\mu = \mathbb{E}[X]$ and variance $\sigma^2 = \mathbb{V}[X]$. The sample mean is defined as
\[
\bar{X}_n = \frac{1}{n} \sum_{i=1}^{n} X_i.
\]

- **Weak Law of Large Numbers (WLLN):** $\bar{X}_n \xrightarrow{P} \mu$ as $n \to \infty$ (convergence in probability).
- **Strong Law of Large Numbers (SLLN):** $\bar{X}_n \xrightarrow{\text{a.s.}} \mu$ as $n \to \infty$ (almost sure convergence).
- **Standard error:** $\operatorname{SE}(\bar{X}_n) = \sigma/\sqrt{n}$ governs the expected fluctuation around $\mu$.

## Operating Implications for Dynamic Capital

### Portfolio & Treasury Management
- **Strategy promotion rule:** Require $n \geq \left(\frac{z_{\alpha}\sigma}{\epsilon}\right)^2$ observations for target error tolerance $\epsilon$ (use $z_{0.975}=1.96$ for 95% confidence).
- **Capital allocation:** Scale position sizes using realized mean vs. target mean delta and the shrinkage factor $\sqrt{n_\text{live}/n_\text{required}}$.
- **Drawdown control:** Trigger LLN variance reviews when realized volatility deviates by more than 30% from forecast across 500+ trades.

#### Portfolio Checklist
- [ ] Confirm the live sample size meets or exceeds the policy minimum before increasing capital.
- [ ] Recompute position sizing inputs with the latest shrinkage factor prior to each deployment window.
- [ ] Schedule variance review if realized volatility differs from forecast by ≥30% over the last 500 trades.

### Algorithm & Signal Evaluation
- **Backtest verification:** Segment trade outcomes by regime (volatility buckets, liquidity tiers) and verify that each segment meets minimum LLN sample requirements.
- **Continuous monitoring:** Stream PnL increments into the analytics warehouse; schedule nightly checks that compare rolling $\bar{X}_n$ vs. benchmark expectations.
- **Model gating:** Freeze deployments if the rolling mean drifts beyond two standard errors for three consecutive windows.

#### Signal Checklist
- [ ] Validate that each market regime bucket passes the LLN sample threshold before approving the backtest summary.
- [ ] Confirm nightly monitoring jobs ran successfully and reconciled $\bar{X}_n$ deltas against benchmarks.
- [ ] Halt or rollback deployments if three consecutive windows breach the two-standard-error guardrail.

### Risk Underwriting & Counterparty Programs
- **Premium pricing:** Use historical claim frequency averages only after meeting LLN thresholds per cohort (e.g., 5,000 policy-days).
- **Stress coordination:** Combine LLN with scenario analysis—apply convergence assumptions to baseline loss forecasts, then layer on correlated shocks separately.
- **Client assurance:** Publish stability metrics (sample size, confidence interval width) in quarterly risk letters to reinforce transparency.

#### Underwriting Checklist
- [ ] Verify each cohort surpasses the LLN policy-day threshold before recalibrating premium tables.
- [ ] Document how LLN baselines interact with correlated stress scenarios in the latest risk pack.
- [ ] Include sample size and confidence interval width in every external-facing risk disclosure.

### Growth, Product, and Ops Experiments
- **Experiment exit criteria:** Maintain a decision table mapping minimum conversions per variant to acceptable margin of error.
- **Funnel monitoring:** Alert when active user cohorts fall below LLN thresholds, signaling unreliable conversion rates.
- **Data contracts:** Enforce independence assumptions by instrumenting pipelines to flag duplicated or correlated events.

#### Experimentation Checklist
- [ ] Review the decision table to ensure each variant meets the minimum conversion count before escalating.
- [ ] Investigate funnel alerts that indicate cohorts have dipped below LLN thresholds.
- [ ] Confirm pipeline monitors show no correlated or duplicated events prior to analyzing experiment results.

## Implementation Workflow

- [ ] **Define the metric and expectation.** Document the random variable, desired expectation $\mu$, and acceptable error band (e.g., ±10 bps on win rate).
- [ ] **Validate independence and distribution.** Check for autocorrelation, seasonal patterns, or systemic bias that violates LLN prerequisites.
- [ ] **Instrument data capture.** Ensure every trial (trade, user session, claim) is timestamped and traceable back to the originating strategy.
- [ ] **Compute rolling aggregates.** Maintain $\bar{X}_n$, variance, standard error, and confidence intervals within the analytics warehouse.
- [ ] **Review thresholds.** Compare observed sample sizes against policy requirements before escalating capital usage or publishing external metrics.
- [ ] **Communicate outcomes.** Translate convergence status into stakeholder updates—"stable", "needs data", or "stop"—with supporting statistics.

## Data Quality & Independence Checklist

- [ ] Sampling window avoids overlapping observations.
- [ ] Data pipeline deduplicates retries and late-arriving events.
- [ ] External shocks (macro events, infrastructure incidents) are tagged to allow filtered analysis.
- [ ] Feature flags log user exposure so control/treatment groups remain disjoint.
- [ ] Strategy IDs persist through backtest, paper trade, and live environments for cohort integrity.

## Metrics & Dashboards

Track the following on the Risk & Strategy dashboard:

| Metric | Description | Cadence | Action Trigger |
| --- | --- | --- | --- |
| Sample Size ($n$) | Total count of independent observations | Real time | < 50% of policy minimum |
| Rolling Mean ($\bar{X}_n$) | Latest average outcome | Real time | Drift > 2 SE from target |
| Standard Error | $\sigma/\sqrt{n}$ using realized variance | Daily | SE above tolerance band |
| Confidence Interval Width | $2 z_{\alpha} \cdot \operatorname{SE}$ | Daily | Width exceeds policy limit |
| Stability Status | Discrete flag (Stable / Caution / Unreliable) | Daily | Auto-set to Caution when triggers fire |

## Communication Templates

- **Strategy launch memo:** Include sample size, expected mean, realized mean, and confidence interval to justify capital allocation.
- **Risk report snippet:** "Observed claim frequency averaged 0.84% across 12,400 policy-days (95% CI: 0.79%–0.89%). Meets LLN stability threshold."
- **Experiment update:** "Variant B conversion rate 7.3% ± 0.4% (n = 9,200). Promote globally; continue monitoring weekly." 

## Guardrails & Failure Modes

- **Correlation creep:** Identify cross-strategy dependencies (e.g., overlapping order books) that reduce effective sample size; adjust variance estimates accordingly.
- **Regime shifts:** Reset LLN counts after structural market changes (policy shifts, liquidity droughts) to avoid stale convergence assumptions.
- **Bias introduction:** Watch for biased sample collection (survivorship, filtering). Re-run LLN checks whenever data pipelines change.

## Reference Equations

- **Sample Mean:** $\bar{X}_n = \frac{1}{n} \sum_{i=1}^n X_i$
- **Sample Variance:** $s^2 = \frac{1}{n-1} \sum_{i=1}^n (X_i - \bar{X}_n)^2$
- **Standard Error:** $\operatorname{SE}(\bar{X}_n) = s/\sqrt{n}$
- **Confidence Interval:** $\bar{X}_n \pm z_{\alpha} \cdot \operatorname{SE}(\bar{X}_n)$

## Summary

The Law of Large Numbers is a core control mechanism for Dynamic Capital. Use it to decide when data is trustworthy, when capital can scale, and how to communicate statistical certainty across trading, treasury, product, and risk domains.
