from __future__ import annotations

from dynamic_domain_name_system import DNSRecord, DynamicDomainNameSystem


def _mark_unhealthy(system: DynamicDomainNameSystem, value: str, *, failures: int = 4) -> None:
    for _ in range(failures):
        system.observe(
            "example.com",
            "@",
            "A",
            value,
            success=False,
            latency_ms=120.0,
        )


def test_resolve_returns_unhealthy_records_when_all_fail() -> None:
    system = DynamicDomainNameSystem(decay=0.5)
    record = DNSRecord(name="@", type="A", value="1.2.3.4", ttl=60)
    system.upsert("example.com", record)
    _mark_unhealthy(system, "1.2.3.4", failures=3)

    results = system.resolve("example.com", "@", "A")

    assert len(results) == 1
    (result,) = results
    assert result.value == "1.2.3.4"
    assert result.healthy is False


def test_resolve_can_include_all_unhealthy_candidates() -> None:
    system = DynamicDomainNameSystem(decay=0.5)
    record_one = DNSRecord(name="@", type="A", value="1.2.3.4", ttl=60)
    record_two = DNSRecord(name="@", type="A", value="5.6.7.8", ttl=60)
    system.upsert("example.com", record_one)
    system.upsert("example.com", record_two)
    _mark_unhealthy(system, "1.2.3.4", failures=3)
    _mark_unhealthy(system, "5.6.7.8", failures=3)

    results = system.resolve("example.com", "@", "A", include_unhealthy=True)

    assert len(results) == 2
    assert {result.value for result in results} == {"1.2.3.4", "5.6.7.8"}
    assert all(result.healthy is False for result in results)
