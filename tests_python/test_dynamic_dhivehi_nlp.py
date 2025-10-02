from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dynamic_natural_language_processing.dhivehi import (
    DhivehiMorphology,
    DhivehiNLPipeline,
    DhivehiNormalizer,
    DhivehiStopwords,
    DhivehiTokenizer,
    DhivehiTransliterator,
    detect_script,
)


@pytest.mark.parametrize(
    "text,expected",
    [
        ("މިއީ ދިވެހި ބަސް", 1.0),
        ("ދިވެހި text", pytest.approx(0.6, abs=1e-2)),
        ("latin only", 0.0),
    ],
)
def test_detect_script_ratio(text: str, expected: float) -> None:
    assert detect_script(text) == expected


def test_normaliser_collapses_spacing() -> None:
    normalizer = DhivehiNormalizer()
    text = "\u200dމިއީ،  ބަސް!"
    assert normalizer.normalise(text) == "މިއީ ބަސް"


def test_tokenizer_with_stopword_filtering() -> None:
    tokenizer = DhivehiTokenizer()
    text = "މިއީ ދިވެހި ބަސް"
    tokens = tokenizer.tokenize(text, drop_stopwords=True)
    assert all(not DhivehiStopwords.contains(token) for token in tokens)


def test_morphology_stemming() -> None:
    morphology = DhivehiMorphology()
    assert morphology.stem("މިއްޔަތައް") == "މިއްޔަ"


def test_transliterator_roundtrip() -> None:
    transliterator = DhivehiTransliterator()
    assert transliterator.transliterate("ދިވެހި") == "dhivehi"


def test_pipeline_feature_encoding() -> None:
    pipeline = DhivehiNLPipeline()
    text = "މިއީ ދިވެހި ބަސް"
    features = pipeline.encode_features(text)

    assert features["tokens"]
    assert features["token_count"] == len(features["tokens"])
    assert 0.0 <= features["thaana_ratio"] <= 1.0
    assert isinstance(features["transliteration"], str)
