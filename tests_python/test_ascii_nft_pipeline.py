from __future__ import annotations

from pathlib import Path
import sys
from typing import Any, Mapping

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_ascii import AsciiDynamicNFTPipeline  # noqa: E402  (import after path setup)


class _StubOracle:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def evaluate(self, nft: Any) -> Mapping[str, Any]:
        self.calls.append(nft.fingerprint)
        return {"score": 0.87, "band": "Gold"}


class _StubPricingEngine:
    def quote(self, intelligence: Mapping[str, Any]) -> float:
        assert intelligence.get("score") == pytest.approx(0.87)
        return 42.0


class _StubTelegramNotifier:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str, Mapping[str, Any]]] = []

    def send_ascii_nft(
        self,
        chat_id: str,
        *,
        ascii_art: str,
        metadata: Mapping[str, Any],
    ) -> None:
        self.messages.append((chat_id, ascii_art, metadata))


class _StubDashboard:
    def __init__(self) -> None:
        self.entries: list[Mapping[str, Any]] = []

    def record_nft(
        self,
        nft,
        *,
        intelligence: Mapping[str, Any],
    ) -> None:
        self.entries.append({
            "token_id": nft.token_id,
            "intelligence": intelligence,
        })


def _matrix() -> list[list[int]]:
    return [
        [0, 64, 128, 255],
        [255, 128, 64, 0],
        [30, 90, 190, 220],
        [5, 10, 15, 20],
    ]


def test_pipeline_executes_with_full_integrations() -> None:
    oracle = _StubOracle()
    pricing = _StubPricingEngine()
    telegram = _StubTelegramNotifier()
    dashboard = _StubDashboard()

    pipeline = AsciiDynamicNFTPipeline(
        oracle=oracle,
        pricing_engine=pricing,
        telegram_notifier=telegram,
        mentorship_dashboard=dashboard,
    )

    context = pipeline.execute(
        _matrix(),
        owner="0xABC",
        name="Aurora",
        description="Mentorship milestone",
        chat_id="12345",
        tags=("mentorship",),
        analysis={"action": "buy", "confidence": 0.91},
        extra_attributes={"impact_points": 7},
    )

    assert context.minted.owner == "0xABC"
    assert context.mint_price == pytest.approx(42.0)
    assert context.intelligence == {"score": 0.87, "band": "Gold"}
    assert "ascii_fingerprint" in context.minted.metadata
    assert context.minted.metadata["impact_points"] == 7
    assert context.minted.metadata["mint_price"] == pytest.approx(42.0)
    assert telegram.messages and telegram.messages[0][0] == "12345"
    assert dashboard.entries[0]["token_id"] == context.minted.token_id
    assert dashboard.entries[0]["intelligence"] == context.intelligence
    assert oracle.calls[0] == context.ascii_nft.fingerprint


def test_pipeline_handles_optional_dependencies() -> None:
    pipeline = AsciiDynamicNFTPipeline()

    context = pipeline.execute(
        _matrix(),
        owner="0xDEF",
        name="Nebula",
        description="Autonomous wisdom badge",
    )

    assert context.mint_price == 0.0
    assert context.intelligence == {}
    assert context.minted.metadata["mint_price"] == 0.0
    assert context.minted.owner == "0xDEF"
