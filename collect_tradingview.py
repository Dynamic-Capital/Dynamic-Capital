"""Collect TradingView ideas from a profile and forward them to Supabase."""

from __future__ import annotations

import argparse
import dataclasses
import logging
import os
import re
import sys
from typing import Iterable, List, Optional

import requests
try:
  from bs4 import BeautifulSoup
except ModuleNotFoundError as exc:
  raise ModuleNotFoundError(
    "BeautifulSoup is required for HTML parsing. Install it with `pip install beautifulsoup4`.",
  ) from exc

LOGGER = logging.getLogger("tradingview-collector")
BIAS_KEYWORDS = {
  "BUY": {"long", "buy", "accumulate", "bull"},
  "SELL": {"short", "sell", "distribute", "bear"},
}
SYMBOL_PATTERN = re.compile(r"\b([A-Z]{3,6}(?:USD|USDT|JPY|EUR|GBP|CAD|AUD|NZD|CHF|BTC|ETH|XAU|XAG))\b")
DEFAULT_TIMEOUT = 20


@dataclasses.dataclass
class Insight:
  symbol: str
  bias: str
  content: str
  chart_url: str

  def to_payload(self) -> dict[str, str]:
    return {
      "symbol": self.symbol,
      "bias": self.bias,
      "content": self.content,
      "chart_url": self.chart_url,
    }


def _detect_bias(title: str) -> str:
  lowered = title.lower()
  for bias, keywords in BIAS_KEYWORDS.items():
    if any(word in lowered for word in keywords):
      return bias
  return "NEUTRAL"


def _extract_symbol(title: str) -> str:
  match = SYMBOL_PATTERN.search(title.upper())
  if match:
    return match.group(1)
  # Fallback to the first uppercase token
  tokens = [token for token in re.split(r"[^A-Z0-9]", title.upper()) if token]
  return tokens[0] if tokens else "UNKNOWN"


def scrape_tradingview(username: str, *, limit: Optional[int] = None) -> List[Insight]:
  url = f"https://www.tradingview.com/u/{username.strip('/')}/"
  LOGGER.debug("Fetching TradingView ideas", extra={"url": url})
  response = requests.get(url, timeout=DEFAULT_TIMEOUT)
  response.raise_for_status()

  soup = BeautifulSoup(response.text, "html.parser")
  insights: List[Insight] = []
  seen_urls: set[str] = set()

  for anchor in soup.find_all("a", {"class": "tv-widget-idea__title"}):
    title = anchor.text.strip()
    href = anchor.get("href")
    if not href or not title:
      continue

    chart_url = href if href.startswith("http") else f"https://www.tradingview.com{href}"
    if chart_url in seen_urls:
      LOGGER.debug("Skipping duplicate chart URL", extra={"chart_url": chart_url})
      continue

    seen_urls.add(chart_url)
    insights.append(
      Insight(
        symbol=_extract_symbol(title),
        bias=_detect_bias(title),
        content=title,
        chart_url=chart_url,
      ),
    )

    if limit is not None and len(insights) >= limit:
      break

  return insights


def send_to_supabase(
  insights: Iterable[Insight],
  *,
  function_url: str,
  api_key: str,
  dry_run: bool = False,
) -> None:
  headers = {
    "Content-Type": "application/json",
    "apikey": api_key,
    "Authorization": f"Bearer {api_key}",
  }

  for insight in insights:
    payload = insight.to_payload()
    if dry_run:
      LOGGER.info("[DRY-RUN] Prepared insight", extra=payload)
      continue

    try:
      LOGGER.info("Sending insight", extra={"symbol": insight.symbol, "bias": insight.bias})
      response = requests.post(function_url, json=payload, headers=headers, timeout=DEFAULT_TIMEOUT)
      if response.status_code >= 400:
        LOGGER.error(
          "Supabase ingestion failed",
          extra={"status": response.status_code, "body": response.text},
        )
      else:
        LOGGER.debug("Supabase response", extra={"body": response.text})
    except requests.RequestException as exc:  # pragma: no cover - network failures
      LOGGER.exception("Failed to send insight", exc_info=exc)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Scrape TradingView ideas and push to Supabase")
  parser.add_argument("--limit", type=int, default=None, help="Maximum number of ideas to forward")
  parser.add_argument("--dry-run", action="store_true", help="Log insights without sending them")
  return parser.parse_args(argv)


def configure_logging() -> None:
  level = os.getenv("TRADINGVIEW_LOG_LEVEL", "INFO").upper()
  logging.basicConfig(level=level, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


def main(argv: Optional[List[str]] = None) -> int:
  configure_logging()
  args = parse_args(argv)

  username = os.getenv("TRADINGVIEW_USERNAME")
  function_url = os.getenv("SUPABASE_ANALYSIS_FN_URL")
  api_key = os.getenv("SUPABASE_ANON_KEY")

  if not username or not function_url or not api_key:
    LOGGER.error(
      "Missing configuration. Ensure TRADINGVIEW_USERNAME, SUPABASE_ANALYSIS_FN_URL, and SUPABASE_ANON_KEY are set.",
    )
    return 1

  try:
    insights = scrape_tradingview(username, limit=args.limit)
  except requests.HTTPError as exc:
    LOGGER.error("TradingView returned an error", exc_info=exc)
    return 1
  except requests.RequestException as exc:  # pragma: no cover - network issues
    LOGGER.error("Failed to fetch TradingView ideas", exc_info=exc)
    return 1

  if not insights:
    LOGGER.info("No TradingView ideas found", extra={"username": username})
    return 0

  send_to_supabase(insights, function_url=function_url, api_key=api_key, dry_run=args.dry_run)
  return 0


if __name__ == "__main__":
  sys.exit(main())
