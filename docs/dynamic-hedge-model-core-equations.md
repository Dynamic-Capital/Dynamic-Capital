# Dynamic Hedge Model – Core Equations

This reference outlines the core sizing, risk, and hedge-management equations
used by the Dynamic Hedge Model. Each section summarises the governing formula,
explains the required inputs, and calls out practical implementation notes so
the rules can be encoded consistently across execution venues.

## 1. Position Sizing

Normal trade entries size lots from the account risk budget:

$$
\text{Lots} = \frac{\text{Risk \$}}{(\text{SL in pips} \times \text{Pip Value})}
$$

Where:

- $\text{Risk \$} = \text{Equity} \times \text{Risk\%}$ (typically 0.5–1.0%).
- $\text{SL in pips} = |\text{Entry} - \text{Stop Loss}|$.
- $\text{Pip Value} = \frac{\text{Contract size} \times \text{Pip size}}{\text{Price}}$.

**Implementation notes**

- Round down the computed lot size to the broker's minimum increment before
  submission.
- Refresh the inputs whenever equity changes (e.g., after a fill or hedge
  adjustment) to avoid over-sizing subsequent entries.
- For instruments quoted in non-account currencies, convert equity into the
  quote currency prior to sizing to maintain a consistent risk basis.

## 2. Daily Stop Loss Guard

Track a soft and hard loss cap each trading day:

- Soft cap: $\text{MaxLoss}_{\text{day}} = \text{Equity} \times 0.02$.
- Hard cap: $\text{MaxLoss}_{\text{day}} = \text{Equity} \times 0.05$.

⚠️ If total (closed + open) PnL is less than or equal to the active cap, suspend
new trades or hedge all baskets to neutralize exposure.

**Implementation notes**

- Reset the realised PnL accumulator at the broker session rollover to ensure a
  clean daily slate.
- Evaluate the cap after each order fill and after each hedge rebalance so the
  guard cannot be bypassed intra-day.
- When the hard cap is breached, lock the book until the next session regardless
  of recovery to avoid revenge trading behaviour.

## 3. Correlation-Aware Exposure

Highly correlated instruments ($\rho \geq 0.8$) are grouped into a basket:

$$
\text{BasketRisk} = \left[ \sum_i (\text{Lots}_i \times \text{PipValue}_i \times \text{SL}_i) \right] \times \rho
$$

Maintain $\text{BasketRisk} \leq 1.5 \times$ the single-trade risk allowance.

**Implementation notes**

- Use rolling 90-session correlations on closing prices to detect and update
  basket membership.
- Clamp $\rho$ to the $[0.5, 1]$ interval to avoid over-penalising temporarily
  negative correlations.
- If basket risk exceeds the cap, either trim the highest-volatility leg or
  widen its stop to reduce risk-weight.

## 4. ATR-Based Hedge Trigger

Monitor volatility expansion with the relative ATR metric:

$$
\text{ATR}_{\text{rel}} = \frac{\text{ATR}_{14}}{\text{Price}}
$$

Trigger a hedge when:

$$
\text{ATR}_{\text{rel}} > 1.3 \times \text{Median}(\text{ATR}_{\text{rel}}, 90)
$$

**Implementation notes**

- Compute $\text{ATR}_{14}$ on the same timeframe used for trade execution
  (e.g., H1) to maintain sensitivity.
- The 90-period median acts as a volatility baseline; update it using a rolling
  window for numerical stability.
- Combine the trigger with a minimum spread filter (e.g., current spread \< 1.5
  × 30-day median) to avoid hedging during illiquid spikes.

## 5. Beta Hedge Sizing

Size a correlated hedge instrument using beta-adjusted volatility scaling:

$$
\text{HedgeSize} = \text{Exposure}_{\text{base}} \times \beta \times \frac{\sigma_{\text{base}}}{\sigma_{\text{hedge}}}
$$

Where $\beta$ is the regression slope of the hedge versus the base instrument.

**Implementation notes**

- Estimate $\beta$ via an ordinary least squares regression on matched returns
  across the latest 60–90 observations.
- Annualise or de-annualise volatility inputs consistently; mismatched units can
  distort the hedge ratio.
- Refit the regression whenever the correlation significance ($p$-value)
  deteriorates above 0.1 to ensure the hedge remains responsive.

## 6. $\rho$-Vol Hedge Sizing

When beta estimates are unreliable, fall back to correlation-weighted sizing:

$$
\text{HedgeSize} = \text{Exposure}_{\text{base}} \times \rho \times \frac{\sigma_{\text{hedge}}}{\sigma_{\text{base}}}
$$

**Implementation notes**

- Apply this method when the beta regression $R^2 < 0.2$ or the hedge instrument
  has structural regime shifts.
- Cap the resulting hedge size at the notional of the base exposure to prevent
  over-hedging in low-volatility hedges.
- Refresh the volatility estimates daily using exponentially weighted standard
  deviations to capture the latest regime shifts.

## 7. Drawdown Hedge Rule

If daily drawdown reaches $2R$ or equity declines by 2%, hedge the basket to
neutral:

1. Compute net exposure:
   $\text{NetExposure} = \text{Exposure}_{\text{long}} - \text{Exposure}_{\text{short}}$.
2. Size the hedge: $\text{HedgeSize} = -\text{NetExposure}$.

**Implementation notes**

- Calculate $R$ as the per-trade risk from Section 1 so the drawdown guard
  scales with the current risk budget.
- Allow a tolerance band (±0.05R) to avoid repeated toggling when equity
  oscillates around the threshold.
- Once neutralised, keep the hedge active until equity recovers above the 1R
  drawdown level and volatility falls below the trigger from Section 4.

## 8. Tokenomics (DCT Price Impact)

Allocate hedge profits for token buybacks and burns:

- Price impact:
  $\Delta P_{\text{DCT}} = \frac{\text{BuybackFunds}}{\text{CirculatingSupply}}$.
- Updated supply after burns:
  $\text{Supply}_{\text{new}} = \text{Supply}_{\text{old}} - \text{TokensBurned}$.

**Implementation notes**

- Channel hedge-derived profits at a fixed cadence (e.g., weekly) to smooth
  buyback pressure and avoid signalling large discretionary moves.
- Publish burn transactions on-chain alongside the updated circulating supply to
  maintain transparency for DCT holders.
- When circulating supply data is stale, defer the buyback to prevent
  overstating the price impact.

## Middleware Validation Layer

### Signal Confidence Score

Aggregate setup validation factors to score signal quality:

$$
C = w_1 \cdot \text{SetupQuality} + w_2 \cdot \text{TimeFilter} + w_3 \cdot \text{NewsRisk}
$$

Reject trades when $C < \text{threshold}$ (e.g., 0.7).

**Implementation notes**

- Normalise each component to $[0, 1]$ before weighting so the confidence score
  remains interpretable.
- Persist the component scores for auditability; failed signals should include
  the reason code corresponding to the lowest factor.
- Retune the weights quarterly using realised trade outcomes to keep the scoring
  aligned with live performance.

### Execution Guard

$$
\text{TotalRisk}_{\text{open}} + \text{NewTradeRisk} \leq \text{MaxRiskAllowed}
$$

Block trade execution when this constraint fails.

**Implementation notes**

- Include hedged positions in $\text{TotalRisk}_{\text{open}}$ using their
  residual (post-hedge) risk to avoid double counting.
- $\text{MaxRiskAllowed}$ is typically capped at 6R; configure it centrally so
  risk managers can adjust per desk.
- When the constraint fails, enqueue the trade for reevaluation after the next
  hedge rebalance rather than discarding outright.

### Slippage Control

$$
\text{Slippage} = |\text{ExecutedPrice} - \text{ExpectedPrice}|
$$

Reject fills whenever slippage exceeds the allowed tolerance.

**Implementation notes**

- Compute expected price from the top-of-book mid plus the modelled impact for
  the intended size.
- Track slippage separately for entry and exit orders to surface venue-specific
  issues.
- Escalate repeated breaches to the execution quality module for venue rotation
  or spread filtering.

## Operational Checklist

1. **Pre-trade**: Update equity, refresh correlation and beta metrics, and
   recompute the risk budget.
2. **Entry**: Validate signal confidence, confirm exposure is within basket and
   aggregate risk limits, then submit the sized order.
3. **Monitoring**: Continuously evaluate ATR triggers, drawdown levels, and
   slippage statistics. Rebalance hedges when any guard trips.
4. **Post-trade**: Reconcile realised PnL against the daily loss caps and
   allocate hedge profits to the buyback queue per the tokenomics rule set.

Following this sequence keeps the risk model, hedging layer, and tokenomics
pipeline synchronised during live operations.
