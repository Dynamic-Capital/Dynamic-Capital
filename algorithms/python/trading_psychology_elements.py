"""Trading psychology element scoring engine."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable, List, Sequence


class Element(Enum):
    """Elemental archetypes used to describe trading psychology states."""

    FIRE = "fire"
    WATER = "water"
    WIND = "wind"
    EARTH = "earth"
    LIGHTNING = "lightning"
    LIGHT = "light"
    DARKNESS = "darkness"


@dataclass(frozen=True)
class ElementSignal:
    """A scored elemental signal with qualitative guidance."""

    element: Element
    score: float
    level: str
    reasons: Sequence[str]
    recommendations: Sequence[str]


@dataclass(frozen=True)
class PsychologyTelemetry:
    """Quantitative and qualitative metrics describing the trader state."""

    rsi: float | None = None
    trades_planned: int = 0
    trades_executed: int = 0
    drawdown_pct: float = 0.0
    account_balance_delta_pct: float = 0.0
    realized_pnl: float = 0.0
    consecutive_losses: int = 0
    consecutive_wins: int = 0
    stress_index: float = 0.0  # 0..1 scale
    emotional_volatility: float = 0.0  # 0..1 scale
    discipline_index: float = 0.0  # 0..1 scale
    conviction_index: float = 0.0  # 0..1 scale
    focus_index: float = 0.0  # 0..1 scale
    fatigue_index: float = 0.0  # 0..1 scale
    journaling_rate: float = 0.0  # 0..1 scale
    market_volatility: float = 0.0  # 0..1 scale
    news_shock: bool = False


@dataclass(frozen=True)
class ElementProfile:
    """Aggregated results containing the ordered elemental signals."""

    signals: Sequence[ElementSignal]

    @property
    def dominant(self) -> ElementSignal:
        """Return the highest scoring element."""

        return max(self.signals, key=lambda signal: signal.score)


def score_elements(telemetry: PsychologyTelemetry) -> ElementProfile:
    """Compute the elemental psychology profile for the provided telemetry."""

    signals: List[ElementSignal] = [
        _score_fire(telemetry),
        _score_water(telemetry),
        _score_wind(telemetry),
        _score_earth(telemetry),
        _score_lightning(telemetry),
        _score_light(telemetry),
        _score_darkness(telemetry),
    ]

    # Order by score descending while keeping deterministic tie-breaking by enum order.
    signals.sort(key=lambda signal: (signal.score, _enum_order(signal.element)), reverse=True)
    return ElementProfile(signals=signals)


def _enum_order(element: Element) -> int:
    return list(Element).index(element)


def _level(score: float) -> str:
    if score >= 7.0:
        return "critical"
    if score >= 4.0:
        return "elevated"
    return "stable"


def _positive_level(score: float) -> str:
    if score >= 7.0:
        return "peak"
    if score >= 4.0:
        return "building"
    return "nascent"


def _score_fire(telemetry: PsychologyTelemetry) -> ElementSignal:
    score = 0.0
    reasons: List[str] = []
    recommendations: List[str] = []

    if telemetry.rsi is not None and telemetry.rsi >= 70:
        increment = 1.5 if telemetry.rsi < 80 else 2.5
        score += increment
        reasons.append(
            f"RSI at {telemetry.rsi:.1f} indicates overbought momentum and risk of chasing heat."
        )
        recommendations.append("Pause execution until momentum normalises and reassess risk.")

    planned = max(telemetry.trades_planned, 1)
    overtrade_ratio = telemetry.trades_executed / planned
    if overtrade_ratio > 1.5:
        score += min(2.5, (overtrade_ratio - 1.0) * 2.0)
        reasons.append(
            f"Executed {telemetry.trades_executed} trades against {telemetry.trades_planned} planned trades."
        )
        recommendations.append("Reinstate the trading plan guardrails to curb overtrading.")

    if telemetry.drawdown_pct >= 5.0:
        drawdown_points = 1.0 + min(telemetry.drawdown_pct / 5.0, 2.0)
        score += drawdown_points
        reasons.append(
            f"Current drawdown at {telemetry.drawdown_pct:.1f}% is eroding capital resiliency."
        )
        recommendations.append("Scale down position size until drawdown stabilises.")

    if telemetry.account_balance_delta_pct < 0.0:
        balance_points = min(2.0, abs(telemetry.account_balance_delta_pct) / 2.0)
        score += balance_points
        reasons.append(
            "Balance slipping negative signals urgent capital protection priority."
        )
        recommendations.append("Switch to capital-preservation mode and log recovery plan tasks.")

    if telemetry.consecutive_losses >= 3:
        score += 1.0
        reasons.append("Loss streak detected which amplifies tilt risk.")
        recommendations.append("Implement a mandatory cooldown before next trade.")

    return ElementSignal(
        element=Element.FIRE,
        score=min(score, 10.0),
        level=_level(score),
        reasons=reasons,
        recommendations=_deduplicate(recommendations),
    )


def _score_water(telemetry: PsychologyTelemetry) -> ElementSignal:
    score = 0.0
    reasons: List[str] = []
    recommendations: List[str] = []

    if telemetry.stress_index > 0.6:
        stress_points = telemetry.stress_index * 3.0
        score += stress_points
        reasons.append(
            f"Stress index at {telemetry.stress_index:.2f} shows emotional waves impacting execution."
        )
        recommendations.append("Schedule breathwork or mindfulness reset before next session.")

    if telemetry.emotional_volatility > 0.5:
        volatility_points = telemetry.emotional_volatility * 3.5
        score += volatility_points
        reasons.append("Emotional volatility is destabilising risk perception.")
        recommendations.append("Journal the trigger events to externalise emotions.")

    if telemetry.consecutive_losses > 0 and telemetry.focus_index < 0.5:
        score += 1.0
        reasons.append("Losses combined with low focus raises likelihood of revenge trading.")
        recommendations.append("Review playbook with mentor to re-anchor confidence.")

    if telemetry.consecutive_wins > 2 and telemetry.emotional_volatility > 0.4:
        score += 0.8
        reasons.append("Winning streak may inflate euphoria and loosen discipline.")
        recommendations.append("Re-run checklist to keep ego in check.")

    return ElementSignal(
        element=Element.WATER,
        score=min(score, 10.0),
        level=_level(score),
        reasons=reasons,
        recommendations=_deduplicate(recommendations),
    )


def _score_wind(telemetry: PsychologyTelemetry) -> ElementSignal:
    score = 0.0
    reasons: List[str] = []
    recommendations: List[str] = []

    if telemetry.market_volatility > 0.6:
        score += telemetry.market_volatility * 2.5
        reasons.append("Choppy market winds require adaptable execution and patience.")
        recommendations.append("Switch to scouting mode and reduce trade frequency.")

    if telemetry.conviction_index < 0.4:
        score += (0.4 - telemetry.conviction_index) * 5.0
        reasons.append("Low conviction suggests signal drift and scattered focus.")
        recommendations.append("Rebuild thesis alignment before entering new positions.")

    if telemetry.trades_executed == 0 and telemetry.trades_planned > 0 and telemetry.focus_index < 0.5:
        score += 0.8
        reasons.append("Inaction during planned sessions highlights hesitation.")
        recommendations.append("Simulate entries to rebuild flow state.")

    return ElementSignal(
        element=Element.WIND,
        score=min(score, 10.0),
        level=_level(score),
        reasons=reasons,
        recommendations=_deduplicate(recommendations),
    )


def _score_earth(telemetry: PsychologyTelemetry) -> ElementSignal:
    score = 0.0
    reasons: List[str] = []
    recommendations: List[str] = []

    if telemetry.discipline_index >= 0.6:
        discipline_points = telemetry.discipline_index * 4.0
        score += discipline_points
        reasons.append("Process discipline is anchoring execution.")
        recommendations.append("Keep reinforcing daily routines to bank consistency.")

    if telemetry.journaling_rate >= 0.7:
        score += telemetry.journaling_rate * 3.0
        reasons.append("High journaling compliance is grounding decision quality.")
        recommendations.append("Integrate insights into next risk review call.")

    if telemetry.account_balance_delta_pct > 0.0 and telemetry.drawdown_pct < 5.0:
        score += 1.0
        reasons.append("Positive balance delta with limited drawdown confirms capital stability.")

    if telemetry.focus_index >= 0.6:
        score += telemetry.focus_index * 2.0
        reasons.append("Focus levels support disciplined execution cadence.")

    return ElementSignal(
        element=Element.EARTH,
        score=min(score, 10.0),
        level=_positive_level(score),
        reasons=reasons,
        recommendations=_deduplicate(recommendations),
    )


def _score_lightning(telemetry: PsychologyTelemetry) -> ElementSignal:
    score = 0.0
    reasons: List[str] = []
    recommendations: List[str] = []

    if telemetry.news_shock:
        score += 2.0
        reasons.append("News shock detected – heightened reactivity expected.")
        recommendations.append("Deploy event-driven checklist and tighten stops.")

    if telemetry.market_volatility > 0.7:
        score += telemetry.market_volatility * 3.0
        reasons.append("Surging volatility can trigger impulsive entries.")
        recommendations.append("Wait for volatility compression before scaling risk.")

    if telemetry.trades_executed > telemetry.trades_planned and telemetry.emotional_volatility > 0.5:
        score += 1.0
        reasons.append("High energy combined with elevated emotions sparks lightning trades.")
        recommendations.append("Convert impulse energy into structured scenario planning.")

    return ElementSignal(
        element=Element.LIGHTNING,
        score=min(score, 10.0),
        level=_level(score),
        reasons=reasons,
        recommendations=_deduplicate(recommendations),
    )


def _score_light(telemetry: PsychologyTelemetry) -> ElementSignal:
    score = 0.0
    reasons: List[str] = []
    recommendations: List[str] = []

    if telemetry.account_balance_delta_pct > 1.0 and telemetry.discipline_index > 0.6:
        score += 2.5
        reasons.append("Positive equity momentum with disciplined process drives clarity.")
        recommendations.append("Document the setups powering the edge to reinforce clarity.")

    if telemetry.consecutive_wins >= 3 and telemetry.emotional_volatility < 0.4:
        score += 1.5
        reasons.append("Steady wins with composed emotions radiate confidence.")

    if telemetry.conviction_index >= 0.6:
        score += telemetry.conviction_index * 3.0
        reasons.append("Conviction alignment keeps decision-making transparent.")

    if telemetry.focus_index >= 0.7 and telemetry.fatigue_index < 0.4:
        score += 1.0
        reasons.append("High focus with low fatigue sustains flow state.")

    return ElementSignal(
        element=Element.LIGHT,
        score=min(score, 10.0),
        level=_positive_level(score),
        reasons=reasons,
        recommendations=_deduplicate(recommendations),
    )


def _score_darkness(telemetry: PsychologyTelemetry) -> ElementSignal:
    score = 0.0
    reasons: List[str] = []
    recommendations: List[str] = []

    if telemetry.fatigue_index > 0.6:
        score += telemetry.fatigue_index * 3.0
        reasons.append("Fatigue is draining cognitive bandwidth.")
        recommendations.append("Schedule rest block and extend sleep window.")

    if telemetry.discipline_index < 0.3:
        score += (0.3 - telemetry.discipline_index) * 5.0
        reasons.append("Discipline erosion signals creeping burnout.")
        recommendations.append("Rebuild baseline routines starting with pre-market ritual.")

    if telemetry.account_balance_delta_pct < -2.0:
        score += min(2.5, abs(telemetry.account_balance_delta_pct) / 2.0)
        reasons.append("Deep capital draw threatens belief system.")
        recommendations.append("Engage accountability partner before next session.")

    if telemetry.stress_index > 0.7 and telemetry.emotional_volatility > 0.5:
        score += 1.0
        reasons.append("Stress and emotional spikes darken market outlook.")
        recommendations.append("Reset mental framing with gratitude routine.")

    return ElementSignal(
        element=Element.DARKNESS,
        score=min(score, 10.0),
        level=_level(score),
        reasons=reasons,
        recommendations=_deduplicate(recommendations),
    )


def _deduplicate(items: Iterable[str]) -> List[str]:
    seen = set()
    unique: List[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


__all__ = [
    "Element",
    "ElementSignal",
    "ElementProfile",
    "PsychologyTelemetry",
    "score_elements",
]
