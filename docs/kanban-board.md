# Dynamic AI (DAI) Kanban Board

The Dynamic AI program tracks work across five epics using a Kanban workflow.
Cards move strictly from **Backlog** → **To Do (Sprint)** → **In Progress** →
**Review / Testing** → **Done**.

## Columns

- **Backlog** – Ideas and unstarted initiatives.
- **To Do (Sprint)** – Tasks committed for the active sprint.
- **In Progress** – Tasks currently being executed.
- **Review / Testing** – Pull requests open for review or items running through
  validation environments.
- **Done** – Work merged, deployed, and validated in production.

## Epic 1: Multi-Lobe Fusion

- **Backlog**
  - Design lobe class structure (`LorentzianLobe`, `TrendLobe`, `SentimentLobe`,
    `TreasuryLobe`).
- **To Do**
  - Implement `fusion.combine()` with dynamic weighting.
- **In Progress**
  - Normalize outputs and confidence scoring.
- **Review / Testing**
  - Unit tests for fusion logic.
- **Done**
  - Fusion engine producing signals with Supabase logs.

## Epic 2: Risk Management

- **Backlog**
  - Define treasury utilization percentage caps.
- **To Do**
  - Add max daily drawdown guardrail.
- **In Progress**
  - Implement circuit breaker conditions.
- **Review / Testing**
  - Backtest guardrails on historical stress periods.
- **Done**
  - Risk management active in live trading.

## Epic 3: Tokenomics Policy Engine

- **Backlog**
  - Define adaptive tax/reward split formula.
- **To Do**
  - Implement buyback/burn policy logic.
- **In Progress**
  - Log policy outputs to Supabase.
- **Review / Testing**
  - Test policy integration with DMM spreads.
- **Done**
  - Policy engine live with daily logs.

## Epic 4: Backtesting & Simulation

- **Backlog**
  - Collect historical price and treasury data.
- **To Do**
  - Build `backtest.py` framework.
- **In Progress**
  - Simulate Lorentzian strategy and policy decisions.
- **Review / Testing**
  - Validate KPIs (Sharpe, drawdown, treasury runway).
- **Done**
  - Backtest results stored in Supabase.

## Epic 5: Governance & Transparency

- **Backlog**
  - Design governance proposal schema (`governance_proposals`).
- **To Do**
  - Add `/governance` in Telegram and Mini App.
- **In Progress**
  - Dhivehi and English explanation generator.
- **Review / Testing**
  - Export reports (PDF/CSV) to Supabase.
- **Done**
  - Governance overrides respected in the live engine.

## Workflow Rules

- Cards must progress left to right; no skipping stages.
- Every pull request must link to a card in **Review / Testing**.
- Weekly sprint planning moves top-priority cards from **Backlog** to **To Do**.
- Standups focus on the **In Progress** column to unblock work.

## Automation

- The `.github/workflows/project-board-automation.yml` workflow keeps the GitHub
  Projects board aligned with column transitions.
- Set the repository variable `DAI_PROJECT_URL` to the Dynamic AI board URL (for
  example, `https://github.com/orgs/<org>/projects/<number>`).
- Optionally, store a fine-grained personal access token in the
  `PROJECT_BOARD_TOKEN` secret if the default `GITHUB_TOKEN` lacks access to the
  organization-level project.
