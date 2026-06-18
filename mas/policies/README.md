# Policy Packs

Policy packs codify guardrails for each agent. They are versioned using semantic tags (`name = "<policy>.<semver>"`) and stored as TOML for readability. Every pack must include:

- Threshold definitions (limits, budgets, caps)
- Enforcement behaviours (HALT, fallback strategies)
- Audit metadata (owner, review cadence)
- Mapping to contracts/agents impacted (align with [`../README.md`](../README.md) interface map)

Policies are distributed through the control plane, validated by PolicyGuard, and cached by downstream agents. Changes require simulation evidence, dual approval, and update of related canvases.

