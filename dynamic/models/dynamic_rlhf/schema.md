# dynamic_rlhf model

## State vector

- $x_t = [w_t, b_t, m_t, h_t]$
  - $w_t$: reward model weights learned from pairwise preferences.
  - $b_t$: scalar bias term capturing baseline preference likelihood.
  - $m_t$: preference memory buffer containing the most recent labelled comparisons.
  - $h_t$: health metrics for the fine-tuning corpus (quality histogram, tag coverage).

## Controls

- $u_t = [\eta_t, \lambda_t, k_t]$
  - $\eta_t$: learning rate applied to the reward model optimiser.
  - $\lambda_t$: regularisation strength preventing weight explosion.
  - $k_t$: harvest quota defining how many high-reward completions feed the fine-tune set each step.

## Parameters

- $\theta = [\mathcal{D}_t, c_t, q_t]$
  - $\mathcal{D}_t$: stream of pairwise preference examples from human annotators or simulated labelers.
  - $c_t$: candidate completions sampled from the current policy.
  - $q_t$: minimum probability threshold for harvesting (guards against noisy labels).

## Dynamics

- Reward update: $w_{t+1} = w_t + \eta_t \nabla_w \mathcal{L}(w_t; \mathcal{D}_t) - \eta_t \lambda_t w_t$
- Bias update: $b_{t+1} = b_t + \eta_t \nabla_b \mathcal{L}(b_t; \mathcal{D}_t)$
- Memory rollover: $m_{t+1} = \text{clip}(m_t \cup \mathcal{D}_t, \text{capacity})$
- Corpus health: $h_{t+1} = f(h_t, \text{harvest}(c_t, q_t, k_t))$

## Outputs

- $y_t = [\hat{r}_t, H_t]$
  - $\hat{r}_t$: scored completions ranked by the reward model.
  - $H_t$: harvested fine-tune batch with RLHF metadata for downstream PPO or SFT loops.

## Objective

Minimise the negative log-likelihood of chosen completions while maximising dataset freshness:

$$
J = \sum_t \left[ -\log \sigma(\Delta_t) + \beta \cdot \text{staleness}(h_t) \right]
$$

## Constraints

- Capacity: $|m_t| \leq M$ to bound memory footprint.
- Harvest guardrails: $\Pr(\text{chosen}) \geq q_t$ for any completion promoted to the fine-tune queue.
- Stability: $\eta_t \lambda_t < 1$ to avoid divergent updates.
