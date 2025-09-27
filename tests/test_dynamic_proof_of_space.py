from datetime import datetime, timedelta, timezone

import pytest

from dynamic_proof_of_space import (
    DynamicProofOfSpace,
    ProofResponse,
)


def _register_plot(engine: DynamicProofOfSpace, *, plot_id: str, commitment: str, size: int) -> None:
    engine.register_plot(
        {
            "plot_id": plot_id,
            "farmer_id": f"farmer-{plot_id}",
            "size_bytes": size,
            "k_parameter": 32,
            "commitment": commitment,
        }
    )


def test_dynamic_proof_of_space_success_flow() -> None:
    engine = DynamicProofOfSpace()
    _register_plot(engine, plot_id="alpha", commitment="a" * 64, size=4 * 1024**4)
    _register_plot(engine, plot_id="beta", commitment="b" * 64, size=2 * 1024**4)

    challenge = engine.issue_challenge(
        difficulty=0.5,
        response_window=timedelta(minutes=5),
        seed="c" * 64,
    )

    plot = engine.plots["alpha"]
    proof = plot.create_proof(challenge, nonce=3)

    assert engine.verify_proof(proof) is True

    snapshot = engine.farmer_snapshot("farmer-alpha")
    assert snapshot["successes"] == 1
    assert snapshot["reliability"] == pytest.approx(1.0)
    assert snapshot["recent_quality"]
    assert engine.challenge_results[challenge.challenge_id].plot_id == "alpha"
    assert engine.history[-1]["success"] is True
    assert not engine.active_challenges()


def test_dynamic_proof_of_space_rejects_invalid_proof() -> None:
    engine = DynamicProofOfSpace()
    _register_plot(engine, plot_id="gamma", commitment="d" * 64, size=1024**4)
    challenge = engine.issue_challenge(
        difficulty=0.3,
        response_window=timedelta(minutes=10),
        seed="e" * 64,
    )

    bad_proof = ProofResponse(
        challenge_id=challenge.challenge_id,
        plot_id="gamma",
        farmer_id="farmer-gamma",
        quality=0.1,
        nonce=5,
        proof="0" * 64,
        submitted_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
    )

    assert engine.verify_proof(bad_proof) is False

    snapshot = engine.farmer_snapshot("farmer-gamma")
    assert snapshot["failures"] == 1
    assert snapshot["reliability"] == 0.0
    assert engine.history[-1]["reason"] == "mismatch"


def test_challenge_quality_scales_with_capacity() -> None:
    engine = DynamicProofOfSpace()
    _register_plot(engine, plot_id="delta", commitment="f" * 64, size=256 * 1024**3)

    small_challenge = engine.issue_challenge(
        difficulty=0.4,
        response_window=timedelta(minutes=15),
        seed="1" * 64,
    )

    _register_plot(engine, plot_id="epsilon", commitment="9" * 64, size=25 * 1024**4)
    larger_challenge = engine.issue_challenge(
        difficulty=0.4,
        response_window=timedelta(minutes=15),
        seed="2" * 64,
    )

    assert larger_challenge.target_quality < small_challenge.target_quality


def test_issue_challenge_requires_registered_plot() -> None:
    engine = DynamicProofOfSpace()
    with pytest.raises(ValueError):
        engine.issue_challenge()
