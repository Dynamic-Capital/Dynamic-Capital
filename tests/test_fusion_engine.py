"""Unit tests for the multi-lobe FusionEngine."""

from dynamic.intelligence.ai_apps.fusion import (
    FusionEngine,
    LorentzianDistanceLobe,
    RegimeContext,
    SentimentLobe,
    TrendMomentumLobe,
    TreasuryLobe,
)


def build_engine() -> FusionEngine:
    return FusionEngine(
        [
            LorentzianDistanceLobe(sensitivity=0.5),
            TrendMomentumLobe(momentum_threshold=0.5),
            SentimentLobe(),
            TreasuryLobe(buffer_ratio=0.1),
        ]
    )


def test_fusion_engine_buy_bias() -> None:
    engine = build_engine()
    data = {
        "price": 105,
        "reference_price": 100,
        "dispersion": 0.1,
        "trend": "bullish",
        "momentum": 0.8,
        "sentiment_feeds": [
            {"score": 0.6, "summary": "Analysts issue bullish upgrade"},
            {"score": 0.4, "summary": "Growth outlook improving"},
        ],
        "treasury": {"balance": 500000, "liabilities": 200000, "utilisation": 0.3},
    }
    regime = RegimeContext(volatility=0.8, sentiment=0.4, session="asia")

    fused = engine.combine(data, regime)

    assert fused["action"] == "BUY"
    assert 0.2 < fused["score"] <= 1
    assert 0.5 < fused["confidence"] <= 1


def test_fusion_engine_guarded_by_treasury() -> None:
    engine = build_engine()
    data = {
        "price": 99,
        "reference_price": 100,
        "dispersion": 0.05,
        "trend": "bullish",
        "momentum": 0.2,
        "sentiment_feeds": [
            {"score": 0.2, "summary": "Bullish"},
        ],
        "treasury": {"balance": 100000, "liabilities": 200000, "utilisation": 0.95},
    }
    regime = RegimeContext(volatility=1.3, sentiment=0.1, session="new_york", risk_off=True)

    fused = engine.combine(data, regime)

    assert fused["action"] in {"NEUTRAL", "SELL"}
    assert fused["confidence"] <= 0.7
