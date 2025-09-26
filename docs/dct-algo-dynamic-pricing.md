# DCT Dynamic Pricing Tied to Algorithmic Performance

## Objectives

- Align DCT market value with verifiable trading performance rather than purely
  speculative demand.
- Provide a transparent, rules-based treasury policy that routes trading profits
  toward buybacks, staking rewards, and long-term reserves.
- Maintain a defensible price floor derived from on-chain treasury net asset
  value (NAV).

## Core Mechanisms

### 1. Performance-backed buybacks

1. **Profit capture** – Aggregate monthly realized profits from the trading fund
   pool (post-fees and after satisfying reinvestment obligations).
2. **Allocation rule** – Route a configurable percentage (e.g., 25–40%) of net
   profits into an automated market maker (AMM) or centralized exchange buyback
   program.
3. **Execution** – Use TWAP or VWAP execution to minimize market impact; log
   every fill on-chain for auditability.
4. **Burn or treasury routing** – Either retire the repurchased DCT
   (deflationary pressure) or redirect a portion back to the treasury for future
   liquidity operations.

### 2. Staking rewards indexed to algo returns

- **Dynamic multiplier** – Define a baseline annual percentage yield (APY) when
  the trading desk is flat (e.g., 4%). Each monthly ROI bucket unlocks a
  multiplier:
  - `ROI < 0%` → baseline APY only.
  - `0% ≤ ROI < 5%` → +1–2% APY boost.
  - `5% ≤ ROI < 10%` → +3–4% APY boost.
  - `ROI ≥ 10%` → +5% APY boost (capped to avoid unsustainable emissions).
- **Reward pool** – Fund the incremental boosts from the profit share earmarked
  for staking. Rewards vest over a 30-day epoch; unclaimed rewards roll forward
  to smooth volatility.
- **Quiet months** – When returns are muted, stakers still receive baseline APY
  and benefit from ongoing burns funded by buybacks.

### 3. Treasury growth linked to profits

Split monthly profits into the following buckets (percentages are illustrative
and adjustable via governance):

| Bucket            | Suggested % of Net Profit | Purpose                                                             |
| ----------------- | ------------------------- | ------------------------------------------------------------------- |
| Buybacks & burns  | 30%                       | Repurchase DCT on the open market and burn it.                      |
| Staking rewards   | 25%                       | Fund the variable APY boosts outlined above.                        |
| Treasury reserves | 35%                       | Accumulate USDT/TON for future buybacks, liquidity, and operations. |
| Risk buffer       | 10%                       | Hold in a segregated account to cover drawdowns or market shocks.   |

Track flows in a `treasury_profit_allocation` table with on-chain proofs
(transaction hashes, execution timestamps, oracle prices) for transparency.

### 4. Dynamic floor pricing model

- **Formula** – `Floor Price = Treasury NAV (USDT) ÷ Circulating DCT Supply`.
- **Inputs** – Treasury NAV is derived from on-chain wallet balances (USDT, TON,
  staked assets) plus the mark-to-market value of any open hedges. Circulating
  supply excludes team-locked or vesting tokens.
- **Publishing cadence** – Recompute daily and store snapshots in a public
  registry so explorers can surface the implicit floor price.
- **Policy** – If secondary markets trade below the floor for a sustained period
  (e.g., 48 hours), trigger accelerated buybacks using treasury reserves until
  parity is restored or the buffer depletes.

### 5. Market sentiment layer

- Publish monthly performance dashboards featuring:
  - ROI %, Sharpe ratio, win rate, and maximum drawdown of trading algorithms.
  - Size of buybacks executed and DCT burned.
  - Updated floor price and treasury balances.
- Syndicate reports via the web app, Telegram, and GitHub releases. Signed
  reports foster trust and satisfy disclosure requirements.

## Operational Workflow

1. **Profit settlement** – At month-end, close trading books, confirm audited
   P&L, and feed the net profit figure into the allocation engine.
2. **Allocation transaction** – Execute on-chain transfers that split profits
   into the buyback, staking reward, treasury, and buffer wallets.
3. **Buyback automation** – Run a bot that executes laddered orders across
   approved venues, respecting daily spend caps and slippage limits.
4. **Reward calculation** – Update staking contract parameters (epoch reward
   totals, APY multipliers) and queue rewards for distribution.
5. **Floor recalculation** – Snapshot treasury holdings, update the floor price
   oracle, and archive the dataset for reference.
6. **Reporting** – Publish the monthly performance memo and broadcast it through
   communication channels.

## Benefits

- **Investor confidence** – Demonstrates that DCT value is underpinned by
  audited trading performance instead of pure speculation.
- **Sustainability** – Recycles real revenue into rewards, treasury expansion,
  and risk buffers that protect against drawdowns.
- **Deflationary pressure** – Consistent buybacks and burns reduce circulating
  supply while treasury NAV continues to grow.
- **Transparency** – On-chain execution receipts, oracle-signed floor prices,
  and public performance reports establish verifiability.

## Risk Controls

- **Caps & throttles** – Define maximum monthly buyback and burn percentages
  (e.g., ≤ 50% of profit) to preserve runway during lean periods.
- **Circuit breakers** – Suspend reward boosts when rolling 3-month ROI < 0% or
  when the risk buffer drops below a governance-defined threshold.
- **Stress testing** – Backtest the mechanism across historical drawdowns to
  ensure the treasury buffer can absorb multi-month underperformance.
- **Regulatory review** – Engage counsel to confirm that performance-linked
  payouts comply with applicable securities and commodities laws.

## Challenges & Mitigations

| Challenge                                                                                                         | Mitigation                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Return volatility** – Monthly ROI can fluctuate, creating uneven staking rewards and buyback volumes.           | Use smoothing mechanisms (rolling averages, reward vesting, carry-over reserves) and communicate ranges in advance.          |
| **Liquidity constraints** – Thin markets can magnify price impact during buybacks.                                | Blend on-chain AMM orders with OTC liquidity and enforce slippage limits per execution batch.                                |
| **Data integrity risk** – Faulty P&L data or compromised oracles could misprice the floor or misallocate profits. | Require multi-source validation, auditor sign-off, and fail-safe modes that pause automation when discrepancies arise.       |
| **Regulatory exposure** – Performance-linked payouts may resemble securities in certain jurisdictions.            | Maintain legal analysis per region, gate participation where necessary, and publish disclosures clarifying rights and risks. |
| **Operational overhead** – Coordinating bots, treasury actions, and reporting increases complexity.               | Automate with monitoring/alerting, document runbooks, and enforce multisig approvals for critical operations.                |

## Data & Transparency Requirements

- Maintain immutable logs of profit calculations, oracle data, and execution
  transactions.
- Provide a public dashboard summarizing:
  - Treasury NAV composition.
  - Circulating supply adjustments (burns, unlocks).
  - Staking reward rates and utilization.
  - Buyback history (volumes, average price, tokens burned).
- Offer API endpoints for community auditors to fetch historical performance and
  allocation data.

## Implementation Checklist

1. **Treasury infrastructure**
   - [ ] Deploy multisig-controlled wallets for buybacks, rewards, reserves, and
         risk buffer.
   - [ ] Integrate price oracles (USDT, TON, DCT spot rates) with fallback
         sources.
2. **Accounting pipeline**
   - [ ] Automate P&L ingestion from trading desks into the treasury ledger.
   - [ ] Reconcile realized profits against custody statements monthly.
3. **Smart contract updates**
   - [ ] Extend staking contracts to accept variable reward parameters per
         epoch.
   - [ ] Implement burn functions with role-based access tied to treasury
         governance.
4. **Automation bots**
   - [ ] Build buyback executors with TWAP scheduling and slippage guards.
   - [ ] Configure monitoring alerts for failed or partial executions.
5. **Reporting layer**
   - [ ] Generate signed PDF/Markdown reports summarizing monthly performance.
   - [ ] Publish data feeds (REST + CSV dumps) for external analysts.
6. **Governance & compliance**
   - [ ] Draft policy documents covering allocation percentages, floor
         enforcement, and emergency actions.
   - [ ] Document KYC/AML obligations for treasury operators and stakers.

## Open Questions

- Optimal cadence for buybacks (daily micro-buys vs. weekly batches) given
  liquidity.
- Whether to tokenize treasury shares so investors can see pro-rata backing in
  real time.
- Best format for on-chain oracle updates (push vs. pull) to minimize gas while
  preserving verifiability.
