"""Tests for enabling Dynamic modules in the Telegram bot integration."""

from __future__ import annotations

from typing import Dict, Mapping

from dynamic.intelligence.ai_apps.activation import ActivationReport

import integrations.telegram_bot as telegram_bot


_ACTIVATION_ENGINES: Mapping[str, object] = {"engine-alpha": object()}
_ACTIVATION_REPORT = ActivationReport(
    engines=dict(_ACTIVATION_ENGINES),
    modules=(),
    total_engines=len(_ACTIVATION_ENGINES),
    total_modules=256,
)


def test_enable_dynamic_modules_uses_activation(monkeypatch):
    calls: Dict[str, int] = {"activation": 0, "engines": 0, "routers": 0}

    def fake_activate(*, strict_engines: bool = False):
        calls["activation"] += 1
        return _ACTIVATION_REPORT

    def fake_enable_engines(*, strict: bool = False):
        calls["engines"] += 1
        return dict(_ACTIVATION_ENGINES)

    routers = {"router-alpha", "router-beta"}

    def fake_enable_routers(*, strict: bool = False):
        calls["routers"] += 1
        return routers

    monkeypatch.setattr(telegram_bot, "activate_dynamic_stack", fake_activate)
    monkeypatch.setattr(
        telegram_bot.platform_engines,
        "enable_all_dynamic_engines",
        fake_enable_engines,
    )
    monkeypatch.setattr(
        telegram_bot.platform_routers,
        "enable_all_dynamic_routers",
        fake_enable_routers,
    )

    telegram_bot._reset_dynamic_module_cache()

    summary = telegram_bot.enable_dynamic_modules()
    assert summary["activation"].total_engines == len(_ACTIVATION_ENGINES)
    assert summary["activation"].total_modules == _ACTIVATION_REPORT.total_modules
    assert calls == {"activation": 1, "engines": 0, "routers": 1}

    repeated = telegram_bot.enable_dynamic_modules()
    assert repeated is summary
    assert calls == {"activation": 1, "engines": 0, "routers": 1}


def test_dynamic_telegram_bot_enables_modules(monkeypatch):
    calls = {"enable": 0}
    summary = telegram_bot.enable_dynamic_modules()

    def fake_enable_dynamic_modules():
        calls["enable"] += 1
        return summary

    monkeypatch.setattr(telegram_bot, "enable_dynamic_modules", fake_enable_dynamic_modules)

    telegram_bot._reset_dynamic_module_cache()

    bot = telegram_bot.DynamicTelegramBot(token="dummy", chat_id="chat")
    assert bot.dynamic_modules is summary
    assert calls == {"enable": 1}


def test_dynamic_telegram_bot_e2e_notify(monkeypatch):
    sent_messages = []

    class DummyBot:
        def __init__(self, token: str) -> None:
            self.token = token

        def send_message(self, chat_id: str, text: str) -> None:
            sent_messages.append((self.token, chat_id, text))

    activation_report = ActivationReport(
        engines={"engine-beta": object(), "engine-gamma": object(), "engine-delta": object()},
        modules=(),
        total_engines=3,
        total_modules=11,
    )

    def fake_activate(*, strict_engines: bool = False):
        return activation_report

    def fake_enable_routers(*, strict: bool = False):
        return {"router-a", "router-b"}

    monkeypatch.setattr(telegram_bot, "Bot", DummyBot)
    monkeypatch.setattr(telegram_bot, "activate_dynamic_stack", fake_activate)
    monkeypatch.setattr(
        telegram_bot.platform_routers, "enable_all_dynamic_routers", fake_enable_routers
    )
    monkeypatch.setattr(
        telegram_bot.platform_engines,
        "enable_all_dynamic_engines",
        lambda *, strict: dict(activation_report.engines),
    )

    telegram_bot._reset_dynamic_module_cache()

    bot = telegram_bot.DynamicTelegramBot(token="secure", chat_id="room")
    bot.notify("hello world")

    assert sent_messages == [("secure", "room", "hello world")]
    assert bot.dynamic_modules["activation"].total_modules == 11
    assert tuple(sorted(bot.dynamic_modules["routers"])) == ("router-a", "router-b")
