# Historical Foundations of Quantitative Finance

This document summarizes several landmark developments in quantitative finance, highlighting the mathematical structures they introduced and the practical insights they offer for modern markets.

## Louis Bachelier (1900): Random Walk Model

- **Key idea:** Securities follow a random walk whose increments are normally distributed with zero mean and variance proportional to time.
- **Canonical SDE:**
  \[
  dS_t = \mu S_t\,dt + \sigma S_t\,dW_t,
  \]
  where:
  - \(S_t\) is the asset price at time \(t\),
  - \(\mu\) is the drift (expected return),
  - \(\sigma\) is the volatility (standard deviation of returns),
  - \(dW_t\) is an increment of a Wiener process (Brownian motion).
- **Insight:** Price changes are independent and identically distributed, laying the groundwork for stochastic calculus in finance.

## Harry Markowitz (1952): Portfolio Selection

- **Key idea:** Diversification can optimize expected return for a target level of risk.
- **Optimization problem:**
  \[
  \min_{w} \sum_{i=1}^{N} \sum_{j=1}^{N} w_i w_j \operatorname{Cov}(R_i, R_j)
  \]
  subject to:
  \[
  \sum_{i=1}^{N} w_i E(R_i) = R_p, \quad \sum_{i=1}^{N} w_i = 1,
  \]
  where:
  - \(w_i\) is the portfolio weight for asset \(i\),
  - \(E(R_i)\) is the expected return of asset \(i\),
  - \(\operatorname{Cov}(R_i, R_j)\) is the covariance between assets \(i\) and \(j\),
  - \(R_p\) is the target portfolio return.
- **Insight:** Efficient frontiers and risk-return trade-offs can be computed explicitly, guiding asset allocation.

## Black-Scholes-Merton (1973–1974): Option Pricing Theory

- **Key idea:** Option prices can be derived under risk-neutral valuation when the underlying asset follows geometric Brownian motion and markets allow continuous hedging.
- **Call option formula:**
  \[
  C = S_t N(d_1) - K e^{-rt} N(d_2),
  \]
  with:
  \[
  d_1 = \frac{\ln (S_t / K) + (r + \sigma^2 / 2) t}{\sigma \sqrt{t}}, \quad d_2 = d_1 - \sigma \sqrt{t},
  \]
  where \(N(\cdot)\) is the cumulative standard normal distribution, \(K\) the strike price, \(r\) the risk-free rate, and \(t\) the time to maturity.
- **Insight:** Provides closed-form prices for European options and a framework for delta hedging.

## Timothy Sauer (2012): Numerical SDE Methods

- **Key idea:** Many stochastic differential equations lack closed-form solutions, making numerical discretization critical for derivative pricing and risk analysis.
- **Euler–Maruyama scheme:**
  \[
  X_{n+1} = X_n + \mu (X_n, t_n) \Delta t + \sigma (X_n, t_n) \Delta W_n,
  \]
  where \(\Delta W_n \sim \mathcal{N}(0, \Delta t)\).
- **Insight:** Simple yet widely used in Monte Carlo simulations; forms the basis for more advanced high-order schemes.

## J. Doyne Farmer (1980s–1990s): Chaos and Complex Systems

- **Key idea:** Financial markets may exhibit chaotic dynamics driven by non-linear feedback loops.
- **Representative chaotic system:**
  \[
  \begin{aligned}
  \frac{dx}{dt} &= gz + (y - a)x, \\
  \frac{dy}{dt} &= -b y^3 - s x^2 + r, \\
  \frac{dz}{dt} &= -c z - \beta x - p y,
  \end{aligned}
  \]
  where \(x, y, z\) capture macroeconomic variables such as interest rates, investment demand, and price indices.
- **Insight:** Highlights the possibility that deterministic systems can generate complex, seemingly random price movements.

## Agent-Based Modeling (ABM)

- **Key idea:** Markets emerge from the interactions of heterogeneous agents following simple behavioral rules.
- **Model structure:** Each agent decides to buy, sell, or hold based on heuristics (e.g., threshold rules on expected returns). Aggregate market behavior arises from these micro-level interactions.
- **Insight:** Captures phenomena like bubbles, crashes, and regime shifts that are difficult to model with equilibrium-based frameworks.

---

Together, these theories chart a progression from early stochastic models to complex adaptive systems, illustrating how quantitative finance continually evolves to accommodate new data, computational techniques, and market behaviors.
