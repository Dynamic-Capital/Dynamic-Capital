"""Minimal Telegram bot client used for trade notifications."""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from types import MappingProxyType
from typing import Dict, Mapping, Optional

from dynamic.platform import engines as platform_engines
from dynamic.platform import routers as platform_routers

try:  # pragma: no cover - optional dependency
    from dynamic.intelligence.ai_apps.activation import (
        ActivationReport,
        activate_dynamic_stack,
    )
except Exception:  # pragma: no cover - graceful fallback when dynamic stack moves
    ActivationReport = None  # type: ignore[assignment]
    activate_dynamic_stack = None  # type: ignore[assignment]

try:  # pragma: no cover - optional dependency
    from telegram import Bot  # type: ignore
except Exception:  # pragma: no cover
    Bot = None  # type: ignore


_MODULE_LOGGER = logging.getLogger(__name__)

@lru_cache(maxsize=2)
def _load_dynamic_module_summary(strict: bool) -> Mapping[str, object]:
    summary: Dict[str, object] = {}
    activation: ActivationReport | None = None

    if activate_dynamic_stack is not None:
        try:
            activation = activate_dynamic_stack(strict_engines=strict)
        except Exception:  # pragma: no cover - defensive guard around dynamic stack
            _MODULE_LOGGER.exception(
                "Failed to activate dynamic stack for Telegram bot."
            )
        else:
            summary.update(
                {
                    "activation": activation,
                    "total_engines": activation.total_engines,
                    "total_modules": activation.total_modules,
                }
            )

    if activation is None:
        try:
            engines = platform_engines.enable_all_dynamic_engines(strict=strict)
        except Exception:  # pragma: no cover - ensure telemetry without crashing
            _MODULE_LOGGER.exception(
                "Failed to enable dynamic engines for Telegram bot."
            )
        else:
            summary["engines"] = tuple(sorted(engines))

    try:
        routers = platform_routers.enable_all_dynamic_routers(strict=strict)
    except Exception:  # pragma: no cover - router discovery should not block bot
        _MODULE_LOGGER.exception(
            "Failed to enable dynamic routers for Telegram bot."
        )
    else:
        summary["routers"] = tuple(sorted(routers))

    if not summary:
        summary["status"] = "dynamic modules unavailable"

    _MODULE_LOGGER.info(
        "Dynamic modules enabled for Telegram bot",
        extra={
            "total_engines": summary.get("total_engines"),
            "total_modules": summary.get("total_modules"),
            "has_engines": "engines" in summary,
            "has_routers": "routers" in summary,
        },
    )

    return MappingProxyType(summary)


def enable_dynamic_modules(*, strict: bool = False) -> Mapping[str, object]:
    """Eagerly enable the dynamic stack for Telegram integrations.

    The Dynamic runtime exposes hundreds of modules through lazy shims to keep
    cold starts fast.  When the Telegram bot boots we want the full experience
    available so commands and automations can rely on every engine, router, and
    module without waiting for on-demand imports.  This helper initialises the
    stack once and caches the result for subsequent bot instances.
    """

    return _load_dynamic_module_summary(strict)


def _reset_dynamic_module_cache() -> None:
    """Clear the cached dynamic module summary (used in tests)."""

    _load_dynamic_module_summary.cache_clear()


class DynamicTelegramBot:
    """Send updates to Telegram chats while tolerating missing deps."""

    def __init__(self, token: str, chat_id: str) -> None:
        self.logger = logging.getLogger(self.__class__.__name__)
        self.dynamic_modules = enable_dynamic_modules()
        if Bot is None:
            self.logger.warning(
                "python-telegram-bot not installed. Notifications will be logged only.",
            )
            self.bot = None
        else:
            self.bot = Bot(token=token)
        self.chat_id = chat_id

    @classmethod
    def from_env(cls) -> Optional["DynamicTelegramBot"]:
        token = os.environ.get("TELEGRAM_BOT_TOKEN")
        chat_id = os.environ.get("TELEGRAM_CHAT_ID")
        if not token or not chat_id:
            return None
        return cls(token=token, chat_id=chat_id)

    def notify(self, message: str) -> None:
        if not message:
            return
        if self.bot is None:
            self.logger.info("Telegram notification: %s", message)
            return
        self.bot.send_message(chat_id=self.chat_id, text=message)
