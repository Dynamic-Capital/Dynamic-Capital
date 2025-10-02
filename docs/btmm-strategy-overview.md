# Beat The Market Maker (BTMM) Strategy Overview

The Beat The Market Maker (BTMM) strategy is a discretionary trading methodology that relies on reading market structure, session behavior, and indicator confluence instead of a single deterministic formula. Rather than reducing the approach to one equation, BTMM traders evaluate context across several inputs and allow the combined evidence to guide entries, exits, and risk management decisions.

## Key Decision Inputs

At any point in time, the trader's decision \(D(t)\) can be considered the output of a qualitative function fed by multiple variables:

\[
D(t) = f\big(\text{EMA}_5(t), \text{EMA}_{13}(t), \text{EMA}_{50}(t), \text{TDI}(t), \text{Range}_{\text{Asian}}(t), \text{Cycle}_{\text{MM}}(t), \text{Candle Patterns}(t)\big).
\]

* **\(\text{EMA}_n(t)\)** – Short-, medium-, and long-term exponential moving averages (EMAs) are monitored for slope, alignment, and crossovers (e.g., the 13/50 EMA cross) that hint at emerging trends or reversals.
* **\(\text{TDI}(t)\)** – The Traders Dynamic Index blends RSI, moving averages, and Bollinger Bands. Specific formations, such as the so-called “Shark Fin,” alert traders to exhaustion and reversal potential.
* **\(\text{Range}_{\text{Asian}}(t)\)** – The high–low range carved out during the Asian session acts as a manipulation zone. London session breakouts or false moves relative to this box often precede directional setups.
* **\(\text{Cycle}_{\text{MM}}(t)\)** – BTMM frames price action within a three-level market maker cycle. Each level carries distinct expectations for accumulation, manipulation, and expansion.
* **\(\text{Candle Patterns}(t)\)** – Price action confirmation arrives through recognizable structures, notably “M” or “W” formations and other reversal candlesticks around session highs and lows.

## Contextual Evaluation

Because BTMM is context-driven, the “function” \(f(\cdot)\) is not a rigid formula. Instead, traders synthesize:

1. **Session Structure** – How price behaved during Asian, London, and New York sessions, including stop hunts and liquidity grabs.
2. **Indicator Confirmation** – Alignment of EMAs, TDI signals, and other tools to validate directional bias.
3. **Cycle Placement** – Determining whether the market is in Level 1 accumulation, Level 2 trend development, or Level 3 reversal potential.
4. **Price Action Triggers** – Candlestick confirmations and pattern completion around key levels or average daily range (ADR) extremes.

## Example Decision Checklist

A practical representation of the decision process is a checklist or decision tree. One high-probability setup might require:

1. Market identified in **Cycle 3** (reversal phase).
2. Formation of an **“M” or “W”** pattern at the session high or low.
3. **TDI “Shark Fin”** divergence signaling momentum exhaustion.
4. Price extending **beyond the previous day’s ADR**, suggesting liquidity sweep completion.
5. Confirmation from EMAs (e.g., 5/13 EMAs crossing back toward the 50 EMA) before executing the trade.

When all criteria align, the trader considers entering in the direction implied by the pattern; otherwise, the bias is to wait until more conditions are satisfied. This qualitative, rules-based assessment captures the essence of BTMM far better than any single mathematical expression.
