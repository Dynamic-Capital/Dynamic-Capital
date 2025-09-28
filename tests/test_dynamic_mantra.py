from dynamic_mantra import DynamicMantra, MantraContext, MantraSeed


def test_generate_sequence_prefers_matching_theme() -> None:
    engine = DynamicMantra()
    engine.extend(
        [
            MantraSeed(
                phrase="Clarity settles through my breath.",
                theme="clarity",
                qualities=("clarity", "focus"),
                intensity=0.45,
                grounding=0.85,
                elevation=0.4,
                keywords=("breath", "clarity"),
            ),
            MantraSeed(
                phrase="Courage lifts my vision.",
                theme="courage",
                qualities=("courage", "confidence"),
                intensity=0.65,
                grounding=0.4,
                elevation=0.8,
                keywords=("vision", "ignite"),
            ),
            MantraSeed(
                phrase="Patience roots my next move.",
                theme="patience",
                qualities=("patience", "calm"),
                intensity=0.35,
                grounding=0.9,
                elevation=0.3,
                keywords=("roots", "steady"),
            ),
        ]
    )

    context = MantraContext(
        intention="Trade the plan with grace",
        focus_theme="clarity",
        mood="grounded",
        energy_level=0.5,
        cycle_length=4,
        desired_qualities=("clarity", "focus"),
        emphasis_keywords=("breath", "clarity"),
    )

    sequence = engine.generate(context)

    assert sequence.primary_mantra == "Clarity settles through my breath."
    assert "4-2-6" in sequence.breath_pattern
    assert sequence.cadence.startswith("steady cadence")
    assert "clarity" in sequence.tonic_keywords
    assert any("intention" in prompt for prompt in sequence.integration_prompts)


def test_ingest_accepts_mapping_and_supports_defaults() -> None:
    engine = DynamicMantra(history=5)
    engine.ingest(
        {
            "phrase": "Expansion meets my focused awareness.",
            "theme": "expansion",
            "qualities": ("expansion", "focus"),
            "intensity": 0.6,
            "grounding": 0.55,
            "elevation": 0.75,
            "keywords": ("expand", "focus"),
        }
    )

    context = MantraContext(
        intention="Invite creativity",
        focus_theme="focus",
        mood="elevated",
        energy_level=0.7,
        cycle_length=3,
        desired_qualities=("focus", "confidence"),
        emphasis_keywords=("spark",),
    )

    sequence = engine.generate(context, support_count=2)

    assert sequence.primary_mantra
    assert len(sequence.support_mantras) <= 2
    assert any(keyword in sequence.tonic_keywords for keyword in ("focus", "spark"))
    assert sequence.as_dict()["primary_mantra"] == sequence.primary_mantra

    # Ensure history constraint keeps engine bounded
    for idx in range(10):
        engine.ingest(
            MantraSeed(
                phrase=f"Grounding mantra {idx}",
                theme="grounding",
                qualities=("calm",),
                intensity=0.4,
                grounding=0.9,
                elevation=0.2,
                keywords=("ground",),
            )
        )
    assert len(engine._seeds) == 5
