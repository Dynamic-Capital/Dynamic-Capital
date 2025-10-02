"""Agents that orchestrate crawlers, builders, and the fine-tune model."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping

from .builder import FineTuneRecordBuilder
from .crawler import FineTuneCrawler
from .model import DynamicFineTuneModel


@dataclass(slots=True)
class DynamicFineTuneAgent:
    """Pipeline-friendly agent that glues together ingestion primitives."""

    model: DynamicFineTuneModel
    builder: FineTuneRecordBuilder = field(default_factory=FineTuneRecordBuilder)

    def ingest_payloads(self, payloads: Iterable[Mapping[str, object]]) -> int:
        records = [self.builder.from_payload(payload) for payload in payloads]
        return self.model.ingest(records)

    def ingest_from_crawler(self, crawler: FineTuneCrawler) -> int:
        accepted = 0
        for source, payload in crawler.crawl():
            mapping: Mapping[str, object]
            if isinstance(payload, Mapping):
                data = dict(payload)
                data.setdefault("source", source)
                mapping = data
            else:
                record = payload
                mapping = {
                    "prompt": record.prompt,
                    "completion": record.completion,
                    "source": record.source or source,
                    "quality": record.quality,
                    "priority": record.priority,
                    "tags": record.tags,
                    "metadata": record.metadata,
                    "created_at": record.created_at,
                    "token_estimate": record.token_estimate,
                }
            accepted += self.ingest_payloads([mapping])
        return accepted

    def harvest(self, **kwargs):
        return self.model.harvest(**kwargs)

    def stats(self):
        return self.model.stats()

