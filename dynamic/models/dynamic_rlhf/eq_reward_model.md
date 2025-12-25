# Logistic reward model update

We model the reward signal as a logistic classifier over handcrafted text features.
Given a preference pair $(y^+, y^-)$ and feature extractor $\phi(\cdot)$ the
margin is

$$
\Delta = b + w^\top (\phi(y^+) - \phi(y^-)).
$$

The negative log-likelihood loss is

$$
\mathcal{L}(w, b) = -\log \sigma(\Delta) + \frac{\lambda}{2} \lVert w \rVert_2^2,
$$

where $\lambda$ controls $\ell_2$ shrinkage. The stochastic gradients used in
`RewardModel.fit` are

$$
\begin{aligned}
\nabla_w &= (1 - \sigma(\Delta)) (\phi(y^+) - \phi(y^-)) - \lambda w, \\
\nabla_b &= (1 - \sigma(\Delta)).
\end{aligned}
$$

Updates scale the gradients by the learning rate $\eta$ and the batch size $|B|$:

$$
\begin{aligned}
w &\leftarrow w + \eta \frac{\nabla_w}{|B|}, \\
b &\leftarrow b + \eta \frac{\nabla_b}{|B|}.
\end{aligned}
$$

Calibration notes:

- Initialise $w$ and $b$ to zero to keep the classifier neutral until
  preferences accumulate.
- Clamp probabilities to $[10^{-6}, 1 - 10^{-6}]$ for numerical stability.
- Tune $\eta$ in $[0.01, 0.1]$ and $\lambda$ in $[10^{-5}, 10^{-3}]$ for steady
  convergence on typical preference batch sizes (32–128).
