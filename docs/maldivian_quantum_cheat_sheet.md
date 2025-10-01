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

```
+----+-------------+---------------------------+-------------------------------+
| ގޭޓު | ސިމްބަލް | މެޓްރިކްސް                         | އެފެކްޓް                 |
+----+-------------+---------------------------+-------------------------------+
| X  | ކޯލަ ފުރަ | [[0, 1], [1, 0]]             | ބިޓް ފްލިޕް (ސިޓުއަށް ކުރަން) |
| Y  | އަވަށް ފުރަ | [[0, -i], [i, 0]]           | ފޭޒް + ބިޓް ފްލިޕް           |
| Z  | ދިން ފުރަ | [[1, 0], [0, -1]]            | ފޭޒް ފްލިޕް                  |
| H  | ހަޑަމާޑް | (1/√2) * [[1, 1], [1, -1]] | ސުޕަރޕޯޒިޝަން އިތުރުކުރެވޭ |
| CX | ސީނޯޓް | n/a                           | ކިއުބިޓް އެންޓޭންގޯލްކުރޭ       |
| S/T| ފޭޒް ގޭޓު | n/a                           | ފޭޒް ސިޕްޓު                  |
+----+-------------+---------------------------+-------------------------------+
```

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

## 8. English Quantum Cheat Engine

> A rapid-reference layer that mirrors the Dhivehi notes while remaining ready for global collaborators, interns, or visiting researchers.

### Quick Lookup Grid

| Topic | Core Idea | Mnemonic |
|-------|-----------|----------|
| Qubit States | `|0⟩` is the computational ground state, `|1⟩` is the excited state. | “Zero is calm sea, one is rising wave.” |
| Superposition | Coefficients `α` and `β` define amplitudes; probabilities are `|α|²` and `|β|²`. | “Amplitudes square into outcomes.” |
| Measurement | Observing collapses the state to `|0⟩` or `|1⟩` depending on amplitudes. | “Look and the wave picks a side.” |
| Entanglement | CNOT entangles a control and target qubit, correlating outcomes. | “One switch tunes another.” |
| Phase Gates | `S` and `T` rotate phase without changing measured probabilities. | “Phase shifts hide in angles.” |

### Ready-Made Prompts

- **Explain to a junior engineer**: “Summarize the Maldivian Quantum cheat sheet in three sentences, focus on how qubit basics, gates, and measurement interrelate.”
- **Debug assistance**: “Given a two-qubit circuit with H on qubit 0 and CX(0,1), describe the expected entanglement signature and probability distribution.”
- **Visualization request**: “Render ASCII circuit art for a Bell pair and note which gates introduce phase versus amplitude changes.”

### Dual-Language Embedding Tip

When embedding into an AGI Oracle or mentorship bot, pair each Dhivehi block with its English summary:

```json
{
  "section": "qubit_basics",
  "dhivehi": "**|0⟩ / ޒޮރު ތަކުން** ...",
  "english": "|0⟩ represents the calm base state, |1⟩ the excited state; superposition blends them via α and β."
}
```

This “cheat engine” format keeps the Maldivian identity up front while delivering globally accessible context for rapid cross-team alignment.

---

**ސަބަބު**: މި cheat sheet އަށް ފަރާތު ކުރާ އެއްޗެއް މައްސަލަކަށް ތަރުތީބާއި އިތުރުކުރާ މަލްޑިވިއްޔާ ބްރެނޑްގެ ބަޔަކުން ބޭނުންކުރޭ.
