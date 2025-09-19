"""Supabase polling worker that pushes signals into Redis."""
from __future__ import annotations

import logging
import signal
import threading
import time

from src.config.settings import Settings
from src.services.supabase_client import SupabaseClient, SupabaseError
from src.utils.redis_queue import RedisQueue

logger = logging.getLogger(__name__)


class SupabaseListener:
    def __init__(self, settings: Settings, client: SupabaseClient, queue: RedisQueue) -> None:
        self.settings = settings
        self.client = client
        self.queue = queue
        self.stop_event = threading.Event()
        self._current_backoff = settings.backoff_initial

    def start(self) -> None:
        logger.info("Supabase listener starting (poll interval %.1fs)", self.settings.supabase_poll_interval)
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)
        self.run()

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                self._poll_once()
                self._current_backoff = self.settings.backoff_initial
                time.sleep(self.settings.supabase_poll_interval)
            except SupabaseError as exc:
                logger.error("Supabase API error: %s", exc)
                self._sleep_with_backoff()
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.exception("Unexpected error in Supabase listener: %s", exc)
                self._sleep_with_backoff()

    def _poll_once(self) -> None:
        self.queue.heartbeat("listener")
        pending = self.client.fetch_pending_signals()
        if not pending:
            logger.debug("No pending signals detected")
            return
        logger.info("Fetched %d pending signals", len(pending))
        for signal in pending:
            if self.stop_event.is_set():
                break
            claimed = self.client.claim_signal(signal.get("id"), self.settings.bridge_node_id)
            if not claimed:
                logger.debug("Signal %s already claimed", signal.get("id"))
                continue
            claimed["bridge_node_id"] = self.settings.bridge_node_id
            claimed["bridge_claimed_at"] = claimed.get("bridge_claimed_at")
            self.queue.enqueue(claimed)
            logger.info("Signal %s enqueued", claimed.get("id"))

    def _sleep_with_backoff(self) -> None:
        logger.info("Backing off for %.1fs", self._current_backoff)
        time.sleep(self._current_backoff)
        self._current_backoff = min(self._current_backoff * 2, self.settings.backoff_max)

    def stop(self) -> None:
        self.stop_event.set()

    def _handle_signal(self, signum, frame) -> None:  # pragma: no cover - signal handling
        logger.info("Received signal %s, shutting down listener", signum)
        self.stop()


__all__ = ["SupabaseListener"]
