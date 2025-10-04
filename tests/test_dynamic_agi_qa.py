from __future__ import annotations

import pytest

from dynamic.intelligence.agi.qa import build_domain_qa_session


def test_build_domain_qa_session_uses_curated_knowledge() -> None:
    session = build_domain_qa_session("DAI")

    assert session.domain == "DAI"
    assert len(session.exchanges) == 3
    assert session.performance_summary["coverage_ratio"] == pytest.approx(0.65, rel=1e-6)

    transcript = session.to_transcript()
    assert "What capabilities are active" in transcript
    assert "coverage_ratio ≈ 0.65" in transcript
    assert "Add structured oil supply" in transcript


def test_build_domain_qa_session_supports_custom_questions() -> None:
    questions = ["Q1", "Q2", "Q3"]
    session = build_domain_qa_session("DAGI", questions=questions)

    assert tuple(exchange.question for exchange in session.exchanges) == tuple(questions)


def test_build_domain_qa_session_handles_unknown_domain() -> None:
    session = build_domain_qa_session("ALT")

    assert session.domain == "ALT"
    assert "Seed training data for ALT domain" in session.exchanges[0].answer


