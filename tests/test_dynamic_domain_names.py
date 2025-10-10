import pytest

from dynamic_domain_names import (
    DomainName,
    DomainPolicy,
    DomainSeed,
    DomainSuggestionDigest,
    DynamicDomainGenerator,
)


def test_domain_seed_normalisation() -> None:
    seed = DomainSeed(
        keyword="  Quantum Flow  ",
        weight=1.4,
        freshness=1.3,
        intent="  Core Focus  ",
        tags=("FinTech", "fintech", "Capital"),
        metadata={"owner": " Domain Ops "},
    )

    assert seed.keyword == "quantumflow"
    assert 0.0 <= seed.weight <= 1.0
    assert 0.0 <= seed.freshness <= 1.0
    assert seed.intent == "corefocus"
    assert seed.tags == ("fintech", "capital")
    assert seed.metadata == {"owner": " Domain Ops "}
    assert 0.0 < seed.influence <= 1.0


def test_domain_policy_constraints() -> None:
    policy = DomainPolicy(
        tlds=("com", "  io", ".AI "),
        min_length=4,
        max_length=20,
        allow_hyphen=True,
        reserved_terms=("Capital", "Flow"),
        forbidden_terms=("spam", "  scam"),
        prefixes=("Go ", "Try"),
        suffixes=("HQ", "Labs"),
        max_words=4,
    )

    assert policy.tlds == (".com", ".io", ".ai")
    assert policy.reserved_terms == ("capital", "flow")
    assert policy.forbidden_terms == ("spam", "scam")
    assert policy.prefixes == ("go", "try")
    assert policy.suffixes == ("hq", "labs")
    assert policy.prefers("FLOW") is True


def test_domain_policy_rejects_unknown_tlds() -> None:
    with pytest.raises(ValueError) as excinfo:
        DomainPolicy(tlds=(".corp",))

    assert "non recognized TLD" in str(excinfo.value)


def test_generate_dynamic_domains_prefers_reserved_terms() -> None:
    engine = DynamicDomainGenerator(history_limit=6)
    engine.prime(
        [
            DomainSeed(keyword="Dynamic", weight=0.9, freshness=0.9),
            DomainSeed(keyword="Capital", weight=1.0, freshness=1.0),
            DomainSeed(keyword="Nova", weight=0.7, freshness=0.6),
            DomainSeed(keyword="Quantum", weight=0.8, freshness=0.5),
        ]
    )

    policy = DomainPolicy(
        tlds=(".com", ".io"),
        min_length=6,
        max_length=18,
        reserved_terms=("capital",),
        forbidden_terms=("spam",),
        prefixes=("get", "join"),
        suffixes=("labs", "cloud"),
        max_words=3,
    )

    digest = engine.generate(policy, sample_size=6)

    assert isinstance(digest, DomainSuggestionDigest)
    assert len(digest.suggestions) <= 6
    assert digest.metrics["history_size"] == 4.0
    assert digest.metrics["candidate_count"] >= len(digest.suggestions)
    assert digest.metrics["reserved_coverage"] > 0.0

    domains = digest.top_domains()
    assert all(domain.endswith((".com", ".io")) for domain in domains)
    assert any("capital" in domain for domain in domains)
    assert all("spam" not in domain for domain in domains)

    if digest.suggestions:
        scores = [candidate.score for candidate in digest.suggestions]
        assert scores == sorted(scores, reverse=True)
        assert "capital" in digest.suggestions[0].label
