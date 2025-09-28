# Dynamic CLI Comprehensive Manual

## Index
| Page | Section |
| ---- | ------- |
| 1 | Preface & Audience |
| 2 | Quick Start Synopsis |
| 3 | Installation & Invocation Options |
| 4 | Scenario Input Specifications |
| 6 | Engine Construction Workflow |
| 7 | Report Rendering Formats |
| 9 | JSON Schema Reference |
| 11 | Operational Examples |
| 13 | Troubleshooting & Diagnostics |
| 15 | Glossary & Synonyms |
| 17 | Appendix A – Default Scenario Blueprint |
| 19 | Appendix B – Exit Codes & Environment Variables |

> **Pagination note:** Page numbers reference printed formatting using US Letter paper with default Markdown-to-PDF rendering (roughly 500 words per page). Adjustments in font size may shift numbering slightly.

---

## Page 1 — Preface & Audience
The Dynamic CLI (command-line interface) orchestrates the `dynamic_framework` evaluation engine, enabling engineering leaders, delivery managers, and platform strategists to transform scenario definitions into actionable maturity reports. This manual targets:

- Engineering directors who need a repeatable governance cadence.
- Site reliability engineers curating operational health dashboards.
- Data and analytics practitioners streamlining maturity telemetry pipelines.

The CLI interoperates seamlessly with traditional UNIX pipelines and JSON-centric workflows, supporting both interactive use and automation pipelines such as CI/CD, cron jobs, and ChatOps command handlers.

---

## Page 2 — Quick Start Synopsis
1. Prepare a scenario definition in JSON (JavaScript Object Notation).
2. Run `python -m dynamic_framework --scenario scenario.json`.
3. Review the text report summary in the terminal or request structured JSON using `--format json`.

**Synonymous phrasing:**
- *Quick start* ⇔ *Fast launch*, *Express setup*, *Rapid onboarding*.
- *Scenario definition* ⇔ *Assessment blueprint*, *Evaluation profile*, *Context specification*.

---

## Page 3 — Installation & Invocation Options
### Python Environment Requirements
- Python 3.11 or newer (aligning with the project runtime constraints).
- Access to the `dynamic_framework` package within your Python path (`pip install -e .` from the repository root during development).

### Invocation Patterns
| Usage Form | Description | Synonyms |
| ---------- | ----------- | -------- |
| `python -m dynamic_framework` | Execute the CLI using the module loader. | run, launch, initiate |
| `dynamic-framework` | If installed via an entry point script, invokes the same runner. | command, executable |

### Core Flags
| Flag | Default | Purpose | Synonymous terminology |
| ---- | ------- | ------- | --------------------- |
| `--scenario PATH` | *(optional)* | Load scenario JSON from a file path or `-` for STDIN. | context file, input manifest, blueprint source |
| `--format {text,json}` | `text` | Choose plain text or JSON report format. | output mode, rendering style, representation |
| `--indent N` | `2` | Number of spaces applied to JSON pretty-printing. | spacing, padding, indentation depth |

---

## Page 4 — Scenario Input Specifications
### Accepted Input Streams
- **Filesystem path**: Absolute or relative path to a UTF-8 encoded JSON document.
- **Standard input (`-`)**: Pipe a JSON payload directly, e.g. `cat scenario.json | python -m dynamic_framework --scenario -`.
- **Implicit default**: Omit `--scenario` to evaluate the baked-in exemplar scenario described in Appendix A.

### Structural Requirements
- Top-level document **must** be a JSON object (mapping/dictionary).
- Supported properties include:
  - `history` *(integer)* — quantity of historical pulses to retain. Synonyms: *window*, *lookback*.
  - `decay` *(float)* — exponential decay factor for historical weighting. Synonyms: *attenuation*, *fade coefficient*.
  - `nodes` *(array)* — definitions of capability nodes.
  - `pulses` *(array)* — chronological signal measurements.

### Node Definition Keys
| Field | Type | Meaning | Related Terms |
| ----- | ---- | ------- | ------------- |
| `key` | string | Unique identifier for the node. | slug, handle |
| `title` | string | Human-readable label. | heading, caption |
| `description` | string | Narrative explanation of the capability. | overview, synopsis |
| `weight` | number | Influence weight in aggregate maturity. | importance, coefficient |
| `minimum_maturity` | number | Threshold for alerting. | floor, baseline |
| `target_maturity` | number | Desired outcome. | objective, goal |
| `dependencies` | array[str] | (Optional) Upstream node keys. | prerequisites, antecedents |
| `practices` | array[str] | (Optional) Supporting rituals. | routines, disciplines |

---

## Page 6 — Engine Construction Workflow
1. **Ingest configuration** via `load_scenario`, performing validation and STDIN handling.
2. **Instantiate nodes** with `_build_nodes`, converting plain dictionaries into `FrameworkNode` objects.
3. **Create engine**: `DynamicFrameworkEngine(nodes=..., history=..., decay=...)`.
4. **Translate pulses** using `_build_pulses`, ensuring timestamps become timezone-aware UTC datetimes.
5. **Feed signals** through `engine.ingest(pulses)`.

**Key synonyms:**
- *Engine* ⇔ *Evaluator*, *Processor*, *Computation core*.
- *Pulse* ⇔ *Signal*, *Measurement*, *Telemetry point*.
- *Ingest* ⇔ *Absorb*, *Assimilate*, *Read in*.

---

## Page 7 — Report Rendering Formats
### Text Mode (`--format text`)
- Generates a human-readable synopsis featuring overall summary, focus areas, alerts, and per-node snapshots.
- Recommendations and alerts are indented with typographic bullets (`•`).
- Sorted by node key for deterministic output.

### JSON Mode (`--format json`)
- Produces serialized metadata via `serialise_report` for downstream automation.
- Obeys the `--indent` flag for readability. Set `--indent 0` or `--indent -1` to produce compact output (Python treats negative indent as separators only).

**Synonymous descriptors:**
- *Text mode* ⇔ *Narrative view*, *Console summary*.
- *JSON mode* ⇔ *Structured view*, *Machine representation*.
- *Indentation* ⇔ *Spacing*, *Padding*, *Tabulation*.

---

## Page 9 — JSON Schema Reference
While not distributed as a formal JSON Schema file, the effective structure resembles:

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

Each numerical field maps to floating-point output from the engine. Timestamps comply with ISO 8601 using a `Z` suffix for UTC.

---

## Page 11 — Operational Examples
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

**Synonyms for operational verbs:** execute ⇔ run ⇔ trigger, pipe ⇔ channel ⇔ funnel.

---

## Page 13 — Troubleshooting & Diagnostics
| Symptom | Likely Cause | Resolution | Equivalent Terms |
| ------- | ------------ | ---------- | ---------------- |
| `error: scenario JSON must be an object` | Input root is an array/string. | Wrap scenario data in an object with `nodes`/`pulses`. | error ⇔ fault ⇔ anomaly |
| `error: stdin did not contain any scenario JSON` | Empty STDIN stream. | Ensure upstream command writes JSON or remove `--scenario -`. | empty ⇔ blank ⇔ vacant |
| `ValueError: timestamp must be datetime, ISO string, or epoch seconds` | Pulse timestamp uses unsupported format. | Convert to ISO 8601 or epoch float. | timestamp ⇔ timecode ⇔ temporal marker |
| Missing recommendations/alerts | Scenario nodes lack optional arrays. | Populate `recommendations`/`alerts` arrays in scenario. | missing ⇔ absent ⇔ lacking |

### Diagnostic Tips
- Run with `PYTHONWARNINGS=default` to surface latent warnings.
- Add `print(serialise_report(engine))` in sandbox scripts for debugging.

---

## Page 15 — Glossary & Synonyms
- **Dynamic Framework Engine**: Core computation service; synonyms — *maturity engine*, *assessment kernel*.
- **Framework Node**: Capability under evaluation; synonyms — *pillar*, *dimension*, *vector*.
- **Framework Pulse**: Individual measurement; synonyms — *data point*, *checkpoint*, *telemetry sample*.
- **Focus Area**: Highlighted improvement theme; synonyms — *priority*, *spotlight*, *attention zone*.
- **Alert**: Risk signal requiring action; synonyms — *warning*, *notification*, *flag*.

---

## Page 17 — Appendix A – Default Scenario Blueprint
The CLI provides `DEFAULT_SCENARIO`, mirroring the JSON contained in `dynamic_framework/__main__.py`. Key highlights:

- **History window**: `12` records.
- **Decay rate**: `0.1` emphasizing recent pulses.
- **Nodes**:
  1. *Orchestration* — practices: `standups`, `retrospectives`.
  2. *Automation* — dependent on Orchestration; practices: `runbooks`, `observability`.
  3. *Platform* — practices: `discovery`, `enablement`.
- **Pulses**: Six sample measurements spanning March–April 2024 with UTC timestamps.

### Synonym Reference for Scenario Concepts
| Concept | Synonyms |
| ------- | -------- |
| History | Retrospective span, archival window |
| Decay | Weight reduction, influence taper |
| Node | Capability, pillar, competency |
| Pulse | Observation, datapoint, reading |
| Narrative | Commentary, storyline, exposition |

---

## Page 19 — Appendix B – Exit Codes & Environment Variables
### Exit Codes
| Code | Meaning | Synonyms |
| ---- | ------- | -------- |
| `0` | Successful execution. | ok, completed, finished |
| `2` | CLI parsing or runtime error; emitted via `argparse.ArgumentParser.exit`. | failure, termination, halt |

### Environment Variables
- `PYTHONWARNINGS` — Control warning verbosity (synonyms: alerts, cautions).
- `PYTHONPATH` — Extend module discovery paths (synonyms: import locations, module search list).
- `LC_ALL` / `LANG` — Influence locale-specific formatting (synonyms: language settings, regional profile).

---

*End of Dynamic CLI Comprehensive Manual.*
