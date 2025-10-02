# Policy harvest scoring

To promote high-quality completions into the supervised fine-tune dataset we
convert reward margins into probabilities via the logistic link:

$$
\hat{p}(y \mid x) = \sigma(b + w^\top \phi(x, y)).
$$

Given a candidate set $C_x$ for prompt $x$, the selection operator keeps the top
$k$ items that clear a probability threshold $q$:

$$
H(x) = \left\{ y \in C_x \;\middle|\; \hat{p}(y \mid x) \ge q, \text{rank}(y) \le k \right\}.
$$

These harvested completions feed the fine-tune engine with metadata capturing
the reward margin and rank. The effective priority score used by
`DynamicRLHFModel.build_fine_tune_records` is a convex blend between the raw
probability and a neutral baseline $0.5$:

$$
\text{priority}(y) = 0.5 + 0.6 (\hat{p}(y \mid x) - 0.5).
$$

This damping keeps priorities bounded while still differentiating confident
completions from marginal ones.
