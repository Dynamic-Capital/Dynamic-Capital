Name: TF-IDF weighting with freshness Purpose: Tracks how dynamic document
arrivals alter term salience used during ranking.

Equation(s):

```math
w_{t,i}(d) = \frac{tf_{t,i}(d)}{\lVert d_t \rVert_1} \cdot \Bigg(1 + \log \frac{1 + N_t}{1 + df_{t,i}} \Bigg) \cdot \exp(-\alpha \Delta_t(d))
```

Assumptions:

- Token counts $tf_{t,i}(d)$ are computed after normalization and stop-word
  filtering.
- Document frequency $df_{t,i}$ is updated atomically alongside index mutations,
  avoiding lagged statistics.
- Freshness penalty uses exponential decay with age $\Delta_t(d)$ in consistent
  time units (e.g., hours).

Calibration:

- **Data**: Historical corpus snapshots with timestamps and query-click logs to
  estimate relevance drift.
- **Method**: Maximum likelihood fit of decay $\alpha$ against observed
  click-through drops; cross-validate IDF smoothing terms with held-out queries.
- **Parameter mapping**: Estimated $\hat{\alpha}$ feeds decay, while smoothed
  IDF constants tune the parameter vector $\theta = [\alpha, \beta, L, K]$.

Usage notes:

- Downstream ranking uses $w_{t,i}(d)$ for cosine similarity; ensure
  normalization to prevent dominance by large documents.
- Under sparse updates, refresh $df_{t,i}$ lazily using differential logs to
  maintain scalability.
