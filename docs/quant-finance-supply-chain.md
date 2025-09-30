# Unified Quantitative Finance Supply Chain

This brief stitches together the physics-inspired stochastic modeling roots of quantitative finance with the later pricing, prediction, and evaluation layers that define modern systematic investing. Each layer transforms raw uncertainty into progressively more actionable structure, mirroring a supply chain in which information is refined and validated before capital is deployed.

## Layer Interfaces at a Glance

| Layer | Input | Transformation | Output | Canonical Equation |
| --- | --- | --- | --- | --- |
| Stochastic dynamics | Micro-level shocks $dW_t$ | SDEs encode drift/diffusion structure | Path distribution $P(S_t)$ | $dS_t = \mu S_t\,dt + \sigma S_t\,dW_t$ |
| Pricing | Path distribution under risk-neutral measure $\mathbb{Q}$ | Hedging + no-arbitrage constraints | Derivative value $V(S,t)$ | $\frac{\partial V}{\partial t} + \tfrac{1}{2}\sigma^2 S^2 \frac{\partial^2 V}{\partial S^2} + rS\frac{\partial V}{\partial S} - rV = 0$ |
| Prediction | Historical observations $(x_t, y_t)$ | Statistical learning / filtering | Forecast $\hat{y}_{t+1}$ | $\hat{y}_{t+1} = f_\theta(x_t)$ |
| Evaluation | Forecasts and realized returns | Risk-adjusted scoring | Capital allocation decision | $\text{Sharpe} = \frac{E[R_p - R_f]}{\sigma_p}$ |

The remainder of the note drills into each layer, highlighting the handoff artifacts that enable the next transformation.

## 1. Stochastic Dynamics Layer (Physics Heritage)

Financial variables are first modeled as stochastic processes borrowed from statistical mechanics. These dynamics specify how uncertainty is injected into the system.

- **Geometric Brownian Motion (drift + diffusion)**
  $$
  dS_t = \mu S_t\,dt + \sigma S_t\,dW_t
  $$
  Captures multiplicative growth with constant drift $\mu$ and volatility $\sigma$.

- **Ornstein–Uhlenbeck Mean Reversion**
  $$
  dx_t = \theta(\mu - x_t)\,dt + \sigma\,dW_t
  $$
  Pulls the state toward a long-run anchor at rate $\theta$.

- **Langevin / Linear Dissipation**
  $$
  \frac{dS}{dt} = -\gamma S + \eta(t)
  $$
  Models frictional decay with a stochastic forcing term $\eta(t)$.

- **Fokker–Planck Density Evolution**
  $$
  \frac{\partial P(x,t)}{\partial t} = -\frac{\partial}{\partial x}\big[A(x)P(x,t)\big] + \tfrac{1}{2}\frac{\partial^2}{\partial x^2}\big[B(x)P(x,t)\big]
  $$
  Tracks how the probability density $P$ implied by the stochastic differential equation drifts and diffuses over time.

**Input → Output.** Random shocks $dW_t$ (or $\eta(t)$) are translated into a probabilistic description of price paths $P(S_t)$.

**Transformation.** This layer converts market randomness into a structured probabilistic description of price paths—setting the stage for risk-neutral valuation and statistical inference. In practice this produces either a closed-form transition density or Monte Carlo simulator that downstream layers can sample from.

## 2. Pricing Layer (No-Arbitrage PDEs)

Given a stochastic model, no-arbitrage arguments translate path dynamics into pricing partial differential equations.

- **Itô’s Lemma (state-to-price bridge)**
  $$
  dV = \frac{\partial V}{\partial t}\,dt + \frac{\partial V}{\partial S}\,dS + \tfrac{1}{2}\frac{\partial^2 V}{\partial S^2}(dS)^2
  $$
  Connects stochastic drivers $dS$ to derivative values $V(S,t)$.

- **Black–Scholes PDE**
  $$
  \frac{\partial V}{\partial t} + \tfrac{1}{2}\sigma^2 S^2 \frac{\partial^2 V}{\partial S^2} + r S \frac{\partial V}{\partial S} - rV = 0
  $$
  Arises by enforcing replication and risk-neutral discounting with rate $r$.

- **Closed-Form European Call Price**
  $$
  C(S,t) = S_0 N(d_1) - K e^{-rT} N(d_2)
  $$
  with
  $$
  d_{1,2} = \frac{\ln(S_0/K) + (r \pm \tfrac{1}{2}\sigma^2)T}{\sigma\sqrt{T}}
  $$
  Transforms the PDE into actionable premium quotes under the GBM assumptions.

**Input → Output.** The state distribution implied by the SDE is converted into a pricing functional $V(S,t)$ under the risk-neutral measure $\mathbb{Q}$.

**Bridge Equation.** The hedging argument implies the risk-neutral expectation
$$
V(S,t) = e^{-r(T-t)} \mathbb{E}_{\mathbb{Q}}\big[\Phi(S_T) \mid S_t = S\big],
$$
linking the stochastic layer to concrete payoff pricing $\Phi$.

**Transformation.** Stochastic behavior is distilled into deterministic pricing rules and hedging ratios—the logistics layer that maps randomness into tradable valuations. Sensitivities (Greeks) serve as quality checks that feed portfolio risk systems.

## 3. Prediction Layer (Data-Driven Inference)

As market microstructure, alternative data, and compute evolved, quants layered empirical models on top of the pricing foundation.

- **Nonlinear Regression Forecasts**
  $$
  y_{t+1} = f(y_t, y_{t-1}, \dots, x_t) + \varepsilon_t
  $$
  where $f$ is learned from data (e.g., splines, gradient boosting, neural networks) to capture conditional structure beyond closed-form solutions.

- **Hidden Markov Models (Regime Detection)**
  - Transition: $P(q_t \mid q_{t-1})$
  - Emission: $P(o_t \mid q_t)$
  Provides latent-state filters for volatility or liquidity regimes that feed downstream allocation rules.

- **Generic Machine-Learning Objective**
  $$
  \min_\theta \sum_t L\big(y_t, f_\theta(x_t)\big)
  $$
  Optimizes model parameters $\theta$ against a loss $L$ (MSE, cross-entropy, asymmetric payoff loss) tailored to the trading horizon.

**Input → Output.** Historical observations and priced signals are molded into forecasts $\hat{y}_{t+1}$ and associated uncertainty bands.

**Coupling with Pricing.** Pricing outputs often act as engineered features—e.g., implied volatility surfaces or carry metrics—feeding $f_\theta$ alongside raw returns. State-space models such as the Kalman filter explicitly fuse theoretical dynamics with empirical residuals.

**Transformation.** Historical observations are ingested to update beliefs and produce predictive signals that sit alongside—or override—classical pricing results when markets depart from idealized assumptions.

## 4. Evaluation Layer (Performance & Risk Diagnostics)

Signals and pricing outputs must be validated against realized performance to justify capital allocation.

- **Sharpe Ratio (Risk-Adjusted Return)**
  $$
  \text{Sharpe} = \frac{E[R_p - R_f]}{\sigma_p}
  $$
  Benchmarks excess return per unit of volatility.

- **CAPM Regression (Systematic Exposure Check)**
  $$
  R_p - R_f = \alpha + \beta (R_m - R_f) + \varepsilon
  $$
  Decomposes performance into systematic beta and idiosyncratic alpha.

- **Jensen’s Alpha (Abnormal Return)**
  $$
  \alpha = (R_p - R_f) - \beta (R_m - R_f)
  $$
  Quantifies residual value-add after accounting for market risk.

**Input → Output.** Forecasts and realized PnL time series are turned into standardized performance diagnostics for investment committees.

**Transformation.** Converts model outputs into accountability metrics that decide whether a strategy survives, scales, or is retired. Risk decomposition (e.g., factor exposures, drawdown statistics) augments the headline ratios to capture nonlinear payoffs.

## 5. Chain Integration & Historical Milestones

The pipeline mirrors a manufacturing flow:

1. **Randomness Intake** → stochastic differential equations articulate the probabilistic raw material.
2. **Structuring & Pricing** → Itô calculus and PDEs package that material into replicable contracts (e.g., Black–Scholes).
3. **Adaptive Forecasting** → statistical learning systems (Renaissance Technologies, machine-learning-driven funds) layer on empirical alpha discovery when closed forms fall short.
4. **Quality Assurance** → performance diagnostics (Sharpe, CAPM, Jensen) filter strategies, echoing critiques such as the Cornell study of Medallion’s anomaly.

This progression reflects the quant revolution’s evolution from physics-style reasoning (Weatherall, Voigt) to data-centric intelligence (Zuckerman’s account of Renaissance) while maintaining rigorous evaluation checkpoints. Each layer hands structured information to the next, ensuring that uncertainty is successively refined into tradable, testable, and ultimately accountable investment decisions. The end-to-end chain can be summarized as the composition
$$
\text{Capital Decision} = \mathcal{E}\big(\mathcal{P}\big(\mathcal{Q}(\mathcal{S}(\text{Market Shocks}))\big)\big),
$$
where $\mathcal{S}$ denotes stochastic modeling, $\mathcal{Q}$ risk-neutral pricing, $\mathcal{P}$ predictive inference, and $\mathcal{E}$ evaluation. Optimization at any stage feeds back upstream, driving the iterative refinement characteristic of modern quantitative finance.
