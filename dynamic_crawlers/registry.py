"""Registry of open-source crawlers with integration planning utilities."""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
import json
import re
from typing import Callable, Mapping, MutableMapping, Sequence

__all__ = [
    "CrawlJob",
    "CrawlerCapabilities",
    "CrawlerConfig",
    "CrawlerMetadata",
    "CrawlerPlan",
    "CrawlerSpec",
    "DynamicCrawlerRegistry",
    "PlanFile",
    "register_default_crawlers",
]


# ---------------------------------------------------------------------------
# Core dataclasses


@dataclass(slots=True)
class CrawlJob:
    """Description of the data capture request for a crawler."""

    name: str
    urls: Sequence[str]
    destination: str
    prompt: str | None = None
    schema: Mapping[str, object] | None = None
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.name = _normalise_non_empty(self.name, label="name")
        self.urls = _normalise_urls(self.urls)
        self.destination = _normalise_non_empty(self.destination, label="destination")
        self.prompt = _normalise_optional_text(self.prompt)
        self.schema = _normalise_mapping(self.schema)
        self.metadata = _normalise_mapping(self.metadata)


@dataclass(slots=True)
class CrawlerConfig:
    """Generic configuration shared across crawler implementations."""

    output_format: str = "markdown"
    concurrency: int = 4
    dynamic_content: bool = True
    max_depth: int | None = None
    max_pages: int | None = None
    llm_provider: str | None = None
    schema: Mapping[str, object] | None = None
    headers: Mapping[str, str] | None = None
    extra_options: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.output_format = _normalise_non_empty(
            self.output_format, label="output_format"
        ).lower()
        if self.concurrency < 1:
            raise ValueError("concurrency must be >= 1")
        if self.max_depth is not None and self.max_depth < 1:
            raise ValueError("max_depth must be >= 1 when provided")
        if self.max_pages is not None and self.max_pages < 1:
            raise ValueError("max_pages must be >= 1 when provided")
        self.dynamic_content = bool(self.dynamic_content)
        self.llm_provider = _normalise_optional_text(self.llm_provider)
        self.schema = _normalise_mapping(self.schema)
        self.headers = _normalise_mapping(self.headers)
        self.extra_options = _normalise_mapping(self.extra_options)

    def with_overrides(self, **overrides: object) -> "CrawlerConfig":
        """Return a new config with ``overrides`` applied."""

        data = {
            "output_format": self.output_format,
            "concurrency": self.concurrency,
            "dynamic_content": self.dynamic_content,
            "max_depth": self.max_depth,
            "max_pages": self.max_pages,
            "llm_provider": self.llm_provider,
            "schema": self.schema,
            "headers": self.headers,
            "extra_options": self.extra_options,
        }
        data.update(overrides)
        return CrawlerConfig(**data)


@dataclass(slots=True)
class CrawlerMetadata:
    """Descriptive metadata about an upstream crawler."""

    name: str
    language: str
    homepage: str
    license: str
    description: str

    def __post_init__(self) -> None:
        self.name = _normalise_non_empty(self.name, label="name")
        self.language = _normalise_non_empty(self.language, label="language")
        self.homepage = _normalise_non_empty(self.homepage, label="homepage")
        self.license = _normalise_non_empty(self.license, label="license")
        self.description = _normalise_non_empty(self.description, label="description")


@dataclass(slots=True)
class CrawlerCapabilities:
    """Feature flags describing crawler strengths."""

    dynamic_content: bool
    concurrent_requests: bool
    schema_driven: bool
    multi_page: bool
    output_formats: tuple[str, ...]
    llm_integration: bool
    notes: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        self.dynamic_content = bool(self.dynamic_content)
        self.concurrent_requests = bool(self.concurrent_requests)
        self.schema_driven = bool(self.schema_driven)
        self.multi_page = bool(self.multi_page)
        self.llm_integration = bool(self.llm_integration)
        self.output_formats = _normalise_sequence(self.output_formats)
        self.notes = _normalise_sequence(self.notes)


@dataclass(slots=True)
class PlanFile:
    """Representation of a file to materialise prior to execution."""

    path: str
    content: str

    def __post_init__(self) -> None:
        self.path = _normalise_non_empty(self.path, label="path")
        self.content = self.content if self.content is not None else ""


@dataclass(slots=True)
class CrawlerPlan:
    """Concrete execution plan describing how to run a crawler."""

    commands: tuple[str, ...]
    environment: Mapping[str, str]
    files: tuple[PlanFile, ...]
    notes: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.commands:
            raise ValueError("plan must include at least one command")
        self.commands = tuple(_normalise_non_empty(cmd, label="command") for cmd in self.commands)
        self.environment = {
            key: _normalise_non_empty(str(value), label="environment value")
            for key, value in (self.environment or {}).items()
        }
        self.files = tuple(self.files or ())
        self.notes = tuple(self.notes or ())


PlanBuilder = Callable[[CrawlJob, CrawlerConfig], CrawlerPlan]


@dataclass(slots=True)
class CrawlerSpec:
    """Bundle metadata, capabilities, and execution planning logic."""

    metadata: CrawlerMetadata
    capabilities: CrawlerCapabilities
    default_config: CrawlerConfig
    plan_builder: PlanBuilder

    def build_plan(
        self, job: CrawlJob, config: CrawlerConfig | None = None
    ) -> CrawlerPlan:
        if config is None:
            config = self.default_config
        return self.plan_builder(job, config)


class DynamicCrawlerRegistry:
    """Registry storing crawler specifications and generating plans."""

    def __init__(self) -> None:
        self._crawlers: dict[str, CrawlerSpec] = {}

    def register(self, spec: CrawlerSpec) -> None:
        key = _slugify(spec.metadata.name)
        if key in self._crawlers:
            raise ValueError(f"crawler '{spec.metadata.name}' already registered")
        self._crawlers[key] = spec

    def get(self, name: str) -> CrawlerSpec:
        key = _slugify(name)
        try:
            return self._crawlers[key]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown crawler '{name}'") from exc

    def build_plan(
        self, name: str, job: CrawlJob, config: CrawlerConfig | None = None
    ) -> CrawlerPlan:
        spec = self.get(name)
        merged_config = config or spec.default_config
        if config is not None:
            merged_config = spec.default_config.with_overrides(
                **{
                    "output_format": config.output_format,
                    "concurrency": config.concurrency,
                    "dynamic_content": config.dynamic_content,
                    "max_depth": config.max_depth,
                    "max_pages": config.max_pages,
                    "llm_provider": config.llm_provider,
                    "schema": config.schema or spec.default_config.schema,
                    "headers": config.headers or spec.default_config.headers,
                    "extra_options": config.extra_options or spec.default_config.extra_options,
                }
            )
        return spec.build_plan(job, merged_config)

    def list_crawlers(self) -> tuple[CrawlerSpec, ...]:
        return tuple(
            self._crawlers[key]
            for key in sorted(self._crawlers)
        )


# ---------------------------------------------------------------------------
# Default crawler specifications


def register_default_crawlers(
    registry: DynamicCrawlerRegistry | None = None,
) -> DynamicCrawlerRegistry:
    """Register the canonical set of open-source crawlers used by Dynamic Capital."""

    registry = registry or DynamicCrawlerRegistry()
    for builder in (
        _build_crawl4ai_spec,
        _build_scrapegraphai_spec,
        _build_firecrawl_spec,
        _build_crawlee_spec,
        _build_llm_scraper_spec,
    ):
        registry.register(builder())
    return registry


# ---------------------------------------------------------------------------
# Plan builders


def _build_crawl4ai_spec() -> CrawlerSpec:
    metadata = CrawlerMetadata(
        name="Crawl4AI",
        language="Python",
        homepage="https://github.com/unclecode/crawl4ai",
        license="Apache-2.0",
        description="High-throughput crawler optimised for AI-ready Markdown output.",
    )
    capabilities = CrawlerCapabilities(
        dynamic_content=True,
        concurrent_requests=True,
        schema_driven=False,
        multi_page=True,
        output_formats=("markdown", "json"),
        llm_integration=True,
        notes=(
            "Supports headless Chromium rendering via Playwright.",
            "Provides clean Markdown output with automatic boilerplate removal.",
        ),
    )
    default_config = CrawlerConfig(output_format="markdown", concurrency=8, dynamic_content=True)
    return CrawlerSpec(
        metadata=metadata,
        capabilities=capabilities,
        default_config=default_config,
        plan_builder=_build_crawl4ai_plan,
    )


def _build_scrapegraphai_spec() -> CrawlerSpec:
    metadata = CrawlerMetadata(
        name="ScrapeGraphAI",
        language="Python",
        homepage="https://github.com/ScrapeGraphAI/Scrapegraph-ai",
        license="MIT",
        description="Prompt-driven scraping pipelines orchestrated through graph logic.",
    )
    capabilities = CrawlerCapabilities(
        dynamic_content=True,
        concurrent_requests=True,
        schema_driven=True,
        multi_page=True,
        output_formats=("json", "markdown"),
        llm_integration=True,
        notes=(
            "Automatically builds scraping workflows from natural-language prompts.",
            "Ideal for schema-first extraction that leverages LLM reasoning.",
        ),
    )
    default_config = CrawlerConfig(
        output_format="json",
        concurrency=4,
        dynamic_content=True,
        llm_provider="openai:gpt-4o-mini",
    )
    return CrawlerSpec(
        metadata=metadata,
        capabilities=capabilities,
        default_config=default_config,
        plan_builder=_build_scrapegraphai_plan,
    )


def _build_firecrawl_spec() -> CrawlerSpec:
    metadata = CrawlerMetadata(
        name="Firecrawl",
        language="TypeScript",
        homepage="https://github.com/firecrawl/firecrawl",
        license="MIT",
        description="LLM-ready crawling engine with resilient content normalisation.",
    )
    capabilities = CrawlerCapabilities(
        dynamic_content=True,
        concurrent_requests=True,
        schema_driven=False,
        multi_page=True,
        output_formats=("markdown", "json"),
        llm_integration=True,
        notes=(
            "Handles modern anti-bot measures with smart retries.",
            "Exports structured Markdown or JSON for ingestion pipelines.",
        ),
    )
    default_config = CrawlerConfig(output_format="markdown", concurrency=6, dynamic_content=True)
    return CrawlerSpec(
        metadata=metadata,
        capabilities=capabilities,
        default_config=default_config,
        plan_builder=_build_firecrawl_plan,
    )


def _build_crawlee_spec() -> CrawlerSpec:
    metadata = CrawlerMetadata(
        name="Crawlee",
        language="TypeScript & Python",
        homepage="https://github.com/apify/crawlee",
        license="Apache-2.0",
        description="Browser automation toolkit for robust web crawling at scale.",
    )
    capabilities = CrawlerCapabilities(
        dynamic_content=True,
        concurrent_requests=True,
        schema_driven=False,
        multi_page=True,
        output_formats=("json",),
        llm_integration=False,
        notes=(
            "Supports both headless browser and fast HTTP-based crawlers.",
            "Integrates with Apify storage and custom pipelines effortlessly.",
        ),
    )
    default_config = CrawlerConfig(output_format="json", concurrency=5, dynamic_content=True)
    return CrawlerSpec(
        metadata=metadata,
        capabilities=capabilities,
        default_config=default_config,
        plan_builder=_build_crawlee_plan,
    )


def _build_llm_scraper_spec() -> CrawlerSpec:
    metadata = CrawlerMetadata(
        name="LLM Scraper",
        language="TypeScript",
        homepage="https://github.com/mishushakov/llm-scraper",
        license="Apache-2.0",
        description="Schema-driven extraction powered by Playwright and LLM reasoning.",
    )
    capabilities = CrawlerCapabilities(
        dynamic_content=True,
        concurrent_requests=False,
        schema_driven=True,
        multi_page=False,
        output_formats=("json", "markdown"),
        llm_integration=True,
        notes=(
            "Pairs Playwright navigation with LLM-guided parsing to honour schemas.",
            "Supports multiple LLM providers through an adapter interface.",
        ),
    )
    default_config = CrawlerConfig(
        output_format="json",
        concurrency=1,
        dynamic_content=True,
        llm_provider="openai:gpt-4o-mini",
    )
    return CrawlerSpec(
        metadata=metadata,
        capabilities=capabilities,
        default_config=default_config,
        plan_builder=_build_llm_scraper_plan,
    )


# ---------------------------------------------------------------------------
# Individual plan builders


def _build_crawl4ai_plan(job: CrawlJob, config: CrawlerConfig) -> CrawlerPlan:
    slug = _slugify(job.name)
    url_file = PlanFile(
        path=f"crawlers/{slug}/crawl4ai_urls.txt",
        content="\n".join(job.urls) + "\n",
    )
    command_parts = [
        "crawl4ai run",
        f"--input {url_file.path}",
        f"--output {job.destination}",
        f"--format {config.output_format}",
        f"--max-concurrency {config.concurrency}",
    ]
    if config.dynamic_content:
        command_parts.append("--render-engine playwright")
    if config.max_depth is not None:
        command_parts.append(f"--max-depth {config.max_depth}")
    if config.max_pages is not None:
        command_parts.append(f"--limit {config.max_pages}")
    for key, value in sorted((config.extra_options or {}).items()):
        command_parts.append(f"--{_slugify(str(key)).replace('-', '_')} {value}")
    notes = (
        "Install Crawl4AI (`pip install crawl4ai`) and Playwright browsers before executing.",
        "The generated Markdown is ready for ingestion into Dynamic Capital's RAG pipelines.",
    )
    return CrawlerPlan(
        commands=(" ".join(command_parts),),
        environment={},
        files=(url_file,),
        notes=notes,
    )


def _build_scrapegraphai_plan(job: CrawlJob, config: CrawlerConfig) -> CrawlerPlan:
    slug = _slugify(job.name)
    config_file = PlanFile(
        path=f"crawlers/{slug}/scrapegraphai_config.json",
        content=json.dumps(
            {
                "graph_name": job.name,
                "description": job.prompt
                or "Extract structured data from the target URLs using ScrapeGraphAI.",
                "llm": config.llm_provider,
                "schema": config.schema or job.schema or {},
                "sources": [{"url": url} for url in job.urls],
                "output": {
                    "format": config.output_format,
                    "path": job.destination,
                },
                "concurrency": config.concurrency,
                "metadata": job.metadata,
            },
            indent=2,
        ),
    )
    requirements_file = PlanFile(
        path=f"crawlers/{slug}/requirements.txt",
        content=_scrapegraphai_requirement_line(job),
    )
    notes = (
        "Ensure the configured LLM provider is available and credentials are exported as environment variables.",
        "ScrapeGraphAI will orchestrate multi-step extraction flows based on the natural-language description.",
        "Install ScrapeGraphAI from the GitHub source via the generated requirements file before execution.",
        "Provide `scrapegraphai_ref` or `scrapegraphai_requirement` metadata to pin a specific release when needed.",
    )
    environment = {
        "SCRAPEGRAPH_OUTPUT_PATH": job.destination,
    }
    if config.llm_provider:
        environment["SCRAPEGRAPH_LLM"] = config.llm_provider
    install_command = (
        f"python -m pip install --upgrade --disable-pip-version-check "
        f"-r {requirements_file.path}"
    )
    return CrawlerPlan(
        commands=(
            install_command,
            f"python -m scrapegraphai.cli run {config_file.path}",
        ),
        environment=environment,
        files=(config_file, requirements_file),
        notes=notes,
    )


def _build_firecrawl_plan(job: CrawlJob, config: CrawlerConfig) -> CrawlerPlan:
    slug = _slugify(job.name)
    url_file = PlanFile(
        path=f"crawlers/{slug}/firecrawl_urls.txt",
        content="\n".join(job.urls) + "\n",
    )
    command_parts = [
        "firecrawl crawl",
        f"--input {url_file.path}",
        f"--output {job.destination}",
        f"--format {config.output_format}",
        f"--concurrency {config.concurrency}",
    ]
    if config.dynamic_content:
        command_parts.append("--javascript")
    if config.max_pages is not None:
        command_parts.append(f"--limit {config.max_pages}")
    notes = (
        "Firecrawl requires a configured data store; set FIRECRAWL_API_KEY if using the hosted API.",
        "Outputs are streamed as Markdown/JSON optimised for downstream LLM consumption.",
    )
    return CrawlerPlan(
        commands=(" ".join(command_parts),),
        environment={"FIRECRAWL_OUTPUT_PATH": job.destination},
        files=(url_file,),
        notes=notes,
    )


def _build_crawlee_plan(job: CrawlJob, config: CrawlerConfig) -> CrawlerPlan:
    slug = _slugify(job.name)
    script = PlanFile(
        path=f"crawlers/{slug}/crawlee-runner.ts",
        content=_render_crawlee_script(job, config),
    )
    notes = (
        "Install Crawlee and Playwright dependencies (`npm install crawlee playwright`).",
        "Set `CRAWLEE_USE_BROWSER=true` to enable full browser rendering for dynamic sites.",
    )
    environment = {
        "CRAWLEE_OUTPUT_PATH": job.destination,
        "CRAWLEE_USE_BROWSER": "true" if config.dynamic_content else "false",
    }
    return CrawlerPlan(
        commands=(f"npx ts-node {script.path}",),
        environment=environment,
        files=(script,),
        notes=notes,
    )


def _build_llm_scraper_plan(job: CrawlJob, config: CrawlerConfig) -> CrawlerPlan:
    slug = _slugify(job.name)
    schema = config.schema or job.schema or {}
    config_file = PlanFile(
        path=f"crawlers/{slug}/llm-scraper.config.json",
        content=json.dumps(
            {
                "name": job.name,
                "llm": config.llm_provider,
                "schema": schema,
                "urls": list(job.urls),
                "output": {
                    "path": job.destination,
                    "format": config.output_format,
                },
                "metadata": job.metadata,
            },
            indent=2,
        ),
    )
    notes = (
        "LLM Scraper uses Playwright; run `npx playwright install` if not already installed.",
        "Provide API keys for the selected LLM provider via environment variables understood by LLM Scraper.",
    )
    environment = {
        "LLM_SCRAPER_OUTPUT": job.destination,
    }
    if config.llm_provider:
        environment["LLM_SCRAPER_PROVIDER"] = config.llm_provider
    return CrawlerPlan(
        commands=(f"npx llm-scraper run {config_file.path}",),
        environment=environment,
        files=(config_file,),
        notes=notes,
    )


# ---------------------------------------------------------------------------
# Helper utilities


def _normalise_non_empty(value: str, *, label: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"{label} must not be empty")
    return text


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


def _normalise_mapping(
    value: Mapping[str, object] | MutableMapping[str, object] | None,
) -> dict[str, object]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):
        raise TypeError("expected mapping when providing metadata or schema")
    return {str(key): val for key, val in value.items()}


def _normalise_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    result: list[str] = []
    for value in values:
        cleaned = (value or "").strip()
        if cleaned:
            result.append(cleaned)
    return tuple(result)


def _normalise_urls(urls: Sequence[str]) -> tuple[str, ...]:
    if not urls:
        raise ValueError("urls must not be empty")
    result: list[str] = []
    for url in urls:
        cleaned = (url or "").strip()
        if not cleaned:
            raise ValueError("urls must not contain empty values")
        result.append(cleaned)
    return tuple(result)


_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")


@lru_cache(maxsize=256)
def _slugify(value: str) -> str:
    cleaned = (value or "").strip().lower()
    if not cleaned:
        return "crawler"
    slug = _NON_ALNUM_RE.sub("-", cleaned).strip("-")
    return slug or "crawler"


def _render_crawlee_script(job: CrawlJob, config: CrawlerConfig) -> str:
    urls_json = json.dumps(list(job.urls), indent=4)
    script = f"""
    import {{ CheerioCrawler, PlaywrightCrawler }} from "crawlee";
    import fs from "node:fs/promises";
    import path from "node:path";

    const urls = {urls_json};
    const outputPath = process.env.CRAWLEE_OUTPUT_PATH ?? "{job.destination}";
    const useBrowser = (process.env.CRAWLEE_USE_BROWSER ?? "false").toLowerCase() === "true";

    const BaseCrawler = useBrowser ? PlaywrightCrawler : CheerioCrawler;

    const crawler = new BaseCrawler({{
        maxConcurrency: {config.concurrency},
        requestHandler: async ({{ request, page, parseWithCheerio }}) => {{
            const timestamp = new Date().toISOString();
            let html: string;
            if (useBrowser && page) {{
                await page.waitForLoadState("networkidle");
                html = await page.content();
            }} else {{
                const $ = await parseWithCheerio();
                html = $.html();
            }}
            const record = {{
                url: request.url,
                html,
                fetchedAt: timestamp,
            }};
            await fs.mkdir(path.dirname(outputPath), {{ recursive: true }});
            await fs.appendFile(outputPath, JSON.stringify(record) + "\n", "utf8");
        }},
    }});

    await crawler.run(urls);
    """
    return "\n".join(line.rstrip() for line in script.strip().splitlines()) + "\n"


def _scrapegraphai_requirement_line(job: CrawlJob) -> str:
    """Return the requirement line for ScrapeGraphAI respecting job metadata overrides."""

    metadata = job.metadata or {}
    explicit_requirement = metadata.get("scrapegraphai_requirement")
    if isinstance(explicit_requirement, str):
        cleaned_requirement = explicit_requirement.strip()
        if cleaned_requirement:
            return _ensure_trailing_newline(cleaned_requirement)

    git_ref = metadata.get("scrapegraphai_ref")
    if isinstance(git_ref, str):
        cleaned_ref = git_ref.strip()
        if cleaned_ref:
            requirement = (
                "scrapegraphai @ "
                f"git+https://github.com/ScrapeGraphAI/Scrapegraph-ai@{cleaned_ref}"
            )
            return _ensure_trailing_newline(requirement)

    return _ensure_trailing_newline(
        "scrapegraphai @ git+https://github.com/ScrapeGraphAI/Scrapegraph-ai"
    )


def _ensure_trailing_newline(value: str) -> str:
    return value if value.endswith("\n") else f"{value}\n"
