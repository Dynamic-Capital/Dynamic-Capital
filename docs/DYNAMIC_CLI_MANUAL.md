# Dynamic CLI Comprehensive Manual

## Index

| Page(s) | Section                                         |
| ------- | ----------------------------------------------- |
| 1       | Preface & Audience                              |
| 2       | Quick Start Synopsis                            |
| 3       | Installation & Invocation Options               |
| 4–5     | Scenario Input Specifications                   |
| 6       | Engine Construction Workflow                    |
| 7–8     | Report Rendering Formats                        |
| 9       | JSON Schema Reference                           |
| 11–12   | Operational Examples                            |
| 13–14   | Troubleshooting & Diagnostics                   |
| 15–16   | Glossary & Synonyms                             |
| 17–18   | Appendix A – Default Scenario Blueprint         |
| 19      | Appendix B – Exit Codes & Environment Variables |
| 20–21   | Appendix C – Back-to-Back Expression Library    |

> **Pagination note:** Page numbers reference printed formatting using US Letter
> paper with default Markdown-to-PDF rendering (roughly 500 words per page).
> Adjustments in font size may shift numbering slightly.

---

## Page 1 — Preface & Audience

The Dynamic CLI (command-line interface) orchestrates the `dynamic_framework`
evaluation engine, enabling engineering leaders, delivery managers, and platform
strategists to transform scenario definitions into actionable maturity reports.
This manual targets:

- Engineering directors who need a repeatable governance cadence.
- Site reliability engineers curating operational health dashboards.
- Data and analytics practitioners streamlining maturity telemetry pipelines.

The CLI interoperates seamlessly with traditional UNIX pipelines and
JSON-centric workflows, supporting both interactive use and automation pipelines
such as CI/CD, cron jobs, and ChatOps command handlers.

---

## Page 2 — Quick Start Synopsis

1. Prepare a scenario definition in JSON (JavaScript Object Notation).
2. Run `python -m dynamic_framework --scenario scenario.json`.
3. Review the text report summary in the terminal or request structured JSON
   using `--format json`.

**Synonymous phrasing:**

- _Quick start_ ⇔ _Fast launch_, _Express setup_, _Rapid onboarding_.
- _Scenario definition_ ⇔ _Assessment blueprint_, _Evaluation profile_, _Context
  specification_.

---

## Page 3 — Installation & Invocation Options

### Python Environment Requirements

- Python 3.11 or newer (aligning with the project runtime constraints).
- Access to the `dynamic_framework` package within your Python path
  (`pip install -e .` from the repository root during development).

### Invocation Patterns

| Usage Form                    | Description                                                      | Synonyms              |
| ----------------------------- | ---------------------------------------------------------------- | --------------------- |
| `python -m dynamic_framework` | Execute the CLI using the module loader.                         | run, launch, initiate |
| `dynamic-framework`           | If installed via an entry point script, invokes the same runner. | command, executable   |

### Core Flags

| Flag | Default | Purpose | Synonymous terminology |
| --- | --- | --- | --- |
| `--scenario PATH` | _(optional)_ | Load scenario JSON from a file path or '-' for STDIN. | context file, input manifest, blueprint source |
| `--format {text,json,fine-tune,awesome-prompts}` | `text` | Choose plain text, JSON, fine-tune dataset, or awesome prompts CSV output. | output mode, rendering style, representation |
| `--indent N` | `2` | Number of spaces applied to JSON pretty-printing. | spacing, padding, indentation depth |
| `--fine-tune-dataset PATH` | _(optional)_ | Write the Dynamic AGI training payload to `PATH` (use `-` for stdout). Parent directories are created automatically. | dataset export, training payload, AGI corpus |
| `--fine-tune-tag TAG` | _(repeatable)_ | Apply default tags to generated fine-tune examples. | label, classification marker, taxonomy token |
| `--awesome-prompts-output PATH` | _(optional)_ | Persist the awesome-prompts CSV export to `PATH` (use `-` to stream after the main output). | save, archive, capture |
| `--extract-datasets DIR` | _(optional)_ | Extract both fine-tune JSON and awesome-prompts CSV datasets into `DIR`, creating the folder when missing. | export, bundle, harvest |
---


## Pages 4–5 — Scenario Input Specifications

### Accepted Input Streams

- **Filesystem path**: Absolute or relative path to a UTF-8 encoded JSON
  document.
- **Standard input (`-`)**: Pipe a JSON payload directly, e.g.
  `cat scenario.json | python -m dynamic_framework --scenario -`.
- **Implicit default**: Omit `--scenario` to evaluate the baked-in exemplar
  scenario described in Appendix A.

### Structural Requirements

- Top-level document **must** be a JSON object (mapping/dictionary).
- Supported properties include:
  - `history` _(integer)_ — quantity of historical pulses to retain. Synonyms:
    _window_, _lookback_.
  - `decay` _(float)_ — exponential decay factor for historical weighting.
    Synonyms: _attenuation_, _fade coefficient_.
  - `nodes` _(array)_ — definitions of capability nodes.
  - `pulses` _(array)_ — chronological signal measurements.

### Node Definition Keys

| Field              | Type       | Meaning                                  | Related Terms              |
| ------------------ | ---------- | ---------------------------------------- | -------------------------- |
| `key`              | string     | Unique identifier for the node.          | slug, handle               |
| `title`            | string     | Human-readable label.                    | heading, caption           |
| `description`      | string     | Narrative explanation of the capability. | overview, synopsis         |
| `weight`           | number     | Influence weight in aggregate maturity.  | importance, coefficient    |
| `minimum_maturity` | number     | Threshold for alerting.                  | floor, baseline            |
| `target_maturity`  | number     | Desired outcome.                         | objective, goal            |
| `dependencies`     | array[str] | (Optional) Upstream node keys.           | prerequisites, antecedents |
| `practices`        | array[str] | (Optional) Supporting rituals.           | routines, disciplines      |

---

## Page 6 — Engine Construction Workflow

1. **Ingest configuration** via `load_scenario`, performing validation and STDIN
   handling.
2. **Instantiate nodes** with `_build_nodes`, converting plain dictionaries into
   `FrameworkNode` objects.
3. **Create engine**:
   `DynamicFrameworkEngine(nodes=..., history=..., decay=...)`.
4. **Translate pulses** using `_build_pulses`, ensuring timestamps become
   timezone-aware UTC datetimes.
5. **Feed signals** through `engine.ingest(pulses)`.

**Key synonyms:**

- _Engine_ ⇔ _Evaluator_, _Processor_, _Computation core_.
- _Pulse_ ⇔ _Signal_, _Measurement_, _Telemetry point_.
- _Ingest_ ⇔ _Absorb_, _Assimilate_, _Read in_.

---

## Pages 7–8 — Report Rendering Formats

### Text Mode (`--format text`)

- Generates a human-readable synopsis featuring overall summary, focus areas,
  alerts, and per-node snapshots.
- Recommendations and alerts are indented with typographic bullets (`•`).
- Sorted by node key for deterministic output.

### JSON Mode (`--format json`)

- Produces serialized metadata via `serialise_report` for downstream automation.
- Obeys the `--indent` flag for readability. Set `--indent 0` for minimal
  padding; negative values are normalized to compact output (equivalent to
  omitting indentation).

**Synonymous descriptors:**

- _Text mode_ ⇔ _Narrative view_, _Console summary_.
- _JSON mode_ ⇔ _Structured view_, _Machine representation_.
- _Indentation_ ⇔ _Spacing_, _Padding_, _Tabulation_.

### Fine-tune Mode (`--format fine-tune`)

- Streams the Dynamic AGI training dataset derived from the current report.
- Mirrors the structure returned by `build_fine_tune_dataset`, embedding the
  report payload alongside fine-tune examples and a dataset summary.
- Combine with `--fine-tune-dataset PATH` to persist the JSON for ingestion by
  the `DynamicAGIFineTuner` utility or orchestration pipelines.
- Examples are ordered by node key so successive runs remain deterministic when
  the scenario input is unchanged.

**Related terminology:**

- _Fine-tune dataset_ ⇔ _Training payload_, _Curriculum bundle_.
- _Examples_ ⇔ _Prompt-completion pairs_, _Learning samples_.
- _Tags_ ⇔ _Labels_, _Facets_, _Taxonomy markers_.

### Awesome Prompts Mode (`--format awesome-prompts`)

- Emits a CSV matching the structure of the
  [`fka/awesome-chatgpt-prompts`](https://huggingface.co/datasets/fka/awesome-chatgpt-prompts)
  dataset for seamless downstream ingestion.
- Each row captures the capability-specific persona in the `act` column and a
  telemetry-rich coaching brief in the `prompt` column.
- Output is ordered deterministically by node key to keep diffs readable across
  repeated runs against unchanged scenarios.
- Combine with `--awesome-prompts-output PATH` to write the CSV to disk while
  still printing the primary CLI response. Supply `-` alongside another format
  (such as `json`) to mirror the CSV to stdout after the main payload.
- Use `--extract-datasets DIR` to simultaneously write `awesome-prompts.csv`
  and the fine-tune dataset (`fine-tune-dataset.json`) into the specified
  directory for batch processing pipelines.

---

## Page 9 — JSON Schema Reference

While not distributed as a formal JSON Schema file, the effective structure
resembles:

```json
{
  "generated_at": "2024-04-30T12:34:56Z",
  "history": 12,
  "decay": 0.1,
  "summary": "text",
  "overall_maturity": 0.72,
  "execution_health": 0.68,
  "momentum": 0.05,
  "focus_areas": ["Orchestration"],
  "alerts": ["Automation maturity below threshold"],
  "nodes": [
    {
      "key": "automation",
      "title": "Automation",
      "maturity": 0.46,
      "confidence": 0.61,
      "enablement": 0.50,
      "resilience": 0.44,
      "momentum": -0.12,
      "status": "Needs Attention",
      "summary": "Deployment pipeline is partially automated with gaps.",
      "tags": ["tooling"],
      "recommendations": ["Invest in CI/CD hardening"],
      "alerts": ["Momentum trending downward"]
    }
  ]
}
```

Each numerical field maps to floating-point output from the engine. Timestamps
comply with ISO 8601 using a `Z` suffix for UTC.

---

## Pages 11–12 — Operational Examples

### Example 1: Evaluate Default Scenario

```bash
python -m dynamic_framework
```

Produces the text summary for the built-in benchmark scenario.

### Example 2: Pipe Custom Scenario from STDIN

```bash
jq '.pulses[0].momentum = 0.35' scenario.json \
  | python -m dynamic_framework --scenario - --format json --indent 4
```

Returns prettified JSON for integration into dashboards or alerting systems.

### Example 3: Compact Machine Output

```bash
python -m dynamic_framework --scenario scenario.json --format json --indent 0
```

Useful for minimizing payload size in message queues.

**Synonyms for operational verbs:** execute ⇔ run ⇔ trigger, pipe ⇔ channel ⇔
funnel.

---

## Pages 13–14 — Troubleshooting & Diagnostics

| Symptom                                                                | Likely Cause                             | Resolution                                                    | Equivalent Terms                       |
| ---------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| `error: scenario JSON must be an object`                               | Input root is an array/string.           | Wrap scenario data in an object with `nodes`/`pulses`.        | error ⇔ fault ⇔ anomaly                |
| `error: stdin did not contain any scenario JSON`                       | Empty STDIN stream.                      | Ensure upstream command writes JSON or remove `--scenario -`. | empty ⇔ blank ⇔ vacant                 |
| `ValueError: timestamp must be datetime, ISO string, or epoch seconds` | Pulse timestamp uses unsupported format. | Convert to ISO 8601 or epoch float.                           | timestamp ⇔ timecode ⇔ temporal marker |
| Missing recommendations/alerts                                         | Scenario nodes lack optional arrays.     | Populate `recommendations`/`alerts` arrays in scenario.       | missing ⇔ absent ⇔ lacking             |

### Diagnostic Tips

- Run with `PYTHONWARNINGS=default` to surface latent warnings.
- Add `print(serialise_report(engine))` in sandbox scripts for debugging.

---

## Pages 15–16 — Glossary & Synonyms

- **Dynamic Framework Engine**: Core computation service; synonyms — _maturity
  engine_, _assessment kernel_.
- **Framework Node**: Capability under evaluation; synonyms — _pillar_,
  _dimension_, _vector_.
- **Framework Pulse**: Individual measurement; synonyms — _data point_,
  _checkpoint_, _telemetry sample_.
- **Focus Area**: Highlighted improvement theme; synonyms — _priority_,
  _spotlight_, _attention zone_.
- **Alert**: Risk signal requiring action; synonyms — _warning_, _notification_,
  _flag_.

---

## Pages 17–18 — Appendix A – Default Scenario Blueprint

The CLI provides `DEFAULT_SCENARIO`, mirroring the JSON contained in
`dynamic_framework/__main__.py`. Key highlights:

- **History window**: `12` records.
- **Decay rate**: `0.1` emphasizing recent pulses.
- **Nodes**:
  1. _Orchestration_ — practices: `standups`, `retrospectives`.
  2. _Automation_ — dependent on Orchestration; practices: `runbooks`,
     `observability`.
  3. _Platform_ — practices: `discovery`, `enablement`.
- **Pulses**: Six sample measurements spanning March–April 2024 with UTC
  timestamps.

### Synonym Reference for Scenario Concepts

| Concept   | Synonyms                            |
| --------- | ----------------------------------- |
| History   | Retrospective span, archival window |
| Decay     | Weight reduction, influence taper   |
| Node      | Capability, pillar, competency      |
| Pulse     | Observation, datapoint, reading     |
| Narrative | Commentary, storyline, exposition   |

---

## Page 19 — Appendix B – Exit Codes & Environment Variables

### Exit Codes

| Code | Meaning                                                                   | Synonyms                   |
| ---- | ------------------------------------------------------------------------- | -------------------------- |
| `0`  | Successful execution.                                                     | ok, completed, finished    |
| `2`  | CLI parsing or runtime error; emitted via `argparse.ArgumentParser.exit`. | failure, termination, halt |

### Environment Variables

- `PYTHONWARNINGS` — Control warning verbosity (synonyms: alerts, cautions).
- `PYTHONPATH` — Extend module discovery paths (synonyms: import locations,
  module search list).
- `LC_ALL` / `LANG` — Influence locale-specific formatting (synonyms: language
  settings, regional profile).

---

## Page 20 — Appendix C – Back-to-Back Expression Library

To support consistent CLI/CD messaging, this appendix curates reusable
"back-to-back" phrases. Grouped lists make it easy to tailor release notes,
pipeline prompts, and operator briefings without repeating the same wording.

### 📘 Master List of Back-to-Back Expressions

#### ⏳ Time & Progression

- day-by-day
- year-by-year
- month-by-month
- week-by-week
- hour-by-hour
- minute-by-minute
- moment-by-moment
- second-by-second
- stage-by-stage
- step-by-step
- phase-by-phase
- period-by-period
- generation-by-generation
- season-by-season

#### 🧩 Detail & Breakdown

- one-by-one
- bit-by-bit
- piece-by-piece
- part-by-part
- element-by-element
- block-by-block
- brick-by-brick
- layer-by-layer
- inch-by-inch
- detail-by-detail
- section-by-section
- line-by-line
- row-by-row
- page-by-page
- chapter-by-chapter
- verse-by-verse
- note-by-note
- word-by-word
- letter-by-letter
- character-by-character
- pixel-by-pixel
- frame-by-frame
- click-by-click
- question-by-question

#### ⚔️ Conflict & Competition

- face-to-face
- toe-to-toe
- head-to-head
- shoulder-to-shoulder
- nose-to-nose
- hand-to-hand (combat)
- eye-to-eye (agreement/disagreement)
- back-to-back (matches, wins, games)
- round-by-round
- play-by-play

#### 🤝 Unity & Relationships

- hand-in-hand
- arm-in-arm
- shoulder-to-shoulder (also teamwork)
- heart-to-heart (deep talk)
- side-by-side
- back-to-back (also protection / closeness)

#### ⚖️ Equivalence & Exactness

- word-for-word
- letter-for-letter
- number-for-number
- like-for-like
- point-for-point
- pound-for-pound
- tit-for-tat
- eye-for-eye (Biblical phrase)
- measure-for-measure

#### 🏠 Travel & Movement

- door-to-door (sales, delivery)
- mile-by-mile
- yard-by-yard
- street-by-street
- road-by-road
- route-by-route
- stop-by-stop
- station-by-station
- journey-by-journey
- step-by-step (fits both travel & process)

#### 🎨 Creative & Stylized

- image-by-image
- sketch-by-sketch
- scene-by-scene
- shot-by-shot
- cut-by-cut
- reel-by-reel (film)
- track-by-track (music albums)
- beat-by-beat (music/drama pacing)
- post-by-post (social media)
- tweet-by-tweet
- story-by-story
- article-by-article
- blog-by-blog

#### 📊 Learning & Analysis

- example-by-example
- case-by-case
- problem-by-problem
- equation-by-equation
- proof-by-proof
- theorem-by-theorem
- argument-by-argument
- point-by-point

#### 🧠 Emotional/Experiential

- breath-by-breath
- heartbeat-by-heartbeat
- tear-by-tear
- smile-by-smile
- memory-by-memory
- thought-by-thought
- lesson-by-lesson
- experience-by-experience

### ⚛️ Quantum Back-to-Back Glossary

1. **Quantum-by-Quantum (State Evolution & Measurement)**

   - **Meaning:** Systems evolve in discrete quanta instead of continuous
     increments.
   - **Used in:** Quantum measurement theory and harmonic oscillator analysis.
   - **Equation:** `E_n = \hbar \omega (n + 1/2), n = 0, 1, 2, ...` — harmonic
     oscillator energy levels climb quantum-by-quantum.

2. **Photon-by-Photon (Quantum Optics)**

   - **Meaning:** Observing light at the level of single photons.
   - **Used in:** Single-photon experiments and quantum communication setups.
   - **Equation:** `\hat{a}^\dagger |n\rangle = \sqrt{n + 1}\, |n + 1\rangle` —
     the creation operator injects photons photon-by-photon.

3. **Particle-by-Particle (Scattering & Detection)**

   - **Meaning:** Treating each interaction or detection event as a discrete
     particle process.
   - **Used in:** Scattering calculations and quantum Monte Carlo simulations.
   - **Equation:** `\Psi(r_1, r_2, ..., r_N)` — an N-body wavefunction is
     assembled particle-by-particle.

4. **Spin-by-Spin (Quantum Magnetism)**

   - **Meaning:** Resolving spin chains and entanglement interactions step by
     step.
   - **Used in:** Ising and Heisenberg model evaluations.
   - **Equation:** `H = -J \sum_i \sigma_i^z \sigma_{i+1}^z` — spin couplings
     accumulate spin-by-spin across the chain.

5. **Qubit-by-Qubit (Quantum Computing)**

   - **Meaning:** Building and entangling quantum registers one qubit at a time.
   - **Used in:** Quantum error correction and circuit synthesis.
   - **Equation:** `|\psi\rangle = \bigotimes_{i=1}^{N} |q_i\rangle` — a
     register state forms qubit-by-qubit.

6. **State-to-State (Transitions)**

   - **Meaning:** Tracking transition probabilities between discrete quantum
     states.
   - **Used in:** Spectroscopy analysis and Fermi's Golden Rule applications.
   - **Equation:**
     `W_{i \to f} = \frac{2\pi}{\hbar} |\langle f|H'|i\rangle|^2 \rho(E_f)` —
     transition rates accrue state-to-state.

7. **Phase-in-Phase (Coherence & Interference)**

   - **Meaning:** Describing overlapping quantum phases that interfere
     constructively or destructively.
   - **Used in:** Superposition experiments, including the double-slit setup.
   - **Equation:**
     `|\Psi\rangle = \tfrac{1}{2} (e^{i\phi_1} |1\rangle + e^{i\phi_2} |2\rangle)`
     — wave components combine phase-in-phase.

8. **Energy-for-Energy (Conservation)**

   - **Meaning:** Energy exchanges balance exactly within quantum interactions.
   - **Used in:** Scattering derivations and conservation law bookkeeping.
   - **Equation:** `E_{\text{in}} = E_{\text{out}}` — conservation enforces
     energy-for-energy symmetry.

9. **Field-to-Field (Quantum Field Theory)**

   - **Meaning:** Capturing interactions between distinct quantum fields.
   - **Used in:** Quantum electrodynamics (QED) and quantum chromodynamics
     (QCD).
   - **Equation:**
     `\mathcal{L}_{\text{int}} = -e \bar{\psi} \gamma^{\mu} \psi A_{\mu}` — the
     electron field couples field-to-field with the photon field.

**Quantum summary:** Quantum systems advance discretely (quantum-by-quantum),
relate through paired interactions (particle-by-particle, field-to-field),
conserve exact quantities (energy-for-energy), and evolve procedurally
(state-to-state).

### 🔑 How to Invent New Ones

The structure is productive and customizable:

- `[Unit] + by + [Unit]`
- `[Unit] + to + [Unit]`
- `[Unit] + for + [Unit]`
- `[Unit] + in + [Unit]`

Examples to adapt for backlog items, experiments, or retrospectives include:

- task-by-task, goal-by-goal (productivity)
- layer-by-layer, frame-by-frame (technology)
- pulse-by-pulse, breath-by-breath (poetic/emotional)

---

_End of Dynamic CLI Comprehensive Manual._
