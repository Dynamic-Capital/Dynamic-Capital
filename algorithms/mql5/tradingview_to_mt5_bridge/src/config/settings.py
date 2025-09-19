"""Configuration loader for the TradingView → MT5 bridge."""
from __future__ import annotations

import os
import platform
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv

from src.utils.credentials import load_secret

# Load a .env file when present to simplify local development.
load_dotenv()


def _bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    """Container for bridge runtime configuration."""

    supabase_url: str
    supabase_service_key: str
    supabase_signals_table: str = "signals"
    supabase_status_column: str = "status"
    supabase_pending_status: str = "pending"
    supabase_queued_status: str = "queued"
    supabase_in_progress_status: str = "in_progress"
    supabase_filled_status: str = "filled"
    supabase_failed_status: str = "failed"
    supabase_error_status: str = "error"
    supabase_batch_size: int = 25
    supabase_poll_interval: float = 2.0
    supabase_claim_ttl_seconds: int = 300
    supabase_credential_target: Optional[str] = None

    redis_url: str = "redis://127.0.0.1:6379/0"
    redis_queue_name: str = "mt5:signals"
    redis_processing_suffix: str = ":processing"
    redis_metrics_key: str = "mt5_bridge:health"

    bridge_node_id: str = platform.node()
    backoff_initial: float = 1.0
    backoff_max: float = 30.0
    log_level: str = os.getenv("BRIDGE_LOG_LEVEL", "INFO")

    mt5_demo_mode: bool = False
    mt5_server: Optional[str] = None
    mt5_login: Optional[str] = None
    mt5_password: Optional[str] = None
    mt5_path: Optional[str] = None

    risk_balance: float = 100_000.0
    risk_per_trade: float = 0.01
    risk_min_lot: float = 0.01
    risk_max_lot: float = 50.0
    risk_default_stop_pips: float = 50.0
    risk_default_pip_value: float = 10.0

    health_ttl_seconds: int = 600
    metrics_namespace: str = "mt5_bridge"


@lru_cache()
def get_settings() -> Settings:
    """Load settings from the current environment."""
    credential_target = os.getenv("SUPABASE_CREDENTIAL_TARGET")

    supabase_key = load_secret("SUPABASE_SERVICE_KEY", credential_target)
    if not supabase_key:
        raise RuntimeError(
            "SUPABASE_SERVICE_KEY is required. Provide it via environment variables "
            "or configure SUPABASE_CREDENTIAL_TARGET to read from the Windows "
            "Credential Manager."
        )

    supabase_url = os.getenv("SUPABASE_URL")
    if not supabase_url:
        raise RuntimeError("SUPABASE_URL must be configured")

    settings = Settings(
        supabase_url=supabase_url,
        supabase_service_key=supabase_key,
        supabase_signals_table=os.getenv("SUPABASE_SIGNALS_TABLE", "signals"),
        supabase_status_column=os.getenv("SUPABASE_STATUS_COLUMN", "status"),
        supabase_pending_status=os.getenv("SUPABASE_PENDING_STATUS", "pending"),
        supabase_queued_status=os.getenv("SUPABASE_QUEUED_STATUS", "queued"),
        supabase_in_progress_status=os.getenv("SUPABASE_IN_PROGRESS_STATUS", "in_progress"),
        supabase_filled_status=os.getenv("SUPABASE_FILLED_STATUS", "filled"),
        supabase_failed_status=os.getenv("SUPABASE_FAILED_STATUS", "failed"),
        supabase_error_status=os.getenv("SUPABASE_ERROR_STATUS", "error"),
        supabase_batch_size=int(os.getenv("SUPABASE_BATCH_SIZE", "25")),
        supabase_poll_interval=float(os.getenv("SUPABASE_POLL_INTERVAL", "2.0")),
        supabase_claim_ttl_seconds=int(os.getenv("SUPABASE_CLAIM_TTL_SECONDS", "300")),
        supabase_credential_target=credential_target,
        redis_url=os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
        redis_queue_name=os.getenv("REDIS_QUEUE_NAME", "mt5:signals"),
        redis_processing_suffix=os.getenv("REDIS_PROCESSING_SUFFIX", ":processing"),
        redis_metrics_key=os.getenv("REDIS_METRICS_KEY", "mt5_bridge:health"),
        bridge_node_id=os.getenv("BRIDGE_NODE_ID", platform.node()),
        backoff_initial=float(os.getenv("BRIDGE_BACKOFF_INITIAL", "1.0")),
        backoff_max=float(os.getenv("BRIDGE_BACKOFF_MAX", "30.0")),
        log_level=os.getenv("BRIDGE_LOG_LEVEL", "INFO"),
        mt5_demo_mode=_bool(os.getenv("MT5_DEMO_MODE"), default=True),
        mt5_server=os.getenv("MT5_SERVER"),
        mt5_login=os.getenv("MT5_LOGIN"),
        mt5_password=load_secret("MT5_PASSWORD", os.getenv("MT5_PASSWORD_CREDENTIAL_TARGET")),
        mt5_path=os.getenv("MT5_TERMINAL_PATH"),
        risk_balance=float(os.getenv("RISK_BALANCE", "100000")),
        risk_per_trade=float(os.getenv("RISK_PER_TRADE", "0.01")),
        risk_min_lot=float(os.getenv("RISK_MIN_LOT", "0.01")),
        risk_max_lot=float(os.getenv("RISK_MAX_LOT", "50")),
        risk_default_stop_pips=float(os.getenv("RISK_DEFAULT_STOP_PIPS", "50")),
        risk_default_pip_value=float(os.getenv("RISK_DEFAULT_PIP_VALUE", "10")),
        health_ttl_seconds=int(os.getenv("BRIDGE_HEALTH_TTL_SECONDS", "600")),
        metrics_namespace=os.getenv("BRIDGE_METRICS_NAMESPACE", "mt5_bridge"),
    )
    return settings


__all__ = ["Settings", "get_settings"]
