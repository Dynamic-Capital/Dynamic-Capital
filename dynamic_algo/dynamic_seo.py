"""Dynamic SEO and geo-targeting playbooks for marketing surfaces.

This module distils location intelligence and positioning inputs into a
structured SEO plan.  It is intentionally framework-agnostic so both the web
front-end and content automation flows can request consistent metadata blocks.

Two high-level abstractions are provided:

``GeoSignal``
    Normalises geography payloads originating from product analytics, CRM
    enrichment, or manual overrides.  It produces human-friendly labels,
    keyword variations, and schema.org compatible address structures.

``DynamicSEOAlgo``
    Generates titles, meta descriptions, canonical slugs, and structured data
    assets tailored to the supplied geo-signal and target audience.  The
    algorithm favours deterministic string manipulation to remain easy to audit
    during compliance reviews.
"""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = ["GeoSignal", "SEOPlan", "DynamicSEOAlgo"]

_SLUG_TOKENISER = re.compile(r"[^a-z0-9]+")


def _coerce_text(value: object | None) -> str | None:
    """Return a stripped string for ``value`` when possible."""

    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _dedupe_preserve_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        lowered = value.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        ordered.append(value)
    return ordered


@dataclass(slots=True)
class GeoSignal:
    """Canonical representation of a geo-target used for SEO personalisation."""

    city: str | None = None
    region: str | None = None
    country: str | None = None
    country_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None

    @classmethod
    def from_mapping(cls, payload: Mapping[str, object] | None) -> GeoSignal | None:
        """Return a :class:`GeoSignal` parsed from ``payload`` if available."""

        if not payload:
            return None

        country = _coerce_text(payload.get("country"))
        if not country:
            return None

        city = _coerce_text(payload.get("city"))
        region = _coerce_text(payload.get("region"))
        country_code = _coerce_text(payload.get("country_code"))
        timezone = _coerce_text(payload.get("timezone"))

        latitude = payload.get("latitude")
        longitude = payload.get("longitude")
        try:
            latitude_f = float(latitude) if latitude is not None else None
        except (TypeError, ValueError):  # pragma: no cover - defensive guardrail
            latitude_f = None
        try:
            longitude_f = float(longitude) if longitude is not None else None
        except (TypeError, ValueError):  # pragma: no cover - defensive guardrail
            longitude_f = None

        return cls(
            city=city,
            region=region,
            country=country,
            country_code=country_code.upper() if country_code else None,
            latitude=latitude_f,
            longitude=longitude_f,
            timezone=timezone,
        )

    # ------------------------------------------------------------------ helpers
    @property
    def label(self) -> str:
        """Return the most specific non-empty location label."""

        return self.city or self.region or self.country or ""

    @property
    def locale(self) -> str:
        """Return a best-effort locale code for OpenGraph metadata."""

        if self.country_code:
            return f"en_{self.country_code.upper()}"
        return "en_US"

    def tokens(self) -> tuple[str, ...]:
        """Return unique tokens describing the location hierarchy."""

        parts = [self.city, self.region, self.country]
        return tuple(token for token in _dedupe_preserve_order(filter(None, parts)))

    def keyword_variations(self, base: str) -> list[str]:
        """Return location-enriched keyword phrases for ``base``."""

        variations: list[str] = []
        for token in self.tokens():
            variations.append(f"{base} {token}")
            variations.append(f"{token} {base}")
            variations.append(f"{base} in {token}")
        return _dedupe_preserve_order(variations)

    def schema_extension(self) -> MutableMapping[str, object]:
        """Return schema.org compatible structures for the geo signal."""

        extension: MutableMapping[str, object] = {}

        address: MutableMapping[str, object] = {
            "@type": "PostalAddress",
        }
        if self.city:
            address["addressLocality"] = self.city
        if self.region:
            address["addressRegion"] = self.region
        if self.country:
            address["addressCountry"] = self.country

        if len(address) > 1:
            extension["address"] = address

        if self.latitude is not None and self.longitude is not None:
            extension["geo"] = {
                "@type": "GeoCoordinates",
                "latitude": self.latitude,
                "longitude": self.longitude,
            }

        area_label = self.label or self.country
        if area_label:
            extension["areaServed"] = {
                "@type": "AdministrativeArea",
                "name": area_label,
            }

        if self.timezone:
            extension["timeZone"] = self.timezone

        return extension


@dataclass(slots=True)
class SEOPlan:
    """Container for the generated SEO artefacts."""

    title: str
    description: str
    slug: str
    canonical_url: str
    keywords: tuple[str, ...]
    headline: str
    summary: str
    open_graph: Mapping[str, object]
    twitter_card: Mapping[str, object]
    schema_org: Mapping[str, object]


class DynamicSEOAlgo:
    """Generate SEO payloads from product positioning signals."""

    def __init__(self, *, max_keyword_variations: int = 12, slug_separator: str = "-") -> None:
        if max_keyword_variations <= 0:
            raise ValueError("max_keyword_variations must be positive")
        if not slug_separator:
            raise ValueError("slug_separator cannot be empty")

        self.max_keyword_variations = int(max_keyword_variations)
        self.slug_separator = slug_separator

    # ------------------------------------------------------------------ builders
    def build_plan(
        self,
        *,
        brand: str,
        product: str,
        audience: str | None = None,
        value_props: Sequence[str] | None = None,
        base_keywords: Sequence[str] | None = None,
        geo: GeoSignal | Mapping[str, object] | None = None,
        tone: str = "trusted",
        canonical_base: str | None = None,
    ) -> SEOPlan:
        """Return a structured SEO plan given the supplied inputs."""

        brand_name = brand.strip()
        product_name = product.strip()
        if not brand_name or not product_name:
            raise ValueError("brand and product must be non-empty strings")

        geo_signal = geo if isinstance(geo, GeoSignal) else GeoSignal.from_mapping(geo)

        audience_fragment = f" for {audience.strip()}" if audience else ""
        location_fragment = f" in {geo_signal.label}" if geo_signal and geo_signal.label else ""
        title = f"{product_name}{location_fragment}{audience_fragment} | {brand_name}"

        props = _dedupe_preserve_order([p for p in (value_props or []) if _coerce_text(p)])
        props_fragment = "; ".join(props) if props else f"{brand_name} {product_name} solutions"
        reach_fragment = (
            geo_signal.label if geo_signal and geo_signal.label else "global markets"
        )
        description = (
            f"{brand_name}'s {product_name} empowers{audience_fragment or ' teams'} with {props_fragment}. "
            f"Trusted {tone.strip()} delivery for {reach_fragment}."
        )

        headline = f"{product_name}{location_fragment}".strip()
        summary = (
            f"{brand_name} deploys {product_name.lower()} tailored to {reach_fragment.lower()}"
            f" audiences{audience_fragment or ''}."
        )

        keywords = self._compose_keywords(
            product_name=product_name,
            brand_name=brand_name,
            base_keywords=base_keywords,
            geo_signal=geo_signal,
        )

        slug = self._build_slug(product_name, geo_signal)
        canonical_url = self._build_canonical(canonical_base, slug)

        open_graph = {
            "title": title,
            "description": description,
            "type": "website",
            "site_name": brand_name,
            "locale": geo_signal.locale if geo_signal else "en_US",
            "tags": keywords[: self.max_keyword_variations],
        }

        twitter_card = {
            "card": "summary_large_image",
            "title": title,
            "description": description[: 240],
            "label1": "Audience",
            "data1": audience.strip() if audience else reach_fragment,
            "label2": "Focus",
            "data2": keywords[0] if keywords else product_name,
        }

        schema_org: MutableMapping[str, object] = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness" if geo_signal else "Organization",
            "name": brand_name,
            "description": description,
            "url": canonical_url,
            "knowsAbout": list(keywords[: self.max_keyword_variations]),
            "slogan": title,
        }
        if geo_signal:
            schema_org.update(geo_signal.schema_extension())

        return SEOPlan(
            title=title,
            description=description,
            slug=slug,
            canonical_url=canonical_url,
            keywords=tuple(keywords[: self.max_keyword_variations]),
            headline=headline,
            summary=summary,
            open_graph=open_graph,
            twitter_card=twitter_card,
            schema_org=schema_org,
        )

    # ------------------------------------------------------------------ internals
    def _compose_keywords(
        self,
        *,
        product_name: str,
        brand_name: str,
        base_keywords: Sequence[str] | None,
        geo_signal: GeoSignal | None,
    ) -> list[str]:
        seeds = [
            product_name,
            f"{brand_name} {product_name}",
        ]
        if base_keywords:
            seeds.extend(filter(None, (_coerce_text(keyword) for keyword in base_keywords)))

        enriched: list[str] = []
        for keyword in _dedupe_preserve_order(filter(None, seeds)):
            enriched.append(keyword)
            if geo_signal:
                enriched.extend(geo_signal.keyword_variations(keyword))

        if not geo_signal:
            enriched.append(f"{product_name} solutions")

        return _dedupe_preserve_order(enriched)

    def _build_slug(self, product_name: str, geo_signal: GeoSignal | None) -> str:
        tokens = [product_name]
        if geo_signal:
            tokens.extend(geo_signal.tokens())

        normalised: list[str] = []
        for token in tokens:
            lowered = token.lower()
            slug_token = _SLUG_TOKENISER.sub(self.slug_separator, lowered).strip(self.slug_separator)
            if slug_token:
                normalised.append(slug_token)

        return self.slug_separator.join(_dedupe_preserve_order(normalised))

    def _build_canonical(self, canonical_base: str | None, slug: str) -> str:
        if canonical_base:
            base = canonical_base.rstrip("/")
            return f"{base}/{slug}"
        return f"/{slug}"
