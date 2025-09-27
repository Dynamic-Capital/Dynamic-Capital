from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.frontend_keeper import (  # noqa: E402
    DynamicFrontendKeeperAlgorithm,
    FrontendSurface,
)
from algorithms.python.multi_llm import LLMConfig  # noqa: E402


class DummyClient:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.prompts.append(prompt)
        return json.dumps(
            {
                "summary": "Frontend keeper aligned",
                "actions": ["Ship updated design tokens"],
            }
        )


def test_frontend_keeper_sync_tracks_surfaces_and_experiments() -> None:
    keeper = DynamicFrontendKeeperAlgorithm()
    design_system = FrontendSurface(
        name="design-system",
        route="/design-system",
        description="Core token and component library",
        owner="DesignOps",
        status="live",
        priority=10,
        components=("theme-provider", "ui-kit"),
        tags=("core", "shared"),
    )
    keeper.register_surface(design_system)
    keeper.register_dependency("portfolio-dashboard", ("design-system",))
    keeper.register_experiment("alpha-ui", ("design-system",))

    insights_feed = FrontendSurface(
        name="insights-feed",
        route="/insights",
        description="Market insights stream",
        owner="Growth",
        status="offline",
        priority=6,
        components=("stream-view",),
    )
    portfolio_dashboard = FrontendSurface(
        name="portfolio-dashboard",
        route="/portfolio",
        description="Trader facing performance surface",
        owner="CoreApps",
        status="beta",
        priority=9,
        components=("portfolio-grid", "pnl-widget"),
        tags=("portfolio", "pwa"),
    )

    dummy_client = DummyClient()
    config = LLMConfig(
        name="frontend-keeper-gpt",
        client=dummy_client,
        temperature=0.2,
        nucleus_p=0.9,
        max_tokens=256,
    )

    as_of = datetime(2024, 5, 1, 12, 45, tzinfo=timezone.utc)
    result = keeper.sync(
        as_of=as_of,
        surfaces=(insights_feed, portfolio_dashboard),
        dependencies={
            "portfolio-dashboard": ("design-system", "auth-gateway"),
            "insights-feed": ("design-system",),
        },
        experiments={"new-cta": ("portfolio-dashboard",)},
        status_overrides={"portfolio-dashboard": "active"},
        llm_configs=(config,),
        theme="Frontend alignment",
        context={"notes": ["Ensure auth-gateway parity"]},
    )

    assert result.timestamp == as_of
    assert result.theme == "Frontend alignment"
    assert len(result.surfaces) == 3

    portfolio_payload = next(surface for surface in result.surfaces if surface["name"] == "portfolio-dashboard")
    assert portfolio_payload["status"] == "active"
    assert "portfolio" in portfolio_payload["tags"]
    assert sorted(portfolio_payload["experiments"]) == ["new-cta"]

    insights_payload = next(surface for surface in result.surfaces if surface["name"] == "insights-feed")
    assert insights_payload["status"] == "offline"

    dependency_entry = next(dep for dep in result.dependencies if dep["surface"] == "portfolio-dashboard")
    assert "auth-gateway" in dependency_entry["missing"]

    assert any(risk["issue"] == "missing_dependency" for risk in result.risks)
    assert any(risk["surface"] == "insights-feed" and risk["issue"] == "status_alert" for risk in result.risks)

    assert result.llm_runs and result.llm_runs[0].name == "frontend-keeper-gpt"
    assert dummy_client.prompts and dummy_client.prompts[0] == result.metadata["prompt"]
    assert "Frontend alignment" in result.metadata["prompt"]
    assert "auth-gateway" in result.metadata["prompt"]

    payload = result.to_dict()
    assert payload["timestamp"] == as_of.isoformat()
    assert payload["summary"].startswith("3 surfaces")
    assert payload["metadata"]["prompt"] == result.metadata["prompt"]


def test_frontend_keeper_requires_surfaces() -> None:
    keeper = DynamicFrontendKeeperAlgorithm()
    with pytest.raises(ValueError):
        keeper.sync()
