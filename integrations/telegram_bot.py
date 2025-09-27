"""Minimal Telegram bot client used for trade notifications."""

from __future__ import annotations

import logging
import os
from typing import Optional

try:  # pragma: no cover - optional dependency
    from telegram import Bot  # type: ignore
except Exception:  # pragma: no cover
    Bot = None  # type: ignore


class DynamicTelegramBot:
    """Send updates to Telegram chats while tolerating missing deps."""

    def __init__(self, token: str, chat_id: str) -> None:
        self.logger = logging.getLogger(self.__class__.__name__)
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
