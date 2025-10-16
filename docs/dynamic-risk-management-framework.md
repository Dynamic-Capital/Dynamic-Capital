# Dynamic Risk Management Framework

## Definition
Risk management underpins every Dynamic Capital trading system. The framework continuously measures exposure across strategies and bots while enforcing predefined drawdown limits (daily, weekly, and total) so that automation cannot exceed the trader's acceptable loss profile.

## Purpose
- Protect capital by dynamically sizing positions relative to account equity and predefined risk thresholds.
- Maintain execution discipline for systematic and discretionary programs alike.
- Ensure that automated strategies remain aligned with each client profile through configurable guardrails.

## Role in Automated Trading
Within Dynamic Capital's Supabase-driven orchestration layer, the risk framework operates between the algorithm layer and the MT5 Bridge ↔ TradingView execution engine.

- Stored parameters (for example, `risk_per_trade`, `max_drawdown`, and portfolio caps) drive lot sizing and trade-validation logic.
- Breach detection halts new signals when limits are crossed, preventing further exposure until manual or scheduled resets occur.
- Status flags propagate to the monitoring dashboard, giving admins immediate visibility into disabled strategies and the rationale for each stop.

## Key Parameters
| Variable | Description | System Behavior |
| --- | --- | --- |
| **Max Daily Loss** | Maximum loss permitted per 24-hour session. | Stops all algos for the remainder of the session; resumes after reset. |
| **Max Weekly Loss** | Aggregate weekly drawdown ceiling. | Locks trading until the next calendar week or an admin override. |
| **Max Total Loss** | Absolute drawdown limit across the account. | Activates recovery protocols or safe-mode algos before re-enabling live flow. |
| **Max Loss Per Trade** | Per-position risk tolerance. | Auto-sizes order quantities and validates stop-loss placement before submission. |
| **Profit Tracking** | Daily, weekly, and lifetime PnL telemetry. | Feeds dashboards, risk reports, and AI summarization pipelines. |

## Operational Workflow
1. **Pre-Trade Validation** – Each signal pulls the latest equity, open exposure, and guardrail definitions from Supabase.
2. **Dynamic Sizing** – Position sizing logic scales lot sizes according to risk-per-trade, volatility, and remaining headroom under session limits.
3. **Execution Gatekeeping** – Orders that breach max-loss or volume constraints are rejected and flagged for review.
4. **Live Monitoring** – Real-time PnL and drawdown feeds update dashboards and trigger notifications when thresholds approach.
5. **Breach Response** – Automated locks prevent additional trades, while administrators receive contextual alerts to determine recovery or safe-mode activation.

## Governance & Controls
- Admins can recalibrate thresholds through the configurable dashboard defined in the Backend Blueprint.
- Every override requires audit notes to preserve transparency and align with Dynamic Capital compliance policy.
- Reset procedures re-enable strategies only after confirming restored equity buffers and updated session markers.

## Outcome
This risk-first framework enforces disciplined execution, minimizes emotional or algorithmic overreach, and reinforces Dynamic Capital's commitment to transparent, reliable automation—the same ethos that underpins DCT token sustainability.

## Recommended Next Steps
- Integrate automated alerting with incident response playbooks to streamline post-breach actions.
- Back-test guardrail settings across historical volatility regimes to validate parameter resilience.
- Expand dashboard analytics with trend views of drawdown utilization to anticipate capacity constraints.
