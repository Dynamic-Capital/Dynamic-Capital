import pytest

from dynamic_index import DynamicIndex, IndexConstituent, IndexSignal


def test_index_constituent_normalisation() -> None:
    constituent = IndexConstituent(
        symbol="  ethusd  ",
        weight=-3.5,
        exposure=1.4,
        volatility=-0.2,
        momentum=1.8,
        conviction=1.3,
        liquidity=1.4,
        category=" defi ",
        tags=(" Growth ", "growth", "CORE"),
        metadata={"source": "desk"},
    )

    assert constituent.symbol == "ETHUSD"
    assert constituent.weight == 0.0
    assert constituent.exposure == 1.0
    assert constituent.volatility == 0.0
    assert constituent.momentum == 1.0
    assert constituent.conviction == 1.0
    assert constituent.liquidity == 1.0
    assert constituent.category == "DEFI"
    assert constituent.tags == ("growth", "core")
    assert constituent.metadata == {"source": "desk"}


def test_dynamic_index_snapshot_and_history() -> None:
    index = DynamicIndex(history=3)
    index.extend(
        [
            {
                "symbol": "btc",
                "weight": 0.6,
                "exposure": 0.4,
                "volatility": 0.25,
                "momentum": 0.3,
                "conviction": 0.8,
                "liquidity": 0.9,
                "tags": ("crypto", "core"),
            },
            {
                "symbol": "eth",
                "weight": 0.4,
                "exposure": -0.2,
                "volatility": 0.35,
                "momentum": 0.1,
                "conviction": 0.6,
                "liquidity": 0.75,
                "tags": ("crypto", "growth"),
            },
        ]
    )

    signal = IndexSignal(
        symbol="BTC",
        return_pct=0.5,
        flow_bias=0.3,
        confidence=0.9,
        liquidity=0.95,
    )
    index.record(signal)

    snapshot = index.snapshot()

    assert len(index.history()) == 1
    assert snapshot.top_constituents == ("BTC", "ETH")
    assert snapshot.net_exposure == pytest.approx(0.205, rel=1e-6)
    assert snapshot.momentum == pytest.approx(0.262, rel=1e-6)
    assert snapshot.liquidity == pytest.approx(0.87, rel=1e-6)
    assert snapshot.value == pytest.approx(1.17295, rel=1e-6)
    assert snapshot.concentration == pytest.approx(0.52, rel=1e-6)
    assert snapshot.breadth == pytest.approx(0.48, rel=1e-6)
    assert snapshot.stress == pytest.approx(0.08225, rel=1e-6)
    assert snapshot.notes and any("themes crypto" in note for note in snapshot.notes)
