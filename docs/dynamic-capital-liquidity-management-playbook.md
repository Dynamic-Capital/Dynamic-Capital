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
