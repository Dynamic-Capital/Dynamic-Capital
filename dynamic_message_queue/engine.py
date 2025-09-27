"""Adaptive in-memory message queue with dynamic retry and visibility windows."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from heapq import heappop, heappush
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional
from uuid import uuid4

__all__ = [
    "DeadLetterMessage",
    "DynamicMessageQueue",
    "Message",
    "QueueMetrics",
]


# ---------------------------------------------------------------------------
# helper utilities
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tz(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_topic(topic: str) -> str:
    cleaned = topic.strip().lower()
    if not cleaned:
        raise ValueError("topic must not be empty")
    return cleaned


def _coerce_delay(value: float | int | None, *, allow_zero: bool = True) -> float:
    if value is None:
        return 0.0
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:
        raise TypeError("delay must be numeric") from exc
    if numeric < 0:
        raise ValueError("delay must be non-negative")
    if not allow_zero and numeric == 0:
        raise ValueError("delay must be strictly positive")
    return numeric


def _coerce_positive(value: float | int | None, *, default: float) -> float:
    if value is None:
        numeric = default
    else:
        try:
            numeric = float(value)
        except (TypeError, ValueError) as exc:
            raise TypeError("value must be numeric") from exc
    if numeric <= 0:
        raise ValueError("value must be positive")
    return numeric


def _coerce_attempts(value: int | None, *, default: int) -> int:
    if value is None:
        attempts = default
    else:
        attempts = int(value)
    if attempts <= 0:
        raise ValueError("max_attempts must be positive")
    return attempts


# ---------------------------------------------------------------------------
# dataclasses
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class Message:
    """Represents a queued message awaiting processing."""

    id: str
    topic: str
    payload: Any
    attempts: int = 0
    max_attempts: int = 5
    created_at: datetime = field(default_factory=_utcnow)
    available_at: datetime = field(default_factory=_utcnow)
    ack_deadline: datetime | None = None
    metadata: Mapping[str, Any] | None = None
    last_error: str | None = None

    def __post_init__(self) -> None:
        self.topic = _normalise_topic(self.topic)
        self.created_at = _ensure_tz(self.created_at)
        self.available_at = _ensure_tz(self.available_at)
        if self.ack_deadline is not None:
            self.ack_deadline = _ensure_tz(self.ack_deadline)
        if self.attempts < 0:
            raise ValueError("attempts must be non-negative")
        self.max_attempts = _coerce_attempts(self.max_attempts, default=1)

    @property
    def is_reserved(self) -> bool:
        return self.ack_deadline is not None

    def as_dict(self) -> MutableMapping[str, Any]:
        return {
            "id": self.id,
            "topic": self.topic,
            "payload": self.payload,
            "attempts": self.attempts,
            "max_attempts": self.max_attempts,
            "created_at": self.created_at,
            "available_at": self.available_at,
            "ack_deadline": self.ack_deadline,
            "metadata": dict(self.metadata) if self.metadata else None,
            "last_error": self.last_error,
        }


@dataclass(slots=True)
class DeadLetterMessage:
    """Container describing a permanently failed message."""

    id: str
    topic: str
    payload: Any
    attempts: int
    last_error: str | None
    failed_at: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, Any]:
        return {
            "id": self.id,
            "topic": self.topic,
            "payload": self.payload,
            "attempts": self.attempts,
            "last_error": self.last_error,
            "failed_at": self.failed_at,
        }


@dataclass(slots=True)
class QueueMetrics:
    """Snapshot describing current queue utilisation for a topic."""

    topic: str
    total_messages: int
    pending_messages: int
    inflight_messages: int
    dead_lettered: int
    oldest_available_at: datetime | None


# ---------------------------------------------------------------------------
# core engine
# ---------------------------------------------------------------------------


class DynamicMessageQueue:
    """In-memory message queue with adaptive retry management."""

    def __init__(
        self,
        *,
        default_ack_timeout: float = 30.0,
        default_max_attempts: int = 5,
    ) -> None:
        self._default_ack_timeout = _coerce_positive(
            default_ack_timeout, default=30.0
        )
        self._default_max_attempts = _coerce_attempts(
            default_max_attempts, default=5
        )
        self._queues: Dict[str, List[tuple[float, str]]] = defaultdict(list)
        self._messages: Dict[str, Message] = {}
        self._inflight: Dict[str, Message] = {}
        self._dead_letter: Dict[str, List[DeadLetterMessage]] = defaultdict(list)

    # ------------------------------------------------------------------
    # enqueueing
    # ------------------------------------------------------------------

    def enqueue(
        self,
        topic: str,
        payload: Any,
        *,
        delay: float | int | None = None,
        max_attempts: int | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> Message:
        topic = _normalise_topic(topic)
        delay_seconds = _coerce_delay(delay)
        available_at = _utcnow() + timedelta(seconds=delay_seconds)
        message = Message(
            id=uuid4().hex,
            topic=topic,
            payload=payload,
            attempts=0,
            max_attempts=_coerce_attempts(
                max_attempts, default=self._default_max_attempts
            ),
            created_at=_utcnow(),
            available_at=available_at,
            metadata=dict(metadata) if metadata else None,
        )
        self._messages[message.id] = message
        heappush(self._queues[topic], (available_at.timestamp(), message.id))
        return message

    # ------------------------------------------------------------------
    # reserving and acknowledging
    # ------------------------------------------------------------------

    def reserve(
        self,
        topic: str,
        *,
        ack_timeout: float | int | None = None,
        now: datetime | None = None,
    ) -> Optional[Message]:
        topic = _normalise_topic(topic)
        current_time = _ensure_tz(now or _utcnow())
        self._release_expired(current_time)
        queue = self._queues.get(topic)
        if not queue:
            return None
        while queue:
            available_at_ts, message_id = queue[0]
            message = self._messages.get(message_id)
            if message is None:
                heappop(queue)
                continue
            if available_at_ts > current_time.timestamp():
                return None
            heappop(queue)
            message.attempts += 1
            timeout = _coerce_positive(
                ack_timeout, default=self._default_ack_timeout
            )
            message.ack_deadline = current_time + timedelta(seconds=timeout)
            self._inflight[message.id] = message
            return message
        return None

    def ack(self, message_id: str) -> None:
        message = self._inflight.pop(message_id, None)
        if message is None:
            raise KeyError(f"message {message_id} is not inflight")
        self._messages.pop(message_id, None)

    def nack(
        self,
        message_id: str,
        *,
        delay: float | int | None = None,
        requeue: bool = True,
        error: str | None = None,
        now: datetime | None = None,
    ) -> None:
        message = self._inflight.pop(message_id, None)
        if message is None:
            raise KeyError(f"message {message_id} is not inflight")
        message.last_error = error
        current_time = _ensure_tz(now or _utcnow())
        if requeue and message.attempts < message.max_attempts:
            delay_seconds = _coerce_delay(delay)
            message.available_at = current_time + timedelta(seconds=delay_seconds)
            message.ack_deadline = None
            heappush(
                self._queues[message.topic],
                (message.available_at.timestamp(), message.id),
            )
        else:
            self._move_to_dead_letter(message)

    def extend_ack_deadline(
        self,
        message_id: str,
        *,
        extension: float | int,
    ) -> None:
        message = self._inflight.get(message_id)
        if message is None:
            raise KeyError(f"message {message_id} is not inflight")
        seconds = _coerce_positive(extension, default=1.0)
        base = message.ack_deadline or _utcnow()
        message.ack_deadline = base + timedelta(seconds=seconds)

    # ------------------------------------------------------------------
    # metrics and inspection
    # ------------------------------------------------------------------

    def metrics(self, topic: str) -> QueueMetrics:
        topic = _normalise_topic(topic)
        pending = 0
        oldest: datetime | None = None
        for ts, message_id in list(self._queues.get(topic, [])):
            message = self._messages.get(message_id)
            if message is None:
                continue
            pending += 1
            if oldest is None or ts < oldest.timestamp():
                oldest = message.available_at
        inflight = sum(
            1 for message in self._inflight.values() if message.topic == topic
        )
        dead = len(self._dead_letter.get(topic, []))
        total = pending + inflight + dead
        return QueueMetrics(
            topic=topic,
            total_messages=total,
            pending_messages=pending,
            inflight_messages=inflight,
            dead_lettered=dead,
            oldest_available_at=oldest,
        )

    def pending_messages(self, topic: str) -> Iterable[Message]:
        topic = _normalise_topic(topic)
        for _, message_id in sorted(self._queues.get(topic, [])):
            message = self._messages.get(message_id)
            if message is not None:
                yield message

    def inflight_messages(self, topic: str | None = None) -> Iterable[Message]:
        target_topic = _normalise_topic(topic) if topic is not None else None
        for message in self._inflight.values():
            if target_topic is None or message.topic == target_topic:
                yield message

    def dead_letter_messages(self, topic: str | None = None) -> Iterable[DeadLetterMessage]:
        if topic is None:
            for messages in self._dead_letter.values():
                for dead in messages:
                    yield dead
        else:
            target_topic = _normalise_topic(topic)
            yield from self._dead_letter.get(target_topic, [])

    # ------------------------------------------------------------------
    # maintenance
    # ------------------------------------------------------------------

    def purge_topic(self, topic: str) -> None:
        topic = _normalise_topic(topic)
        for _, message_id in list(self._queues.get(topic, [])):
            self._messages.pop(message_id, None)
            self._inflight.pop(message_id, None)
        self._queues.pop(topic, None)
        self._dead_letter.pop(topic, None)

    def clear_all(self) -> None:
        self._queues.clear()
        self._messages.clear()
        self._inflight.clear()
        self._dead_letter.clear()

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------

    def _release_expired(self, now: datetime) -> None:
        expired: List[str] = []
        for message_id, message in list(self._inflight.items()):
            if message.ack_deadline is None:
                continue
            if now >= message.ack_deadline:
                expired.append(message_id)
        for message_id in expired:
            message = self._inflight.pop(message_id, None)
            if message is None:
                continue
            if message.attempts >= message.max_attempts:
                self._move_to_dead_letter(message)
            else:
                message.ack_deadline = None
                message.available_at = now
                heappush(
                    self._queues[message.topic],
                    (message.available_at.timestamp(), message.id),
                )

    def _move_to_dead_letter(self, message: Message) -> None:
        self._messages.pop(message.id, None)
        dead = DeadLetterMessage(
            id=message.id,
            topic=message.topic,
            payload=message.payload,
            attempts=message.attempts,
            last_error=message.last_error,
        )
        self._dead_letter[message.topic].append(dead)

