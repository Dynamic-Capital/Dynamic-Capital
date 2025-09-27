"""Unit tests for the DynamicAnalysis orchestration."""

from pathlib import Path
from typing import Iterable
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_ai.analysis import DynamicAnalysis


def test_moving_average_alignment_generator_is_materialised() -> None:
    analysis = DynamicAnalysis()

    def ma_series() -> Iterable[str]:
        yield "bullish"
        yield "bearish"
        yield "bullish"

    result = analysis.analyse(
        {
            "technical": {
                "trend": "neutral",
                "momentum": 0,
                "volatility": 1,
                "support_strength": 0,
                "resistance_pressure": 0,
                "moving_average_alignment": ma_series(),
            }
        }
    )

    technical_component = next(
        component for component in result["components"] if component["name"] == "technical"
    )

    assert technical_component["score"] == pytest.approx(0.05)
    assert result["score"] == pytest.approx(0.05)
