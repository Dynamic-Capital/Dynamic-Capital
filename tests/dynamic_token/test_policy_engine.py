from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dynamic_token.policy_engine import PolicyDecision, PolicyEngine


def test_policy_engine_triggers_buyback_on_stress() -> None:
    engine = PolicyEngine(buyback_budget=5000.0)
    decision = engine.evaluate(score=4.0, volatility=0.04, treasury_balance=100_000.0, twap_deviation=-0.5)
    assert isinstance(decision, PolicyDecision)
    assert decision.regime == "stressed"
    assert decision.buyback > 0
    assert any("buybacks" in note.lower() for note in decision.notes)


def test_policy_engine_burns_surplus_when_calm() -> None:
    engine = PolicyEngine(max_burn_share=0.05)
    decision = engine.evaluate(score=0.2, volatility=0.01, treasury_balance=200_000.0)
    assert decision.regime == "calm"
    assert decision.burn == 200_000.0 * 0.05
    assert decision.spread_target_bps == engine.tight_spread_bps


def test_policy_engine_handles_transition_regime() -> None:
    engine = PolicyEngine()
    decision = engine.evaluate(score=1.5, volatility=0.03, treasury_balance=50_000.0)
    assert decision.regime == "transition"
    assert decision.burn > 0
    assert decision.spread_target_bps == engine.base_spread_bps
