"""High-level trade decision engine powered by a Lorentzian k-NN classifier.

This module provides a Python implementation of the Lorentzian classification
logic used by the MetaTrader 5 expert advisor bundled with the Dynamic Capital
repository.  It mirrors the behaviour of the original MQL5 strategy while being
framework agnostic so it can run inside research notebooks, Supabase Edge
Functions, or bespoke automation services.

The implementation attempts to reuse the feature engineering utilities and
kernel helpers published in the jdehorty Hugging Face repositories.  The modules
can be referenced with the shorthand path syntax used by Dynamic Codex, e.g.
``"jdehorty/MLExtensions/2"``.  When those dependencies are not available the
trade logic gracefully falls back to built-in implementations so the strategy
remains operational in air-gapped environments.
"""

from __future__ import annotations

import importlib
import logging
import math
import pickle
import sys
from copy import deepcopy
from heapq import nsmallest
from collections import OrderedDict, deque
from dataclasses import asdict, dataclass, field, fields
from datetime import UTC, date, datetime, timedelta
from types import ModuleType, SimpleNamespace
from typing import TYPE_CHECKING, Any, Callable, Dict, Iterable, Iterator, List, Literal, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())


if TYPE_CHECKING:  # pragma: no cover - import cycles avoided at runtime
    from .grok_advisor import AdvisorFeedback, TradeAdvisor


# ---------------------------------------------------------------------------
# Remote module loader
# ---------------------------------------------------------------------------


def _load_remote_module(module_spec: str) -> ModuleType | SimpleNamespace:
    """Load a module that may live in a remote Hugging Face repository.

    The Dynamic Capital research environment references a handful of reusable
    utilities that are distributed via Hugging Face Spaces.  Dynamic Codex uses
    a slash-delimited syntax (``owner/repo/revision``) to reference those
    resources.  This helper understands the shorthand and will attempt to
    download the repository snapshot when the package is not already available
    locally.

    Parameters
    ----------
    module_spec:
        Either a standard Python module path (``package.module``) or a
        Hugging Face style identifier of the form ``owner/repo/revision``.

    Returns
    -------
    ModuleType | SimpleNamespace
        The imported module or a placeholder namespace when the dependency
        could not be resolved.  Callers should always be prepared for the
        fallback scenario.
    """

    if "/" not in module_spec:
        return importlib.import_module(module_spec)

    repo_path, revision = module_spec.rsplit("/", 1)
    module_name = repo_path.split("/")[-1].replace("-", "_")

    # Attempt a regular import first – the package may already be installed.
    try:
        return importlib.import_module(module_name)
    except ImportError:
        pass

    try:
        from huggingface_hub import snapshot_download  # type: ignore
    except Exception as exc:  # pragma: no cover - optional dependency
        logger.warning(
            "huggingface_hub is required to fetch %s: %s", module_spec, exc
        )
        return SimpleNamespace()

    last_error: Exception | None = None
    for repo_type in (None, "model", "dataset", "space"):
        download_kwargs = {
            "repo_id": repo_path,
            "revision": revision,
        }
        if repo_type is not None:
            download_kwargs["repo_type"] = repo_type
        try:
            local_dir = snapshot_download(**download_kwargs)
        except Exception as exc:  # pragma: no cover - network variability
            last_error = exc
            continue

        if local_dir not in sys.path:
            sys.path.insert(0, local_dir)
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:  # pragma: no cover - module layout mismatch
            last_error = exc
            continue
        logger.info("Loaded %s from Hugging Face snapshot %s", module_spec, local_dir)
        return module

    if last_error is not None:
        logger.warning("Failed to load %s: %s", module_spec, last_error)
    return SimpleNamespace()


ml = _load_remote_module("jdehorty/MLExtensions/2")
kernels = _load_remote_module("jdehorty/KernelFunctions/2")


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class FeatureRow:
    """Historical feature sample with an optional forward-looking label."""

    features: tuple[float, ...]
    close: float
    timestamp: datetime
    label: Optional[int] = None
    persisted: bool = False


@dataclass(slots=True)
class LabeledFeature:
    """Immutable sample used for offline training and persistence."""

    features: tuple[float, ...]
    label: int
    close: float
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class SMCZone:
    """Discretionary supply/demand zone surfaced by analysts or detectors."""

    name: str
    price: float
    side: Literal["supply", "demand"]
    role: Literal["continuation", "reversal"]
    strength: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class MarketSnapshot:
    """Normalized view of the market data required by the strategy.

    The optional ``smc_zones`` field carries discretionary supply/demand bases
    so :class:`SMCAnalyzer` can align continuation and reversal logic with desk
    markups.
    """

    symbol: str
    timestamp: datetime
    close: float
    rsi_fast: float
    adx_fast: float
    rsi_slow: float
    adx_slow: float
    pip_size: float
    pip_value: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    daily_high: Optional[float] = None
    daily_low: Optional[float] = None
    previous_daily_high: Optional[float] = None
    previous_daily_low: Optional[float] = None
    weekly_high: Optional[float] = None
    weekly_low: Optional[float] = None
    previous_week_high: Optional[float] = None
    previous_week_low: Optional[float] = None
    correlation_scores: Optional[Dict[str, float]] = None
    seasonal_bias: Optional[float] = None
    seasonal_confidence: Optional[float] = None
    mechanical_velocity: Optional[float] = None
    mechanical_acceleration: Optional[float] = None
    mechanical_jerk: Optional[float] = None
    mechanical_energy: Optional[float] = None
    mechanical_stress_ratio: Optional[float] = None
    mechanical_state: Optional[str] = None
    smc_zones: Optional[Sequence[SMCZone | Dict[str, Any]]] = None

    def feature_vector(self) -> tuple[float, ...]:
        mechanical_features = (
            float(self.mechanical_velocity) if self.mechanical_velocity is not None else 0.0,
            float(self.mechanical_acceleration) if self.mechanical_acceleration is not None else 0.0,
            float(self.mechanical_jerk) if self.mechanical_jerk is not None else 0.0,
            float(self.mechanical_energy) if self.mechanical_energy is not None else 0.0,
            float(self.mechanical_stress_ratio) if self.mechanical_stress_ratio is not None else 0.0,
            self.mechanical_state_score(),
        )
        return (
            self.rsi_fast,
            self.adx_fast,
            self.rsi_slow,
            self.adx_slow,
            *mechanical_features,
        )

    def mechanical_state_score(self) -> float:
        mapping = {
            "Bullish": 1.0,
            "Bearish": -1.0,
            "Turbulent": 0.3,
        }
        if self.mechanical_state is None:
            return 0.0
        return mapping.get(self.mechanical_state, 0.0)

    def mechanical_bias(self) -> float:
        """Return a directional bias derived from mechanical analytics."""

        def _sign(value: Optional[float], threshold: float = 1e-6) -> float:
            if value is None:
                return 0.0
            if value > threshold:
                return 1.0
            if value < -threshold:
                return -1.0
            return 0.0

        bias = self.mechanical_state_score()
        bias += 0.6 * _sign(self.mechanical_velocity)
        bias += 0.3 * _sign(self.mechanical_acceleration)
        bias += 0.1 * _sign(self.mechanical_jerk)

        energy = float(self.mechanical_energy) if self.mechanical_energy else 0.0
        stress = float(self.mechanical_stress_ratio) if self.mechanical_stress_ratio else 0.0

        # Normalise energy to a 0-1 factor and dampen when stress is elevated.
        energy_factor = min(max(energy, 0.0), 5.0) / 5.0
        stress_penalty = max(0.0, min(stress, 5.0)) / 5.0
        amplifier = 0.5 + 0.5 * energy_factor
        damping = 1.0 - 0.5 * stress_penalty

        return max(-2.0, min(2.0, bias * amplifier * damping))


@dataclass(slots=True)
class TradeSignal:
    """Output of the Lorentzian k-NN model."""

    direction: int
    confidence: float
    votes: int
    neighbors_considered: int


@dataclass(slots=True)
class TradeDecision:
    """Action emitted by the trade engine."""

    action: Literal["open", "close", "modify"]
    symbol: str
    direction: Optional[int] = None
    size: Optional[float] = None
    entry: Optional[float] = None
    exit: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    reason: str = ""
    signal: Optional[TradeSignal] = None
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ActivePosition:
    """Simplified representation of an open trade."""

    symbol: str
    direction: int
    size: float
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    opened_at: Optional[datetime] = None


@dataclass(slots=True)
class TradeConfig:
    """Configuration parameters for :class:`TradeLogic`."""

    neighbors: int = 8
    max_rows: int = 2_000
    label_lookahead: int = 4
    neutral_zone_pips: float = 2.0
    knn_recency_halflife_minutes: Optional[float] = None
    manual_stop_loss_pips: float = 30.0
    manual_take_profit_pips: float = 60.0
    break_even_pips: float = 10.0
    trail_start_pips: float = 25.0
    trail_step_pips: float = 15.0
    use_adr: bool = True
    adr_period: int = 14
    adr_stop_loss_factor: float = 0.5
    adr_take_profit_factor: float = 1.0
    min_confidence: float = 0.0
    correlation_threshold: float = 0.6
    correlation_weight: float = 0.5
    max_correlation_adjustment: float = 0.4
    seasonal_bias_weight: float = 0.5
    max_seasonal_adjustment: float = 0.3
    use_smc_context: bool = True
    smc_level_threshold_pips: float = 10.0
    smc_round_number_interval_pips: float = 50.0
    smc_structure_lookback: int = 12
    smc_structure_threshold_pips: float = 6.0
    smc_bias_weight: float = 0.15
    smc_liquidity_weight: float = 0.1
    max_smc_adjustment: float = 0.25


@dataclass(slots=True)
class RiskParameters:
    """Risk controls used by :class:`RiskManager`."""

    balance: float = 10_000.0
    risk_per_trade: float = 0.01
    pip_value_per_standard_lot: float = 10.0
    min_lot: float = 0.01
    lot_step: float = 0.01
    max_lot: Optional[float] = None
    max_positions_per_symbol: int = 1
    max_total_positions: int = 3
    max_daily_drawdown_pct: Optional[float] = None


# ---------------------------------------------------------------------------
# Smart Money Concepts (SMC) context analyser
# ---------------------------------------------------------------------------


class SMCAnalyzer:
    """Derives lightweight SMC context to enrich trade decisions.

    In addition to standard session levels, the analyzer now considers
    discretionary :class:`SMCZone` definitions so continuation bases can boost
    aligned trades while nearby supply/demand still gates opposing setups.
    """

    def __init__(self, config: TradeConfig) -> None:
        self.config = config
        lookback = max(2, int(config.smc_structure_lookback))
        self._lookback = lookback
        self._high_window: deque[float] = deque(maxlen=lookback)
        self._low_window: deque[float] = deque(maxlen=lookback)
        self._previous_close: Optional[float] = None
        self._structure_bias: int = 0
        self._last_context: Optional[Dict[str, Any]] = None

    def observe(self, snapshot: MarketSnapshot) -> Dict[str, Any]:
        """Update internal state with the latest snapshot and return context."""

        context = self._compute_context(snapshot)
        self._last_context = context
        return context

    def apply(self, signal: TradeSignal) -> tuple[float, Dict[str, Any]]:
        """Compute the SMC-driven confidence modifier for a signal."""

        if self._last_context is None:
            return 1.0, {"enabled": False, "modifier": 1.0, "reason": "insufficient_history"}

        base = self._last_context
        structure_context = dict(base["structure"])
        levels_base = base["levels"]
        levels_context = {
            "near": [dict(level) for level in levels_base["near"]],
            "swept": [dict(level) for level in levels_base["swept"]],
            "pressure": {
                "long": list(levels_base["pressure"]["long"]),
                "short": list(levels_base["pressure"]["short"]),
            },
            "threshold_pips": levels_base["threshold_pips"],
            "round_number_interval_pips": levels_base["round_number_interval_pips"],
            "all_levels": [dict(level) for level in levels_base["all_levels"]],
            "pip_size": levels_base.get("pip_size", 0.0),
        }
        pressure_detail = levels_base.get("pressure_detail")
        if pressure_detail:
            levels_context["pressure_detail"] = {
                "long": [dict(level) for level in pressure_detail.get("long", [])],
                "short": [dict(level) for level in pressure_detail.get("short", [])],
            }
        if "zones" in levels_base:
            levels_context["zones"] = [dict(zone) for zone in levels_base.get("zones", [])]
        if base["levels"].get("round_number") is not None:
            levels_context["round_number"] = dict(levels_base["round_number"])

        history_ready = bool(base.get("history_ready", False))
        components: Dict[str, float] = {
            "structure_alignment": 0.0,
            "sms_penalty": 0.0,
            "liquidity_penalty": 0.0,
        }
        if not history_ready:
            structure_context["applied_adjustment"] = 0.0
            meta = {
                "enabled": True,
                "structure": structure_context,
                "levels": levels_context,
                "components": components,
                "liquidity": {"penalised_levels": [], "penalty": 0.0},
                "adjustment": 0.0,
                "modifier": 1.0,
            }
            return 1.0, meta

        structure_adjustment = 0.0
        liquidity_adjustment = 0.0
        penalty_strength = 0.0
        support_strength = 0.0
        penalised_levels: List[str] = []
        supportive_levels: List[str] = []

        bias = structure_context.get("bias", 0)
        sms = bool(structure_context.get("sms", False))

        if signal.direction != 0 and bias != 0:
            alignment = 1.0 if bias == signal.direction else -1.0
            structure_adjustment += alignment * self.config.smc_bias_weight
            components["structure_alignment"] = alignment * self.config.smc_bias_weight

        if sms:
            sms_penalty = self.config.smc_bias_weight * 0.5
            structure_adjustment -= sms_penalty
            components["sms_penalty"] = -sms_penalty

        base_weight = max(0.0, self.config.smc_liquidity_weight)
        if signal.direction != 0 and base_weight > 0.0:
            pip_size = float(levels_base.get("pip_size", 0.0))
            tolerance = pip_size * 0.5 if pip_size > 0 else 1e-6
            penalty_clusters: Dict[tuple[str, str, int], float] = {}
            support_clusters: Dict[tuple[str, str, int], float] = {}

            def _cluster_key(value: float, relation: str, effect: str) -> tuple[str, str, int]:
                bucket = 0
                if tolerance > 0:
                    bucket = int(round(value / tolerance))
                return (effect, relation, bucket)

            for level in levels_context.get("near", []):
                name = str(level.get("name", "")) or "level"
                relation = str(level.get("relation", ""))
                if relation not in {"above", "below", "at"}:
                    continue
                try:
                    strength_value = float(level.get("strength", 1.0))
                except (TypeError, ValueError):
                    strength_value = 1.0
                strength_value = max(0.0, strength_value)
                role = str(level.get("role", "")).lower()
                role_multiplier = 1.0
                if role == "continuation":
                    role_multiplier = 1.2
                elif role == "reversal":
                    role_multiplier = 0.9
                weight = base_weight * strength_value * role_multiplier
                if math.isclose(weight, 0.0, abs_tol=1e-9):
                    continue
                bias_direction = int(level.get("bias_direction", 0))
                if bias_direction > 0:
                    bias_direction = 1
                elif bias_direction < 0:
                    bias_direction = -1
                applied = False
                if bias_direction == 0:
                    if signal.direction > 0 and relation in {"above", "at"}:
                        key = None
                        if isinstance(level.get("value"), (int, float)):
                            key = _cluster_key(float(level["value"]), relation, "penalty")
                            previous = penalty_clusters.get(key)
                        else:
                            previous = None
                        if previous is None or weight > previous:
                            delta = weight - (previous or 0.0)
                            penalty_strength += delta
                            penalised_levels.append(name)
                            if key is not None:
                                penalty_clusters[key] = weight
                        applied = True
                    elif signal.direction < 0 and relation in {"below", "at"}:
                        key = None
                        if isinstance(level.get("value"), (int, float)):
                            key = _cluster_key(float(level["value"]), relation, "penalty")
                            previous = penalty_clusters.get(key)
                        else:
                            previous = None
                        if previous is None or weight > previous:
                            delta = weight - (previous or 0.0)
                            penalty_strength += delta
                            penalised_levels.append(name)
                            if key is not None:
                                penalty_clusters[key] = weight
                        applied = True
                else:
                    if bias_direction == signal.direction:
                        expected_relations = {1: {"below", "at"}, -1: {"above", "at"}}
                        if relation in expected_relations[bias_direction]:
                            key = None
                            if isinstance(level.get("value"), (int, float)):
                                key = _cluster_key(float(level["value"]), relation, "support")
                                previous = support_clusters.get(key)
                            else:
                                previous = None
                            if previous is None or weight > previous:
                                delta = weight - (previous or 0.0)
                                support_strength += delta
                                supportive_levels.append(name)
                                if key is not None:
                                    support_clusters[key] = weight
                            applied = True
                        else:
                            key = None
                            if isinstance(level.get("value"), (int, float)):
                                key = _cluster_key(float(level["value"]), relation, "penalty")
                                previous = penalty_clusters.get(key)
                            else:
                                previous = None
                            if previous is None or weight > previous:
                                delta = weight - (previous or 0.0)
                                penalty_strength += delta
                                penalised_levels.append(name)
                                if key is not None:
                                    penalty_clusters[key] = weight
                            applied = True
                    else:
                        key = None
                        if isinstance(level.get("value"), (int, float)):
                            key = _cluster_key(float(level["value"]), relation, "penalty")
                            previous = penalty_clusters.get(key)
                        else:
                            previous = None
                        if previous is None or weight > previous:
                            delta = weight - (previous or 0.0)
                            penalty_strength += delta
                            penalised_levels.append(name)
                            if key is not None:
                                penalty_clusters[key] = weight
                        applied = True
                if not applied and relation == "at":
                    key = None
                    if isinstance(level.get("value"), (int, float)):
                        key = _cluster_key(float(level["value"]), relation, "penalty")
                        previous = penalty_clusters.get(key)
                    else:
                        previous = None
                    if previous is None or weight > previous:
                        delta = weight - (previous or 0.0)
                        penalty_strength += delta
                        penalised_levels.append(name)
                        if key is not None:
                            penalty_clusters[key] = weight

        liquidity_adjustment = support_strength - penalty_strength
        components["liquidity_penalty"] = liquidity_adjustment

        adjustment = structure_adjustment + liquidity_adjustment
        max_adjust = max(0.0, self.config.max_smc_adjustment)
        modifier = 1.0 + adjustment
        lower_bound = max(0.0, 1.0 - max_adjust)
        upper_bound = 1.0 + max_adjust
        modifier = max(lower_bound, min(modifier, upper_bound))

        structure_context["applied_adjustment"] = structure_adjustment
        meta = {
            "enabled": True,
            "structure": structure_context,
            "levels": levels_context,
            "components": components,
            "liquidity": {
                "penalised_levels": penalised_levels,
                "supportive_levels": supportive_levels,
                "penalty": penalty_strength,
                "support": support_strength,
                "net": liquidity_adjustment,
            },
            "adjustment": adjustment,
            "modifier": modifier,
        }
        return modifier, meta

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _compute_context(self, snapshot: MarketSnapshot) -> Dict[str, Any]:
        pip_size = snapshot.pip_size if snapshot.pip_size > 0 else 1.0
        structure_threshold = max(0.0, self.config.smc_structure_threshold_pips) * pip_size
        level_threshold_pips = max(0.0, self.config.smc_level_threshold_pips)
        tolerance = pip_size * 0.1

        high = snapshot.high if snapshot.high is not None else snapshot.close
        low = snapshot.low if snapshot.low is not None else snapshot.close

        prev_high = max(self._high_window) if self._high_window else None
        prev_low = min(self._low_window) if self._low_window else None

        bos: Optional[str] = None
        sms = False
        previous_bias = self._structure_bias
        structure_bias = previous_bias

        if prev_high is not None and snapshot.close >= prev_high + structure_threshold:
            bos = "bullish"
            structure_bias = 1
        elif prev_low is not None and snapshot.close <= prev_low - structure_threshold:
            bos = "bearish"
            structure_bias = -1

        if bos is not None and previous_bias not in (0, structure_bias):
            sms = True
        if bos is not None:
            self._structure_bias = structure_bias

        levels: List[Dict[str, Any]] = []

        def push_level(
            name: str,
            value: Optional[float],
            *,
            kind: str = "reference",
            bias_direction: int = 0,
            role: Optional[str] = None,
            source: Optional[str] = None,
            strength: Optional[float] = None,
            extra: Optional[Dict[str, Any]] = None,
        ) -> None:
            if value is None:
                return
            level_value = float(value)
            distance_pips = (
                abs(snapshot.close - level_value) / pip_size if pip_size > 0 else float("inf")
            )
            relation = "at"
            if level_value > snapshot.close + tolerance:
                relation = "above"
            elif level_value < snapshot.close - tolerance:
                relation = "below"
            record: Dict[str, Any] = {
                "name": name,
                "value": level_value,
                "distance_pips": float(distance_pips),
                "relation": relation,
                "kind": kind,
            }
            if bias_direction != 0:
                record["bias_direction"] = 1 if bias_direction > 0 else -1
            if role:
                record["role"] = role
            if source:
                record["source"] = source
            if strength is not None:
                try:
                    record["strength"] = max(0.0, float(strength))
                except (TypeError, ValueError):
                    record["strength"] = 1.0
            if extra:
                record.update(extra)
            levels.append(record)

        push_level("PDH", snapshot.previous_daily_high, kind="session_high", source="previous_daily_high")
        push_level("PDL", snapshot.previous_daily_low, kind="session_low", source="previous_daily_low")
        push_level("PWH", snapshot.previous_week_high, kind="session_high", source="previous_week_high")
        push_level("PWL", snapshot.previous_week_low, kind="session_low", source="previous_week_low")
        push_level("DailyHigh", snapshot.daily_high, kind="session_high", source="daily_high")
        push_level("DailyLow", snapshot.daily_low, kind="session_low", source="daily_low")
        push_level("WeeklyHigh", snapshot.weekly_high, kind="session_high", source="weekly_high")
        push_level("WeeklyLow", snapshot.weekly_low, kind="session_low", source="weekly_low")

        zones_summary: List[Dict[str, Any]] = []
        if snapshot.smc_zones:
            for raw_zone in snapshot.smc_zones:
                zone = self._normalise_zone(raw_zone)
                if zone is None:
                    continue
                zones_summary.append(dict(zone))
                push_level(
                    zone["name"],
                    zone["price"],
                    kind="smc_zone",
                    bias_direction=zone["bias_direction"],
                    role=zone["role"],
                    source=zone["side"],
                    strength=zone.get("strength"),
                    extra={"metadata": dict(zone.get("metadata", {}))},
                )

        round_number_info: Optional[Dict[str, Any]] = None
        rn_interval = max(0.0, self.config.smc_round_number_interval_pips) * pip_size
        if rn_interval >= pip_size and rn_interval > 0:
            rn_value = round(snapshot.close / rn_interval) * rn_interval
            distance_pips = abs(snapshot.close - rn_value) / pip_size if pip_size > 0 else float("inf")
            relation = "at"
            if rn_value > snapshot.close + tolerance:
                relation = "above"
            elif rn_value < snapshot.close - tolerance:
                relation = "below"
            round_number_info = {
                "name": "RN",
                "value": float(rn_value),
                "distance_pips": float(distance_pips),
                "relation": relation,
                "kind": "round_number",
                "source": "round_number",
            }
            levels.append(round_number_info)

        near_levels = sorted(
            (dict(level) for level in levels if level["distance_pips"] <= level_threshold_pips),
            key=lambda entry: entry["distance_pips"],
        )
        pressure_long = sorted({level["name"] for level in near_levels if level["relation"] in {"above", "at"}})
        pressure_short = sorted({level["name"] for level in near_levels if level["relation"] in {"below", "at"}})
        pressure_detail = {
            "long": [dict(level) for level in near_levels if level["relation"] in {"above", "at"}],
            "short": [dict(level) for level in near_levels if level["relation"] in {"below", "at"}],
        }

        cross_threshold = max(structure_threshold, pip_size)
        swept_levels: List[Dict[str, Any]] = []
        history_ready = self._previous_close is not None
        if history_ready:
            prev_close = self._previous_close
            for level in levels:
                level_value = level["value"]
                moved_pips = abs(snapshot.close - level_value) / pip_size if pip_size > 0 else float("inf")
                if prev_close <= level_value and snapshot.close >= level_value + cross_threshold:
                    swept_levels.append(
                        {
                            "name": level["name"],
                            "direction": "above",
                            "value": level_value,
                            "moved_pips": float(moved_pips),
                        }
                    )
                elif prev_close >= level_value and snapshot.close <= level_value - cross_threshold:
                    swept_levels.append(
                        {
                            "name": level["name"],
                            "direction": "below",
                            "value": level_value,
                            "moved_pips": float(moved_pips),
                        }
                    )

        self._high_window.append(float(high))
        self._low_window.append(float(low))
        self._previous_close = float(snapshot.close)

        context = {
            "enabled": True,
            "structure": {
                "bos": bos,
                "sms": sms,
                "bias": structure_bias,
                "previous_bias": previous_bias,
                "lookback": self._high_window.maxlen or self._lookback,
                "threshold_pips": self.config.smc_structure_threshold_pips,
            },
            "levels": {
                "near": near_levels,
                "swept": swept_levels,
                "pressure": {"long": pressure_long, "short": pressure_short},
                "pressure_detail": pressure_detail,
                "threshold_pips": level_threshold_pips,
                "round_number_interval_pips": self.config.smc_round_number_interval_pips,
                "all_levels": [dict(level) for level in levels],
                "pip_size": pip_size,
            },
            "history_ready": history_ready,
        }
        if round_number_info is not None:
            context["levels"]["round_number"] = dict(round_number_info)
        if zones_summary:
            context["levels"]["zones"] = [dict(zone) for zone in zones_summary]
        return context

    @staticmethod
    def _normalise_zone(zone: SMCZone | Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert an arbitrary zone payload into a normalised dictionary."""

        base: Dict[str, Any]
        if isinstance(zone, SMCZone):
            base = {
                "name": zone.name,
                "price": float(zone.price),
                "side": zone.side,
                "role": zone.role,
                "strength": zone.strength,
                "metadata": dict(zone.metadata),
            }
        elif isinstance(zone, dict):
            name = zone.get("name")
            price = zone.get("price")
            side = zone.get("side")
            role = zone.get("role")
            if name is None or price is None or side is None or role is None:
                return None
            try:
                price_value = float(price)
            except (TypeError, ValueError):
                return None
            base = {
                "name": str(name),
                "price": price_value,
                "side": str(side),
                "role": str(role),
                "strength": zone.get("strength"),
                "metadata": dict(zone.get("metadata", {})) if isinstance(zone.get("metadata"), dict) else {},
            }
        else:
            return None

        side_value = base["side"].lower()
        if side_value not in {"supply", "demand"}:
            return None
        role_value = base["role"].lower()
        if role_value not in {"continuation", "reversal"}:
            return None

        try:
            price_value = float(base["price"])
        except (TypeError, ValueError):
            return None
        if not math.isfinite(price_value):
            return None

        strength_value = base.get("strength")
        if strength_value is None:
            normalised_strength = 1.0
        else:
            try:
                normalised_strength = max(0.0, float(strength_value))
            except (TypeError, ValueError):
                normalised_strength = 1.0

        metadata = base.get("metadata")
        if not isinstance(metadata, dict):
            metadata = {}

        return {
            "name": base["name"],
            "price": price_value,
            "side": side_value,
            "role": role_value,
            "strength": normalised_strength,
            "metadata": metadata,
            "bias_direction": -1 if side_value == "supply" else 1,
        }

# ---------------------------------------------------------------------------
# Feature pipeline helpers
# ---------------------------------------------------------------------------


class OnlineFeatureScaler:
    """Simple online mean/std estimator used to normalise features."""

    def __init__(self) -> None:
        self._count = 0
        self._mean: list[float] | None = None
        self._m2: list[float] | None = None

    def _initialise(self, vector: Sequence[float]) -> None:
        self._mean = [float(v) for v in vector]
        self._m2 = [0.0 for _ in vector]
        self._count = 1

    def transform(self, values: Sequence[float], *, update: bool = True) -> tuple[float, ...]:
        vector = tuple(float(v) for v in values)
        if self._count == 0:
            if update:
                self._initialise(vector)
            return tuple(0.0 for _ in vector)

        assert self._mean is not None and self._m2 is not None

        if len(vector) != len(self._mean):
            raise ValueError("Feature dimensionality changed; cannot normalise.")

        normalised: list[float] = []
        for idx, value in enumerate(vector):
            mean = self._mean[idx]
            if self._count > 1:
                variance = self._m2[idx] / max(self._count - 1, 1)
                std = math.sqrt(variance) if variance > 1e-12 else 1.0
            else:
                std = 1.0
            normalised.append((value - mean) / std)

        if update:
            self._count += 1
            for idx, value in enumerate(vector):
                delta = value - self._mean[idx]
                self._mean[idx] += delta / self._count
                self._m2[idx] += delta * (value - self._mean[idx])

        return tuple(normalised)

    def push(self, values: Sequence[float]) -> tuple[float, ...]:
        return self.transform(values, update=True)

    def state_dict(self) -> Dict[str, Any]:
        return {
            "count": self._count,
            "mean": list(self._mean or []),
            "m2": list(self._m2 or []),
        }

    def load_state_dict(self, state: Dict[str, Any]) -> None:
        self._count = int(state.get("count", 0))
        mean = state.get("mean")
        m2 = state.get("m2")
        if mean is None or m2 is None or len(mean) != len(m2):
            self._mean = None
            self._m2 = None
            self._count = 0
            return
        self._mean = [float(v) for v in mean]
        self._m2 = [float(v) for v in m2]



class FeaturePipeline:
    """Pipeline that optionally leverages jdehorty ML helpers for scaling."""

    def __init__(self, *, scaler: Optional[object] = None) -> None:
        self._scaler = scaler or self._resolve_remote_scaler() or OnlineFeatureScaler()

    @staticmethod
    def _resolve_remote_scaler() -> Optional[object]:
        if not hasattr(ml, "__dict__"):
            return None

        candidate_names = [
            "OnlineStandardScaler",
            "OnlineStandardizer",
            "FeatureScaler",
            "RunningFeatureScaler",
            "AdaptiveScaler",
        ]
        module_name = getattr(ml, "__name__", "ml")
        for name in candidate_names:
            attr = getattr(ml, name, None)
            if attr is None:
                continue
            try:
                instance = attr()
            except Exception:
                continue
            if hasattr(instance, "push") and hasattr(instance, "transform"):
                logger.info("Using %s.%s for feature scaling", module_name, name)
                return instance
            if hasattr(instance, "transform"):
                logger.info(
                    "Wrapping %s.%s (sklearn-style scaler) for feature scaling",
                    module_name,
                    name,
                )
                return _SklearnLikeScaler(instance)
        return None

    def transform(self, values: Sequence[float], *, update: bool = True) -> tuple[float, ...]:
        scaler = self._scaler
        if isinstance(scaler, OnlineFeatureScaler):
            return scaler.transform(values, update=update)
        if isinstance(scaler, _SklearnLikeScaler):
            return scaler.transform(values, update=update)
        if hasattr(scaler, "transform") and hasattr(scaler, "partial_fit"):
            vector = [list(values)]
            if update:
                scaler.partial_fit(vector)  # type: ignore[attr-defined]
            transformed = scaler.transform(vector)  # type: ignore[attr-defined]
            return tuple(float(x) for x in transformed[0])
        if hasattr(scaler, "push"):
            if update:
                return tuple(scaler.push(values))  # type: ignore[attr-defined]
            if hasattr(scaler, "transform"):
                try:
                    return tuple(
                        scaler.transform(values, update=False)  # type: ignore[attr-defined]
                    )
                except TypeError:
                    transformed = scaler.transform([list(values)])  # type: ignore[attr-defined]
                    return tuple(float(x) for x in transformed[0])
            return tuple(scaler.push(values))  # type: ignore[attr-defined]
        if hasattr(scaler, "transform"):
            transformed = scaler.transform([list(values)])  # type: ignore[attr-defined]
            return tuple(float(x) for x in transformed[0])
        return tuple(float(v) for v in values)

    def push(self, values: Sequence[float]) -> tuple[float, ...]:
        return self.transform(values, update=True)

    def fit(self, rows: Iterable[Sequence[float]]) -> None:
        for row in rows:
            self.transform(row, update=True)

    def state_dict(self) -> Dict[str, Any]:
        scaler = self._scaler
        if isinstance(scaler, OnlineFeatureScaler):
            return {"type": "online", "state": scaler.state_dict()}
        if isinstance(scaler, _SklearnLikeScaler):
            return {"type": "sklearn", "state": scaler.state_dict()}
        if hasattr(scaler, "state_dict"):
            return {"type": "external", "state": scaler.state_dict()}  # type: ignore[attr-defined]
        try:
            payload = pickle.dumps(scaler)
        except Exception as exc:  # pragma: no cover - fallback path
            raise TypeError(f"Scaler is not serialisable: {exc}") from exc
        return {"type": "pickle", "state": payload}

    def load_state_dict(self, state: Dict[str, Any]) -> None:
        kind = state.get("type")
        payload = state.get("state")
        if kind == "online":
            scaler = OnlineFeatureScaler()
            if isinstance(payload, dict):
                scaler.load_state_dict(payload)
            self._scaler = scaler
        elif kind == "sklearn":
            self._scaler = _SklearnLikeScaler.from_state(payload)
        elif kind == "external":
            if hasattr(self._scaler, "load_state_dict"):
                self._scaler.load_state_dict(payload)  # type: ignore[attr-defined]
            else:
                self._scaler = payload
        elif kind == "pickle":
            self._scaler = pickle.loads(payload)
        else:
            raise ValueError(f"Unknown scaler state kind: {kind}")


class _SklearnLikeScaler:
    """Adapter that exposes ``push`` for sklearn-style scalers."""

    def __init__(self, scaler: object) -> None:
        self._scaler = scaler
        self._is_fitted = False

    def transform(self, values: Sequence[float], *, update: bool = True) -> tuple[float, ...]:
        vector = [list(values)]
        if update or not self._is_fitted:
            if hasattr(self._scaler, "partial_fit"):
                self._scaler.partial_fit(vector)  # type: ignore[attr-defined]
            else:
                self._scaler.fit(vector)  # type: ignore[attr-defined]
            self._is_fitted = True
        transformed = self._scaler.transform(vector)  # type: ignore[attr-defined]
        self._is_fitted = True
        return tuple(float(x) for x in transformed[0])

    def state_dict(self) -> Dict[str, Any]:
        try:
            payload = pickle.dumps(self._scaler)
        except Exception as exc:  # pragma: no cover - fallback path
            raise TypeError(f"Scaler is not serialisable: {exc}") from exc
        return {"payload": payload, "fitted": self._is_fitted}

    @classmethod
    def from_state(cls, state: Any) -> "_SklearnLikeScaler":
        if not isinstance(state, dict) or "payload" not in state:
            raise ValueError("Invalid sklearn scaler state")
        scaler = pickle.loads(state["payload"])
        instance = cls(scaler)
        instance._is_fitted = bool(state.get("fitted", False))
        return instance


# ---------------------------------------------------------------------------
# Distance helpers
# ---------------------------------------------------------------------------


def _lorentzian_distance(a: Sequence[float], b: Sequence[float]) -> float:
    return float(sum(math.log1p(abs(x - y)) for x, y in zip(a, b)))


def _resolve_distance_function() -> Callable[[Sequence[float], Sequence[float]], float]:
    if not hasattr(kernels, "__dict__"):
        return _lorentzian_distance

    candidate_names = [
        "lorentzian_distance",
        "lorentzian_metric",
        "log_kernel_distance",
        "log_distance",
        "lorentzian_kernel",
    ]
    module_name = getattr(kernels, "__name__", "kernels")
    for name in candidate_names:
        fn = getattr(kernels, name, None)
        if callable(fn):
            try:
                test_value = fn((0.0, 0.0), (0.0, 0.0))
            except Exception:
                continue
            if isinstance(test_value, (int, float)):
                logger.info("Using %s.%s as distance function", module_name, name)
                return lambda a, b, _fn=fn: float(_fn(tuple(a), tuple(b)))

    for name in dir(kernels):
        if "lorentz" not in name.lower():
            continue
        fn = getattr(kernels, name, None)
        if callable(fn):
            logger.info("Using %s.%s as distance function", module_name, name)
            return lambda a, b, _fn=fn: float(_fn(tuple(a), tuple(b)))

    return _lorentzian_distance


# ---------------------------------------------------------------------------
# Model container
# ---------------------------------------------------------------------------


class LorentzianKNNModel:
    """Standalone Lorentzian k-NN model with fit/predict semantics."""

    def __init__(
        self,
        *,
        neighbors: int,
        max_samples: Optional[int] = None,
        distance_fn: Optional[Callable[[Sequence[float], Sequence[float]], float]] = None,
        grok_weight: float = 0.6,
        deepseek_weight: float = 0.4,
        recency_halflife_minutes: Optional[float] = None,
        cache_size: int = 32,
    ) -> None:
        if neighbors <= 0:
            raise ValueError("neighbors must be positive")
        if grok_weight < 0 or deepseek_weight < 0:
            raise ValueError("advisor weights must be non-negative")
        if cache_size < 0:
            raise ValueError("cache_size cannot be negative")
        if recency_halflife_minutes is not None and recency_halflife_minutes <= 0:
            raise ValueError("recency_halflife_minutes must be positive")
        self.neighbors = neighbors
        self.max_samples = max_samples
        self.distance_fn = distance_fn or _resolve_distance_function()
        self.grok_weight = float(grok_weight)
        self.deepseek_weight = float(deepseek_weight)
        self._weight_total = self.grok_weight + self.deepseek_weight
        self._recency_halflife_minutes = (
            float(recency_halflife_minutes) if recency_halflife_minutes is not None else None
        )
        self._recency_halflife_seconds = (
            self._recency_halflife_minutes * 60.0 if self._recency_halflife_minutes else None
        )
        self._cache_capacity = 0 if self._recency_halflife_seconds else int(cache_size)
        self._samples: deque[LabeledFeature] = deque()
        self._distance_cache: OrderedDict[tuple[float, ...], tuple[int, tuple[tuple[float, int], ...]]] = (
            OrderedDict()
        )
        self._cache_generation = 0
        self._labelled_count = 0

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._samples)

    def _invalidate_cache(self) -> None:
        self._cache_generation += 1
        if self._cache_capacity == 0:
            self._distance_cache.clear()

    def _cache_key(self, features: Sequence[float]) -> tuple[float, ...]:
        return tuple(float(value) for value in features)

    def _store_cached_neighbors(
        self, features: Sequence[float], winners: Sequence[tuple[float, int]]
    ) -> None:
        if self._cache_capacity <= 0:
            return
        key = self._cache_key(features)
        payload = (self._cache_generation, tuple((float(d), int(label)) for d, label in winners))
        self._distance_cache[key] = payload
        self._distance_cache.move_to_end(key)
        if len(self._distance_cache) > self._cache_capacity:
            self._distance_cache.popitem(last=False)

    def _get_cached_neighbors(self, features: Sequence[float]) -> Optional[list[tuple[float, int]]]:
        if self._cache_capacity <= 0:
            return None
        key = self._cache_key(features)
        cached = self._distance_cache.get(key)
        if not cached:
            return None
        generation, winners = cached
        if generation != self._cache_generation:
            self._distance_cache.pop(key, None)
            return None
        self._distance_cache.move_to_end(key)
        return [tuple(pair) for pair in winners]

    def reset(self) -> None:
        self._samples.clear()
        self._distance_cache.clear()
        self._cache_generation = 0
        self._labelled_count = 0

    def fit(self, samples: Iterable[LabeledFeature]) -> None:
        self.reset()
        for sample in samples:
            self.add_sample(sample)

    def add_sample(self, sample: LabeledFeature) -> None:
        if sample.label is not None:
            self._labelled_count += 1
        self._samples.append(sample)
        if self.max_samples is not None:
            while len(self._samples) > self.max_samples:
                removed = self._samples.popleft()
                if removed.label is not None:
                    self._labelled_count -= 1
        self._invalidate_cache()

    def iter_samples(self) -> Iterator[LabeledFeature]:
        yield from self._samples

    def predict(
        self, features: Sequence[float], *, timestamp: Optional[datetime] = None
    ) -> Optional[TradeSignal]:
        if self._labelled_count < self.neighbors:
            return None

        cached = self._get_cached_neighbors(features)
        if cached is None:
            recency_seconds = self._recency_halflife_seconds

            def _distance_with_recency(sample: LabeledFeature) -> float:
                base = self.distance_fn(sample.features, features)
                if not recency_seconds or timestamp is None:
                    return base
                sample_timestamp = getattr(sample, "timestamp", None)
                if not isinstance(sample_timestamp, datetime):
                    return base
                try:
                    age = (timestamp - sample_timestamp).total_seconds()
                except Exception:
                    return base
                if age <= 0:
                    return base
                decay = 0.5 ** (age / recency_seconds)
                decay = max(decay, 1e-6)
                return base / decay

            distances_iter = (
                (_distance_with_recency(row), int(label))
                for row in self._samples
                if (label := row.label) is not None
            )
            winners = nsmallest(self.neighbors, distances_iter, key=lambda item: item[0])
            self._store_cached_neighbors(features, winners)
        else:
            winners = cached

        limit = len(winners)
        if limit == 0:
            return None

        vote = sum(label for _, label in winners)
        if vote > 0:
            direction = 1
        elif vote < 0:
            direction = -1
        else:
            return TradeSignal(
                direction=0,
                confidence=0.0,
                votes=0,
                neighbors_considered=limit,
            )

        distance_weights = [1.0 / (1.0 + distance) for distance, _ in winners]
        distance_sum = sum(distance_weights)
        weighted_vote = sum(label * weight for weight, (_, label) in zip(distance_weights, winners))
        grok_component = abs(vote) / limit if limit else 0.0
        if distance_sum > 0:
            consensus_component = abs(weighted_vote) / distance_sum
        else:  # pragma: no cover - defensive guard
            consensus_component = grok_component
        average_distance = sum(distance for distance, _ in winners) / limit
        deepseek_component = 1.0 / (1.0 + average_distance)
        combined_weight = self._weight_total if self._weight_total > 0 else 1.0
        confidence = (
            self.grok_weight * max(grok_component, consensus_component)
            + self.deepseek_weight * deepseek_component
        ) / combined_weight
        confidence = max(0.0, min(1.0, confidence))

        return TradeSignal(
            direction=direction,
            confidence=confidence,
            votes=vote,
            neighbors_considered=limit,
        )

    def evaluate_with_advisors(
        self,
        features: Sequence[float],
        *,
        snapshot: "MarketSnapshot",
        context: Optional[Dict[str, Any]] = None,
        open_positions: Optional[Sequence["ActivePosition"]] = None,
        advisors: Optional[Sequence["TradeAdvisor"]] = None,
    ) -> tuple[Optional[TradeSignal], list["AdvisorFeedback"]]:
        """Predict and optionally refine the signal with Grok-1/DeepSeek advisors."""

        signal = self.predict(features, timestamp=snapshot.timestamp)
        if signal is None or not advisors:
            return signal, []

        context_payload: Dict[str, Any] = dict(context or {})
        positions = tuple(open_positions or ())
        feedbacks: list["AdvisorFeedback"] = []
        working_signal = signal

        for advisor in advisors:
            feedback = advisor.review(
                snapshot=snapshot,
                signal=working_signal,
                context=context_payload,
                open_positions=positions,
            )
            if feedback is None:
                continue
            feedbacks.append(feedback)
            if feedback.adjusted_signal is not None:
                working_signal = feedback.adjusted_signal

        return working_signal, feedbacks

    def state_dict(self) -> Dict[str, Any]:
        return {
            "neighbors": self.neighbors,
            "max_samples": self.max_samples,
            "weights": {
                "grok": self.grok_weight,
                "deepseek": self.deepseek_weight,
            },
            "recency_halflife_minutes": self._recency_halflife_minutes,
            "samples": [
                {
                    "features": list(sample.features),
                    "label": sample.label,
                    "close": sample.close,
                    "timestamp": sample.timestamp.isoformat(),
                    "metadata": sample.metadata,
                }
                for sample in self._samples
            ],
        }

    @classmethod
    def from_state(cls, state: Dict[str, Any]) -> "LorentzianKNNModel":
        neighbors = int(state.get("neighbors", 0))
        max_samples = state.get("max_samples")
        weights = state.get("weights", {})
        grok_weight = float(weights.get("grok", 0.6))
        deepseek_weight = float(weights.get("deepseek", 0.4))
        recency_halflife = state.get("recency_halflife_minutes")
        model = cls(
            neighbors=neighbors,
            max_samples=max_samples,
            grok_weight=grok_weight,
            deepseek_weight=deepseek_weight,
            recency_halflife_minutes=recency_halflife,
        )
        samples = state.get("samples", [])
        for payload in samples:
            timestamp = datetime.fromisoformat(payload["timestamp"])
            sample = LabeledFeature(
                features=tuple(float(x) for x in payload["features"]),
                label=int(payload["label"]),
                close=float(payload["close"]),
                timestamp=timestamp,
                metadata=dict(payload.get("metadata", {})),
            )
            model.add_sample(sample)
        return model


# ---------------------------------------------------------------------------
# Strategy core
# ---------------------------------------------------------------------------


class LorentzianKNNStrategy:
    """k-NN classifier with Lorentzian distance for directional signals."""

    def __init__(
        self,
        *,
        neighbors: int,
        max_rows: int,
        label_lookahead: int,
        neutral_zone_pips: float,
        recency_halflife_minutes: Optional[float],
    ) -> None:
        if neighbors <= 0:
            raise ValueError("neighbors must be positive")
        if max_rows <= 0:
            raise ValueError("max_rows must be positive")
        if label_lookahead < 0:
            raise ValueError("label_lookahead cannot be negative")

        self.neighbors = neighbors
        self.max_rows = max_rows
        self.label_lookahead = label_lookahead
        self.neutral_zone_pips = neutral_zone_pips
        self.pipeline = FeaturePipeline()
        self.distance_fn = _resolve_distance_function()
        self.model = LorentzianKNNModel(
            neighbors=self.neighbors,
            max_samples=self.max_rows,
            distance_fn=self.distance_fn,
            recency_halflife_minutes=recency_halflife_minutes,
        )
        self._rows: deque[FeatureRow] = deque()

    def update(self, snapshot: MarketSnapshot) -> Optional[TradeSignal]:
        features = snapshot.feature_vector()
        transformed = self.pipeline.push(features)
        row = FeatureRow(features=transformed, close=snapshot.close, timestamp=snapshot.timestamp)
        self._rows.append(row)
        if len(self._rows) > self.max_rows:
            self._rows.popleft()

        if self.label_lookahead > 0 and len(self._rows) > self.label_lookahead:
            label_index = -self.label_lookahead - 1
            try:
                label_row = self._rows[label_index]
            except IndexError:
                label_row = None
            if label_row is not None and label_row.label is None:
                move_pips = abs(snapshot.close - label_row.close) / snapshot.pip_size
                if move_pips < self.neutral_zone_pips:
                    label_row.label = 0
                else:
                    label_row.label = 1 if snapshot.close > label_row.close else -1
            if label_row is not None and label_row.label is not None and not label_row.persisted:
                labelled = LabeledFeature(
                    features=label_row.features,
                    label=int(label_row.label),
                    close=label_row.close,
                    timestamp=label_row.timestamp,
                )
                self.model.add_sample(labelled)
                label_row.persisted = True

        signal = self._evaluate(transformed, snapshot.timestamp)
        if signal is None or signal.direction == 0:
            return signal

        bias = snapshot.mechanical_bias()
        if bias == 0.0:
            return signal

        if signal.direction * bias < 0:
            return TradeSignal(
                direction=0,
                confidence=0.0,
                votes=signal.votes,
                neighbors_considered=signal.neighbors_considered,
            )

        bias_strength = min(0.35, abs(bias) * 0.2)
        boosted_confidence = min(1.0, signal.confidence * (1.0 + bias_strength))
        if boosted_confidence == signal.confidence:
            return signal

        return TradeSignal(
            direction=signal.direction,
            confidence=boosted_confidence,
            votes=signal.votes,
            neighbors_considered=signal.neighbors_considered,
        )

    def _evaluate(
        self, features: Sequence[float], timestamp: datetime
    ) -> Optional[TradeSignal]:
        return self.model.predict(features, timestamp=timestamp)

    def ingest_labelled(self, samples: Iterable[LabeledFeature]) -> None:
        for sample in samples:
            self.model.add_sample(sample)

    def snapshot_state(self) -> Dict[str, Any]:
        return {
            "pipeline": self.pipeline.state_dict(),
            "model": self.model.state_dict(),
        }

    def restore_state(self, state: Dict[str, Any]) -> None:
        pipeline_state = state.get("pipeline")
        if pipeline_state:
            self.pipeline.load_state_dict(pipeline_state)
        model_state = state.get("model")
        if model_state:
            restored = LorentzianKNNModel.from_state(model_state)
            restored.distance_fn = self.distance_fn
            self.model = restored


# ---------------------------------------------------------------------------
# Risk analytics and monitoring
# ---------------------------------------------------------------------------


TradeType = Literal["Swing", "Intra-day", "Scalp"]


@dataclass(slots=True)
class TradeClassificationRules:
    """Thresholds used to infer the trading style for a completed position."""

    scalp_max_duration_minutes: float = 60.0
    """Upper bound on the holding period (in minutes) still considered a scalp."""

    intraday_max_duration_minutes: float = 24 * 60.0
    """Longest position duration (in minutes) that remains an intra-day trade."""

    scalp_max_pips: Optional[float] = None
    """Optional ceiling on the pip target for scalp trades."""

    intraday_max_pips: Optional[float] = None
    """Optional ceiling on the pip target for intra-day trades."""


@dataclass(slots=True)
class CompletedTrade:
    """Representation of a fully realised position used for analytics."""

    symbol: str
    direction: int
    size: float
    entry_price: float
    exit_price: float
    open_time: datetime
    close_time: datetime
    profit: float
    pips: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def holding_period(self) -> timedelta:
        """Return the time delta between opening and closing the position."""

        return self.close_time - self.open_time

    def holding_period_minutes(self) -> float:
        """Convenience accessor exposing the holding period in minutes."""

        return max(0.0, self.holding_period().total_seconds() / 60.0)


@dataclass(slots=True)
class PerformanceMetrics:
    total_trades: int
    wins: int
    losses: int
    hit_rate: float
    profit_factor: float
    max_drawdown_pct: float
    equity_curve: List[tuple[datetime, float]]


@dataclass(slots=True)
class RiskEvent:
    """Event emitted by :class:`RiskManager` for monitoring hooks."""

    type: str
    timestamp: datetime
    payload: Dict[str, Any] = field(default_factory=dict)


class PerformanceTracker:
    """Tracks realised performance statistics for monitoring and backtests."""

    def __init__(self, initial_equity: float = 0.0) -> None:
        self.initial_equity = float(initial_equity)
        self._equity_curve: List[tuple[datetime, float]] = []
        self._trades: List[CompletedTrade] = []
        self._gross_profit = 0.0
        self._gross_loss = 0.0
        self._peak_equity = initial_equity
        self._max_drawdown_pct = 0.0

    def record_equity(self, timestamp: datetime, equity: float) -> None:
        equity = float(equity)
        self._equity_curve.append((timestamp, equity))
        if equity > self._peak_equity:
            self._peak_equity = equity
        if self._peak_equity > 0:
            drawdown = (self._peak_equity - equity) / self._peak_equity * 100
            if drawdown > self._max_drawdown_pct:
                self._max_drawdown_pct = drawdown

    def record_trade(self, trade: CompletedTrade) -> None:
        self._trades.append(trade)
        if trade.profit >= 0:
            self._gross_profit += float(trade.profit)
        else:
            self._gross_loss += abs(float(trade.profit))

    def metrics(self) -> PerformanceMetrics:
        total_trades = len(self._trades)
        wins = sum(1 for trade in self._trades if trade.profit > 0)
        losses = sum(1 for trade in self._trades if trade.profit < 0)
        hit_rate = wins / total_trades if total_trades else 0.0
        if self._gross_loss > 0:
            profit_factor = self._gross_profit / self._gross_loss
        else:
            profit_factor = float("inf") if self._gross_profit > 0 else 0.0
        return PerformanceMetrics(
            total_trades=total_trades,
            wins=wins,
            losses=losses,
            hit_rate=hit_rate,
            profit_factor=profit_factor,
            max_drawdown_pct=self._max_drawdown_pct,
            equity_curve=list(self._equity_curve),
        )


def classify_trade_type(
    trade: CompletedTrade,
    *,
    rules: Optional[TradeClassificationRules] = None,
) -> TradeType:
    """Infer whether a trade fits scalp, intra-day, or swing criteria.

    Parameters
    ----------
    trade:
        The completed trade that should be analysed.
    rules:
        Optional override for the default classification thresholds.

    Returns
    -------
    TradeType
        A human-readable label describing the trading style.
    """

    thresholds = rules or TradeClassificationRules()

    duration_minutes = trade.holding_period_minutes()
    pip_distance = abs(float(trade.pips))

    if duration_minutes <= thresholds.scalp_max_duration_minutes and (
        thresholds.scalp_max_pips is None or pip_distance <= thresholds.scalp_max_pips
    ):
        return "Scalp"

    if duration_minutes <= thresholds.intraday_max_duration_minutes and (
        thresholds.intraday_max_pips is None or pip_distance <= thresholds.intraday_max_pips
    ):
        return "Intra-day"

    return "Swing"


# ---------------------------------------------------------------------------
# Risk management
# ---------------------------------------------------------------------------


class RiskManager:
    """Basic risk framework that mimics the MQL5 EA configuration."""

    def __init__(self, params: Optional[RiskParameters] = None) -> None:
        self.params = params or RiskParameters()
        self._daily_start_equity: Optional[float] = None
        self._daily_marker: Optional[date] = None
        self.performance = PerformanceTracker(self.params.balance)
        self._monitors: List[Callable[[RiskEvent], None]] = []

    def update_equity(self, equity: float, *, timestamp: Optional[datetime] = None) -> None:
        ts_date = (timestamp or datetime.now(UTC)).date()
        if self._daily_marker != ts_date:
            self._daily_marker = ts_date
            self._daily_start_equity = equity
        self.params.balance = equity
        self.performance.record_equity(timestamp or datetime.now(UTC), equity)

    def can_open(
        self,
        *,
        symbol: str,
        open_positions: Sequence[ActivePosition],
        timestamp: datetime,
        direction: int,
        equity: Optional[float] = None,
    ) -> bool:
        if equity is not None:
            self.update_equity(equity, timestamp=timestamp)

        if len(open_positions) >= self.params.max_total_positions:
            return False

        max_per_symbol = self.params.max_positions_per_symbol
        symbol_count = 0
        opposing_count = 0
        for pos in open_positions:
            if pos.symbol != symbol:
                continue
            symbol_count += 1
            if pos.direction != direction:
                opposing_count += 1
            if symbol_count >= max_per_symbol:
                break

        if symbol_count >= max_per_symbol:
            return False

        if self.params.max_daily_drawdown_pct is not None and self._daily_start_equity:
            threshold = self._daily_start_equity * (1 - self.params.max_daily_drawdown_pct / 100)
            if self.params.balance <= threshold:
                return False

        if opposing_count and symbol_count >= max_per_symbol:
            return False

        return True

    def position_size(self, *, stop_loss_pips: float, pip_value: float) -> float:
        if stop_loss_pips <= 0 or pip_value <= 0:
            return round(self.params.min_lot, 4)

        risk_amount = self.params.balance * self.params.risk_per_trade
        if risk_amount <= 0:
            return 0.0

        raw_lot = risk_amount / (stop_loss_pips * pip_value)
        if self.params.max_lot is not None:
            raw_lot = min(raw_lot, self.params.max_lot)

        lot_steps = max(1, math.floor(raw_lot / self.params.lot_step))
        size = lot_steps * self.params.lot_step
        return max(self.params.min_lot, round(size, 4))

    def register_monitor(self, callback: Callable[[RiskEvent], None]) -> None:
        self._monitors.append(callback)

    def notify(self, event_type: str, payload: Optional[Dict[str, Any]] = None) -> None:
        event = RiskEvent(type=event_type, timestamp=datetime.now(UTC), payload=payload or {})
        for callback in list(self._monitors):
            try:
                callback(event)
            except Exception:  # pragma: no cover - monitoring should not break trading
                logger.exception("Risk monitor callback failed for event %s", event_type)

    def record_closed_trade(self, trade: CompletedTrade) -> None:
        self.performance.record_trade(trade)
        self.notify("trade_closed", {"trade": trade, "metrics": self.performance.metrics()})

    def metrics(self) -> PerformanceMetrics:
        return self.performance.metrics()


# ---------------------------------------------------------------------------
# Average daily range tracker
# ---------------------------------------------------------------------------


class ADRTracker:
    """Maintains a rolling estimate of the Average Daily Range (ADR)."""

    def __init__(self, period: int) -> None:
        if period <= 0:
            raise ValueError("ADR period must be positive")
        self.period = period
        self._ranges: deque[float] = deque(maxlen=period)
        self._last_update: Optional[date] = None

    def update(self, *, timestamp: datetime, high: Optional[float], low: Optional[float], pip_size: float) -> None:
        if high is None or low is None or pip_size <= 0:
            return
        day = timestamp.date()
        if self._last_update == day:
            return
        self._last_update = day
        self._ranges.append(abs(high - low) / pip_size)

    @property
    def value(self) -> Optional[float]:
        if not self._ranges:
            return None
        return sum(self._ranges) / len(self._ranges)


# ---------------------------------------------------------------------------
# Trade logic orchestrator
# ---------------------------------------------------------------------------


class TradeLogic:
    """High-level trade planner that combines model signals and risk controls."""

    def __init__(
        self,
        config: Optional[TradeConfig] = None,
        risk: Optional[RiskManager] = None,
        monitors: Optional[Sequence[Callable[[RiskEvent], None]]] = None,
    ) -> None:
        self.config = config or TradeConfig()
        self.strategy = LorentzianKNNStrategy(
            neighbors=self.config.neighbors,
            max_rows=self.config.max_rows,
            label_lookahead=self.config.label_lookahead,
            neutral_zone_pips=self.config.neutral_zone_pips,
            recency_halflife_minutes=self.config.knn_recency_halflife_minutes,
        )
        self.risk = risk or RiskManager()
        self.adr_tracker = (
            ADRTracker(self.config.adr_period)
            if self.config.use_adr
            else None
        )
        self.smc = SMCAnalyzer(self.config) if self.config.use_smc_context else None
        for monitor in monitors or []:
            self.risk.register_monitor(monitor)

    def on_bar(
        self,
        snapshot: MarketSnapshot,
        *,
        open_positions: Sequence[ActivePosition] | None = None,
        account_equity: Optional[float] = None,
        advisor: "TradeAdvisor" | None = None,
    ) -> List[TradeDecision]:
        open_positions = list(open_positions or [])

        if self.smc:
            self.smc.observe(snapshot)

        if self.adr_tracker:
            self.adr_tracker.update(
                timestamp=snapshot.timestamp,
                high=snapshot.daily_high,
                low=snapshot.daily_low,
                pip_size=snapshot.pip_size,
            )

        management_decisions, managed_positions = self._manage_open_positions(
            snapshot=snapshot,
            open_positions=open_positions,
        )
        decisions: List[TradeDecision] = list(management_decisions)
        open_positions = managed_positions

        exit_decisions, filtered_positions = self._generate_exit_decisions(
            snapshot, open_positions
        )
        decisions.extend(exit_decisions)
        open_positions = filtered_positions

        signal = self.strategy.update(snapshot)
        if signal is None or signal.direction == 0:
            self.risk.notify(
                "signal_skipped",
                {"snapshot": snapshot, "reason": "no_signal", "signal": signal},
            )
            return self._finalise_decisions(decisions, snapshot)
        signal, context = self._apply_contextual_adjustments(
            snapshot=snapshot,
            signal=signal,
            open_positions=open_positions,
        )
        advisor_feedback: "AdvisorFeedback" | None = None
        if advisor is not None:
            advisor_context = deepcopy(context)
            try:
                advisor_feedback = advisor.review(
                    snapshot=snapshot,
                    signal=signal,
                    context=advisor_context,
                    open_positions=open_positions,
                )
            except Exception:  # pragma: no cover - advisor failures should not halt trading
                logger.exception("Grok advisor review failed for %s", snapshot.symbol)
            else:
                if advisor_feedback:
                    if advisor_feedback.adjusted_signal is not None:
                        signal = advisor_feedback.adjusted_signal
                        signal, context = self._apply_contextual_adjustments(
                            snapshot=snapshot,
                            signal=signal,
                            open_positions=open_positions,
                        )
                    advisor_meta = dict(advisor_feedback.metadata)
                    if advisor_feedback.raw_response and "raw_response" not in advisor_meta:
                        advisor_meta["raw_response"] = advisor_feedback.raw_response
                    if advisor_meta:
                        context["advisor"] = advisor_meta
        if signal.confidence < self.config.min_confidence:
            self.risk.notify(
                "signal_skipped",
                {
                    "snapshot": snapshot,
                    "reason": "low_confidence",
                    "signal": signal,
                    "context": context,
                },
            )
            return self._finalise_decisions(decisions, snapshot)

        reversal_decisions, filtered_positions = self._close_opposing_positions(
            symbol=snapshot.symbol,
            signal=signal,
            open_positions=open_positions,
        )
        if reversal_decisions:
            decisions.extend(reversal_decisions)
        open_positions = filtered_positions

        if not self.risk.can_open(
            symbol=snapshot.symbol,
            open_positions=open_positions,
            timestamp=snapshot.timestamp,
            direction=signal.direction,
            equity=account_equity,
        ):
            self.risk.notify(
                "signal_rejected",
                {
                    "snapshot": snapshot,
                    "reason": "risk_limits",
                    "signal": signal,
                    "context": context,
                },
            )
            return self._finalise_decisions(decisions, snapshot)

        stop_loss_pips, take_profit_pips = self._determine_sl_tp(snapshot)
        size = self.risk.position_size(stop_loss_pips=stop_loss_pips, pip_value=snapshot.pip_value)
        if size <= 0:
            self.risk.notify(
                "signal_rejected",
                {
                    "snapshot": snapshot,
                    "reason": "position_size",
                    "signal": signal,
                    "context": context,
                },
            )
            return self._finalise_decisions(decisions, snapshot)
        entry = snapshot.close
        if signal.direction > 0:
            stop_loss_price = entry - stop_loss_pips * snapshot.pip_size
            take_profit_price = entry + take_profit_pips * snapshot.pip_size
        else:
            stop_loss_price = entry + stop_loss_pips * snapshot.pip_size
            take_profit_price = entry - take_profit_pips * snapshot.pip_size

        reason = "Lorentzian k-NN signal"
        correlation_modifier = context["correlation"]["modifier"]
        seasonal_modifier = context["seasonal"]["modifier"]
        smc_modifier = context.get("smc", {}).get("modifier", 1.0)
        reason_details: List[str] = []
        if not math.isclose(correlation_modifier, 1.0, rel_tol=1e-6):
            reason_details.append(f"correlation {correlation_modifier:.2f}x")
        if not math.isclose(seasonal_modifier, 1.0, rel_tol=1e-6):
            reason_details.append(f"seasonal {seasonal_modifier:.2f}x")
        if not math.isclose(smc_modifier, 1.0, rel_tol=1e-6):
            reason_details.append(f"smc {smc_modifier:.2f}x")
        if reason_details:
            reason = f"{reason} ({', '.join(reason_details)})"

        decisions.append(
            TradeDecision(
                action="open",
                symbol=snapshot.symbol,
                direction=signal.direction,
                size=size,
                entry=entry,
                stop_loss=stop_loss_price,
                take_profit=take_profit_price,
                reason=reason,
                signal=signal,
                context=context,
            )
        )

        return self._finalise_decisions(decisions, snapshot)

    def _manage_open_positions(
        self,
        *,
        snapshot: MarketSnapshot,
        open_positions: Sequence[ActivePosition],
    ) -> tuple[List[TradeDecision], List[ActivePosition]]:
        pip_size = snapshot.pip_size if snapshot.pip_size > 0 else 1.0
        tolerance = abs(pip_size) * 1e-4 or 1e-6
        break_even_pips = max(0.0, self.config.break_even_pips)
        trail_start_pips = max(0.0, self.config.trail_start_pips)
        trail_step_pips = max(0.0, self.config.trail_step_pips)
        price = snapshot.close

        decisions: List[TradeDecision] = []
        managed: List[ActivePosition] = []

        for pos in open_positions:
            normalised_stop = self._normalise_stop_value(pos.stop_loss, pip_size)
            if pos.symbol != snapshot.symbol or pos.direction == 0:
                if self._stops_equivalent(pos.stop_loss, normalised_stop, tolerance):
                    managed.append(pos)
                else:
                    managed.append(
                        ActivePosition(
                            symbol=pos.symbol,
                            direction=pos.direction,
                            size=pos.size,
                            entry_price=pos.entry_price,
                            stop_loss=normalised_stop,
                            take_profit=pos.take_profit,
                            opened_at=pos.opened_at,
                        )
                    )
                continue

            previous_stop = normalised_stop
            new_stop = previous_stop
            changed = False
            components: List[str] = []

            profit_pips = (price - pos.entry_price) / pip_size * pos.direction

            if break_even_pips > 0 and profit_pips >= break_even_pips:
                target_stop = pos.entry_price
                if pos.direction > 0:
                    if new_stop is None or new_stop < target_stop - tolerance:
                        new_stop = target_stop
                        changed = True
                        components.append("breakeven")
                else:
                    if new_stop is None or new_stop > target_stop + tolerance:
                        new_stop = target_stop
                        changed = True
                        components.append("breakeven")

            if trail_start_pips > 0 and trail_step_pips > 0:
                if pos.direction > 0:
                    trigger_price = pos.entry_price + trail_start_pips * pip_size
                    if price > trigger_price:
                        desired_stop = price - trail_step_pips * pip_size
                        if new_stop is None or desired_stop > new_stop + tolerance:
                            new_stop = desired_stop
                            changed = True
                            if "trailing" not in components:
                                components.append("trailing")
                else:
                    trigger_price = pos.entry_price - trail_start_pips * pip_size
                    if price < trigger_price:
                        desired_stop = price + trail_step_pips * pip_size
                        if new_stop is None or desired_stop < new_stop - tolerance:
                            new_stop = desired_stop
                            changed = True
                            if "trailing" not in components:
                                components.append("trailing")

            if self._stops_equivalent(pos.stop_loss, new_stop, tolerance):
                managed.append(pos)
            else:
                managed.append(
                    ActivePosition(
                        symbol=pos.symbol,
                        direction=pos.direction,
                        size=pos.size,
                        entry_price=pos.entry_price,
                        stop_loss=new_stop,
                        take_profit=pos.take_profit,
                        opened_at=pos.opened_at,
                    )
                )

            if changed and (
                previous_stop is None
                or new_stop is None
                or not math.isclose(previous_stop, new_stop, rel_tol=0.0, abs_tol=tolerance)
            ):
                reason = self._format_management_reason(new_stop, components, pip_size)
                decisions.append(
                    TradeDecision(
                        action="modify",
                        symbol=pos.symbol,
                        direction=pos.direction,
                        size=pos.size,
                        entry=pos.entry_price,
                        stop_loss=new_stop,
                        take_profit=pos.take_profit,
                        reason=reason,
                        context={
                            "components": list(components),
                            "previous_stop_loss": previous_stop,
                            "new_stop_loss": new_stop,
                            "break_even_pips": break_even_pips,
                            "trail_start_pips": trail_start_pips,
                            "trail_step_pips": trail_step_pips,
                            "profit_pips": profit_pips,
                            "price": price,
                        },
                    )
                )

        return decisions, managed

    def _generate_exit_decisions(
        self,
        snapshot: MarketSnapshot,
        open_positions: Sequence[ActivePosition],
    ) -> tuple[List[TradeDecision], List[ActivePosition]]:
        decisions: List[TradeDecision] = []
        remaining: List[ActivePosition] = []
        price = snapshot.close
        open_price = snapshot.open if snapshot.open is not None else price
        high = snapshot.high if snapshot.high is not None else price
        low = snapshot.low if snapshot.low is not None else price
        pip_size = snapshot.pip_size if snapshot.pip_size != 0 else 1.0
        tolerance = abs(pip_size) * 1e-4 or 1e-6

        for pos in open_positions:
            if pos.symbol != snapshot.symbol:
                remaining.append(pos)
                continue

            direction = pos.direction
            stop_level = pos.stop_loss
            take_level = pos.take_profit

            if direction > 0:
                stop_triggered = stop_level is not None and low <= stop_level
                take_triggered = take_level is not None and high >= take_level
            elif direction < 0:
                stop_triggered = stop_level is not None and high >= stop_level
                take_triggered = take_level is not None and low <= take_level
            else:
                stop_triggered = False
                take_triggered = False

            trigger: Optional[str] = None
            exit_price: Optional[float] = None

            if stop_triggered and take_triggered:
                reference = open_price if open_price is not None else price
                stop_level = pos.stop_loss if pos.stop_loss is not None else reference
                take_level = pos.take_profit if pos.take_profit is not None else reference
                stop_distance = abs(reference - stop_level)
                take_distance = abs(reference - take_level)
                if take_distance + tolerance < stop_distance:
                    trigger = "take_profit"
                elif stop_distance + tolerance < take_distance:
                    trigger = "stop_loss"
                else:
                    trigger = "stop_loss"
            elif stop_triggered:
                trigger = "stop_loss"
            elif take_triggered:
                trigger = "take_profit"

            if trigger == "stop_loss":
                exit_price = pos.stop_loss
            elif trigger == "take_profit":
                exit_price = pos.take_profit

            if trigger is not None:
                if exit_price is None:
                    exit_price = price
                if open_price is not None:
                    if direction > 0:
                        if trigger == "stop_loss" and open_price < exit_price - tolerance:
                            exit_price = open_price
                        elif trigger == "take_profit" and open_price > exit_price + tolerance:
                            exit_price = open_price
                    elif direction < 0:
                        if trigger == "stop_loss" and open_price > exit_price + tolerance:
                            exit_price = open_price
                        elif trigger == "take_profit" and open_price < exit_price - tolerance:
                            exit_price = open_price

                decisions.append(
                    TradeDecision(
                        action="close",
                        symbol=pos.symbol,
                        direction=pos.direction,
                        size=pos.size,
                        entry=pos.entry_price,
                        exit=exit_price,
                        stop_loss=pos.stop_loss,
                        take_profit=pos.take_profit,
                        reason="Stop loss hit" if trigger == "stop_loss" else "Take profit hit",
                        context={
                            "trigger": trigger,
                            "bar": {
                                "open": open_price,
                                "high": high,
                                "low": low,
                                "close": price,
                            },
                            "exit_price": exit_price,
                        },
                    )
                )
            else:
                remaining.append(pos)
        return decisions, remaining

    def _close_opposing_positions(
        self,
        *,
        symbol: str,
        signal: TradeSignal,
        open_positions: Sequence[ActivePosition],
    ) -> tuple[List[TradeDecision], List[ActivePosition]]:
        decisions: List[TradeDecision] = []
        remaining: List[ActivePosition] = []
        for pos in open_positions:
            if pos.symbol == symbol and pos.direction != signal.direction:
                decisions.append(
                    TradeDecision(
                        action="close",
                        symbol=pos.symbol,
                        direction=pos.direction,
                        size=pos.size,
                        entry=pos.entry_price,
                        stop_loss=pos.stop_loss,
                        take_profit=pos.take_profit,
                        reason="Reverse signal",
                        signal=signal,
                    )
                )
            else:
                remaining.append(pos)
        return decisions, remaining

    @staticmethod
    def _price_decimals(pip_size: float) -> int:
        if pip_size <= 0:
            return 5
        text = f"{pip_size:.8f}".rstrip("0").rstrip(".")
        if "." in text:
            return min(8, len(text.split(".")[1]))
        return 0

    @staticmethod
    def _normalise_stop_value(
        value: Optional[float], pip_size: float
    ) -> Optional[float]:
        if value is None:
            return None
        if not math.isfinite(value):
            return None
        threshold = max(abs(pip_size) * 0.1, 1e-8)
        if math.isclose(value, 0.0, abs_tol=threshold):
            return None
        return value

    @staticmethod
    def _stops_equivalent(
        current: Optional[float],
        target: Optional[float],
        tolerance: float,
    ) -> bool:
        if current is None and target is None:
            return True
        if current is None or target is None:
            return False
        return math.isclose(current, target, rel_tol=0.0, abs_tol=tolerance)

    def _format_management_reason(
        self,
        stop_loss: Optional[float],
        components: Sequence[str],
        pip_size: float,
    ) -> str:
        labels = {
            "breakeven": "breakeven",
            "trailing": "trailing stop",
        }
        component_text = ", ".join(labels.get(component, component) for component in components)
        if stop_loss is None:
            base = "Adjusted position"
        else:
            decimals = self._price_decimals(pip_size)
            base = f"Adjusted stop loss to {stop_loss:.{decimals}f}"
        if component_text:
            return f"{base} ({component_text})"
        return base

    def _apply_contextual_adjustments(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        open_positions: Sequence[ActivePosition],
    ) -> tuple[TradeSignal, Dict[str, Any]]:
        adjusted_confidence, context = self._compute_signal_context(
            snapshot=snapshot,
            signal=signal,
            open_positions=open_positions,
        )
        original_confidence = signal.confidence
        if math.isclose(adjusted_confidence, original_confidence, rel_tol=1e-6):
            return signal, context
        adjusted_signal = TradeSignal(
            direction=signal.direction,
            confidence=adjusted_confidence,
            votes=signal.votes,
            neighbors_considered=signal.neighbors_considered,
        )
        return adjusted_signal, context

    def compute_signal_context(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        open_positions: Sequence[ActivePosition] | None = None,
    ) -> Dict[str, Any]:
        """Return the contextual modifiers that would be applied to ``signal``."""

        positions = list(open_positions or [])
        if self.smc:
            self.smc.observe(snapshot)
        _, context = self._compute_signal_context(
            snapshot=snapshot,
            signal=signal,
            open_positions=positions,
        )
        return deepcopy(context)

    def _compute_signal_context(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        open_positions: Sequence[ActivePosition],
    ) -> tuple[float, Dict[str, Any]]:
        original_confidence = signal.confidence
        correlation_modifier, correlation_meta = self._compute_correlation_modifier(
            snapshot=snapshot,
            signal=signal,
            open_positions=open_positions,
        )
        seasonal_modifier, seasonal_meta = self._compute_seasonal_modifier(
            snapshot=snapshot,
            signal=signal,
        )
        smc_modifier = 1.0
        smc_meta: Dict[str, Any] = {"enabled": False, "modifier": 1.0}
        if self.smc:
            smc_modifier, smc_meta = self.smc.apply(signal)
        adjusted_confidence = (
            original_confidence * correlation_modifier * seasonal_modifier * smc_modifier
        )
        adjusted_confidence = max(0.0, min(1.0, adjusted_confidence))
        context = {
            "original_confidence": original_confidence,
            "final_confidence": adjusted_confidence,
            "correlation": {"modifier": correlation_modifier, **correlation_meta},
            "seasonal": {"modifier": seasonal_modifier, **seasonal_meta},
            "smc": dict(smc_meta),
        }
        return adjusted_confidence, context

    def _compute_correlation_modifier(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        open_positions: Sequence[ActivePosition],
    ) -> tuple[float, Dict[str, Any]]:
        correlations = snapshot.correlation_scores or {}
        if not correlations or not open_positions:
            return 1.0, {"penalised": [], "boosted": [], "penalty": 0.0, "boost": 0.0}

        weight = max(0.0, self.config.correlation_weight)
        max_adjust = max(0.0, self.config.max_correlation_adjustment)
        if weight == 0.0 or max_adjust == 0.0:
            return 1.0, {"penalised": [], "boosted": [], "penalty": 0.0, "boost": 0.0}

        threshold = max(0.0, min(1.0, self.config.correlation_threshold))
        penalty_strength = 0.0
        boost_strength = 0.0
        penalised: List[Dict[str, Any]] = []
        boosted: List[Dict[str, Any]] = []

        for pos in open_positions:
            if pos.symbol == snapshot.symbol:
                continue
            corr = correlations.get(pos.symbol)
            if corr is None:
                continue
            corr_value = max(-1.0, min(1.0, float(corr)))
            same_direction = pos.direction == signal.direction
            record = {
                "symbol": pos.symbol,
                "correlation": corr_value,
                "position_direction": pos.direction,
            }
            if same_direction and corr_value >= threshold:
                penalty_strength = max(penalty_strength, abs(corr_value))
                penalised.append(record)
            elif not same_direction and corr_value <= -threshold:
                penalty_strength = max(penalty_strength, abs(corr_value))
                penalised.append(record)
            elif same_direction and corr_value <= -threshold:
                boost_strength = max(boost_strength, abs(corr_value))
                boosted.append(record)
            elif not same_direction and corr_value >= threshold:
                boost_strength = max(boost_strength, abs(corr_value))
                boosted.append(record)

        penalty = min(max_adjust, penalty_strength * weight)
        boost = min(max_adjust, boost_strength * weight)
        modifier = 1.0 - penalty + boost
        lower_bound = max(0.0, 1.0 - max_adjust)
        upper_bound = 1.0 + max_adjust
        modifier = max(lower_bound, min(modifier, upper_bound))
        return modifier, {
            "penalised": penalised,
            "boosted": boosted,
            "penalty": penalty,
            "boost": boost,
            "threshold": threshold,
        }

    def _compute_seasonal_modifier(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
    ) -> tuple[float, Dict[str, Any]]:
        bias = snapshot.seasonal_bias
        weight = max(0.0, self.config.seasonal_bias_weight)
        max_adjust = max(0.0, self.config.max_seasonal_adjustment)
        if bias is None or weight == 0.0 or max_adjust == 0.0:
            confidence = snapshot.seasonal_confidence
            return 1.0, {
                "bias": bias,
                "confidence": confidence,
                "alignment": 0.0,
                "adjustment": 0.0,
            }

        bias_value = max(-1.0, min(1.0, float(bias)))
        confidence = snapshot.seasonal_confidence
        conviction = 1.0 if confidence is None else max(0.0, min(1.0, float(confidence)))
        alignment = bias_value if signal.direction > 0 else -bias_value
        alignment *= conviction
        adjustment = alignment * weight
        adjustment = max(-max_adjust, min(max_adjust, adjustment))
        modifier = 1.0 + adjustment
        modifier = max(0.0, modifier)
        return modifier, {
            "bias": bias_value,
            "confidence": conviction,
            "alignment": alignment,
            "adjustment": adjustment,
        }

    def _finalise_decisions(
        self, decisions: List[TradeDecision], snapshot: MarketSnapshot
    ) -> List[TradeDecision]:
        self._notify_decisions(decisions, snapshot)
        return decisions

    def _notify_decisions(
        self, decisions: Sequence[TradeDecision], snapshot: MarketSnapshot
    ) -> None:
        for decision in decisions:
            if decision.action == "open":
                event_type = "trade_open"
            elif decision.action == "close":
                event_type = "trade_close"
            else:
                event_type = "trade_modify"
            self.risk.notify(event_type, {"decision": decision, "snapshot": snapshot})

    def _determine_sl_tp(self, snapshot: MarketSnapshot) -> tuple[float, float]:
        stop_loss_pips = self.config.manual_stop_loss_pips
        take_profit_pips = self.config.manual_take_profit_pips
        if self.config.use_adr and self.adr_tracker:
            adr_pips = self.adr_tracker.value
            if adr_pips:
                stop_loss_pips = max(0.1, adr_pips * self.config.adr_stop_loss_factor)
                take_profit_pips = max(0.1, adr_pips * self.config.adr_take_profit_factor)
        return (stop_loss_pips, take_profit_pips)

    def export_artifacts(self) -> Dict[str, Any]:
        return {
            "config": asdict(self.config),
            "model": self.strategy.snapshot_state(),
        }

    def load_artifacts(self, payload: Dict[str, Any]) -> None:
        config_payload = payload.get("config")
        if isinstance(config_payload, dict):
            for field_info in fields(TradeConfig):
                if field_info.name in config_payload:
                    setattr(self.config, field_info.name, config_payload[field_info.name])
        model_payload = payload.get("model")
        if isinstance(model_payload, dict):
            self.strategy.restore_state(model_payload)


__all__ = [
    "ActivePosition",
    "TradeClassificationRules",
    "CompletedTrade",
    "FeatureRow",
    "FeaturePipeline",
    "LabeledFeature",
    "LorentzianKNNModel",
    "LorentzianKNNStrategy",
    "SMCZone",
    "MarketSnapshot",
    "OnlineFeatureScaler",
    "PerformanceMetrics",
    "PerformanceTracker",
    "RiskManager",
    "RiskParameters",
    "RiskEvent",
    "TradeType",
    "classify_trade_type",
    "TradeConfig",
    "TradeDecision",
    "TradeLogic",
    "TradeSignal",
    "SMCAnalyzer",
    "ml",
    "kernels",
]


if __name__ == "__main__":  # pragma: no cover - convenience usage example
    logging.basicConfig(level=logging.INFO)
    logic = TradeLogic()
    now = datetime.now(UTC)
    snapshot = MarketSnapshot(
        symbol="XAUUSD",
        timestamp=now,
        close=2350.50,
        rsi_fast=55.2,
        adx_fast=21.4,
        rsi_slow=48.7,
        adx_slow=18.9,
        pip_size=0.1,
        pip_value=1.0,
    )
    decisions = logic.on_bar(snapshot)
    for decision in decisions:
        print(decision)
