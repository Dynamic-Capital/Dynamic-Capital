"""Worker that pulls queued signals and executes them in MT5."""
from __future__ import annotations

import logging
import signal
import threading
import time
from typing import Optional

from src.config.settings import Settings
from src.services.mt5_service import MT5Service
from src.services.risk import RiskManager
from src.services.supabase_client import SupabaseClient, SupabaseError
from src.utils.redis_queue import QueueItem, RedisQueue

logger = logging.getLogger(__name__)


class MT5Worker:
    def __init__(
        self,
        settings: Settings,
        queue: RedisQueue,
        client: Optional[SupabaseClient] = None,
    ) -> None:
        self.settings = settings
        self.queue = queue
        self.client = client
        self.stop_event = threading.Event()
        self.risk = RiskManager(settings)
        self.mt5 = MT5Service(settings)
        self._current_backoff = settings.backoff_initial

    def start(self) -> None:
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)
        logger.info("MT5 worker starting")
        self.run()

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                item = self.queue.pop_for_processing(timeout=5)
                self.queue.heartbeat("worker")
                if item is None:
                    continue
                self._current_backoff = self.settings.backoff_initial
                self._process_item(item)
            except SupabaseError as exc:
                logger.error("Supabase error while processing trade: %s", exc)
                self._sleep_with_backoff()
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.exception("Unexpected error in MT5 worker: %s", exc)
                self._sleep_with_backoff()

    def _process_item(self, item: QueueItem) -> None:
        signal_data = item.payload
        signal_id = signal_data.get("id")
        try:
            if self.client:
                self.client.mark_in_progress(signal_id)
            plan = self.risk.build_execution_plan(signal_data)
            result = self.mt5.execute(plan)
            if self.client:
                self.client.mark_filled(signal_id, result.ticket, result.price, result.volume)
            logger.info(
                "Executed signal %s at %.5f lot %.2f (ticket %s)",
                signal_id,
                result.price,
                result.volume,
                result.ticket,
            )
            self.queue.ack(item)
        except SupabaseError:
            self.queue.requeue(item)
            raise
        except Exception as exc:
            logger.error("Trade execution failed for signal %s: %s", signal_id, exc)
            if self.client and signal_id is not None:
                try:
                    self.client.mark_error(signal_id, str(exc))
                except SupabaseError as supa_exc:
                    logger.error("Failed to mark signal %s as error: %s", signal_id, supa_exc)
            self.queue.requeue(item)
            time.sleep(1)

    def stop(self) -> None:
        self.stop_event.set()
        self.mt5.shutdown()

    def _sleep_with_backoff(self) -> None:
        logger.info("Worker backing off for %.1fs", self._current_backoff)
        time.sleep(self._current_backoff)
        self._current_backoff = min(self._current_backoff * 2, self.settings.backoff_max)

    def _handle_signal(self, signum, frame) -> None:  # pragma: no cover - signal handling
        logger.info("Received signal %s, stopping worker", signum)
        self.stop()


__all__ = ["MT5Worker"]
