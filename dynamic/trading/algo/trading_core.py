"""Execution layer that bridges AI guidance with MT5/Exness trades."""

from __future__ import annotations

import math
import random
from copy import deepcopy
from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Mapping, Optional, Tuple

try:  # pragma: no cover - optional dependency
    from integrations.mt5_connector import MT5Connector  # type: ignore
except Exception:  # pragma: no cover - keep module importable if MT5 deps missing
    MT5Connector = None  # type: ignore

from dynamic_metadata import ModelVersion, VersionNumber

ORDER_ACTION_BUY = "BUY"
ORDER_ACTION_SELL = "SELL"
SUCCESS_RETCODE = 10009


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


ALGO_VERSION_INFO = ModelVersion(
    name="Dynamic Algo",
    number=VersionNumber(major=0, minor=2),
).with_source("dynamic.trading.algo.trading_core")
ALGO_VERSION = ALGO_VERSION_INFO.tag


def _default_version_info() -> Dict[str, Any]:
    return ALGO_VERSION_INFO.as_dict()


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


_TRUE_FLAG_VALUES = {"true", "yes", "on", "1", "enable", "enabled"}
_FALSE_FLAG_VALUES = {"false", "no", "off", "0", "disable", "disabled"}


_SIGNAL_NUMERIC_LOOKUPS: Dict[str, tuple[str, ...]] = {
    "confidence": ("confidence", "confidence_score"),
    "conviction": ("conviction", "strength", "probability"),
    "urgency": ("urgency", "velocity", "timing"),
    "risk": ("risk", "risk_score", "drawdown_risk"),
    "volatility": ("volatility", "volatility_score", "turbulence"),
    "size_multiplier": ("size_multiplier", "lot_multiplier", "scale", "boost"),
    "edge": ("edge", "edge_score", "alpha", "edge_probability"),
    "reward": ("reward", "reward_score", "risk_reward", "rr"),
    "heat": ("portfolio_heat", "heat", "exposure_utilization", "book_utilisation"),
    "drawdown": ("drawdown", "max_drawdown", "floating_drawdown"),
    "implied_volatility": (
        "implied_volatility",
        "expected_volatility",
        "signal_volatility",
        "forecast_volatility",
    ),
    "liquidity": ("liquidity", "market_liquidity", "depth_score"),
    "slippage": ("slippage", "slippage_estimate", "impact_cost"),
}

_BAND_METRIC_CONFIG: tuple[tuple[str, float, float], ...] = (
    ("confidence", 0.6, 1.0),
    ("conviction", 0.7, 1.0),
    ("urgency", 0.85, 1.15),
    ("edge", 0.85, 1.3),
    ("reward", 0.95, 1.2),
)

_RISK_METRIC_CONFIG: tuple[tuple[str, float, float], ...] = (
    ("risk", 0.5, 0.5),
    ("drawdown", 0.35, 0.5),
    ("heat", 0.4, 0.45),
)


def _interpret_flag(value: Any) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if not math.isfinite(float(value)):
            return None
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in _TRUE_FLAG_VALUES:
            return True
        if lowered in _FALSE_FLAG_VALUES:
            return False
    return None


def _extract_signal_section(signal: Any, *keys: str) -> Any:
    for key in keys:
        candidate: Any
        if isinstance(signal, Mapping) and key in signal:
            candidate = signal[key]
        elif hasattr(signal, key):
            candidate = getattr(signal, key)
        else:
            continue
        if callable(candidate):
            continue
        return candidate
    return None


def _normalise_signal_metrics(signal: Any) -> Dict[str, float | None]:
    metrics: Dict[str, float | None] = {}
    for name, keys in _SIGNAL_NUMERIC_LOOKUPS.items():
        metrics[name] = _extract_signal_numeric(signal, *keys)
    return metrics


def _band_scale(value: float | None, *, low: float, high: float) -> float:
    if value is None:
        return 1.0
    if not math.isfinite(low) or not math.isfinite(high):
        return 1.0
    bounded = _clamp_unit(value)
    return max(0.0, low + (high - low) * bounded)


def _risk_suppression(value: float | None, *, floor: float, intensity: float) -> float:
    if value is None:
        return 1.0
    bounded = _clamp_unit(abs(value))
    suppression = 1.0 - bounded * intensity
    return max(floor, suppression)


def _liquidity_penalty(liquidity: float | None, slippage: float | None) -> float:
    penalty = 1.0
    if liquidity is not None:
        availability = _clamp_unit(liquidity)
        penalty *= 0.6 + 0.4 * availability
    if slippage is not None:
        impact = _clamp_unit(slippage)
        penalty *= max(0.5, 1.0 - 0.5 * impact)
    return max(0.3, penalty)


def _volatility_alignment(
    profile: InstrumentProfile,
    implied_volatility: float | None,
    market_volatility: float | None,
) -> float:
    candidate = _coerce_positive(implied_volatility)
    if candidate is None:
        candidate = _coerce_positive(market_volatility)
    if candidate is None:
        return 1.0

    # Signals often provide volatility metrics normalised between ``0`` and ``1``.
    # We treat the value as a direct penalty factor so calmer markets keep sizing
    # intact while turbulent conditions progressively suppress lot sizes. The
    # clamp avoids negative multipliers and ensures we never boost exposure based
    # solely on volatility.
    bounded = _clamp_unit(candidate)
    penalty = 1.0 - 0.4 * bounded
    return max(0.5, penalty)


def _normalise_sizing_candidate(candidate: Any) -> Dict[str, Any] | None:
    if candidate is None:
        return None
    if isinstance(candidate, Mapping):
        return {str(key): value for key, value in candidate.items()}
    if is_dataclass(candidate):
        try:
            return asdict(candidate)
        except Exception:
            return None
    to_dict = getattr(candidate, "to_dict", None)
    if callable(to_dict):
        try:
            mapping = to_dict()
        except Exception:
            mapping = None
        else:
            if isinstance(mapping, Mapping):
                return dict(mapping)
    as_dict_method = getattr(candidate, "_asdict", None)
    if callable(as_dict_method):
        mapping = as_dict_method()
        if isinstance(mapping, Mapping):
            return dict(mapping)
    if hasattr(candidate, "__dict__"):
        return {
            key: value
            for key, value in vars(candidate).items()
            if not key.startswith("_")
        }
    if isinstance(candidate, (list, tuple)):
        try:
            mapping = dict(candidate)
        except Exception:
            return None
        return {str(key): value for key, value in mapping.items()}
    return None


def _apply_sizing_directives(
    signal: Any, lot: float, profile: InstrumentProfile
) -> float:
    sizing_candidate = _extract_signal_section(
        signal,
        "sizing",
        "position_sizing",
        "position_size",
        "target_position",
        "allocation",
    )
    sizing_payload = _normalise_sizing_candidate(sizing_candidate)
    if not sizing_payload:
        return lot

    for key in ("payload", "value", "data"):
        nested = _normalise_sizing_candidate(sizing_payload.get(key))
        if nested:
            for nested_key, nested_value in nested.items():
                sizing_payload.setdefault(nested_key, nested_value)

    if _interpret_flag(sizing_payload.get("disabled")) is True:
        return lot
    apply_flag = _interpret_flag(sizing_payload.get("apply"))
    if apply_flag is False:
        return lot
    enabled_flag = _interpret_flag(sizing_payload.get("enabled"))
    if enabled_flag is False:
        return lot

    base_result = lot

    reference = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "reference_price",
            "price",
            "entry_price",
            "mid_price",
            "mark",
        )
    )
    if reference is None or reference <= 0.0:
        reference = profile.reference_price or profile.tick_size or 1.0
    reference = max(reference, profile.tick_size, 1e-9)

    leverage = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "leverage",
            "target_leverage",
            "gear",
            "notional_leverage",
        )
    )
    if leverage is None:
        leverage = 1.0

    candidate_result: float | None = None

    exposure = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "exposure",
            "target_exposure",
            "gross_exposure",
        )
    )
    if exposure is not None:
        candidate_result = exposure / reference

    if candidate_result is None:
        notional = _coerce_positive(
            _extract_signal_numeric(
                sizing_payload,
                "notional",
                "target_notional",
                "notional_value",
            )
        )
        if notional is None:
            equity = _coerce_positive(
                _extract_signal_numeric(
                    sizing_payload,
                    "equity",
                    "account_equity",
                    "capital",
                    "balance",
                    "portfolio_equity",
                )
            )
            fraction = _coerce_positive(
                _extract_signal_numeric(
                    sizing_payload,
                    "risk_fraction",
                    "capital_fraction",
                    "equity_fraction",
                    "allocation",
                    "risk_percent",
                    "capital_percent",
                )
            )
            if equity is not None and fraction is not None:
                fraction_value = fraction if fraction <= 1.0 else fraction / 100.0
                notional = equity * max(fraction_value, 0.0)
        if notional is not None:
            candidate_result = (notional * leverage) / reference

    direct_lot = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "lot",
            "lots",
            "quantity",
            "size",
            "target_lot",
            "target",
        )
    )
    if direct_lot is not None:
        candidate_result = direct_lot

    delta = _extract_signal_numeric(
        sizing_payload,
        "delta",
        "lot_delta",
        "adjustment",
        "increment",
        "lot_adjustment",
    )
    if delta is not None:
        base = candidate_result if candidate_result is not None else base_result
        candidate_result = base + delta

    scale_hint = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "multiplier",
            "scale",
            "weight",
            "lot_multiplier",
        )
    )
    if scale_hint is not None:
        base = candidate_result if candidate_result is not None else base_result
        candidate_result = base * scale_hint

    if candidate_result is None:
        candidate_result = base_result

    floor = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "min_lot",
            "floor",
            "min",
            "lot_floor",
        )
    )
    if floor is not None:
        candidate_result = max(candidate_result, floor)

    ceiling = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "max_lot",
            "ceiling",
            "max",
            "lot_ceiling",
        )
    )

    notional_cap = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "notional_cap",
            "max_notional",
            "exposure_cap",
        )
    )
    if notional_cap is not None:
        allowed = notional_cap / reference
        if ceiling is None or allowed < ceiling:
            ceiling = allowed

    if ceiling is not None:
        candidate_result = min(candidate_result, ceiling)

    step = _coerce_positive(
        _extract_signal_numeric(
            sizing_payload,
            "lot_step",
            "step",
            "increment_size",
        )
    )
    if step is not None:
        step = max(step, 1e-9)
        candidate_result = round(round(candidate_result / step) * step, 8)

    precision_hint = _extract_signal_numeric(
        sizing_payload,
        "lot_precision",
        "precision",
    )
    if precision_hint is not None:
        try:
            decimals = max(0, int(round(float(precision_hint))))
        except (TypeError, ValueError):
            decimals = None
        if decimals is not None:
            candidate_result = round(candidate_result, decimals)

    if not math.isfinite(candidate_result):
        return base_result

    return candidate_result


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
    version: str = ALGO_VERSION
    version_info: Dict[str, Any] = field(default_factory=_default_version_info)
    generated_at: datetime = field(default_factory=_utcnow)

    @property
    def ok(self) -> bool:
        return self.retcode == SUCCESS_RETCODE

    def __post_init__(self) -> None:
        if self.generated_at.tzinfo is None:
            self.generated_at = self.generated_at.replace(tzinfo=timezone.utc)
        else:
            self.generated_at = self.generated_at.astimezone(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "retcode": self.retcode,
            "message": self.message,
            "profit": self.profit,
            "version": self.version,
            "generated_at": self.generated_at.isoformat(),
        }
        if self.ticket is not None:
            payload["ticket"] = self.ticket
        if self.symbol is not None:
            payload["symbol"] = self.symbol
        if self.lot is not None:
            payload["lot"] = self.lot
        if self.price is not None:
            payload["price"] = self.price
        if self.raw_response is not None:
            payload["raw_response"] = self.raw_response
        payload["version_info"] = deepcopy(self.version_info)
        return payload


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
        version: ModelVersion | Mapping[str, Any] | str | None = ALGO_VERSION,
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
        self._version, self._version_metadata = self._coerce_version(version)

    @property
    def version_metadata(self) -> Dict[str, Any]:
        return deepcopy(self._version_metadata)

    def _coerce_version(
        self, version: ModelVersion | Mapping[str, Any] | str | None
    ) -> Tuple[str, Dict[str, Any]]:
        if isinstance(version, ModelVersion):
            info = version.as_dict()
            return version.tag, info
        if isinstance(version, Mapping):
            metadata = dict(version)
            label = str(
                metadata.get("version")
                or metadata.get("tag")
                or metadata.get("label")
                or ""
            ).strip()
            if not label:
                label = ALGO_VERSION
            metadata.setdefault("name", metadata.get("name", ALGO_VERSION_INFO.name))
            metadata.setdefault("number", ALGO_VERSION_INFO.number.to_dict())
            metadata.setdefault(
                "build_timestamp",
                metadata.get("build_timestamp", ALGO_VERSION_INFO.build_timestamp.isoformat()),
            )
            metadata.setdefault("source", metadata.get("source", "override"))
            metadata["version"] = label
            return label, metadata
        if isinstance(version, str):
            label = version.strip() or ALGO_VERSION
        elif version is None:
            label = ALGO_VERSION
        else:
            label = str(version).strip() or ALGO_VERSION
        metadata = ALGO_VERSION_INFO.as_dict()
        if label != ALGO_VERSION:
            metadata = {**metadata, "version": label, "source": "override"}
        return label, metadata

    @property
    def version(self) -> str:
        return self._version

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
            version=self._version,
            version_info=self.version_metadata,
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
        result = self._paper_broker.execute(action, symbol, lot, profile)
        result.version = self._version
        result.version_info = self.version_metadata
        return result

    def _normalise_response(self, response: Any, *, symbol: str, lot: float) -> TradeExecutionResult:
        if isinstance(response, TradeExecutionResult):
            response.version = self._version
            response.version_info = self.version_metadata
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
            version=self._version,
            version_info=self.version_metadata,
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
        metrics = _normalise_signal_metrics(signal)
        multiplier = 1.0

        for name, low, high in _BAND_METRIC_CONFIG:
            multiplier *= _band_scale(metrics.get(name), low=low, high=high)

        for name, floor, intensity in _RISK_METRIC_CONFIG:
            multiplier *= _risk_suppression(
                metrics.get(name), floor=floor, intensity=intensity
            )

        multiplier *= _liquidity_penalty(
            metrics.get("liquidity"), metrics.get("slippage")
        )
        multiplier *= _volatility_alignment(
            profile,
            metrics.get("implied_volatility"),
            metrics.get("volatility"),
        )

        size_multiplier = metrics.get("size_multiplier")
        if size_multiplier is not None and size_multiplier > 0.0:
            multiplier *= size_multiplier

        if not math.isfinite(multiplier) or multiplier <= 0.0:
            multiplier = 1.0
        else:
            multiplier = max(multiplier, 0.05)

        adjusted = lot * multiplier

        adjusted = _apply_sizing_directives(signal, adjusted, profile)

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
