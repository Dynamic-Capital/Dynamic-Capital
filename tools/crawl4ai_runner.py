"""Utility helpers to run Crawl4AI crawls inside Dynamic Capital."""

from __future__ import annotations

import argparse
import asyncio
import logging
import pathlib
import sys
from dataclasses import dataclass
from typing import Literal, Optional

LOGGER = logging.getLogger("crawl4ai-runner")


class DependencyError(RuntimeError):
  """Raised when Crawl4AI or one of its dependencies is missing."""


@dataclass(frozen=True)
class CrawlOptions:
  """CLI options for a Crawl4AI run."""

  url: str
  headless: bool
  cache: bool
  only_text: bool
  selector: Optional[str]
  fit_output: bool
  format: Literal["markdown", "html"]
  output: Optional[pathlib.Path]
  verbose_browser: bool
  verbose_runner: bool


@dataclass(frozen=True)
class Crawl4AIDependencies:
  """Grouped Crawl4AI imports for easier testing."""

  AsyncWebCrawler: object
  BrowserConfig: object
  CrawlerRunConfig: object
  CacheMode: object
  DefaultMarkdownGenerator: object


def _resolve_vendor_path() -> pathlib.Path:
  vendor_root = pathlib.Path(__file__).resolve().parents[1] / "third_party" / "crawl4ai"
  if not vendor_root.exists():
    raise DependencyError(
      "The vendored crawl4ai package is missing. Did you accidentally remove third_party/crawl4ai?",
    )
  return vendor_root


def _load_crawl4ai() -> Crawl4AIDependencies:
  vendor_root = _resolve_vendor_path()
  path_str = str(vendor_root)
  if path_str not in sys.path:
    sys.path.insert(0, path_str)
  try:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig, DefaultMarkdownGenerator
  except ModuleNotFoundError as exc:  # pragma: no cover - executed when deps are missing
    missing = exc.name or str(exc)
    raise DependencyError(
      "Missing Python dependency '%s'. Install packages from third_party/crawl4ai/requirements.txt." % missing,
    ) from exc
  return Crawl4AIDependencies(
    AsyncWebCrawler=AsyncWebCrawler,
    BrowserConfig=BrowserConfig,
    CrawlerRunConfig=CrawlerRunConfig,
    CacheMode=CacheMode,
    DefaultMarkdownGenerator=DefaultMarkdownGenerator,
  )


def _configure_logging(verbose: bool) -> None:
  level = logging.DEBUG if verbose else logging.INFO
  logging.basicConfig(level=level, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


def _parse_args(argv: Optional[list[str]] = None) -> CrawlOptions:
  parser = argparse.ArgumentParser(description="Run a single Crawl4AI crawl and emit markdown or HTML")
  parser.add_argument("url", help="URL to crawl")
  parser.add_argument("--headless", dest="headless", action="store_true", default=True, help="Launch browser in headless mode")
  parser.add_argument(
    "--no-headless", dest="headless", action="store_false", help="Launch browser with a visible window (if supported)",
  )
  parser.add_argument("--cache", action="store_true", help="Use Crawl4AI's cache instead of bypassing it")
  parser.add_argument("--only-text", action="store_true", help="Strip non-text content before markdown generation")
  parser.add_argument("--selector", help="CSS selector to scope the crawl to a specific element")
  parser.add_argument(
    "--format",
    choices=("markdown", "html"),
    default="markdown",
    help="Output either cleaned markdown (default) or HTML",
  )
  parser.add_argument(
    "--fit",
    dest="fit_output",
    action="store_true",
    help="Prefer the \"fit\" variant of the markdown/HTML output when available",
  )
  parser.add_argument(
    "--output",
    type=pathlib.Path,
    help="Optional path to save the crawl result. When omitted the result is printed to stdout.",
  )
  parser.add_argument("--verbose-browser", action="store_true", help="Enable verbose Crawl4AI browser logging")
  parser.add_argument("--verbose", action="store_true", help="Enable verbose runner logging")
  args = parser.parse_args(argv)
  return CrawlOptions(
    url=args.url,
    headless=args.headless,
    cache=args.cache,
    only_text=args.only_text,
    selector=args.selector,
    fit_output=args.fit_output,
    format=args.format,
    output=args.output,
    verbose_browser=args.verbose_browser,
    verbose_runner=args.verbose,
  )


async def _run_crawl(options: CrawlOptions, deps: Crawl4AIDependencies) -> str:
  browser_config = deps.BrowserConfig(headless=options.headless, verbose=options.verbose_browser)
  run_config = deps.CrawlerRunConfig(
    cache_mode=deps.CacheMode.ENABLED if options.cache else deps.CacheMode.BYPASS,
    only_text=options.only_text,
    css_selector=options.selector,
  )
  if options.format == "markdown":
    run_config.markdown_generator = deps.DefaultMarkdownGenerator()
  async with deps.AsyncWebCrawler(config=browser_config) as crawler:
    result = await crawler.arun(url=options.url, config=run_config)
  if not result.success:
    raise RuntimeError(f"Crawl failed: {result.error_message or 'unknown error'}")
  if options.format == "markdown":
    if result.markdown is None:
      raise RuntimeError("Crawl succeeded but markdown content was not produced.")
    if options.fit_output and result.markdown.fit_markdown:
      return result.markdown.fit_markdown
    return result.markdown.raw_markdown
  if options.fit_output and result.fit_html:
    return result.fit_html
  return result.html


def _emit_result(result: str, destination: Optional[pathlib.Path]) -> None:
  if destination is None:
    print(result)
    return
  destination.write_text(result, encoding="utf-8")
  LOGGER.info("Saved crawl output", extra={"path": str(destination)})


def main(argv: Optional[list[str]] = None) -> int:
  options = _parse_args(argv)
  _configure_logging(options.verbose_runner)
  try:
    deps = _load_crawl4ai()
  except DependencyError as exc:
    LOGGER.error("%s", exc)
    return 2
  try:
    result = asyncio.run(_run_crawl(options, deps))
  except Exception as exc:  # pragma: no cover - runtime errors depend on external websites
    LOGGER.error("Crawl failed", exc_info=exc)
    return 1
  _emit_result(result, options.output)
  return 0


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
  raise SystemExit(main())
