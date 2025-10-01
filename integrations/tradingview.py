"""Flask webhook that drives the Dynamic Capital trading loop."""

from __future__ import annotations

import logging
import os
from hmac import compare_digest
from typing import Any, Dict, Optional

from flask import Flask, Response, jsonify, request

from dynamic.intelligence.ai_apps.core import DynamicFusionAlgo
from dynamic.trading.algo.trading_core import DynamicTradingAlgo
from dynamic.platform.token.treasury import DynamicTreasuryAlgo
from integrations.supabase_logger import SupabaseLogger
from integrations.telegram_bot import DynamicTelegramBot

logger = logging.getLogger(__name__)

app = Flask(__name__)

fusion = DynamicFusionAlgo()
trader = DynamicTradingAlgo()
treasury = DynamicTreasuryAlgo()
supabase_logger = SupabaseLogger()
telegram_bot = DynamicTelegramBot.from_env()

SECRET_HEADER = "X-Tradingview-Secret"


def _coerce_lot(value: Any, default: float = 0.1) -> float:
    """Safely parse the provided lot value."""

    if value is None:
        return default

    try:
        return float(value)
    except (TypeError, ValueError):
        logger.warning(
            "Invalid lot value received from TradingView payload. Defaulting to %s.",
            default,
            extra={"lot": value},
        )
        return default


def _verify_secret() -> Optional[Response]:
    """Validate the shared TradingView webhook secret."""

    expected_secret = os.environ.get("TRADINGVIEW_WEBHOOK_SECRET")
    if not expected_secret:
        logger.error("TradingView webhook secret is not configured.")
        return jsonify({"error": "Webhook secret not configured."}), 500

    provided_secret = request.headers.get(SECRET_HEADER)
    if not provided_secret or not compare_digest(provided_secret, expected_secret):
        logger.warning(
            "Rejected TradingView webhook due to invalid secret.",
            extra={"header": SECRET_HEADER},
        )
        return jsonify({"error": "Unauthorized"}), 401

    return None


@app.route("/webhook", methods=["POST"])
def webhook() -> Any:
    verification = _verify_secret()
    if verification is not None:
        return verification

    payload = request.get_json(silent=True) or {}
    logger.info("TradingView alert received: %s", payload)

    symbol = str(payload.get("symbol", "XAUUSD"))
    lot = _coerce_lot(payload.get("lot"))

    ai_signal = fusion.generate_signal(payload)
    trade_result = trader.execute_trade(ai_signal, lot=lot, symbol=symbol)
    treasury_event = treasury.update_from_trade(trade_result)

    supabase_logger.log_trade(
        _build_supabase_payload(payload, lot, ai_signal, trade_result, treasury_event)
    )

    message = _format_telegram_message(symbol, ai_signal.to_dict(), trade_result, treasury_event)
    if telegram_bot and message:
        telegram_bot.notify(message)

    status = "executed" if trade_result.ok else "skipped"

    return jsonify(
        {
            "status": status,
            "raw_signal": payload.get("signal", "NEUTRAL"),
            "ai_signal": ai_signal.to_dict(),
            "trade": {
                "retcode": trade_result.retcode,
                "profit": trade_result.profit,
                "ticket": trade_result.ticket,
                "symbol": trade_result.symbol or symbol,
                "lot": trade_result.lot or lot,
            },
            "treasury_event": _treasury_event_to_dict(treasury_event),
        }
    )


def _build_supabase_payload(
    payload: Dict[str, Any],
    lot: float,
    ai_signal,
    trade_result,
    treasury_event,
) -> Dict[str, Any]:
    supabase_payload = {
        "symbol": trade_result.symbol or payload.get("symbol"),
        "lot": trade_result.lot or lot,
        "raw_signal": payload.get("signal", "NEUTRAL"),
        "ai_signal": ai_signal.action,
        "ai_confidence": ai_signal.confidence,
        "ai_reasoning": ai_signal.reasoning,
        "retcode": trade_result.retcode,
        "profit": trade_result.profit,
        "ticket": trade_result.ticket,
        "status": "executed" if trade_result.ok else "skipped",
    }
    if treasury_event:
        supabase_payload.update(
            {
                "burned": treasury_event.burned,
                "rewards_distributed": treasury_event.rewards_distributed,
                "profit_retained": treasury_event.profit_retained,
            }
        )
    return supabase_payload


def _format_telegram_message(
    symbol: str,
    ai_signal: Dict[str, Any],
    trade_result,
    treasury_event,
) -> Optional[str]:
    if not getattr(trade_result, "ok", False):
        return None

    lines = [
        f"✅ Trade Executed: {ai_signal['action']} {symbol}",
        f"Confidence: {ai_signal['confidence']}",
        f"Profit: {trade_result.profit}",
    ]

    if treasury_event:
        lines.append(f"🔥 Burned {treasury_event.burned} DCT")
        lines.append(f"💰 Rewards Distributed: {treasury_event.rewards_distributed} DCT")

    return "\n".join(lines)


def _treasury_event_to_dict(event) -> Optional[Dict[str, Any]]:
    if not event:
        return None
    return {
        "burned": event.burned,
        "rewards_distributed": event.rewards_distributed,
        "profit_retained": event.profit_retained,
    }


if __name__ == "__main__":  # pragma: no cover
    app.run(host="0.0.0.0", port=8000, debug=True)
