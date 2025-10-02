from __future__ import annotations

from dynamic_trading_language import (
    DeskEnvironment,
    DynamicTradingLanguageModel,
    MarketNarrative,
    OrderFlowSignal,
    TradeIntent,
)


def test_language_model_produces_rich_narrative() -> None:
    model = DynamicTradingLanguageModel(
        tone="Institutional",
        guardrails=("Respect max drawdown", "Align with portfolio hedges"),
    )
    intent = TradeIntent(
        instrument="ETHUSD",
        direction="long",
        conviction=0.72,
        timeframe="Intraday",
        catalysts=("London upgrade tailwinds", "Funding premium stabilising"),
        entry=1820.25,
        target=1895.0,
        stop=1778.5,
        reasoning="Momentum re-accelerating alongside improving liquidity",
        risk_notes=("Watch on-chain flows",),
        metrics={"skew": 0.45, "momentum": 0.62},
    )
    environment = DeskEnvironment(
        regime="growth",
        risk_appetite=0.65,
        volatility=0.48,
        liquidity=0.58,
        macro_backdrop="US CPI inline, credit spreads tightening",
        narrative_bias=0.1,
        communication_style="Institutional",
    )

    order_flow = OrderFlowSignal(
        dominant_side="buy",
        intensity=0.62,
        bias=0.64,
        average_latency=0.8,
        sample_size=86,
        commentary="Large takers continue lifting the offer across venues",
    )

    narrative = model.generate_narrative(
        intent,
        environment=environment,
        insights=("Desk quant flags positive skew",),
        sentiment="constructive risk mood",
        order_flow=order_flow,
    )

    assert isinstance(narrative, MarketNarrative)
    assert "ETHUSD" in narrative.headline
    assert "long" in narrative.thesis.lower()
    assert "Desk quant flags positive skew" in narrative.thesis
    assert any("Watch on-chain flows" in item for item in narrative.risk_mitigation)
    assert any("Entry" in level for level in narrative.key_levels)
    assert narrative.confidence > 0
    assert "Order flow" in narrative.thesis
    assert "FLOW_BUY" in narrative.tags
    assert "aggressive liquidity" in narrative.call_to_action.lower()
    assert "STRESSED" not in narrative.tags  # balanced regime should not mark stressed


def test_guardrails_apply_without_environment() -> None:
    model = DynamicTradingLanguageModel(guardrails=("Respect risk limits",))
    intent = TradeIntent(
        instrument="XAUUSD",
        direction="short",
        conviction=0.55,
        timeframe="Swing",
        reasoning="Rates momentum favouring dollar strength",
    )

    narrative = model.generate_narrative(intent, insights=("CTAs de-risking",))

    assert narrative.style == "institutional"
    assert "Respect risk limits" in narrative.risk_mitigation
    assert any("Define entry" in item for item in narrative.risk_mitigation)
    assert "CTAs de-risking" in narrative.insights
    assert "XAUUSD" in narrative.tags


def test_missing_levels_drive_guidance() -> None:
    model = DynamicTradingLanguageModel()
    intent = TradeIntent(
        instrument="ESZ3",
        direction="long",
        conviction=0.52,
        timeframe="Overnight",
    )

    narrative = model.generate_narrative(intent)

    assert any("No explicit levels" in level for level in narrative.key_levels)
    assert "Anchor sizing" in narrative.call_to_action
    assert narrative.confidence > 0


def test_order_flow_opposition_reduces_conviction() -> None:
    model = DynamicTradingLanguageModel()
    intent = TradeIntent(
        instrument="BTCUSD",
        direction="long",
        conviction=0.68,
        timeframe="Intraday",
    )
    order_flow = OrderFlowSignal(
        dominant_side="sell",
        intensity=0.72,
        bias=0.66,
        commentary="Sellers leaning on the bid stack",
    )

    narrative = model.generate_narrative(intent, order_flow=order_flow)

    assert narrative.confidence < 0.7  # opposing flow should dampen conviction
    assert any("opposing flow" in note for note in narrative.risk_mitigation)
    assert "FLOW_SELL" in narrative.tags
    assert "passive clips" in narrative.call_to_action.lower()


def test_strong_flow_tagging() -> None:
    model = DynamicTradingLanguageModel()
    intent = TradeIntent(
        instrument="EURUSD",
        direction="short",
        conviction=0.61,
        timeframe="Intraday",
        entry=1.0825,
    )
    order_flow = OrderFlowSignal(
        dominant_side="sell",
        intensity=0.82,
        bias=0.7,
    )

    narrative = model.generate_narrative(intent, order_flow=order_flow)

    assert "FLOW_STRONG" in narrative.tags
    assert narrative.confidence > 0.4


def test_market_narrative_markdown_rendering() -> None:
    narrative = MarketNarrative(
        headline="Long ETHUSD setup — intraday focus",
        thesis="Dynamic desk sees opportunity in ETHUSD.",
        key_levels=("Entry: 1850.0000", "Target: 1900.0000"),
        risk_mitigation=("Respect risk limits", "Monitor volatility"),
        call_to_action="Structure the long expression.",
        confidence=0.72,
        style="institutional",
        insights=("Funding normalising",),
        tags=("ETHUSD", "INTRADAY"),
    )

    markdown = narrative.to_markdown()

    assert markdown.startswith("# Long ETHUSD setup — intraday focus")
    assert "## Key Levels" in markdown
    assert "- Entry: 1850.0000" in markdown
    assert "## Risk Mitigation" in markdown
    assert "- Confidence: 72%" in markdown
    assert "## Desk Insights" in markdown
    assert "ETHUSD, INTRADAY" in markdown
