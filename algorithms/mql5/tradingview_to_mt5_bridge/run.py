"""Entry point for managing the TradingView → MT5 bridge services."""
from __future__ import annotations

import argparse
import threading
import time

from src.config.settings import Settings, get_settings
from src.services.supabase_client import SupabaseClient
from src.utils.logging import configure_logging
from src.utils.redis_queue import RedisQueue
from src.workers.mt5_worker import MT5Worker
from src.workers.supabase_listener import SupabaseListener


def build_queue(settings: Settings) -> RedisQueue:
    return RedisQueue(
        url=settings.redis_url,
        queue_name=settings.redis_queue_name,
        processing_suffix=settings.redis_processing_suffix,
        metrics_key=settings.redis_metrics_key,
        health_ttl=settings.health_ttl_seconds,
    )


def run_listener(settings: Settings) -> None:
    configure_logging(settings.log_level)
    client = SupabaseClient(settings)
    queue = build_queue(settings)
    listener = SupabaseListener(settings, client, queue)
    listener.start()


def run_worker(settings: Settings) -> None:
    configure_logging(settings.log_level)
    client = SupabaseClient(settings)
    queue = build_queue(settings)
    worker = MT5Worker(settings, queue, client)
    worker.start()


def run_demo(settings: Settings) -> None:
    """Fire a single simulated signal through the worker."""
    configure_logging(settings.log_level)
    queue = build_queue(settings)
    client = None
    worker = MT5Worker(settings, queue, client)

    fake_signal = {
        "id": "demo-signal",
        "symbol": "EURUSD",
        "side": "buy",
        "entry": 1.1000,
        "stop_loss_pips": 35,
        "take_profit_offset": 70,
        "risk_fraction": 0.01,
        "account_balance": 25_000,
    }
    queue.enqueue(fake_signal)

    thread = threading.Thread(target=worker.run, daemon=True)
    thread.start()
    time.sleep(2)
    worker.stop()
    thread.join(timeout=5)


COMMANDS = {
    "supabase-listener": run_listener,
    "worker": run_worker,
    "demo-dry-run": run_demo,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="TradingView to MT5 bridge controller")
    parser.add_argument("command", choices=COMMANDS.keys())
    args = parser.parse_args()
    settings = get_settings()
    COMMANDS[args.command](settings)


if __name__ == "__main__":
    main()
