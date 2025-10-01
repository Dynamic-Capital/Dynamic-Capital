# Trading Data Organization Playbook

This playbook standardizes how Dynamic Capital stores trading templates,
algorithmic trade results, performance summaries, trade journals, and
backtesting/backtracking evidence across every session. The taxonomy below keeps
12-year down to single-session artifacts synchronized so reviewers can compare
signals, execution notes, and quantitative outcomes without combing through
disconnected folders.

## 1. Repository Scope

- **Coverage:** discretionary and automated strategies tracked in Supabase,
  TradingView, or broker exports.
- **Session granularity:** every trading session (London, New York, Asia, or
  bespoke time blocks) receives its own folder beneath each horizon bucket.
- **Artifacts:**
  - Strategy and execution templates (checklists, playbooks, screeners).
  - Raw algo trade blotters and KPI summaries.
  - Daily performance snapshots and cumulative dashboards.
  - Narrative trade journal entries with links to screenshots or screen
    recordings.
  - Backtesting datasets (structured CSV/Parquet) and backtracking commentary on
    post-trade reviews.

## 2. Directory Taxonomy

```
trading-ops/
  templates/
    <horizon>/<session>/<artifact>.md
  algo-results/
    <horizon>/<session>/<date>-results.csv
  performance/
    <horizon>/<session>/<date>-kpis.md
  journals/
    <horizon>/<session>/<date>-journal.md
  backtesting/
    <horizon>/<session>/<date>-backtest.(csv|parquet)
  backtracking/
    <horizon>/<session>/<date>-review.md
```

- `<horizon>` uses the canonical set: `12Y`, `6Y`, `3Y`, `1Y`, `6M`, `3M`, `1M`,
  `1W`, `1D`, `SESSION`.
- `<session>` maps to the trading window (e.g., `lon-open`, `ny-mid`,
  `asia-close`, or a strategy-specific code such as `ict-london-model`).
- Use ISO dates (`YYYY-MM-DD`) for filenames to keep chronological sorting.
- When a session spans multiple days (e.g., swing positions opened during Asia
  and closed during NY), create a folder for the originating session and link to
  dependent sessions in the metadata section of the journal or review template.

## 3. Horizon Buckets & Review Cadence

| Horizon          | Primary Questions                                                  | Source Data                                                 | Owner            | Review Rhythm           |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------- | ----------------------- |
| **12Y / 6Y**     | Macro validity of strategy families, regulatory shifts, fund KPIs. | Audited financials, macro research, archived journals.      | CIO / Compliance | Semi-annual board prep. |
| **3Y / 1Y**      | Portfolio evolution, regime changes, model drift.                  | Algo aggregate KPIs, risk reports, annual post-mortems.     | Quant Lead       | Quarterly OKRs.         |
| **6M / 3M**      | Seasonality effects, quarter-over-quarter drawdown control.        | Broker statements, desk OKRs, quarterly journal highlights. | Desk Leads       | Monthly desk sync.      |
| **1M / 1W**      | Execution quality, campaign performance, liquidity notes.          | Daily KPIs, journal insights, backtracking notes.           | Strategy Owners  | Weekly trade review.    |
| **1D / Session** | Trade-by-trade context, screenshot library, anomalies.             | Session templates, raw blotter, screen recordings.          | On-call Trader   | End-of-session ritual.  |

## 4. Session Workflow

1. **Clone session template:** copy the relevant checklist from
   `templates/<horizon>` into the new session folder and rename with the session
   code and date.
2. **Ingest algo results:** export the broker or Supabase job output into
   `algo-results/<horizon>/<session>/<date>-results.csv`. Append metadata
   (latency, slippage) in the header block of the performance file.
3. **Update performance KPIs:** fill `performance/<...>/<date>-kpis.md` with win
   rate, expectancy, max drawdown, capital deployed, and notable deviations from
   plan.
4. **Write journal entry:** summarize narrative context, screenshots, and action
   items in `journals/<...>/<date>-journal.md`. Include links to any video
   reviews stored in shared drives.
5. **Record backtesting/backtracking:**
   - Attach datasets to `backtesting/` when scenarios are rerun historically.
   - Use `backtracking/<...>/<date>-review.md` to document post-trade analysis,
     lessons learned, and checklist updates.
6. **Sync upward horizons:** roll session metrics into the `1W` folder during
   weekly reviews, then cascade into higher horizons during monthly and
   quarterly recaps. Reference aggregates in the header of each higher-horizon
   document for traceability.

## 5. Template Metadata Blocks

Each Markdown artifact should begin with a metadata fence to simplify parsing:

```
---
session: ny-open
horizon: 1D
trade_date: 2025-01-24
linked_sessions:
  - lon-open-2025-01-24
owner: trader.alex
status: completed
---
```

- Use `status` values: `planned`, `in-progress`, `completed`, `escalated`.
- Add `tags` when categorizing by strategy (e.g., `ict`, `smc`, `scalping`).

## 6. Governance & Quality Control

- **Version control:** store Markdown and CSV assets in Git for reproducibility;
  large datasets live in Supabase storage with references in the metadata block.
- **Automation hooks:** integrate Supabase Edge Functions to auto-generate daily
  KPI summaries and file them into the appropriate horizon bucket.
- **Audit trail:** compliance periodically samples `1M` and `3M` folders to
  ensure journals, backtracking reviews, and algo outputs align with desk
  mandates.
- **Retrospective updates:** when checklist templates change, include a
  changelog entry in the template file and annotate dependent sessions in the
  `backtracking` reviews to capture process drift.
