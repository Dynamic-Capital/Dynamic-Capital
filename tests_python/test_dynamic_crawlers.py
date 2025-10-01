"""Tests for the dynamic crawler registry and plan builders."""

from __future__ import annotations

import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic_crawlers import (
    CrawlJob,
    CrawlerConfig,
    DynamicCrawlerRegistry,
    register_default_crawlers,
)


def test_registry_lists_all_crawlers() -> None:
    registry = register_default_crawlers()
    names = [spec.metadata.name for spec in registry.list_crawlers()]
    assert names == [
        "Crawl4AI",
        "Crawlee",
        "Firecrawl",
        "LLM Scraper",
        "ScrapeGraphAI",
    ]


def test_crawl4ai_plan_includes_urls_and_options(tmp_path: Path) -> None:
    registry = register_default_crawlers()
    job = CrawlJob(
        name="Market Sweep",
        urls=["https://example.com/a", "https://example.com/b"],
        destination=str(tmp_path / "output.md"),
    )
    config = CrawlerConfig(concurrency=2, dynamic_content=False, output_format="markdown")
    plan = registry.build_plan("Crawl4AI", job, config=config)

    assert plan.commands[0].startswith("crawl4ai run")
    assert "--input crawlers/market-sweep/crawl4ai_urls.txt" in plan.commands[0]
    assert "--max-concurrency 2" in plan.commands[0]
    assert "--render-engine" not in plan.commands[0]
    assert plan.files[0].path.endswith("crawl4ai_urls.txt")
    assert "https://example.com/a" in plan.files[0].content


def test_scrapegraphai_plan_serialises_schema(tmp_path: Path) -> None:
    registry = register_default_crawlers()
    job = CrawlJob(
        name="Schema Test",
        urls=["https://example.com"],
        destination=str(tmp_path / "records.json"),
        prompt="Collect product cards",
        schema={"type": "object", "properties": {"title": {"type": "string"}}},
        metadata={"team": "research"},
    )
    plan = registry.build_plan("ScrapeGraphAI", job)
    config_file = plan.files[0]
    payload = json.loads(config_file.content)
    assert payload["schema"]["properties"]["title"]["type"] == "string"
    assert payload["metadata"]["team"] == "research"
    assert plan.environment["SCRAPEGRAPH_OUTPUT_PATH"].endswith("records.json")
    assert plan.commands[0].startswith(
        "python -m pip install --upgrade --disable-pip-version-check -r "
    )
    assert plan.commands[1] == (
        f"python -m scrapegraphai.cli run {config_file.path}"
    )
    requirements_file = plan.files[1]
    assert requirements_file.path.endswith("requirements.txt")
    assert "git+https://github.com/ScrapeGraphAI/Scrapegraph-ai" in requirements_file.content


def test_crawlee_plan_toggles_browser_mode(tmp_path: Path) -> None:
    registry = register_default_crawlers()
    job = CrawlJob(
        name="Browser Switch",
        urls=["https://dynamic.example"],
        destination=str(tmp_path / "crawl.jsonl"),
    )
    config = CrawlerConfig(dynamic_content=False, concurrency=3, output_format="json")
    plan = registry.build_plan("Crawlee", job, config=config)

    assert plan.environment["CRAWLEE_USE_BROWSER"] == "false"
    script_body = plan.files[0].content
    assert "CheerioCrawler" in script_body
    assert "PlaywrightCrawler" in script_body
    assert "CRAWLEE_OUTPUT_PATH" in script_body


def test_llm_scraper_plan_prefers_config_schema(tmp_path: Path) -> None:
    registry = register_default_crawlers()
    job = CrawlJob(
        name="LLM Job",
        urls=["https://example.com"],
        destination=str(tmp_path / "llm.json"),
        schema={"job": True},
    )
    config = CrawlerConfig(
        schema={"config": True},
        llm_provider="anthropic:claude-3-haiku",
        output_format="json",
        concurrency=1,
    )
    plan = registry.build_plan("LLM Scraper", job, config=config)
    payload = json.loads(plan.files[0].content)
    assert payload["schema"] == {"config": True}
    assert plan.environment["LLM_SCRAPER_PROVIDER"] == "anthropic:claude-3-haiku"


def test_register_default_crawlers_can_extend_existing_registry() -> None:
    registry = DynamicCrawlerRegistry()
    register_default_crawlers(registry)
    assert len(registry.list_crawlers()) == 5
    with pytest.raises(ValueError):
        register_default_crawlers(registry)
