"""Dhivehi-focused translation simulation helpers."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from typing import Iterable, Mapping, Sequence

from dynamic_translation import (
    DynamicTranslationEngine,
    Glossary,
    GlossaryEntry,
    TranslationMemory,
    TranslationMemoryEntry,
    TranslationRequest,
    TranslationResult,
)
from dynamic_translation.model import normalise

__all__ = [
    "build_dhivehi_demo_engine",
    "simulate_dhivehi_translation",
    "SimulationSample",
]


@dataclass(slots=True, frozen=True)
class SimulationSample:
    """Container representing a rendered simulation result."""

    text: str
    source_language: str
    target_language: str
    translated_text: str
    confidence: float
    applied_memory: Mapping[str, object] | None
    glossary_terms: tuple[str, ...]
    post_edit_instructions: tuple[str, ...]
    model_features: Mapping[str, float]


def _simulated_translator(text: str, source: str, target: str) -> str:
    """Return a deterministic synthetic translation for demo purposes."""

    key = (normalise(text), normalise(source), normalise(target))
    translations: dict[tuple[str, str, str], str] = {
        (normalise("ކާމިޔާބު ކުރިން"), "dhivehi", "english"): "Successful completion.",
        (
            normalise("ރިޕޯޓު ނަފާތު"),
            "dhivehi",
            "english",
        ): "Generate the incident report.",
        (
            normalise("urgent card replacement"),
            "english",
            "dhivehi",
        ): "އުންމީދު ކެޑްކާޑް ބަލާލުން.",
    }
    return translations.get(key, f"[simulated {source}->{target}] {text}")


def build_dhivehi_demo_engine() -> DynamicTranslationEngine:
    """Return an engine preloaded with Dhivehi assets for simulations."""

    glossary = Glossary(
        (
            GlossaryEntry("account balance", "account balance"),
            GlossaryEntry("incident report", "incident report"),
        )
    )
    memory_entries: Iterable[TranslationMemoryEntry] = (
        TranslationMemoryEntry(
            source_text="ބާވަތް ބަލާލުން.",
            target_text="Review the account balance.",
            source_language="Dhivehi",
            target_language="English",
            domain="banking",
            quality_score=0.94,
        ),
        TranslationMemoryEntry(
            source_text="ރިޕޯޓު ނަފާތު",
            target_text="Generate the incident report.",
            source_language="Dhivehi",
            target_language="English",
            domain="operations",
            quality_score=0.9,
        ),
    )
    engine = DynamicTranslationEngine(
        supported_languages=("Dhivehi", "English"),
        memory=TranslationMemory(tuple(memory_entries)),
        glossary=glossary,
    )
    engine.configure_translator(_simulated_translator)
    return engine


def simulate_dhivehi_translation(
    text: str,
    *,
    source_language: str = "Dhivehi",
    target_language: str = "English",
    domain: str | None = None,
) -> TranslationResult:
    """Simulate the translation flow for Dhivehi text."""

    engine = build_dhivehi_demo_engine()
    request = TranslationRequest(
        text=text,
        source_language=source_language,
        target_language=target_language,
        domain=domain,
    )
    return engine.translate(request)


def _format_sample(result: TranslationResult, request: TranslationRequest) -> SimulationSample:
    return SimulationSample(
        text=request.text,
        source_language=request.source_language,
        target_language=request.target_language,
        translated_text=result.translated_text,
        confidence=result.confidence,
        applied_memory=
            {
                "source_text": result.applied_memory.source_text,
                "target_text": result.applied_memory.target_text,
                "quality_score": result.applied_memory.quality_score,
                "domain": result.applied_memory.domain,
            }
            if result.applied_memory
            else None,
        glossary_terms=tuple(entry.source_term for entry in result.glossary_terms),
        post_edit_instructions=result.post_edit_instructions,
        model_features=dict(result.model_features),
    )


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entrypoint for running the Dhivehi translation simulation."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("text", help="Dhivehi text to translate")
    parser.add_argument(
        "--source",
        default="Dhivehi",
        help="Source language name (default: Dhivehi)",
    )
    parser.add_argument(
        "--target",
        default="English",
        help="Target language name (default: English)",
    )
    parser.add_argument(
        "--domain",
        default=None,
        help="Optional domain tag to include in the request",
    )
    args = parser.parse_args(argv)

    request = TranslationRequest(
        text=args.text,
        source_language=args.source,
        target_language=args.target,
        domain=args.domain,
    )
    engine = build_dhivehi_demo_engine()
    result = engine.translate(request)
    sample = _format_sample(result, request)
    print(json.dumps(asdict(sample), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
