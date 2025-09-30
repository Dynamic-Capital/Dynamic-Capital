# Dynamic search engine model

## Problem statement

- **State**: $x_t = [N_t, \{tf_{t,i}(d)\}_{d \in \mathcal{D}_t}, \{df_{t,i}\}]$ captures the corpus size, document-level term frequencies, and collection-wide document frequencies for each token $i$.
- **Controls**: $u_t = [a_t(d), r_t(d)]$ toggles document add/update operations $a_t$ and removals $r_t$ issued by upstream ingestion pipelines.
- **Parameters**: $\theta = [\alpha, \beta, L, K]$ configures token normalization strength, snippet window length $L$, ranking truncation $K$, and optional freshness decay rate.
- **Disturbances / shocks**: $\xi_t = [q_t, m_t]$ bundles user queries and metadata filters arriving stochastically over time.
- **Horizon**: $t = 0, \ldots, T$ where $T$ spans the operating life of the search index.

## Dynamics

$$
x_{t+1} = f(x_t, u_t, \xi_t; \theta) = \text{UpdateIndex}(x_t, a_t, r_t) \circ \text{NormalizeTokens}(\alpha)
$$

Document arrivals and removals mutate the inverted index. Token normalization enforces case folding and alphanumeric filtering; optional decay factors rescale document frequencies to prioritize recency.

## Outputs / observables

$$
y_t = g(x_t, q_t, m_t; \theta) = \text{RankDocuments}(q_t \mid x_t, m_t; \theta)
$$

The ranked list $y_t$ surfaces scored `SearchResult` bundles with document metadata and generated snippets. Downstream analytics consume score distributions, click-through feedback, and snippet text for evaluation loops.

## Objective

$$
\max_{\{u_t\}} J = \sum_{t=0}^{T} \Big[ \mathbb{E}[\text{rel}(y_t, q_t)] - \beta \, \text{cost}(u_t) - \sum_k w_k \, \varphi_k(x_t) \Big]
$$

The engine seeks to maximize expected relevance for incoming queries while controlling indexing cost and optional regularizers $\varphi_k(\cdot)$ that penalize stale or bloated index states.

## Constraints

- **Equality**: $h(x_t, u_t; \theta) = \sum_{d \in \mathcal{D}_t} tf_{t,i}(d) - df_{t,i} \cdot L_{t,i} = 0$ ensures document frequencies align with postings list lengths $L_{t,i}$ after updates.
- **Inequality**: $c(x_t, u_t; \theta) = \lvert \mathcal{D}_t \rvert - K \le 0$ enforces configurable limits on index size or response truncation.

## Initial conditions & calibration hooks

- Initial state $x_0 = [0, \varnothing, \varnothing]$ with an empty document set and zeroed statistics.
- Prior over parameters $p(\theta)$ reflects baseline term weighting (e.g., uninformative priors on $\alpha$ and decay rates).
- Calibration draws on historical query logs, click feedback, and corpus statistics to tune normalization constants and snippet window lengths.

## Interfaces

- **Inputs consumed**: Document ingestion streams, metadata filters, freshness signals, and live query text.
- **Outputs produced**: Ranked `SearchResult` objects, per-term inverse document frequency traces, and snippet excerpts for observability dashboards.

