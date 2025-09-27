"""Execution layer that bridges AI guidance with MT5/Exness trades."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Any, Dict, Mapping, Optional

try:  # pragma: no cover - optional dependency
    from integrations.mt5_connector import MT5Connector  # type: ignore
except Exception:  # pragma: no cover - keep module importable if MT5 deps missing
    MT5Connector = None  # type: ignore

ORDER_ACTION_BUY = "BUY"
ORDER_ACTION_SELL = "SELL"
SUCCESS_RETCODE = 10009


@dataclass(slots=True, frozen=True)
class InstrumentProfile:
    """Trading instrument metadata used for normalisation and simulation."""

    symbol: str
    asset_class: str
    pip_value: float
    volatility: float
    spread_cost: float
    tick_size: float
    price_precision: int
    reference_price: float
    min_lot: float = 0.01
    max_lot: float = 100.0
    aliases: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        symbol = str(self.symbol).strip().upper()
        if not symbol:
            raise ValueError("symbol must not be empty")
        object.__setattr__(self, "symbol", symbol)

        asset_class = str(self.asset_class).strip().lower() or "multi_asset"
        object.__setattr__(self, "asset_class", asset_class)

        pip_value = float(self.pip_value)
        volatility = float(self.volatility)
        spread_cost = float(self.spread_cost)
        tick_size = float(self.tick_size)
        reference_price = float(self.reference_price)
        min_lot = float(self.min_lot)
        max_lot = float(self.max_lot)
        price_precision = int(self.price_precision)

        if pip_value <= 0:
            raise ValueError("pip_value must be positive")
        if volatility <= 0:
            raise ValueError("volatility must be positive")
        if spread_cost < 0:
            raise ValueError("spread_cost cannot be negative")
        if tick_size <= 0:
            raise ValueError("tick_size must be positive")
        if reference_price <= 0:
            raise ValueError("reference_price must be positive")
        if min_lot <= 0:
            raise ValueError("min_lot must be positive")
        if max_lot < min_lot:
            raise ValueError("max_lot must be greater than or equal to min_lot")
        if price_precision < 0:
            raise ValueError("price_precision cannot be negative")

        object.__setattr__(self, "pip_value", pip_value)
        object.__setattr__(self, "volatility", volatility)
        object.__setattr__(self, "spread_cost", spread_cost)
        object.__setattr__(self, "tick_size", tick_size)
        object.__setattr__(self, "reference_price", reference_price)
        object.__setattr__(self, "min_lot", min_lot)
        object.__setattr__(self, "max_lot", max_lot)
        object.__setattr__(self, "price_precision", price_precision)

        alias_tokens = tuple(
            str(alias).strip().upper()
            for alias in self.aliases
            if str(alias).strip()
        )
        object.__setattr__(self, "aliases", alias_tokens)


_SYMBOL_SANITISE = str.maketrans({
    "-": "",
    "_": "",
    "/": "",
    " ": "",
    ":": "",
    ".": "",
    "=": "",
})


def _normalise_symbol_token(symbol: Any) -> str:
    if symbol is None:
        return ""
    token = str(symbol).strip().upper().translate(_SYMBOL_SANITISE)
    if token.endswith("USDT"):
        usd_variant = token[:-4] + "USD"
        if usd_variant:
            token = usd_variant
    return token


def _derive_generic_profile(symbol: str) -> InstrumentProfile:
    token = _normalise_symbol_token(symbol) or DEFAULT_SYMBOL
    if token.endswith("USD") and len(token) == 6:
        return InstrumentProfile(
            symbol=token,
            asset_class="fx_major",
            pip_value=10.0,
            volatility=40.0,
            spread_cost=0.8,
            tick_size=0.0001,
            price_precision=5,
            reference_price=1.0,
            min_lot=0.01,
            max_lot=200.0,
        )
    if token.endswith("USD"):
        return InstrumentProfile(
            symbol=token,
            asset_class="crypto",
            pip_value=4.0,
            volatility=220.0,
            spread_cost=6.0,
            tick_size=1.0,
            price_precision=2,
            reference_price=100.0,
            min_lot=0.01,
            max_lot=100.0,
        )
    return InstrumentProfile(
        symbol=token,
        asset_class="multi_asset",
        pip_value=25.0,
        volatility=80.0,
        spread_cost=1.0,
        tick_size=0.01,
        price_precision=3,
        reference_price=10.0,
        min_lot=0.01,
        max_lot=100.0,
    )


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def _coerce_positive(value: float | None) -> float | None:
    if value is None:
        return None
    if value <= 0.0:
        return None
    return value


def _extract_signal_numeric(signal: Any, *keys: str) -> float | None:
    if not keys:
        return None
    for key in keys:
        candidate: Any
        if isinstance(signal, Mapping) and key in signal:
            candidate = signal[key]
        elif hasattr(signal, key):
            candidate = getattr(signal, key)
        else:
            continue

        if candidate is None:
            continue

        try:
            numeric = float(candidate)
        except (TypeError, ValueError):
            continue

        if not math.isfinite(numeric):  # pragma: no cover - defensive guard
            continue

        return numeric
    return None


def _build_alias_index(profiles: Mapping[str, InstrumentProfile]) -> Dict[str, str]:
    index: Dict[str, str] = {}
    for profile in profiles.values():
        canonical_token = _normalise_symbol_token(profile.symbol)
        if canonical_token:
            index[canonical_token] = profile.symbol
        for alias in profile.aliases:
            alias_token = _normalise_symbol_token(alias)
            if alias_token and alias_token not in index:
                index[alias_token] = profile.symbol
    return index


_DEFAULT_PROFILE_LIST = [
    InstrumentProfile(
        symbol="EURUSD",
        asset_class="fx_major",
        pip_value=10.0,
        volatility=45.0,
        spread_cost=0.7,
        tick_size=0.0001,
        price_precision=5,
        reference_price=1.085,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("EUR/USD", "FX:EURUSD", "EUR-USD", "EURUSDT"),
    ),
    InstrumentProfile(
        symbol="GBPUSD",
        asset_class="fx_major",
        pip_value=10.0,
        volatility=55.0,
        spread_cost=0.8,
        tick_size=0.0001,
        price_precision=5,
        reference_price=1.27,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("GBP/USD", "FX:GBPUSD", "GBP-USD", "GBPUSDT"),
    ),
    InstrumentProfile(
        symbol="USDJPY",
        asset_class="fx_major",
        pip_value=9.1,
        volatility=55.0,
        spread_cost=0.9,
        tick_size=0.01,
        price_precision=3,
        reference_price=147.5,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("USD/JPY", "FX:USDJPY", "USD-JPY", "USDJPY.", "USDJPY=")
    ),
    InstrumentProfile(
        symbol="USDCHF",
        asset_class="fx_major",
        pip_value=10.0,
        volatility=38.0,
        spread_cost=0.7,
        tick_size=0.0001,
        price_precision=5,
        reference_price=0.9,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("USD/CHF", "FX:USDCHF", "USD-CHF"),
    ),
    InstrumentProfile(
        symbol="USDCAD",
        asset_class="fx_major",
        pip_value=10.0,
        volatility=40.0,
        spread_cost=0.75,
        tick_size=0.0001,
        price_precision=5,
        reference_price=1.36,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("USD/CAD", "FX:USDCAD", "USD-CAD"),
    ),
    InstrumentProfile(
        symbol="AUDUSD",
        asset_class="fx_major",
        pip_value=10.0,
        volatility=45.0,
        spread_cost=0.75,
        tick_size=0.0001,
        price_precision=5,
        reference_price=0.66,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("AUD/USD", "FX:AUDUSD", "AUD-USD", "AUDUSDT"),
    ),
    InstrumentProfile(
        symbol="NZDUSD",
        asset_class="fx_major",
        pip_value=10.0,
        volatility=40.0,
        spread_cost=0.75,
        tick_size=0.0001,
        price_precision=5,
        reference_price=0.61,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("NZD/USD", "FX:NZDUSD", "NZD-USD", "NZDUSDT"),
    ),
    InstrumentProfile(
        symbol="XAUUSD",
        asset_class="metal",
        pip_value=100.0,
        volatility=25.0,
        spread_cost=1.2,
        tick_size=0.1,
        price_precision=2,
        reference_price=2350.0,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("GOLD", "XAU", "XAU/USD", "XAUUSDT", "GOLDUSD"),
    ),
    InstrumentProfile(
        symbol="XAGUSD",
        asset_class="metal",
        pip_value=50.0,
        volatility=30.0,
        spread_cost=0.9,
        tick_size=0.01,
        price_precision=3,
        reference_price=28.0,
        min_lot=0.01,
        max_lot=200.0,
        aliases=("SILVER", "XAG", "XAG/USD", "XAGUSDT", "SILVERUSD"),
    ),
    InstrumentProfile(
        symbol="BTCUSD",
        asset_class="crypto",
        pip_value=5.0,
        volatility=600.0,
        spread_cost=15.0,
        tick_size=1.0,
        price_precision=2,
        reference_price=65000.0,
        min_lot=0.01,
        max_lot=50.0,
        aliases=("BTCUSDT", "BTC/USD", "BTC-USD", "XBTUSD"),
    ),
    InstrumentProfile(
        symbol="ETHUSD",
        asset_class="crypto",
        pip_value=4.0,
        volatility=220.0,
        spread_cost=8.0,
        tick_size=1.0,
        price_precision=2,
        reference_price=3200.0,
        min_lot=0.01,
        max_lot=100.0,
        aliases=("ETHUSDT", "ETH/USD", "ETH-USD"),
    ),
    InstrumentProfile(
        symbol="XRPUSD",
        asset_class="crypto",
        pip_value=1.5,
        volatility=80.0,
        spread_cost=2.0,
        tick_size=0.001,
        price_precision=4,
        reference_price=0.6,
        min_lot=1.0,
        max_lot=500000.0,
        aliases=("XRPUSDT", "XRP/USD", "XRP-USD"),
    ),
    InstrumentProfile(
        symbol="BNBUSD",
        asset_class="crypto",
        pip_value=4.0,
        volatility=90.0,
        spread_cost=5.0,
        tick_size=0.1,
        price_precision=2,
        reference_price=600.0,
        min_lot=0.01,
        max_lot=100.0,
        aliases=("BNBUSDT", "BNB/USD", "BNB-USD"),
    ),
    InstrumentProfile(
        symbol="TONUSD",
        asset_class="crypto",
        pip_value=3.0,
        volatility=70.0,
        spread_cost=3.0,
        tick_size=0.01,
        price_precision=3,
        reference_price=6.0,
        min_lot=0.1,
        max_lot=1000.0,
        aliases=("TONUSDT", "TON/USD", "TON-USD", "TONCOINUSD", "TONCOINUSDT", "TON"),
    ),
    InstrumentProfile(
        symbol="DCTTON",
        asset_class="crypto",
        pip_value=1.0,
        volatility=150.0,
        spread_cost=2.5,
        tick_size=0.0001,
        price_precision=5,
        reference_price=0.12,
        min_lot=1.0,
        max_lot=250000.0,
        aliases=("DCT/TON", "DCT-TON", "DCTTONUSD", "DCT"),
    ),
]

DEFAULT_INSTRUMENT_PROFILES: Dict[str, InstrumentProfile] = {
    profile.symbol: profile for profile in _DEFAULT_PROFILE_LIST
}
DEFAULT_ALIAS_INDEX = _build_alias_index(DEFAULT_INSTRUMENT_PROFILES)
DEFAULT_SYMBOL = "XAUUSD"


def normalise_symbol(symbol: Any, *, default: str = DEFAULT_SYMBOL) -> str:
    token = _normalise_symbol_token(symbol)
    if token:
        return DEFAULT_ALIAS_INDEX.get(token, token)
    default_token = _normalise_symbol_token(default)
    if default_token:
        return DEFAULT_ALIAS_INDEX.get(default_token, default_token)
    return DEFAULT_SYMBOL


@dataclass(slots=True)
class TradeExecutionResult:
    """Normalised view of a trading execution attempt."""

    retcode: int
    message: str
    profit: float
    ticket: Optional[int] = None
    symbol: Optional[str] = None
    lot: Optional[float] = None
    price: Optional[float] = None
    raw_response: Any = None

    @property
    def ok(self) -> bool:
        return self.retcode == SUCCESS_RETCODE


class _PaperBroker:
    """Fallback connector that simulates fills when MT5 is unavailable."""

    def execute(
        self, action: str, symbol: str, lot: float, profile: InstrumentProfile
    ) -> TradeExecutionResult:
        pip_move = random.uniform(-profile.volatility, profile.volatility)
        direction = 1.0 if action == ORDER_ACTION_BUY else -1.0
        gross = pip_move * profile.pip_value * lot * direction
        spread = profile.spread_cost * lot
        noise = random.uniform(-profile.pip_value * 0.1, profile.pip_value * 0.1)
        profit = round(gross - spread + noise, 2)

        price_move = pip_move * profile.tick_size
        execution_price = profile.reference_price + price_move
        if execution_price <= 0:
            execution_price = profile.reference_price
        price = round(execution_price, profile.price_precision)

        message = f"Simulated {action} order executed"

        return TradeExecutionResult(
            retcode=SUCCESS_RETCODE,
            message=message,
            profit=profit,
            ticket=random.randint(10_000, 99_999),
            symbol=symbol,
            lot=lot,
            price=price,
        )

    def open_hedge(
        self, symbol: str, lot: float, side: str, profile: InstrumentProfile
    ) -> TradeExecutionResult:
        action = ORDER_ACTION_BUY if side.upper() == "LONG_HEDGE" else ORDER_ACTION_SELL
        return self.execute(action, symbol, lot, profile)

    def close_hedge(
        self, symbol: str, lot: float, side: str, profile: InstrumentProfile
    ) -> TradeExecutionResult:
        action = ORDER_ACTION_SELL if side.upper() == "LONG_HEDGE" else ORDER_ACTION_BUY
        return self.execute(action, symbol, lot, profile)


class DynamicTradingAlgo:
    """High-level trade executor that orchestrates MT5 or paper trades."""

    def __init__(
        self,
        connector: Optional[Any] = None,
        *,
        instrument_profiles: Mapping[str, InstrumentProfile] | None = None,
        default_symbol: Optional[str] = None,
    ) -> None:
        base_profiles = dict(DEFAULT_INSTRUMENT_PROFILES)
        if instrument_profiles:
            for profile in instrument_profiles.values():
                if not isinstance(profile, InstrumentProfile):
                    raise TypeError("instrument_profiles must contain InstrumentProfile values")
                base_profiles[profile.symbol] = profile

        self.instrument_profiles: Dict[str, InstrumentProfile] = base_profiles
        self._alias_index: Dict[str, str] = _build_alias_index(self.instrument_profiles)
        candidate_default = default_symbol or DEFAULT_SYMBOL
        default_token = _normalise_symbol_token(candidate_default)
        canonical_default = self._alias_index.get(default_token) if default_token else None
        if canonical_default is None:
            canonical_default = default_token or DEFAULT_SYMBOL

        if canonical_default not in self.instrument_profiles:
            profile = _derive_generic_profile(canonical_default)
            self.instrument_profiles[canonical_default] = profile
            token = _normalise_symbol_token(canonical_default)
            if token:
                self._alias_index[token] = canonical_default

        self.default_symbol = canonical_default
        self._paper_broker = _PaperBroker()
        self.connector = connector or self._bootstrap_connector()

    # ----------------------------------------------------------------- execution
    def execute_trade(self, signal: Any, *, lot: float, symbol: str) -> TradeExecutionResult:
        action = self._extract_action(signal)
        canonical_symbol, profile = self._resolve_symbol(symbol)
        base_lot = self._clamp_lot(lot, profile)
        adjusted_lot = self._apply_signal_modifiers(signal, base_lot, profile)
        adjusted_lot = self._clamp_lot(adjusted_lot, profile)

        if action == ORDER_ACTION_BUY:
            return self._buy(canonical_symbol, adjusted_lot, profile=profile)
        if action == ORDER_ACTION_SELL:
            return self._sell(canonical_symbol, adjusted_lot, profile=profile)

        return TradeExecutionResult(
            retcode=0,
            message="No trade executed for neutral signal",
            profit=0.0,
            symbol=canonical_symbol,
            lot=adjusted_lot,
        )

    def _buy(
        self, symbol: str, lot: float, *, profile: InstrumentProfile | None = None
    ) -> TradeExecutionResult:
        resolved_profile = profile or self._resolve_symbol(symbol)[1]
        adjusted_lot = self._clamp_lot(lot, resolved_profile)

        if self.connector and hasattr(self.connector, "buy"):
            response = self.connector.buy(symbol, adjusted_lot)
            return self._normalise_response(response, symbol=symbol, lot=adjusted_lot)

        return self._paper_execute(ORDER_ACTION_BUY, symbol, adjusted_lot, resolved_profile)

    def _sell(
        self, symbol: str, lot: float, *, profile: InstrumentProfile | None = None
    ) -> TradeExecutionResult:
        resolved_profile = profile or self._resolve_symbol(symbol)[1]
        adjusted_lot = self._clamp_lot(lot, resolved_profile)

        if self.connector and hasattr(self.connector, "sell"):
            response = self.connector.sell(symbol, adjusted_lot)
            return self._normalise_response(response, symbol=symbol, lot=adjusted_lot)

        return self._paper_execute(ORDER_ACTION_SELL, symbol, adjusted_lot, resolved_profile)

    def execute_hedge(
        self,
        *,
        symbol: str,
        lot: float,
        side: str,
        close: bool = False,
    ) -> TradeExecutionResult:
        """Execute a hedge open/close instruction."""

        canonical_symbol, profile = self._resolve_symbol(symbol)
        adjusted_lot = self._clamp_lot(lot, profile)

        if close:
            return self._close_hedge(canonical_symbol, adjusted_lot, side, profile=profile)
        return self._open_hedge(canonical_symbol, adjusted_lot, side, profile=profile)

    def _open_hedge(
        self,
        symbol: str,
        lot: float,
        side: str,
        *,
        profile: InstrumentProfile,
    ) -> TradeExecutionResult:
        if self.connector and hasattr(self.connector, "open_hedge"):
            response = self.connector.open_hedge(symbol, lot, side)
            return self._normalise_response(response, symbol=symbol, lot=lot)

        action = ORDER_ACTION_BUY if side.upper() == "LONG_HEDGE" else ORDER_ACTION_SELL
        return self._paper_execute(action, symbol, lot, profile)

    def _close_hedge(
        self,
        symbol: str,
        lot: float,
        side: str,
        *,
        profile: InstrumentProfile,
    ) -> TradeExecutionResult:
        if self.connector and hasattr(self.connector, "close_hedge"):
            response = self.connector.close_hedge(symbol, lot, side)
            return self._normalise_response(response, symbol=symbol, lot=lot)

        action = ORDER_ACTION_SELL if side.upper() == "LONG_HEDGE" else ORDER_ACTION_BUY
        return self._paper_execute(action, symbol, lot, profile)

    # ------------------------------------------------------------------ helpers
    def _paper_execute(
        self,
        action: str,
        symbol: str,
        lot: float,
        profile: InstrumentProfile,
    ) -> TradeExecutionResult:
        return self._paper_broker.execute(action, symbol, lot, profile)

    def _normalise_response(self, response: Any, *, symbol: str, lot: float) -> TradeExecutionResult:
        if isinstance(response, TradeExecutionResult):
            return response

        retcode = getattr(response, "retcode", 0)
        profit = getattr(response, "profit", 0.0)
        ticket = getattr(response, "order", None) or getattr(response, "ticket", None)
        price = getattr(response, "price", None)
        comment = getattr(response, "comment", "")

        return TradeExecutionResult(
            retcode=retcode,
            message=comment or "Trade executed",
            profit=profit,
            ticket=ticket,
            symbol=symbol,
            lot=lot,
            price=price,
            raw_response=response,
        )

    def _extract_action(self, signal: Any) -> str:
        if hasattr(signal, "action"):
            return str(signal.action).upper()
        if isinstance(signal, dict) and "action" in signal:
            return str(signal["action"]).upper()
        return str(signal).upper()

    def _resolve_symbol(self, symbol: Optional[str]) -> tuple[str, InstrumentProfile]:
        candidate = symbol if symbol is not None else self.default_symbol
        token = _normalise_symbol_token(candidate)
        if not token:
            token = _normalise_symbol_token(self.default_symbol)
        canonical = self._alias_index.get(token)
        if canonical is None:
            canonical = token or self.default_symbol

        profile = self.instrument_profiles.get(canonical)
        if profile is None:
            profile = _derive_generic_profile(canonical)
            self.instrument_profiles[canonical] = profile
            canonical_token = _normalise_symbol_token(canonical)
            if canonical_token:
                self._alias_index[canonical_token] = canonical

        return canonical, profile

    def _clamp_lot(self, lot: float, profile: InstrumentProfile) -> float:
        try:
            value = float(lot)
        except (TypeError, ValueError):
            value = profile.min_lot
        if value <= 0:
            value = profile.min_lot
        return round(min(max(value, profile.min_lot), profile.max_lot), 4)

    def _apply_signal_modifiers(
        self, signal: Any, lot: float, profile: InstrumentProfile
    ) -> float:
        multiplier = 1.0

        confidence = _extract_signal_numeric(signal, "confidence", "confidence_score")
        if confidence is not None:
            multiplier *= 0.6 + 0.4 * _clamp_unit(confidence)

        conviction = _extract_signal_numeric(signal, "conviction", "strength", "probability")
        if conviction is not None:
            multiplier *= 0.7 + 0.3 * _clamp_unit(conviction)

        urgency = _extract_signal_numeric(signal, "urgency", "velocity", "timing")
        if urgency is not None:
            multiplier *= 0.85 + 0.3 * _clamp_unit(urgency)

        risk = _extract_signal_numeric(signal, "risk", "risk_score", "drawdown_risk")
        if risk is not None:
            multiplier *= max(0.1, 1.0 - 0.5 * _clamp_unit(risk))

        volatility = _extract_signal_numeric(signal, "volatility", "volatility_score", "turbulence")
        if volatility is not None:
            multiplier *= max(0.25, 1.0 - 0.4 * _clamp_unit(volatility))

        size_multiplier = _extract_signal_numeric(signal, "size_multiplier", "lot_multiplier")
        if size_multiplier is not None and size_multiplier > 0.0:
            multiplier *= size_multiplier

        adjusted = lot * multiplier

        min_hint = _coerce_positive(
            _extract_signal_numeric(signal, "min_lot", "min_position", "floor")
        )
        if min_hint is not None:
            adjusted = max(adjusted, min_hint)

        max_hint = _coerce_positive(
            _extract_signal_numeric(signal, "max_lot", "max_position", "ceiling")
        )

        notional_cap = _coerce_positive(
            _extract_signal_numeric(signal, "notional_cap", "max_notional", "exposure_cap")
        )
        if notional_cap is not None and profile.reference_price > 0:
            allowed = notional_cap / max(profile.reference_price, profile.tick_size)
            if max_hint is None:
                max_hint = allowed
            else:
                max_hint = min(max_hint, allowed)

        if max_hint is not None:
            adjusted = min(adjusted, max_hint)

        return adjusted

    def _bootstrap_connector(self) -> Any:
        if MT5Connector is None:
            return self._paper_broker
        try:
            return MT5Connector()
        except Exception:
            return self._paper_broker


__all__ = [
    "InstrumentProfile",
    "DynamicTradingAlgo",
    "TradeExecutionResult",
    "ORDER_ACTION_BUY",
    "ORDER_ACTION_SELL",
    "SUCCESS_RETCODE",
    "normalise_symbol",
]
