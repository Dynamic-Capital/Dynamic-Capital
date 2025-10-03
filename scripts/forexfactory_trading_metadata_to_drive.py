"""Extract Forex Factory trading metadata or educational content.

The calendar scraper attempts to load the public calendar page from
``https://www.forexfactory.com/`` by default. When the optional
``cloudscraper`` dependency is installed the script can bypass the
Cloudflare challenge that protects the site. Otherwise the caller can
provide a direct JSON feed URL via ``--calendar-url``.

Educational content is gathered by loading the Forex Factory news page,
applying the built-in "Educational News" filter, and parsing the
resulting headlines. This mode requires ``beautifulsoup4`` for HTML
parsing in addition to ``cloudscraper`` when Cloudflare protection is
enabled.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable, Mapping, MutableMapping, Sequence
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from bs4.element import Tag

from dynamic_corpus_extraction.google_drive import parse_drive_share_link

DEFAULT_CALENDAR_URL = "https://www.forexfactory.com/calendar?week=this"
DEFAULT_NEWS_URL = "https://www.forexfactory.com/news"
DEFAULT_FILE_NAME_TEMPLATES = {
    "calendar": "forexfactory-trading-metadata-{timestamp}.json",
    "education": "forexfactory-education-content-{timestamp}.json",
}

_IMPACT_PRIORITY = {"Holiday": 0, "Low": 1, "Medium": 2, "High": 3}

_CALENDAR_JSON_PATTERN = re.compile(
    r"""https://[\w./-]*ff_calendar_[^"'\s]+\.json(?:\?[^"'\s]*)?""",
    re.IGNORECASE,
)

_EDUCATIONAL_CATEGORY_ID = "174"
_EDUCATION_FORMAT_CHOICES = ("headline", "threads", "large")
_EDUCATION_SORT_CHOICES = (
    "latest",
    "hottest",
    "latestreplies",
    "mostreplied",
    "mostviewed",
    "latestliked",
    "mostliked",
)
_EDUCATION_PERIOD_CHOICES = (
    "last12h",
    "last24h",
    "last3d",
    "last7d",
    "last30d",
)


@dataclass(slots=True)
class TradingEvent:
    """Normalised representation of a Forex Factory calendar entry."""

    title: str
    country: str
    timestamp: str
    impact: str
    forecast: str | None
    previous: str | None
    actual: str | None

    @classmethod
    def from_payload(cls, payload: Mapping[str, object]) -> "TradingEvent" | None:
        title = str(payload.get("title", "")).strip()
        country = str(payload.get("country", "")).strip()
        date_text = str(payload.get("date", "")).strip()
        impact = str(payload.get("impact", "")).strip() or "Low"
        if not title or not country or not date_text:
            return None

        forecast = _clean_optional_text(payload.get("forecast"))
        previous = _clean_optional_text(payload.get("previous"))
        actual = _clean_optional_text(payload.get("actual"))

        return cls(
            title=title,
            country=country,
            timestamp=date_text,
            impact=impact,
            forecast=forecast,
            previous=previous,
            actual=actual,
        )

    def to_json(self) -> MutableMapping[str, object]:
        data: MutableMapping[str, object] = {
            "title": self.title,
            "country": self.country,
            "timestamp": self.timestamp,
            "impact": self.impact,
        }
        if self.forecast is not None:
            data["forecast"] = self.forecast
        if self.previous is not None:
            data["previous"] = self.previous
        if self.actual is not None:
            data["actual"] = self.actual
        return data


@dataclass(slots=True)
class EducationalStory:
    """Normalised representation of an educational Forex Factory article."""

    story_id: str
    title: str
    forex_factory_url: str
    published_at: str
    summary: str | None
    source_name: str | None
    source_domain: str | None
    source_url: str | None

    @classmethod
    def from_element(cls, element: Tag, *, base_url: str) -> "EducationalStory" | None:
        classes = element.get("class", [])
        if "flexposts__story" not in classes:
            return None

        story_id = element.get("data-story-id", "").strip()
        if not story_id:
            return None

        title_link = element.select_one("div.flexposts__story-title a")
        if title_link is None:
            return None

        title = title_link.get_text(strip=True)
        if not title:
            return None

        summary = (title_link.get("title") or "").strip() or None
        internal_href = title_link.get("href") or ""
        forex_factory_url = urljoin(base_url, internal_href)

        timestamp_raw = element.get("data-timestamp")
        published_at = _coerce_timestamp(timestamp_raw)

        source_link = element.select_one("span.flexposts__caption a[data-source]")
        source_name = None
        source_domain = None
        source_url = None
        if source_link is not None:
            source_text = source_link.get_text(strip=True)
            source_name = source_text.removeprefix("From ").strip() or None
            source_domain = (source_link.get("data-source") or "").strip() or None
            source_href = source_link.get("href") or ""
            source_url = urljoin(base_url, source_href) if source_href else None

        return cls(
            story_id=story_id,
            title=title,
            forex_factory_url=forex_factory_url,
            published_at=published_at,
            summary=summary,
            source_name=source_name,
            source_domain=source_domain,
            source_url=source_url,
        )

    def to_json(self) -> MutableMapping[str, object]:
        data: MutableMapping[str, object] = {
            "story_id": self.story_id,
            "title": self.title,
            "forex_factory_url": self.forex_factory_url,
            "published_at": self.published_at,
        }
        if self.summary:
            data["summary"] = self.summary
        if self.source_name:
            data["source_name"] = self.source_name
        if self.source_domain:
            data["source_domain"] = self.source_domain
        if self.source_url:
            data["source_url"] = self.source_url
        return data


def _clean_optional_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _coerce_timestamp(raw_timestamp: object) -> str:
    if isinstance(raw_timestamp, str):
        raw_timestamp = raw_timestamp.strip()
    try:
        timestamp = int(raw_timestamp)
    except (TypeError, ValueError):
        return datetime.now(tz=UTC).isoformat()
    return datetime.fromtimestamp(timestamp, tz=UTC).isoformat()


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Fetch Forex Factory calendar metadata or educational content, "
            "normalise the results, and optionally upload the JSON document to "
            "Google Drive."
        )
    )
    parser.add_argument(
        "--mode",
        choices=("calendar", "education"),
        default="calendar",
        help=(
            "Dataset to extract: 'calendar' collects economic events while "
            "'education' gathers educational news and analysis."
        ),
    )
    parser.add_argument(
        "--calendar-url",
        default=DEFAULT_CALENDAR_URL,
        help=(
            "Forex Factory calendar page or JSON endpoint to query. When a HTML"
            " page is supplied the script will extract the embedded JSON feed"
            " automatically."
        ),
    )
    parser.add_argument(
        "--news-url",
        default=DEFAULT_NEWS_URL,
        help=(
            "Forex Factory news listing used when --mode=education. The scraper "
            "loads the page and applies the educational filter automatically."
        ),
    )
    parser.add_argument(
        "--min-impact",
        choices=sorted(_IMPACT_PRIORITY, key=_IMPACT_PRIORITY.get),
        default="Low",
        help="Minimum impact level to retain in the exported dataset.",
    )
    parser.add_argument(
        "--countries",
        nargs="*",
        default=None,
        help="Optional list of currency codes to filter on (e.g. USD EUR GBP).",
    )
    parser.add_argument(
        "--education-format",
        choices=_EDUCATION_FORMAT_CHOICES,
        default="headline",
        help=(
            "Display format to request when fetching educational stories. "
            "'headline' yields compact article entries."
        ),
    )
    parser.add_argument(
        "--education-sort",
        choices=_EDUCATION_SORT_CHOICES,
        default="latest",
        help="Sort order applied to the educational feed (e.g. latest or mostliked).",
    )
    parser.add_argument(
        "--education-period",
        choices=_EDUCATION_PERIOD_CHOICES,
        default="last30d",
        help="Time window to apply when gathering educational content.",
    )
    parser.add_argument(
        "--education-limit",
        type=int,
        default=None,
        help="Optional cap on the number of educational stories returned.",
    )
    parser.add_argument(
        "--access-token",
        help="OAuth access token authorised for the Google Drive API.",
    )
    parser.add_argument(
        "--folder-id",
        help="Target Google Drive folder identifier where the file will be stored.",
    )
    parser.add_argument(
        "--share-link",
        help="Google Drive folder share link; used when --folder-id is not provided.",
    )
    parser.add_argument(
        "--file-name",
        help=(
            "Optional override for the uploaded file name. Defaults to a timestamped "
            "slug when omitted."
        ),
    )
    parser.add_argument(
        "--description",
        help="Optional description applied to the file stored in Google Drive.",
    )
    parser.add_argument(
        "--make-public",
        action="store_true",
        help="Grant reader permissions to anyone with the link after upload.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional local file path where the JSON payload will also be stored.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="Timeout (in seconds) applied to network requests.",
    )
    parser.add_argument(
        "--skip-upload",
        action="store_true",
        help="Fetch and optionally store the JSON locally without uploading to Drive.",
    )
    return parser.parse_args(argv)


def _resolve_folder_id(folder_id: str | None, share_link: str | None) -> str:
    if folder_id:
        return folder_id.strip()
    if not share_link:
        raise SystemExit("Either --folder-id or --share-link must be provided for upload.")
    target_type, identifier = parse_drive_share_link(share_link)
    if target_type != "folder":
        raise SystemExit("The provided share link does not reference a Google Drive folder.")
    return identifier


def _fetch_calendar(url: str, *, timeout: float) -> Sequence[Mapping[str, object]]:
    session, using_scraper = _make_forexfactory_session(url)
    response = session.get(url, timeout=timeout)
    if response.status_code != requests.codes.ok:
        hint = ""
        if (not using_scraper) and "forexfactory.com" in url:
            hint = (
                " Consider installing the 'cloudscraper' package to bypass"
                " Cloudflare challenges when hitting Forex Factory pages."
            )
        raise SystemExit(
            f"Failed to fetch Forex Factory data: HTTP {response.status_code}.{hint}"
        )

    content_type = response.headers.get("Content-Type", "").lower()
    if "json" in content_type or url.lower().endswith(".json"):
        return _coerce_calendar_payload(response.json())

    feed_url = _extract_calendar_feed_url(response.text)
    if feed_url is None:
        raise SystemExit(
            "Unable to locate the Forex Factory calendar JSON feed within the"
            " provided HTML page."
        )

    feed_response = session.get(feed_url, timeout=timeout)
    if feed_response.status_code != requests.codes.ok:
        raise SystemExit(
            "Failed to download Forex Factory calendar feed: HTTP "
            f"{feed_response.status_code}"
        )
    return _coerce_calendar_payload(feed_response.json())


def _coerce_calendar_payload(payload: object) -> Sequence[Mapping[str, object]]:
    if not isinstance(payload, Sequence):
        raise SystemExit("Unexpected payload received from Forex Factory")
    return payload


def _extract_calendar_feed_url(html: str) -> str | None:
    match = _CALENDAR_JSON_PATTERN.search(html)
    if match:
        return match.group(0)
    return None


def _fetch_education_news(
    news_url: str,
    *,
    timeout: float,
    education_format: str,
    education_sort: str,
    education_period: str,
    limit: int | None,
) -> list[EducationalStory]:
    session, using_scraper = _make_forexfactory_session(news_url)
    response = session.get(news_url, timeout=timeout)
    if response.status_code != requests.codes.ok:
        hint = ""
        if (not using_scraper) and "forexfactory.com" in news_url:
            hint = (
                " Consider installing the 'cloudscraper' package to bypass"
                " Cloudflare challenges when hitting Forex Factory pages."
            )
        raise SystemExit(
            f"Failed to load Forex Factory news page: HTTP {response.status_code}.{hint}"
        )

    soup = BeautifulSoup(response.text, "html.parser")
    form = soup.find("form", {"action": "flex.php", "method": "post"})
    if form is None:
        raise SystemExit("Unable to locate the Forex Factory news filter form.")

    form_data: MutableMapping[str, str] = {}
    for input_el in form.find_all("input"):
        name = input_el.get("name")
        if not name:
            continue
        input_type = (input_el.get("type") or "").lower()
        if input_type == "hidden":
            form_data[name] = input_el.get("value", "")

    if not form_data:
        raise SystemExit("Forex Factory news form did not provide the expected hidden inputs.")

    form_data["flex[News_newsLeft1][news]"] = _EDUCATIONAL_CATEGORY_ID
    form_data["flex[News_newsLeft1][format]"] = education_format
    form_data["flex[News_newsLeft1][sort]"] = education_sort
    form_data["flex[News_newsLeft1][period]"] = education_period

    post_url = urljoin(news_url, "/flex.php")
    post_response = session.post(post_url, data=form_data, timeout=timeout)
    if post_response.status_code != requests.codes.ok:
        raise SystemExit(
            "Failed to download Forex Factory education feed: HTTP "
            f"{post_response.status_code}"
        )

    try:
        html_fragment = ET.fromstring(post_response.content).text or ""
    except ET.ParseError as exc:  # pragma: no cover - defensive branch
        raise SystemExit(f"Unable to parse Forex Factory response: {exc}") from exc

    snippet_soup = BeautifulSoup(html_fragment, "html.parser")
    feed = snippet_soup.select_one("ul.flexposts")
    if feed is None:
        raise SystemExit(
            "Unable to locate educational stories within the Forex Factory response."
        )

    stories: list[EducationalStory] = []
    for item in feed.select("li.flexposts__story"):
        story = EducationalStory.from_element(item, base_url=news_url)
        if story is None:
            continue
        stories.append(story)
        if limit is not None and limit > 0 and len(stories) >= limit:
            break
    return stories


def _make_forexfactory_session(url: str) -> tuple[requests.Session, bool]:
    if "forexfactory.com" not in url.lower():
        return requests.Session(), False
    try:  # pragma: no cover - optional dependency branch
        import cloudscraper

        scraper = cloudscraper.create_scraper(
            delay=5,
            browser={"browser": "firefox", "platform": "windows", "mobile": False},
        )
        return scraper, True
    except ImportError:  # pragma: no cover - optional dependency branch
        return requests.Session(), False


def _filter_events(
    events: Iterable[Mapping[str, object]],
    *,
    min_impact: str,
    countries: Sequence[str] | None,
) -> list[TradingEvent]:
    threshold = _IMPACT_PRIORITY.get(min_impact, 0)
    allowed_countries = {country.upper() for country in countries or ()}
    normalised: list[TradingEvent] = []
    for entry in events:
        candidate = TradingEvent.from_payload(entry)
        if candidate is None:
            continue
        impact_rank = _IMPACT_PRIORITY.get(candidate.impact, 0)
        if impact_rank < threshold:
            continue
        if allowed_countries and candidate.country.upper() not in allowed_countries:
            continue
        normalised.append(candidate)
    normalised.sort(key=lambda item: item.timestamp)
    return normalised


def _build_calendar_payload(
    events: Sequence[TradingEvent],
    *,
    source_url: str,
    min_impact: str,
    countries: Sequence[str] | None,
) -> MutableMapping[str, object]:
    return {
        "fetched_at": datetime.now(tz=UTC).isoformat(),
        "source": source_url,
        "filters": {
            "min_impact": min_impact,
            "countries": sorted({country.upper() for country in countries or ()}),
        },
        "event_count": len(events),
        "events": [event.to_json() for event in events],
    }


def _build_education_payload(
    stories: Sequence[EducationalStory],
    *,
    source_url: str,
    education_format: str,
    education_sort: str,
    education_period: str,
    limit: int | None,
) -> MutableMapping[str, object]:
    return {
        "fetched_at": datetime.now(tz=UTC).isoformat(),
        "source": source_url,
        "category": "Educational News",
        "filters": {
            "format": education_format,
            "sort": education_sort,
            "period": education_period,
            "limit": limit,
        },
        "story_count": len(stories),
        "stories": [story.to_json() for story in stories],
    }


def _default_file_name(mode: str) -> str:
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%SZ")
    template = DEFAULT_FILE_NAME_TEMPLATES.get(
        mode,
        DEFAULT_FILE_NAME_TEMPLATES["calendar"],
    )
    return template.format(timestamp=timestamp)


def _maybe_write_local(payload: Mapping[str, object], output: Path | None) -> None:
    if output is None:
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)


def _upload_json_to_drive(
    *,
    access_token: str,
    payload: Mapping[str, object],
    folder_id: str,
    file_name: str,
    description: str | None,
    make_public: bool,
    timeout: float,
) -> Mapping[str, object]:
    boundary = uuid.uuid4().hex
    metadata: MutableMapping[str, object] = {
        "name": file_name,
        "mimeType": "application/json",
        "parents": [folder_id],
    }
    if description:
        metadata["description"] = description

    multipart_body = (
        f"--{boundary}\r\n"
        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{json.dumps(metadata, ensure_ascii=False)}\r\n"
        f"--{boundary}\r\n"
        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
        f"{json.dumps(payload, ensure_ascii=False)}\r\n"
        f"--{boundary}--\r\n"
    )

    headers = {
        "Authorization": f"Bearer {access_token.strip()}",
        "Content-Type": f"multipart/related; boundary={boundary}",
    }
    upload_url = "https://www.googleapis.com/upload/drive/v3/files"
    params = {
        "uploadType": "multipart",
        "supportsAllDrives": "true",
    }
    response = requests.post(
        upload_url,
        params=params,
        data=multipart_body.encode("utf-8"),
        headers=headers,
        timeout=timeout,
    )
    if response.status_code not in (requests.codes.ok, requests.codes.created):
        raise SystemExit(
            "Google Drive upload failed with status "
            f"{response.status_code}: {response.text}"
        )

    metadata_response = response.json()
    file_id = metadata_response.get("id")
    if make_public and file_id:
        _set_public_permission(access_token, file_id, timeout=timeout)
    return metadata_response


def _set_public_permission(access_token: str, file_id: str, *, timeout: float) -> None:
    permission_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions"
    headers = {
        "Authorization": f"Bearer {access_token.strip()}",
        "Content-Type": "application/json",
    }
    payload = {"type": "anyone", "role": "reader"}
    response = requests.post(
        permission_url,
        params={"supportsAllDrives": "true"},
        headers=headers,
        json=payload,
        timeout=timeout,
    )
    if response.status_code not in (requests.codes.ok, requests.codes.created):
        raise SystemExit(
            "Failed to update Google Drive permissions: "
            f"HTTP {response.status_code} {response.text}"
        )


def main(argv: Sequence[str] | None = None) -> None:
    args = _parse_args(argv)

    if not args.skip_upload and not args.access_token:
        raise SystemExit("--access-token is required unless --skip-upload is set.")

    if args.skip_upload:
        folder_id = None
    else:
        folder_id = _resolve_folder_id(args.folder_id, args.share_link)

    if args.mode == "education":
        stories = _fetch_education_news(
            args.news_url,
            timeout=args.timeout,
            education_format=args.education_format,
            education_sort=args.education_sort,
            education_period=args.education_period,
            limit=args.education_limit,
        )
        payload = _build_education_payload(
            stories,
            source_url=args.news_url,
            education_format=args.education_format,
            education_sort=args.education_sort,
            education_period=args.education_period,
            limit=args.education_limit,
        )
        dataset_label = "Forex Factory educational content"
    else:
        raw_events = _fetch_calendar(args.calendar_url, timeout=args.timeout)
        events = _filter_events(
            raw_events,
            min_impact=args.min_impact,
            countries=args.countries,
        )
        payload = _build_calendar_payload(
            events,
            source_url=args.calendar_url,
            min_impact=args.min_impact,
            countries=args.countries,
        )
        dataset_label = "Forex Factory trading metadata"

    _maybe_write_local(payload, args.output)

    if args.skip_upload:
        message = f"Fetched {dataset_label}; skipping Google Drive upload."
        if args.output:
            message += f" Local copy written to '{args.output}'."
        print(message)
        return

    file_name = args.file_name or _default_file_name(args.mode)
    upload_response = _upload_json_to_drive(
        access_token=args.access_token,
        payload=payload,
        folder_id=folder_id,
        file_name=file_name,
        description=args.description,
        make_public=args.make_public,
        timeout=args.timeout,
    )

    print(
        f"Uploaded {dataset_label} to Google Drive as "
        f"'{file_name}' (file id: {upload_response.get('id')})."
    )


if __name__ == "__main__":
    main(sys.argv[1:])
