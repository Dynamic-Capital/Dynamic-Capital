from __future__ import annotations

from dynamic_proof_of_work import DynamicProofOfWork


def test_mine_finds_valid_nonce() -> None:
    pow_engine = DynamicProofOfWork(difficulty=2, target_seconds=0.1, sample_window=5)

    result = pow_engine.mine({"data": "hello"})

    assert result.hash.startswith("0" * result.difficulty)
    assert DynamicProofOfWork.verify({"data": "hello"}, nonce=result.nonce, difficulty=result.difficulty, hash_value=result.hash)
    assert result.difficulty == 2
    assert pow_engine.difficulty >= 1


def test_override_difficulty_does_not_adjust_base() -> None:
    pow_engine = DynamicProofOfWork(difficulty=3, target_seconds=0.5, sample_window=3)

    result = pow_engine.mine({"payload": 1}, difficulty=1)

    assert result.difficulty == 1
    assert pow_engine.difficulty == 3


def test_observe_scales_difficulty_up_and_down() -> None:
    pow_engine = DynamicProofOfWork(difficulty=4, target_seconds=2.0, sample_window=5, max_adjustment_ratio=2.0)

    pow_engine.observe(duration=0.5, difficulty=4)
    pow_engine.observe(duration=0.6, difficulty=4)
    pow_engine.observe(duration=0.4, difficulty=4)

    increased_difficulty = pow_engine.difficulty
    assert increased_difficulty > 4

    pow_engine.observe(duration=5.0, difficulty=increased_difficulty)
    pow_engine.observe(duration=4.5, difficulty=pow_engine.difficulty)
    pow_engine.observe(duration=4.8, difficulty=pow_engine.difficulty)

    assert pow_engine.difficulty < increased_difficulty
    assert pow_engine.difficulty >= 1


def test_calculate_next_difficulty_without_samples_returns_base() -> None:
    pow_engine = DynamicProofOfWork(difficulty=5)

    assert pow_engine.calculate_next_difficulty() == 5


def test_verify_rejects_invalid_hash() -> None:
    pow_engine = DynamicProofOfWork(difficulty=2)
    result = pow_engine.mine("test", difficulty=2)

    bad_hash = "f" * 64
    assert not pow_engine.verify("test", nonce=result.nonce, difficulty=result.difficulty, hash_value=bad_hash)

