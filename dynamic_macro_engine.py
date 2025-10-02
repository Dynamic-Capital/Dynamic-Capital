"""Macro aware prompt engine building on :mod:`dynamic.intelligence.ai_apps`."""

from __future__ import annotations

from typing import Any, Iterable, Mapping, Sequence

from dynamic.intelligence.ai_apps.prompt_engine import (
    DynamicPromptEngine,
    PromptMessage,
    PromptTemplate,
    RenderedPrompt,
)

from dynamic_macro_helper import (
    ensure_macro_signals,
    format_objectives,
    summarise_signals,
)
from dynamic_macro_model import MacroContext

__all__ = ["DynamicMacroEngine", "build_default_macro_templates"]


_DEFAULT_TEMPLATE_DESCRIPTION = "Macro briefing template with automatic signal macros."


def build_default_macro_templates() -> tuple[PromptTemplate, ...]:
    """Return the built-in macro briefing templates."""

    briefing = PromptTemplate(
        name="macro_brief",
        description=_DEFAULT_TEMPLATE_DESCRIPTION,
        messages=(
            PromptMessage(
                role="system",
                content="You are {persona}, a macro strategist distilling complex market forces.",
            ),
            PromptMessage(
                role="user",
                content=(
                    "Timeframe: {timeframe}\n\n"
                    "Objectives:\n{macro_objectives}\n\n"
                    "Macro Landscape:\n{macro_overview}\n\n"
                    "Historical Context:\n{historical_context}\n\n"
                    "Recommended Actions:\n{macro_actions}"
                ),
            ),
        ),
        metadata={"domain": "macro", "version": 1},
    )
    follow_up = PromptTemplate(
        name="macro_follow_up",
        description="Follow up prompt focusing on deltas and risk shifts.",
        messages=(
            PromptMessage(
                role="system",
                content="You are {persona}, reviewing macro deltas for stakeholders.",
            ),
            PromptMessage(
                role="user",
                content=(
                    "Summarise the most important changes since last briefing.\n\n"
                    "Updated objectives:\n{macro_objectives}\n\n"
                    "Signal shifts:\n{macro_overview}\n\n"
                    "Legacy context:\n{historical_context}\n\n"
                    "Next actions:\n{macro_actions}"
                ),
            ),
        ),
        metadata={"domain": "macro", "version": 1},
    )
    return (briefing, follow_up)


class DynamicMacroEngine(DynamicPromptEngine):
    """Specialised engine that injects macro-aware macros."""

    def __init__(
        self,
        *,
        templates: Iterable[PromptTemplate] | None = None,
        base_context: Mapping[str, Any] | None = None,
        macro_limit: int = 4,
    ) -> None:
        if templates is None:
            templates = build_default_macro_templates()
        super().__init__(templates=templates, base_context=base_context)
        self._macro_limit = macro_limit
        self.register_macro("macro_overview", self._macro_overview, overwrite=True)
        self.register_macro("macro_objectives", self._macro_objectives, overwrite=True)
        self.register_macro("macro_actions", self._macro_actions, overwrite=True)
        self.register_macro("historical_context", self._historical_context, overwrite=True)

    def render_brief(
        self,
        template: str,
        macro_context: MacroContext | Mapping[str, Any],
        *,
        context_layers: Sequence[Mapping[str, Any] | None] | None = None,
        allow_partial: bool = False,
    ) -> RenderedPrompt:
        """Render a template using either a :class:`MacroContext` or a mapping."""

        if isinstance(macro_context, MacroContext):
            context_mapping = macro_context.to_prompt_context()
        else:
            context_mapping = dict(macro_context)
        return self.build_prompt(
            template,
            context=context_mapping,
            context_layers=context_layers,
            allow_partial=allow_partial,
        )

    # -- macro implementations -------------------------------------------------
    def _macro_overview(self, context: Mapping[str, Any]) -> str:
        raw_signals = context.get("signals")
        if not raw_signals:
            return "- No significant macro signals registered."
        signals = ensure_macro_signals(raw_signals)
        return summarise_signals(signals, limit=self._macro_limit)

    def _macro_objectives(self, context: Mapping[str, Any]) -> str:
        objectives = context.get("objectives") or ()
        return format_objectives(objectives)

    def _macro_actions(self, context: Mapping[str, Any]) -> str:
        actions = context.get("actions")
        formatted = format_objectives(actions or ())
        if formatted:
            return formatted
        fallback = context.get("objectives") or ()
        return format_objectives(fallback)

    def _historical_context(self, context: Mapping[str, Any]) -> str:
        history = context.get("historical_context")
        if isinstance(history, str) and history.strip():
            return history.strip()
        legacy = context.get("history")
        if isinstance(legacy, str) and legacy.strip():
            return legacy.strip()
        return "- No previous briefing data captured."
