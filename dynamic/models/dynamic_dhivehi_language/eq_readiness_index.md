Name: Dhivehi language readiness index

Equation(s):

```math
\begin{aligned}
R_t &= w_c \cdot \text{coverage}_t + w_q \cdot \text{quality}_t + w_s \cdot \left(1 - \frac{a_t}{a_{\max}}\right) \\
\text{coverage}_t &= \frac{g_t}{g_{\text{target}}} \\
\text{quality}_t &= \frac{q_t}{q_{\text{target}}}
\end{aligned}
```

Assumptions:

- Readiness is a convex combination of coverage, quality, and backlog relief.
- g_{\text{target}} and q_{\text{target}} encode the desired steady-state
  glossary and translation memory performance.
- Backlog penalty scales with the actionable backlog relative to an acceptable
  threshold a_{\max}.

Calibration:

- Estimate w_c, w_q, and w_s from historical support SLAs or leadership weightings;
  enforce w_c + w_q + w_s = 1.
- Set g_{\text{target}} and q_{\text{target}} using quarterly localization OKRs
  (e.g., 90% glossary coverage, BLEU ≥ 0.80).
- Choose a_{\max} from observed review throughput so that R_t responds sharply
  when the backlog exceeds two sprint capacities.
