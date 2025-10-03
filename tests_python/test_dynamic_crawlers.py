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
    SCRAPEGRAPH_GIT_REQUIREMENT,
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

    assert plan.commands[0].startswith(
        "python -m pip install --upgrade --disable-pip-version-check -r "
    )
    assert plan.commands[1].startswith("crawl4ai run")
    assert "--input crawlers/market-sweep/crawl4ai_urls.txt" in plan.commands[1]
    assert "--max-concurrency 2" in plan.commands[1]
    assert "--render-engine" not in plan.commands[1]
    assert plan.files[0].path.endswith("crawl4ai_urls.txt")
    assert "https://example.com/a" in plan.files[0].content
    assert plan.files[1].path.endswith("crawl4ai_requirements.txt")
    assert "git+https://github.com/unclecode/crawl4ai" in plan.files[1].content


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
    assert requirements_file.content.strip() == SCRAPEGRAPH_GIT_REQUIREMENT


def test_scrapegraphai_plan_allows_requirement_overrides(tmp_path: Path) -> None:
    registry = register_default_crawlers()
    job = CrawlJob(
        name="Pinned Release",
        urls=["https://example.com"],
        destination=str(tmp_path / "records.json"),
        metadata={"scrapegraphai_ref": "v1.2.3"},
    )
    plan = registry.build_plan("ScrapeGraphAI", job)

    requirements_file = plan.files[1]
    assert requirements_file.content.strip().endswith("@v1.2.3")

    overridden_job = CrawlJob(
        name="Custom Requirement",
        urls=["https://example.com"],
        destination=str(tmp_path / "records.json"),
        metadata={
            "scrapegraphai_requirement": "scrapegraphai @ git+https://example.com/fork.git"
        },
    )
    overridden_plan = registry.build_plan("ScrapeGraphAI", overridden_job)

    custom_requirements_file = overridden_plan.files[1]
    assert (
        custom_requirements_file.content
        == "scrapegraphai @ git+https://example.com/fork.git\n"
    )

    repo_override_job = CrawlJob(
        name="Custom Repo",
        urls=["https://example.com"],
        destination=str(tmp_path / "records.json"),
        metadata={"scrapegraphai_repo": "https://example.com/custom.git"},
    )
    repo_plan = registry.build_plan("ScrapeGraphAI", repo_override_job)

    repo_requirements = repo_plan.files[1]
    assert (
        repo_requirements.content
        == "scrapegraphai @ git+https://example.com/custom.git\n"
    )

    prefixed_repo_job = CrawlJob(
        name="Prefixed Repo",
        urls=["https://example.com"],
        destination=str(tmp_path / "records.json"),
        metadata={
            "scrapegraphai_repo": "git+https://example.com/prefixed.git",
            "scrapegraphai_ref": "feature-branch",
        },
    )
    prefixed_plan = registry.build_plan("ScrapeGraphAI", prefixed_repo_job)

    prefixed_requirements = prefixed_plan.files[1]
    assert (
        prefixed_requirements.content
        == "scrapegraphai @ git+https://example.com/prefixed.git@feature-branch\n"
    )


def test_crawlee_plan_toggles_browser_mode(tmp_path: Path) -> None:
    registry = register_default_crawlers()
    job = CrawlJob(
        name="Browser Switch",
        urls=["https://dynamic.example"],
        destination=str(tmp_path / "crawl.jsonl"),
    )
    config = CrawlerConfig(dynamic_content=False, concurrency=3, output_format="json")
    plan = registry.build_plan("Crawlee", job, config=config)

    assert plan.commands[0].startswith(
        "npm install --no-save crawlee@github:apify/crawlee playwright"
    )
    assert plan.commands[1].startswith("npx ts-node ")
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
    assert plan.commands[0].startswith(
        "npm install --no-save llm-scraper@github:mishushakov/llm-scraper"
    )
    assert plan.commands[1].startswith("npx llm-scraper run ")


def test_register_default_crawlers_can_extend_existing_registry() -> None:
    registry = DynamicCrawlerRegistry()
    register_default_crawlers(registry)
    assert len(registry.list_crawlers()) == 5
    with pytest.raises(ValueError):
        register_default_crawlers(registry)


def test_build_plan_requires_enabled_crawler(tmp_path: Path) -> None:
    registry = DynamicCrawlerRegistry()
    register_default_crawlers(registry)
    registry.disable("Crawl4AI")

    job = CrawlJob(
        name="Disabled Crawl",
        urls=["https://example.com"],
        destination=str(tmp_path / "out.md"),
    )

    with pytest.raises(RuntimeError, match="disabled"):
        registry.build_plan("Crawl4AI", job)

    registry.enable("Crawl4AI")
    plan = registry.build_plan("Crawl4AI", job)
    assert plan.commands
