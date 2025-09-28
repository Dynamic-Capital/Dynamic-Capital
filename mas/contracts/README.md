# Message Contracts

All inter-agent communication flows through versioned envelopes defined here. Schemas use JSON Schema Draft 2020-12 and are mirrored in Pydantic models for runtime validation. Changes must follow semantic versioning with backward/forward compatibility notes.

## Envelope (v1)

`envelope.v1.json` defines the transport wrapper applied to every message. Payload schemas reference this envelope via `$defs`.

Key rules:

- Reject unknown versions or additional properties.
- Require `ttl_ms`, `idempotency_key`, and signature metadata for authenticity.
- Enforce ISO 8601 timestamps and UUIDv4 identifiers.

## Domain Payloads & Ownership

| Schema | Producer → Consumer | Purpose |
| --- | --- | --- |
| `signal.event.opportunity.v1.json` | MarketData → Signal/Portfolio | Scored opportunity payload with dedupe keys |
| `portfolio.intent.allocate.v1.json` | Portfolio → Risk | Allocation proposal with exposure deltas |
| `risk.state.context.v1.json` | Risk → PolicyGuard/Reporter | Risk trims, warnings, compliance context |
| `order.intent.route.v1.json` | PolicyGuard → Order/Execution | Authorised order routing instructions |
| `execution.event.fill.v1.json` | Execution → Hedger/Compliance/Reporter | Fill batches + slippage metrics |
| `compliance.event.alert.v1.json` | Compliance → Reporter/Control Plane | Regulatory alerts + remediation guidance |
| `reporter.event.snapshot.v1.json` | Reporter → Stakeholders | Aggregated operational + financial metrics |

Future schemas (`hedger.intent.cover`, `order.event.ack`, etc.) should extend this table as soon as contract drafts exist.

## Schema Governance Checklist

1. Update schema with semantic version bump and change log (`$comment`).
2. Generate JSON Schema diff and attach to PR.
3. Publish to schema registry via `tools/schema-publisher`.
4. Update affected agents with contract tests.
5. Replay relevant DLQ entries post-deploy.

