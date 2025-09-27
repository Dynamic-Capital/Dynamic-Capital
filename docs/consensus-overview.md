# Consensus Mechanism Reference

This document summarizes common consensus mechanisms and the main variables,
formulas, and tuning knobs associated with each approach. Use it as a quick
reference when comparing Proof of Work (PoW), Proof of Stake (PoS), Delegated
Proof of Stake (DPoS), Proof of Authority (PoA), and Proof of Space/Capacity
(PoSpace).

| Model   | Primary Sybil Cost | Finality Signal | Main Dynamic Knobs                              |
| ------- | ------------------ | --------------- | ----------------------------------------------- |
| PoW     | Energy expenditure | Confirmations   | Hash rate target, difficulty, confirmations     |
| PoS     | Locked capital     | BFT votes       | Stake weighting, slashing %, epoch length       |
| DPoS    | Voting stake       | Schedule slots  | Delegate count, rotation cadence, voting quorum |
| PoA     | Legal/identity     | BFT votes       | Committee size, governance, timeout window      |
| PoSpace | Storage commitment | Confirmations   | Plot size, challenge cadence, sealing time      |

The sections below expand on the quantitative relationships that drive each
mechanism and highlight practical optimization levers.

## Proof of Work (PoW)

### Variables

- $h_i$: hash rate for miner $i$
- $H = \sum h_i$: total network hash rate
- $T$: difficulty target
- $D$: difficulty
- $\tau$: expected block interval
- $R$: block reward (new coins plus fees)
- $c_H$: cost per hash (energy + opex)
- $z$: required confirmations
- $q$: attacker hash share
- $p = 1 - q$: honest hash share

### Key Relationships

**Performance**

- Block win probability per miner: $P_i = \frac{h_i}{H}$
- Block arrival rate: $\lambda \propto \frac{H}{D}$ with
  $\tau = \frac{1}{\lambda}$ (Bitcoin keeps $\tau$ near constant via difficulty
  retargeting)
- Expected revenue rate:
  $\mathbb{E}[\text{rev}_i/\text{time}] = \frac{h_i}{H} \cdot \frac{R}{\tau}$

**Economics**

- Expected profit rate: $\Pi_i = \frac{h_i}{H} \cdot \frac{R}{\tau} - c_H h_i$
- Network energy per block: $E_{\text{block}} = P_{\text{net}} \cdot \tau$,
  where $P_{\text{net}}$ is aggregate electrical power

### Double-Spend Catch-Up Probability (Satoshi)

For attacker share $q < p$ after $z$ confirmations:

1. Let $\lambda = z \cdot \frac{q}{p}$
2. Catch-up probability:
   $P_{\text{catch}} = 1 - \sum_{k=0}^{z} e^{-\lambda} \frac{\lambda^{k}}{k!}\left(1 - \left(\frac{q}{p}\right)^{z-k}\right)$

Use the above to select $z$ such that $P_{\text{catch}}(q, z) \leq \varepsilon$
for a target risk threshold.

### Attack Cost Estimate

Back-of-the-envelope cost of sustaining a 51% attack for time $t$: \[
C_{\text{attack}} \approx c_H (q H) t + \text{opportunity cost} +
\text{hardware/rental cost} \]

### Optimization Notes

- **Security vs. finality:** Increase $z$ until $P_{\text{catch}}$ is below the
  desired failure probability. Typical retail settings require $10^{-4}$ to
  $10^{-6}$.
- **Cost efficiency:** Track real-time electricity pricing to ensure
  $\Pi_i > 0$. If $c_H$ spikes, reducing hash rate or migrating hardware may be
  rational.
- **Difficulty retarget:** Faster retarget intervals lower $\tau$ volatility but
  can invite oscillations; maintain a window ($\geq 1$ day) to avoid feedback
  loops.

## Proof of Stake (PoS)

### Variables

- $s_i$: stake of validator $i$
- $S = \sum s_i$: total stake
- $R_e$: rewards per epoch
- $\tau_e$: epoch length
- $\alpha$: slashing fraction for faults
- $f$: Byzantine fraction
- $\Delta$: network delay bound

### Key Relationships

**Performance & Rewards**

- Selection probability per slot/epoch: $P_i = \frac{s_i}{S}$
- Expected epoch reward: $\mathbb{E}[R_i] = \frac{s_i}{S} R_e$
- Auto-compounding stake after $n$ epochs:
  $s_i(n) = s_i(0) \left(1 + \frac{R_e}{S}\right)^n$

**Security and Finality**

- BFT-style safety and liveness if $f < \frac{1}{3}$ and synchrony holds
- Approximate finality time (two-round BFT):
  $T_{\text{final}} \approx c \cdot \Delta$ with small constant $c$ (typically
  2–3)
- Expected slash on detected fault:
  $\mathbb{E}[\text{loss}_i] = \alpha s_i \cdot \Pr(\text{fault detected})$

### Optimization Notes

- **Dynamic inflation:** Keep $R_e$ proportional to active stake growth to avoid
  runaway compounding advantages. Many protocols implement decay schedules for
  $R_e$ as $S$ increases.
- **Slashing policy:** Higher $\alpha$ improves deterrence but risks
  destabilizing honest validators under network partitions. Balance with
  insurance pools or partial refunds when faults are provably unintentional.
- **Latency tuning:** Reduce $\Delta$ via gossip optimizations and
  stake-weighted leader selection to shorten $T_{\text{final}}$ while preserving
  safety margins.

## Delegated Proof of Stake (DPoS)

### Variables

- $v_i$: votes for delegate $i$ (stake-weighted)
- $M$: number of active block producers
- $\tau_c$: schedule period

### Mechanics

- Active set: top-$M$ delegates by votes
- Holder with stake $s_j$ contributes vote weight $w_j = \frac{s_j}{S}$
- Throughput estimate:
  $\text{TPS} \approx \frac{B}{s_{\text{avg}}} \cdot \frac{1}{\tau_{\text{block}}}$
- Concentration metric (HHI):
  $\text{HHI} = \sum_i \left(\frac{v_i}{\sum_k v_k}\right)^2$

### Optimization Notes

- **Delegate rotation:** Shorter $\tau_c$ increases censorship resistance but
  raises coordination overhead. Align rotation with average network propagation
  time to avoid missed slots.
- **Vote decay:** Applying exponential decay to $v_i$ encourages regular
  participation and prevents inactive delegates from lingering in the active
  set.
- **Quorum thresholds:** Require multi-party signatures (e.g., 2-of-3) on
  delegate blocks to mitigate single-producer downtime without sacrificing
  throughput.

## Proof of Authority (PoA)

### Variables

- $N$: total validators
- $f$: faulty/Byzantine validators
- $B$: block size (bytes)
- $\tau$: block interval
- $s_{\text{avg}}$: average transaction size

### Key Relationships

- Safety if $N \geq 3f + 1$ (tolerates $f < \frac{N}{3}$)
- Throughput: $\text{TPS} \approx \frac{B}{s_{\text{avg}}} \cdot \frac{1}{\tau}$
- Finality latency (BFT rounds): $T_{\text{final}} \approx c \cdot \Delta$

### Optimization Notes

- **Committee sizing:** Increasing $N$ hardens safety but lengthens consensus
  rounds. A practical balance is $N \in [10, 50]$ with hot/cold standby
  rotations.
- **Timeout management:** Tune view-change timeout to slightly exceed worst-case
  propagation ($\approx 2\Delta$) to avoid unnecessary leader switches.
- **Governance safeguards:** Maintain legal/identity collateral (e.g., bonds) to
  ensure $f$ remains low and to backstop slash-like penalties.

## Proof of Space / Capacity (PoSpace)

### Variables

- $x_i$: space committed by miner $i$
- $X = \sum x_i$: total committed space
- $R$: block reward
- $c_S$: storage cost per unit time

### Key Relationships

- Block win probability: $P_i = \frac{x_i}{X}$
- Expected reward rate:
  $\mathbb{E}[\text{rev}_i/\text{time}] = \frac{x_i}{X} \cdot \frac{R}{\tau}$
- Amortized cost per block time:
  $\text{Cost}_i \approx c_S x_i + \text{I/O overhead}$

### Optimization Notes

- **Plot refresh:** Periodically re-plot to mitigate grinding attacks; balance
  refresh frequency with plotting bandwidth limitations.
- **Proof quality:** Increase challenge frequency to raise honest cost slightly
  while sharply increasing attacker plotting burden.
- **Hybrid models:** Combine PoSpace with verifiable delay functions (VDFs) to
  neutralize time-memory trade-off attacks.

## Economic Security Knobs

### Minimum Break Cost

\[ \text{MinBreakCost} \approx \begin{cases} c_H \cdot q H \cdot t &
\text{(PoW)} \\ \alpha \cdot S & \text{(PoS / DPoS with slashing)} \\
\text{Jurisdictional penalty} + \text{stake in identity} & \text{(PoA)}
\end{cases} \]

### Finality vs. Confirmations

- **PoW:** choose confirmations $z$ so that
  $P_{\text{catch}}(q, z) \leq \varepsilon$
- **BFT PoS / PoA:** select committee size $N$ with $N \geq 3f + 1$ and expect
  $T_{\text{final}} \approx c \Delta$

### Validator Concentration (Gini)

\[ \text{Gini} = 1 - \frac{2}{N-1} \left( N - \frac{\sum_{i=1}^N (N+1-i)
s_{(i)}}{\sum_{i=1}^N s_{(i)}} \right) \]

## Optimization Workflow

1. **Define target risk ($\varepsilon$)** and service levels (TPS, finality).
2. **Estimate adversary budget** using the appropriate MinBreakCost expression.
3. **Tune dynamic parameters** (e.g., $z$, $\alpha$, $M$, $N$) using the
   optimization notes for each model to satisfy both throughput and security.
4. **Monitor concentration metrics** (HHI, Gini) and automate alerts when
   thresholds are breached.
5. **Re-evaluate quarterly** as hardware prices, energy costs, and stake
   distribution evolve.

## Example: PoW Double-Spend

Given attacker share $q = 0.2$, honest share $p = 0.8$, and $z = 6$
confirmations:

- $\lambda = z \cdot \frac{q}{p} = 6 \cdot 0.25 = 1.5$
- Plug $\lambda$ into $P_{\text{catch}}$ to evaluate risk and adjust $z$ to meet
  a target (e.g., $< 10^{-4}$)
