import pytest

from dynamic_ocean import (
    DEFAULT_FINANCIAL_PROFILES,
    build_financial_ocean,
)
from dynamic_agents.ocean import (
    DynamicAbyssopelagicAgent,
    DynamicBathypelagicAgent,
    DynamicEpipelagicAgent,
    DynamicHadalpelagicAgent,
    DynamicMesopelagicAgent,
)
from dynamic_helpers.ocean import (
    DynamicAbyssopelagicHelper,
    DynamicBathypelagicHelper,
    DynamicEpipelagicHelper,
    DynamicHadalpelagicHelper,
    DynamicMesopelagicHelper,
)
from dynamic_keepers.ocean import (
    DynamicAbyssopelagicKeeper,
    DynamicBathypelagicKeeper,
    DynamicEpipelagicKeeper,
    DynamicHadalpelagicKeeper,
    DynamicMesopelagicKeeper,
)
from dynamic_bots.ocean import (
    DynamicAbyssopelagicBot,
    DynamicBathypelagicBot,
    DynamicEpipelagicBot,
    DynamicHadalpelagicBot,
    DynamicMesopelagicBot,
)


def test_build_financial_ocean_registers_all_layers() -> None:
    ocean = build_financial_ocean()
    assert set(ocean.layers) == set(DEFAULT_FINANCIAL_PROFILES)
    assert len(ocean.sensors) >= 5
    assert len(ocean.currents) >= 5


@pytest.mark.parametrize(
    (
        "agent_cls",
        "helper_cls",
        "keeper_cls",
        "bot_cls",
    ),
    [
        (
            DynamicEpipelagicAgent,
            DynamicEpipelagicHelper,
            DynamicEpipelagicKeeper,
            DynamicEpipelagicBot,
        ),
        (
            DynamicMesopelagicAgent,
            DynamicMesopelagicHelper,
            DynamicMesopelagicKeeper,
            DynamicMesopelagicBot,
        ),
        (
            DynamicBathypelagicAgent,
            DynamicBathypelagicHelper,
            DynamicBathypelagicKeeper,
            DynamicBathypelagicBot,
        ),
        (
            DynamicAbyssopelagicAgent,
            DynamicAbyssopelagicHelper,
            DynamicAbyssopelagicKeeper,
            DynamicAbyssopelagicBot,
        ),
        (
            DynamicHadalpelagicAgent,
            DynamicHadalpelagicHelper,
            DynamicHadalpelagicKeeper,
            DynamicHadalpelagicBot,
        ),
    ],
)
def test_pelagic_layer_pipeline(agent_cls, helper_cls, keeper_cls, bot_cls) -> None:
    engine = build_financial_ocean()
    agent = agent_cls(engine=engine)
    signal = agent.capture_signal()
    assert 0.0 <= signal.liquidity_score <= 1.0
    assert 0.0 <= signal.volatility_score <= 1.0
    assert signal.recommendations

    helper = helper_cls(agent.profile)
    digest = helper.compose_digest(signal, summary=agent.summarise())
    assert agent.profile.layer_name in digest
    assert "Scores" in digest

    keeper = keeper_cls(agent.profile, limit=4)
    keeper.record(signal)
    keeper.record(agent.capture_signal())
    trend = keeper.trend()
    assert set(trend.averages) >= {
        "liquidity",
        "momentum",
        "volatility",
        "systemic_risk",
        "sentiment",
    }

    bot = bot_cls(agent=agent, helper=helper, keeper=keeper)
    message = bot.publish_update()
    assert isinstance(message, str)
    assert agent.profile.layer_name in message
    assert "Recommendations" in message
