"""Flask webhook that drives the Dynamic Capital trading loop."""

from __future__ import annotations

import json
import logging
import os
from hmac import compare_digest
from typing import Any, Dict, Optional, Sequence

from flask import Flask, Response, jsonify, request

from dynamic_ai.core import DynamicFusionAlgo
from dynamic_algo.trading_core import DynamicTradingAlgo
from dynamic_token.treasury import DynamicTreasuryAlgo
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
    base_lot = float(payload.get("lot", 0.1))
    session_name = payload.get("session")
    volatility = _coerce_float(payload.get("volatility"))
    news_bias = _coerce_float(payload.get("news_bias"))

    lorentzian_blob = _extract_lorentzian_blob(payload)
    params = fusion.dai_lorentzian_params(volatility, news_bias, session_name)
    params = _apply_lorentzian_overrides(params, lorentzian_blob)

    prices = _coerce_prices(lorentzian_blob.get("prices") if lorentzian_blob else None)
    components: list[Any] = []
    lorentzian_state: Dict[str, Any] = {}

    if prices:
        component = fusion.build_lorentzian_component(prices, params)
        if component is not None:
            components.append(component)
            lorentzian_state = dict(component.metadata)

    if not lorentzian_state and lorentzian_blob:
        fallback_component = _component_from_payload(lorentzian_blob, params)
        if fallback_component is not None:
            components.append(fallback_component)
            lorentzian_state = dict(fallback_component.get("metadata", {}))

    components.extend(_extract_additional_components(payload))

    default_signal = str(payload.get("signal", "NEUTRAL"))
    if components:
        ai_signal = fusion.combine(components, default_signal=default_signal)
    else:
        ai_signal = fusion.generate_signal(payload)

    lorentzian_state.setdefault("enter_z", params.get("enter_z"))
    lorentzian_state.setdefault("exit_z", params.get("exit_z"))
    lorentzian_state.setdefault("style", params.get("style"))

    execution_context = {
        "volatility": volatility,
        "news_bias": news_bias,
        "twap_deviation": _coerce_float(
            (lorentzian_blob or {}).get("twap_deviation"), default=0.0
        ),
        "session": {
            "name": session_name,
            "halt": bool(payload.get("halt_trading")),
        },
        "lorentzian": lorentzian_state if lorentzian_state else None,
        "lorentzian_params": params,
    }

    trade_result = trader.execute_trade(
        ai_signal, base_lot=base_lot, symbol=symbol, context=execution_context
    )
    treasury_event = treasury.update_from_trade(trade_result, market_context=execution_context)

    supabase_logger.log_trade(
        _build_supabase_payload(
            payload, ai_signal, trade_result, treasury_event, execution_context
        )
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
                "lot": trade_result.lot or base_lot,
            },
            "treasury_event": _treasury_event_to_dict(treasury_event),
            "lorentzian": lorentzian_state or None,
        }
    )


def _build_supabase_payload(
    payload: Dict[str, Any],
    ai_signal,
    trade_result,
    treasury_event,
    market_context: Dict[str, Any],
) -> Dict[str, Any]:
    supabase_payload = {
        "symbol": trade_result.symbol or payload.get("symbol"),
        "lot": trade_result.lot or payload.get("lot", 0.1),
        "raw_signal": payload.get("signal", "NEUTRAL"),
        "ai_signal": ai_signal.action,
        "ai_confidence": ai_signal.confidence,
        "ai_reasoning": ai_signal.reasoning,
        "retcode": trade_result.retcode,
        "profit": trade_result.profit,
        "ticket": trade_result.ticket,
        "status": "executed" if trade_result.ok else "skipped",
    }
    if getattr(ai_signal, "components", None):
        supabase_payload["components"] = ai_signal.components
    lorentzian_state = market_context.get("lorentzian")
    if lorentzian_state:
        supabase_payload["lorentzian"] = lorentzian_state
    if treasury_event:
        supabase_payload.update(
            {
                "burned": treasury_event.burned,
                "rewards_distributed": treasury_event.rewards_distributed,
                "profit_retained": treasury_event.profit_retained,
                "policy_buyback": treasury_event.policy_buyback,
                "policy_burn": treasury_event.policy_burn,
                "policy_spread_target_bps": treasury_event.policy_spread_target_bps,
                "policy_regime": treasury_event.policy_regime,
                "policy_notes": treasury_event.policy_notes,
            }
        )
    return supabase_payload


def _format_telegram_message(
    symbol: str,
    ai_signal: Dict[str, Any],
    trade_result,
    treasury_event,
) -> Optional[str]:
    if trade_result.retcode == 0:
        return None

    lines = [
        f"✅ Trade Executed: {ai_signal['action']} {symbol}",
        f"Confidence: {ai_signal['confidence']}",
        f"Profit: {trade_result.profit}",
    ]

    if treasury_event:
        lines.append(f"🔥 Burned {treasury_event.burned} DCT")
        lines.append(f"💰 Rewards Distributed: {treasury_event.rewards_distributed} DCT")
        if treasury_event.policy_buyback > 0:
            lines.append(f"🛒 Buybacks: {treasury_event.policy_buyback} DCT")
        if treasury_event.policy_spread_target_bps is not None:
            lines.append(
                f"⚙️ Spread Target: {treasury_event.policy_spread_target_bps} bps ({treasury_event.policy_regime})"
            )

    return "\n".join(lines)


def _extract_lorentzian_blob(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    blob = payload.get("lorentzian")
    if isinstance(blob, str):
        try:
            blob = json.loads(blob)
        except json.JSONDecodeError:
            blob = None
    if isinstance(blob, dict):
        return blob

    message = payload.get("message")
    if isinstance(message, str):
        try:
            parsed = json.loads(message)
        except json.JSONDecodeError:
            return None
        if isinstance(parsed, dict) and parsed.get("strategy") == "DynamicLorentzian":
            return parsed
    return None


def _apply_lorentzian_overrides(
    params: Dict[str, Any], blob: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    if not blob:
        return params

    overrides = dict(params)
    mapping = {
        "win": "window",
        "window": "window",
        "alpha": "alpha",
        "mode": "mode",
        "style": "style",
        "enter_z": "enter_z",
        "exit_z": "exit_z",
    }
    for source, target in mapping.items():
        if source not in blob:
            continue
        value = blob[source]
        if target in {"alpha", "enter_z", "exit_z", "window"}:
            numeric = _coerce_float(value, default=params.get(target, 0.0))
            overrides[target] = int(numeric) if target == "window" else numeric
        else:
            overrides[target] = value
    return overrides


def _coerce_prices(raw: Any) -> Optional[Sequence[float]]:
    if raw is None:
        return None
    data = raw
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return None
    if not isinstance(data, Sequence):
        return None
    try:
        return [float(value) for value in data]
    except (TypeError, ValueError):
        return None


def _component_from_payload(
    blob: Dict[str, Any], params: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    signal = str(blob.get("signal", "NEUTRAL")).upper()
    score = _coerce_float(blob.get("score"))
    if signal not in {"BUY", "SELL", "HOLD", "NEUTRAL"}:
        signal = "NEUTRAL"
    confidence = min(1.0, abs(score) / 3.0)
    metadata = {
        **{k: v for k, v in blob.items() if k not in {"signal", "score"}},
        "score": score,
        "enter_z": params.get("enter_z"),
        "exit_z": params.get("exit_z"),
        "mode": params.get("mode"),
        "style": params.get("style"),
    }
    return {
        "name": "lorentzian",
        "signal": signal,
        "confidence": confidence,
        "score": score,
        "metadata": metadata,
    }


def _extract_additional_components(payload: Dict[str, Any]) -> Sequence[Dict[str, Any]]:
    components: list[Dict[str, Any]] = []
    raw_components = payload.get("components")
    if isinstance(raw_components, Sequence):
        for item in raw_components:
            if isinstance(item, dict):
                components.append(item)

    ma_signal = payload.get("ma_signal")
    if ma_signal:
        components.append(
            {
                "name": "trend_ma",
                "signal": ma_signal,
                "confidence": _coerce_float(payload.get("ma_confidence"), default=0.4),
            }
        )

    sentiment_signal = payload.get("sentiment_signal")
    if sentiment_signal:
        components.append(
            {
                "name": "sentiment",
                "signal": sentiment_signal,
                "confidence": _coerce_float(
                    payload.get("sentiment_confidence"), default=0.3
                ),
            }
        )

    return components


def _coerce_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _treasury_event_to_dict(event) -> Optional[Dict[str, Any]]:
    if not event:
        return None
    return {
        "burned": event.burned,
        "rewards_distributed": event.rewards_distributed,
        "profit_retained": event.profit_retained,
        "policy_buyback": event.policy_buyback,
        "policy_burn": event.policy_burn,
        "policy_spread_target_bps": event.policy_spread_target_bps,
        "policy_regime": event.policy_regime,
        "policy_notes": event.policy_notes,
    }


if __name__ == "__main__":  # pragma: no cover
    app.run(host="0.0.0.0", port=8000, debug=True)
