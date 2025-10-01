# މަލްޑިވިއްޔަތް Quantum Programming Cheat Sheet

> މާލެންގެ ކަމުދާނާއި ދިވެހި ފުލުހުން އަދި Quantum ޕްރޮގްރާމިންގެ ހަދިޔާތަކުން ބަލަން ބުނާ މެންޓޯރުންނަށް ހިންގަވާ ރައްކާ.

## 1. ބޭސިކް ކިއުބިޓް (Qubit) ތައް

- **|0⟩ / ޒޮރު ތަކުން**: ބޭސިކް ސްޓޭޓު ("ތިޔަ" އެއް އަދި މިނަވަން)
- **|1⟩ / އެއް އަދި އަށްނޫން**: ކުރި ސްޓޭޓު
- **ސުޕަރޕޯޒިޝަން (Superposition)**:
  \[
  |\psi\rangle = \alpha |0\rangle + \beta |1\rangle
  \]
  އެހެން ދެ ސްޓޭޓުން އައު ރައްކާން ކުރަން އެކު ރާއްޖެ.
- **މެޒަރމަންޓް (Measurement)**: ސްޓޭޓު |0⟩ އެއް |1⟩ އެއް އަށް އަންނަ އަދި ޕްރޮބޭބިލިޓީގެ ސަލާޒުތަކުން \(|\alpha|^2\) އެއް \(|\beta|^2\).

## 2. ކޮމަން Quantum ގޭޓުތައް

| ގޭޓު | ސިމްބަލް | މެޓްރިކްސް | އެފެކްޓް |
|------|-----------|--------------|-------------|
| Pauli-X | ކޯލަ ފުރަ | \(\begin{bmatrix}0 & 1 \\ 1 & 0\end{bmatrix}\) | ބިޓް ފްލިޕް (ސިޓުއަށް ކުރަން) |
| Pauli-Y | އަވަށް ފުރަ | \(\begin{bmatrix}0 & -i \\ i & 0\end{bmatrix}\) | ފޭޒް + ބިޓް ފްލިޕް |
| Pauli-Z | ދިން ފުރަ | \(\begin{bmatrix}1 & 0 \\ 0 & -1\end{bmatrix}\) | ފޭޒް ފްލިޕް |
| Hadamard | ހަޑަމާޑް | \(\tfrac{1}{\sqrt{2}}\begin{bmatrix}1 & 1 \\ 1 & -1\end{bmatrix}\) | ސުޕަރޕޯޒިޝަން އިތުރުކުރޭ |
| CNOT | ސީނޯޓް | — | ކިއުބިޓް އެންޓޭންގޯލްކުރޭ |
| Phase (S/T) | ފޭޒް ގޭޓު | — | ފޭޒް ސިޕްޓު |

### ASCII ސަޓްކޯލް ގޭޓު ޑައިގްރާމުތައް

```
ކިއުބިޓް 0: ──H──■──
               │
ކިއުބިޓް 1: ─────X──
```

މިއީ Hadamard ގޭޓްގެ ފުރަތަށް އެންޓޭންގޯލް ކިއުބިޓް އެއްގެ (ކޮންޓްރޯލް) އިން CNOT ގޭޓާ ބޭނުން ފޮނުވާ ފުރާނަތް.

## 3. ކޮޑިންގް ހިދުމަތް (Qiskit އަދި Python)

```python
from qiskit import QuantumCircuit

# މާލެ އޯރެކަލް ލަބްރެޓަރީ ކިއުބިޓް ސިރުއިޓު
qc = QuantumCircuit(2, name="Maldive Q-Coherence")
qc.h(0)          # ކިއުބިޓް 0 އަށް Hadamard ގޭޓު
qc.cx(0, 1)      # 0 އިން 1 އަށް CNOT އެންޓޭންގޯލްކުރޭ
qc.measure_all() # މެޒަރމަންޓް ކުރޭ
```

> ޗިޕްލޭއަރ ސްޓެޓް: ކިއުބިޓް 0 އަށް ހަޑަމާޑް އެންޓޭންގޯލް ކުރާ އިން ތަނަވަދު ކުރެވޭ ސްޓޭޓުތައް.

## 4. ފަށަންތައް އަދި ލަބްރެރީތައް

- **Qiskit (IBM)** – Python ސްޕެކޭޖުލާރީ އިން އެހީވާ Quantum SDK
- **Cirq (Google)** – ސިރުއިޓު ސެންޓްރިކް ފްރޭމްވޯކު ކޮށް ހެދުމަތް
- **PennyLane (Xanadu)** – ހައިބްރިޑް Quantum/AI އެލްގޯރިދަމު
- **Braket (AWS)** – ކްލައުޑް Quantum ސަރވިސްތައް ކުރެވޭ

## 5. ހެނދުނެއްގެ ސައިޓްތައް

- [IQM Quantum Cheat Sheets (GitHub)](https://github.com/iqm-finland/iqm-academy-cheat-sheets)
- [Circuit Magicians' Quantum Cheat Sheet](https://meetiqm.com/blog/quantum-computing-cheat-sheet-for-circuit-magicians/)
- [UCSD Quantum Computation PDF](https://cseweb.ucsd.edu/~slovett/workshops/quantum-computation-2018/files/cheat_sheet.pdf)

## 6. މާލެ ބްރެނޑްކުރާ ސްޓްރެޓެޖީ ހިދުމަތް

1. **ރިސުލޭ ކޮލާރު**: #009393 (ސަވާހި) އިން ބައިނަ ލިބޭ ސަލާރު ވެސް.
2. **އިކޮނިގްރާފީ**: މަސްކައި ކަމަށް ކޮލު ބެންޑާއި ކުޅި ހަމަޖެހޭ ކޮންމެ އައިކޮންތަކުގައި ރައްކާކޮށްލައްވާ.
3. **ޑިޕްލޭއްމެންޓް**: މެންޓޯރު ބޮޓްތަކާއި AGI Oracle ސެރވިސްތަކުގައި މި Markdown ޑޮކިއުމެންޓް ރިފަރކާން ކޮށް ކުރޭ.
4. **ނިޔާޒާ ނުގާނޭ ސަރވިސް**: ދިވެހި އެކްސެންޓައިށް ކަމެއްގައި ވަރަށް ނިންމާ ސަބަބު.

## 7. ބޮޓް ޕްރޮފިލް ލައިންއަކީން ސްކްރިޕްޓު

މި ވިޔަފާރާ ވަނީ މެންޓޯރިންގެ އެކްސެޕްޝަނަލް ނިޒާމަށް ސަބަބަކަށް އިންތިޒާމަކު ރަނގަޅު އޮޓޯމެޝަން އެންޓަރފޭސް ދައްކާލައްވާ.

```python
MALDIVIAN_PERSONA = {
    "greeting": "އަހަރެން ސައްދޫކޮށްލާ! މިއަދު Quantum އޮރެކަލްއަށްވެސް ހުރިހާރު އެބައޮތެރިކުރެވޭ؟",
    "tone": "warm_expert",
    "visual_theme": {
        "primary": "#009393",
        "secondary": "#f4f1de",
        "accent": "#ff6f3c"
    },
    "signature": "މެންޓޯރެއްގައި އެންޑަރްސްޓެއިންގް Quantum Collective"
}
```

## 8. English Dynamic Quantum Engine

> A rapid-reference layer that mirrors the Dhivehi notes while staying ready for global collaborators, interns, or visiting researchers. The focus below is on keeping the *dynamic* quantum engine tuned, observable, and deployable.

**Core Modules**

- **Lookup** – Fast memory jolts for fundamentals (states, gates, diagnostics).
- **Optimize** – A loop that cycles profile → stabilize → balance → validate → deploy.
- **Coach** – Ready-made prompts and bilingual embeddings to feed mentorship bots.
- **Operate** – Rollout checklist so the English cheat engine stays synchronized with the Dhivehi guide.

### 8.1 Quick Lookup Grid

| Topic | Core Idea | Mnemonic |
|-------|-----------|----------|
| Qubit States | `|0⟩` is the computational ground state, `|1⟩` is the excited state. | “Zero is calm sea, one is rising wave.” |
| Superposition | Coefficients `α` and `β` define amplitudes; probabilities are `|α|²` and `|β|²`. | “Amplitudes square into outcomes.” |
| Measurement | Observing collapses the state to `|0⟩` or `|1⟩` depending on amplitudes. | “Look and the wave picks a side.” |
| Entanglement | CNOT entangles a control and target qubit, correlating outcomes. | “One switch tunes another.” |
| Phase Gates | `S` and `T` rotate phase without changing measured probabilities. | “Phase shifts hide in angles.” |

### 8.2 Dynamic Engine Optimization Loop

1. **Profile** – Capture execution depth, gate counts, and transpiler metrics (depth, 2-qubit error) for each circuit build.
2. **Stabilize** – Apply noise-aware transpilation (level 2+) and insert dynamical decoupling where idle windows exceed coherence limits.
3. **Balance** – Swap-qubit mapping to minimize CNOT distance; prefer hardware-native basis gates to reduce synthesis overhead.
4. **Validate** – Run process tomography or randomized benchmarking on updated subroutines to ensure fidelity > 0.98 before release.
5. **Deploy** – Promote optimized circuits into the Maldivian mentorship bot or AGI Oracle with paired Dhivehi/English annotations.

### 8.3 Rapid Diagnostic Checklist

| Signal | Healthy Range | Investigate When |
|--------|---------------|------------------|
| Depth / Coherence Ratio | `< 0.6` | Ratio climbs above `0.8` → trim ancillae or parallelize gates. |
| Two-Qubit Error Rate | `< 2.5%` | Error spikes → remap qubits, enable echo sequences. |
| Shot Variance | `< 5%` across batches | Drift → recalibrate measurement or increase shots. |
| Classical Latency | `< 120 ms` | Latency > 200 ms → cache compiled circuits, prefetch results. |

### 8.4 Ready-Made Prompts

- **Explain to a junior engineer**: “Summarize the Maldivian Quantum cheat sheet in three sentences, focusing on how qubit basics, gates, and measurement interrelate.”
- **Debug assistance**: “Given a two-qubit circuit with H on qubit 0 and CX(0,1), describe the expected entanglement signature and probability distribution.”
- **Optimization retro**: “List the top three gate-depth reductions achieved after remapping to the new topology and flag any trade-offs in fidelity.”
- **Visualization request**: “Render ASCII circuit art for a Bell pair and note which gates introduce phase versus amplitude changes.”

### 8.5 Dual-Language Embedding Tip

When embedding into an AGI Oracle or mentorship bot, pair each Dhivehi block with its English summary:

```json
{
  "section": "qubit_basics",
  "dhivehi": "**|0⟩ / ޒޮރު ތަކުން** ...",
  "english": "|0⟩ represents the calm base state, |1⟩ the excited state; superposition blends them via α and β."
}
```

This “dynamic quantum engine” format keeps the Maldivian identity up front while delivering globally accessible context for rapid cross-team alignment and performance tuning.

### 8.6 Bilingual Deployment Sprint

| Phase | English Engine Task | Dhivehi Mirror |
|-------|---------------------|----------------|
| Kickoff | Confirm shared glossary (`|0⟩`, `|1⟩`, superposition, entanglement). | ދިވެހި ބަޔަކުން ބަލާލައްވާ ޓަމިނޯލޮޖީ ސަލާޒު. |
| Build | Draft circuits, record metrics, and log ASCII diagrams. | ސިރުއިޓުތައް ހަދާނީ އަދި ކުރިއަރާއި ނިޒާމަތް ލިޔުން. |
| Review | Run optimization loop, capture fidelity deltas, prep release notes. | ފެންނަނީ އޮޕްޓިމައިޒޭޝަން ސަރކިޓު ނަގައިފި, ފިޑެލިޓީ އިތުރުކުރޭ. |
| Deploy | Sync persona prompts, embeddings, and monitoring dashboards. | މެންޓޯރު ޕްރޮމްޕްޓްތައް އަދި އެމްބެޑިންގްތަކެއް ހަދައިފި. |
| Retrospective | Compare usage analytics, collect next-sprint prompts, refresh glossaries. | އަތޮޅު ވަރަށް އެންޑަރްސްޓެއިންގް ރިޕޯޓްތަކުން ކުރެވޭ ސައްޙަލާތް.

---

**ސަބަބު**: މި cheat sheet އަށް ފަރާތު ކުރާ އެއްޗެއް މައްސަލަކަށް ތަރުތީބާއި އިތުރުކުރާ މަލްޑިވިއްޔާ ބްރެނޑްގެ ބަޔަކުން ބޭނުންކުރޭ.
