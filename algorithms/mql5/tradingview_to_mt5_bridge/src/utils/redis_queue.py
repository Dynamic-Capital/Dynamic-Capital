"""Redis-backed work queue helpers."""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import redis

from src.utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class QueueItem:
    raw: str
    payload: Dict[str, Any]


class RedisQueue:
    """Simple reliable queue built on Redis lists."""

    def __init__(
        self,
        url: str,
        queue_name: str,
        processing_suffix: str = ":processing",
        metrics_key: Optional[str] = None,
        health_ttl: int = 600,
    ) -> None:
        self.redis = redis.Redis.from_url(url, decode_responses=True)
        self.queue_name = queue_name
        self.processing_queue = f"{queue_name}{processing_suffix}"
        self.metrics_key = metrics_key or f"{queue_name}:health"
        self.health_ttl = health_ttl

    def enqueue(self, payload: Dict[str, Any]) -> str:
        raw = json.dumps(payload)
        self.redis.lpush(self.queue_name, raw)
        self._record_metric(
            {
                "last_enqueued_at": time.time(),
                "queue_depth": self.redis.llen(self.queue_name),
            }
        )
        logger.debug("Enqueued signal %s", payload.get("id"))
        return raw

    def pop_for_processing(self, timeout: int = 5) -> Optional[QueueItem]:
        raw = self.redis.brpoplpush(self.queue_name, self.processing_queue, timeout=timeout)
        if raw is None:
            return None
        payload = json.loads(raw)
        self._record_metric(
            {
                "last_dequeued_at": time.time(),
                "processing_depth": self.redis.llen(self.processing_queue),
            }
        )
        return QueueItem(raw=raw, payload=payload)

    def ack(self, item: QueueItem) -> None:
        self.redis.lrem(self.processing_queue, 1, item.raw)
        self._record_metric(
            {
                "last_ack_at": time.time(),
                "processing_depth": self.redis.llen(self.processing_queue),
            }
        )

    def requeue(self, item: QueueItem) -> None:
        self.redis.lrem(self.processing_queue, 1, item.raw)
        self.redis.rpush(self.queue_name, item.raw)
        self._record_metric({"last_requeue_at": time.time()})

    def heartbeat(self, role: str) -> None:
        self._record_metric({f"{role}_heartbeat": time.time()})

    def _record_metric(self, data: Dict[str, Any]) -> None:
        try:
            self.redis.hset(self.metrics_key, mapping=data)
            if self.health_ttl:
                self.redis.expire(self.metrics_key, self.health_ttl)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("Failed to record queue metrics: %s", exc)


__all__ = ["RedisQueue", "QueueItem"]
