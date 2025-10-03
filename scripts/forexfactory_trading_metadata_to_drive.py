"""Extract Forex Factory trading metadata and upload it to Google Drive."""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable, Mapping, MutableMapping, Sequence

import requests

from dynamic_corpus_extraction.google_drive import parse_drive_share_link

DEFAULT_CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
DEFAULT_FILE_NAME_TEMPLATE = "forexfactory-trading-metadata-{timestamp}.json"

_IMPACT_PRIORITY = {"Holiday": 0, "Low": 1, "Medium": 2, "High": 3}


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


def _clean_optional_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Fetch Forex Factory calendar metadata, normalise the trading-focused "
            "fields, and upload the resulting JSON document to Google Drive."
        )
    )
    parser.add_argument(
        "--calendar-url",
        default=DEFAULT_CALENDAR_URL,
        help="Forex Factory calendar JSON endpoint to query.",
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
        "--access-token",
        required=True,
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
    response = requests.get(url, timeout=timeout)
    if response.status_code != requests.codes.ok:
        raise SystemExit(f"Failed to fetch Forex Factory data: HTTP {response.status_code}")
    try:
        payload = response.json()
    except ValueError as error:  # pragma: no cover - defensive guard
        raise SystemExit("Response from Forex Factory was not valid JSON") from error
    if not isinstance(payload, Sequence):
        raise SystemExit("Unexpected payload received from Forex Factory")
    return payload


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


def _build_payload(
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


def _default_file_name() -> str:
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%SZ")
    return DEFAULT_FILE_NAME_TEMPLATE.format(timestamp=timestamp)


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

    folder_id = _resolve_folder_id(args.folder_id, args.share_link)

    raw_events = _fetch_calendar(args.calendar_url, timeout=args.timeout)
    events = _filter_events(raw_events, min_impact=args.min_impact, countries=args.countries)
    payload = _build_payload(
        events,
        source_url=args.calendar_url,
        min_impact=args.min_impact,
        countries=args.countries,
    )

    _maybe_write_local(payload, args.output)

    file_name = args.file_name or _default_file_name()
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
        "Uploaded Forex Factory trading metadata to Google Drive as "
        f"'{file_name}' (file id: {upload_response.get('id')})."
    )


if __name__ == "__main__":
    main(sys.argv[1:])
