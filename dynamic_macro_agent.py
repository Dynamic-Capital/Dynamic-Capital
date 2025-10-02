"""Macro-aware agent that coordinates prompt construction."""

from __future__ import annotations

from typing import Mapping, Sequence

from dynamic.intelligence.ai_apps.prompt_engine import RenderedPrompt

from dynamic_macro_engine import DynamicMacroEngine
from dynamic_macro_helper import ensure_macro_signals
from dynamic_macro_model import MacroContext, MacroSignal, normalise_sequence

__all__ = ["DynamicMacroAgent"]


class DynamicMacroAgent:
    """High-level agent orchestrating macro-aware prompts."""

    def __init__(
        self,
        *,
        engine: DynamicMacroEngine,
        template_name: str = "macro_brief",
        default_persona: str = "Macro Strategist",
    ) -> None:
        if template_name not in engine.list_templates():
            raise ValueError(f"Template '{template_name}' is not registered with the engine")
        self._engine = engine
        self._template_name = template_name
        self._default_persona = default_persona

    @property
    def persona(self) -> str:
        """Return the agent's default persona."""

        return self._default_persona

    @property
    def template_name(self) -> str:
        """Template used for rendering briefs."""

        return self._template_name

    def build_brief(
        self,
        macro_context: MacroContext | Mapping[str, object],
        *,
        context_layers: Sequence[Mapping[str, object] | None] | None = None,
        allow_partial: bool = False,
    ) -> RenderedPrompt:
        """Render the macro briefing template with resolved macros."""

        mapping = self._coerce_context(macro_context)
        layers = list(context_layers or [])
        return self._engine.render_brief(
            self._template_name,
            mapping,
            context_layers=layers,
            allow_partial=allow_partial,
        )

    # ------------------------------------------------------------------
    def _coerce_context(self, macro_context: MacroContext | Mapping[str, object]) -> Mapping[str, object]:
        if isinstance(macro_context, MacroContext):
            mapping = macro_context.to_prompt_context()
        else:
            mapping = dict(macro_context)

        mapping.setdefault("persona", self._default_persona)
        mapping.setdefault("timeframe", "current cycle")

        signals = mapping.get("signals", ())
        if signals:
            mapping["signals"] = [signal.as_dict() if isinstance(signal, MacroSignal) else signal for signal in ensure_macro_signals(signals)]
        objectives = mapping.get("objectives", ())
        mapping["objectives"] = normalise_sequence(objectives or ("Maintain observation",)) or ["Maintain observation"]
        actions = mapping.get("actions")
        if actions is None:
            mapping["actions"] = list(mapping["objectives"])
        else:
            mapping["actions"] = normalise_sequence(actions)
        return mapping
