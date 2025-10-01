# Dynamic Self-Awareness Engine

Dynamic Capital’s Self-Awareness Engine is the reflexive counterpart to our
treasury and execution systems. It ingests raw emotional, cognitive, and
behavioural signals, stabilises them into a structured record, and delivers
actionable guidance that keeps operators aligned with the organisation’s values
while avoiding analysis
paralysis.【F:dynamic_self_awareness/engine.py†L26-L223】

## Architecture at a Glance

### Signal contracts

`SelfAwarenessSignal` is the canonical contract for incoming observations. It
cleans channel labels, enforces non-empty descriptions, clamps continuous
metrics into safe ranges, and normalises timestamps to UTC so that downstream
analytics stay comparable across journaling cadences or
devices.【F:dynamic_self_awareness/engine.py†L26-L52】

### Situational lens

`AwarenessContext` captures the frame around a reflection session—situation,
emotion label, cognitive noise, bodily tension, readiness, target alignment,
personal standards, and perceived support—then derives whether adequate backing
exists for accountability loops.【F:dynamic_self_awareness/engine.py†L55-L82】

### Report contract

`SelfAwarenessReport` packages the computed indices, dominant channels,
action-oriented nudges, adaptive prompts, grounding practices, and narrative so
other agents or dashboards can consume the outcome without reimplementing
business logic.【F:dynamic_self_awareness/engine.py†L85-L110】

### Runtime container

`DynamicSelfAwareness` manages a bounded deque of signals, ensuring the engine
remains memory-safe while keeping enough history to identify short-term trends
before synthesising guidance.【F:dynamic_self_awareness/engine.py†L116-L143】

## Report Lifecycle

1. **Capture** – Sessions stream individual or batched payloads through
   `capture`/`extend`. Loose dictionaries are coerced into dataclass instances
   with default timestamps, giving the operator a forgiving interface without
   compromising data hygiene.【F:dynamic_self_awareness/engine.py†L121-L143】
2. **Contextualise** – `generate_report` requires at least one signal, then
   computes clarity, equilibrium, alignment, action bias, dominant channels, and
   overthinking risk with the supplied situational
   context.【F:dynamic_self_awareness/engine.py†L145-L171】
3. **Stabilise metrics** – Weighted averages are clamped so abnormal weights or
   partial journals cannot overwhelm the analysis, keeping downstream heuristics
   numerically safe.【F:dynamic_self_awareness/engine.py†L173-L187】

### Scoring heuristics

- **Overthinking risk** blends rumination signals (lack of clarity, cognitive
  noise, agitation) with behavioural inertia (low action bias, low readiness) to
  spotlight when reflection is veering toward
  loops.【F:dynamic_self_awareness/engine.py†L188-L197】
- **Trend detection** surfaces dominant channels so coaching can target the
  loudest cognitive, emotional, or behavioural narratives driving the current
  state.【F:dynamic_self_awareness/engine.py†L181-L186】

## Turning Awareness into Motion

- **Productive actions** translate alignment gaps, personal standards, action
  bias, and support levels into concrete micro-commitments that close the loop
  between insight and behaviour.【F:dynamic_self_awareness/engine.py†L199-L223】
- **Reflection prompts** adapt default introspective questions with targeted
  probes when clarity is low, overthinking risk is high, or explicit standards
  exist.【F:dynamic_self_awareness/engine.py†L225-L243】
- **Grounding practices** recommend nervous-system resets or accountability
  check-ins when equilibrium or support are lacking, while reinforcing healthy
  routines when stability is already
  present.【F:dynamic_self_awareness/engine.py†L245-L257】
- **Narrative synthesis** summarises situation, emotion, channel dominance,
  alignment deltas, and the awareness-versus-overthinking verdict in natural
  language for human review or automated
  notifications.【F:dynamic_self_awareness/engine.py†L259-L282】

## Operating Playbook

### Quickstart

```python
from dynamic_self_awareness.engine import (
    AwarenessContext,
    DynamicSelfAwareness,
    SelfAwarenessSignal,
)

engine = DynamicSelfAwareness(history=90)

engine.extend(
    [
        {"channel": "emotion", "observation": "Feeling scattered", "clarity": 0.3, "agitation": 0.6},
        SelfAwarenessSignal(channel="thought", observation="Doubting roadmap", alignment=0.4, action_bias=0.3),
    ]
)

context = AwarenessContext(
    situation="Preparing investor update",
    emotion_label="anxious",
    cognitive_noise=0.7,
    bodily_tension=0.6,
    readiness_for_action=0.4,
    value_alignment_target=0.8,
    personal_standards=("Radical transparency",),
    support_level=0.5,
)

report = engine.generate_report(context)
print(report.as_dict())
```

This pattern powers CLI journaling tools, Slack bots, or scheduled retros. The
report object feeds analytics stores, real-time nudges, or compliance systems
without additional
transformation.【F:dynamic_self_awareness/engine.py†L101-L170】

### Operational safeguards

- Rotate the optional `history` window if you need shorter or longer trend
  memory; the deque automatically discards stale signals to protect
  performance.【F:dynamic_self_awareness/engine.py†L116-L124】
- Use `reset()` to demarcate significant rituals (monthly reviews, crisis
  debriefs) so subsequent guidance reflects a fresh slate rather than
  compounding across contexts.【F:dynamic_self_awareness/engine.py†L127-L132】
- Store `report.as_dict()` alongside governance artefacts so auditors can trace
  intention → decision → execution with complete psychological
  context.【F:dynamic_self_awareness/engine.py†L99-L110】

### Integration patterns

- **Leadership cadences** – Pair daily journaling with the report narrative to
  decide whether to lean into action bias coaching or emotional support in the
  next stand-up.【F:dynamic_self_awareness/engine.py†L199-L282】
- **Automation guardrails** – Trigger alerts when overthinking risk spikes so
  high-frequency trading surfaces automatically prompt grounding rituals before
  approving discretionary moves.【F:dynamic_self_awareness/engine.py†L188-L257】
- **Learning loops** – Log dominant channels alongside market events to study
  how emotional noise correlates with execution quality and refine standards
  accordingly.【F:dynamic_self_awareness/engine.py†L181-L223】

## Continuous Evolution Checklist

1. Review `personal_standards` every quarter; refreshed anchors immediately
   reshape the action and prompt catalogue, keeping guidance tethered to current
   leadership values.【F:dynamic_self_awareness/engine.py†L206-L242】
2. Backtest overthinking risk thresholds against real incidents to calibrate
   when to escalate to human mentors versus automated
   rituals.【F:dynamic_self_awareness/engine.py†L188-L257】
3. Extend the `SelfAwarenessSignal` schema only through additional optional
   fields so historical logs remain backwards
   compatible.【F:dynamic_self_awareness/engine.py†L26-L52】

By converting introspective noise into structured, value-aligned guidance, the
Dynamic Self-Awareness Engine keeps leadership steady in volatile markets while
ensuring every reflection session results in accountable
action.【F:dynamic_self_awareness/engine.py†L145-L282】
