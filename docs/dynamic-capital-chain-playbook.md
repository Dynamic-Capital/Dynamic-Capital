# Dynamic Capital Chain Playbook

## 1. Core Concept

A Markov chain is a stochastic process that evolves in discrete steps where the
probability of the next state depends **only** on the current state. This
"memoryless" behaviour is captured by the Markov property:

$$
P(X_{n+1} = j \mid X_n = i, X_{n-1}, \ldots, X_0) = P(X_{n+1} = j \mid X_n = i).
$$

## 2. Structure of a Markov Chain

### States

The system has a finite or countable set of possible states
$S = \{s_1, s_2, \ldots, s_k\}$.

### Transition Probabilities

Each move between states is characterised by a probability
$P_{ij} = P(X_{n+1} = j \mid X_n = i)$.

### Transition Matrix

The transitions are organised in a matrix $P$ where the $(i, j)$ entry equals
$P_{ij}$:

$$
P =
\begin{bmatrix}
P_{11} & P_{12} & \cdots & P_{1k} \\
P_{21} & P_{22} & \cdots & P_{2k} \\
\vdots & \vdots & \ddots & \vdots \\
P_{k1} & P_{k2} & \cdots & P_{kk}
\end{bmatrix}
$$

Each row must sum to $1$: $\sum_j P_{ij} = 1$.

## 3. Example: Weather Model

Consider a simple weather system with two states: Sunny (S) and Rainy (R).

Transition rules:

- Sunny $\rightarrow$ Sunny with probability $0.8$
- Sunny $\rightarrow$ Rainy with probability $0.2$
- Rainy $\rightarrow$ Sunny with probability $0.5$
- Rainy $\rightarrow$ Rainy with probability $0.5$

This yields the transition matrix

$$
P = \begin{bmatrix}
0.8 & 0.2 \\
0.5 & 0.5
\end{bmatrix}.
$$

If today is Sunny, represented by the row vector $[1, 0]$, then tomorrow's
distribution is

$$
[1, 0] P = [0.8, 0.2].
$$

## 4. Key Concepts

### $n$-Step Transitions

The probability of being in state $j$ after $n$ steps starting from state $i$ is
obtained from the $n$th matrix power $P^n = P \times P \times \cdots \times P$
(applied $n$ times).

### Stationary Distribution

A stationary distribution $\pi$ describes the long-run behaviour of the chain:

$$
\pi P = \pi, \qquad \sum_i \pi_i = 1.
$$

### Absorbing States

A state $i$ is absorbing if $P_{ii} = 1$; once entered, the process cannot
leave.

### Ergodicity

A chain is ergodic when every state is reachable from every other state
(irreducible) and the long-run average is independent of the initial state.

## 5. Applications

- **Finance:** Credit rating migrations, option pricing.
- **AI / NLP:** Hidden Markov models for speech recognition, translation, and
  tagging.
- **Queueing Systems:** Customer flow through service stations.
- **Games:** Board games, random walks.
- **Biology:** DNA sequence analysis, protein folding models.

## 6. Step-by-Step Playbook

1. **Define the state space:** enumerate all possible states.
2. **Assign transition probabilities:** construct the transition matrix $P$
   ensuring each row sums to $1$.
3. **Identify key features:** locate absorbing states, determine if the chain is
   irreducible, and assess ergodicity.
4. **Compute $n$-step probabilities:** evaluate $P^n$ to study the distribution
   after $n$ steps.
5. **Find the stationary distribution:** solve $\pi P = \pi$ with
   $\sum_i \pi_i = 1$.
6. **Apply insights:** forecast long-term trends, estimate future state
   probabilities, and optimise decisions in your domain.

## 7. Quick Reference Formulas

- **One-step transition:** $P_{ij} = P(X_{n+1} = j \mid X_n = i)$
- **$n$-step transition:** $P^{(n)} = P^n$
- **Stationary distribution:** $\pi P = \pi$, $\sum_i \pi_i = 1$

---

**Summary:** Markov chains model systems where the next state depends solely on
the current state. Transition matrices, their powers, and stationary
distributions provide both short-term and long-term insights into the dynamics
of these systems.
