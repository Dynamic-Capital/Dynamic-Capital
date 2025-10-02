# Intelligence · AI Applications

This package aggregates Dynamic Capital's applied AI capabilities: persona
agents, fusion engines, hedging policies, and infrastructure registries.

Key modules:

- `agents.py`: Persona orchestration, execution/research/risk agents, and agent
  lifecycle helpers.
- `core.py`: Fusion engine generating trading signals with explainable context.
- `analysis.py`, `risk.py`, `hedge.py`: Analysis pipelines, risk management, and
  hedging strategies.
- `infrastructure.py`: Module registry wiring copilots to operational workflows.
- `knowledge_engine.py`: Dynamic knowledge graph management, auto-linking, and
  retrieval utilities that power research copilots and documentation flows.
- `prompt_engine.py`: Macro-aware prompt builder composing structured chat
  messages for LLM copilots and trading research assistants.
- Adapter integrations (`dolphin_adapter.py`, `ollama_adapter.py`, `kimi_k2_adapter.py`) enabling multi-model support.

When extending the AI surface ensure exports remain typed and update this
README with new personas or integrations.
