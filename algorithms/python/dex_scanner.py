"""TON-focused DEX scanner scoring utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence


@dataclass(frozen=True)
class DexPoolSnapshot:
    """Represents a point-in-time view of a TON DEX pool."""

    dex: str
    pool_address: str
    base_token: str
    quote_token: str
    price_usd: float | None = None
    liquidity_usd: float | None = None
    volume_24h_usd: float | None = None
    price_change_24h_pct: float | None = None
    transactions_24h: int | None = None
    fees_24h_usd: float | None = None
    is_verified: bool = False


@dataclass(frozen=True)
class DexScannerSignal:
    """Output signal describing the attractiveness of a DEX pool."""

    pool: DexPoolSnapshot
    score: float
    tier: str
    liquidity_score: float
    volume_score: float
    activity_score: float
    momentum_score: float
    volatility_penalty: float
    notes: tuple[str, ...]


class DexScannerAlgo:
    """Scores TON DEX pools to help prioritise monitoring."""

    def __init__(
        self,
        tracked_tokens: Sequence[str] | None = None,
        min_liquidity_usd: float = 5_000.0,
        min_volume_24h_usd: float = 2_000.0,
        min_transactions_24h: int = 5,
        high_volatility_threshold_pct: float = 18.0,
    ) -> None:
        self.tracked_tokens = tuple(token.upper() for token in (tracked_tokens or ("DCT", "TON")))
        if not self.tracked_tokens:
            raise ValueError("tracked_tokens must contain at least one token symbol")

        if min_liquidity_usd < 0 or min_volume_24h_usd < 0:
            raise ValueError("minimum liquidity and volume thresholds must be non-negative")

        if min_transactions_24h < 0:
            raise ValueError("minimum transaction threshold must be non-negative")

        self.min_liquidity_usd = float(min_liquidity_usd)
        self.min_volume_24h_usd = float(min_volume_24h_usd)
        self.min_transactions_24h = int(min_transactions_24h)
        self.high_volatility_threshold_pct = float(high_volatility_threshold_pct)

    def score_pool(self, snapshot: DexPoolSnapshot) -> DexScannerSignal:
        """Scores a single pool snapshot and returns the resulting signal."""

        self._validate_snapshot(snapshot)
        notes: list[str] = []

        liquidity_score = self._scale(snapshot.liquidity_usd, self.min_liquidity_usd, 250_000.0)
        volume_score = self._scale(snapshot.volume_24h_usd, self.min_volume_24h_usd, 150_000.0)
        activity_score = self._scale(snapshot.transactions_24h, self.min_transactions_24h, 500)
        momentum_score, volatility_penalty = self._compute_momentum(snapshot)

        verification_bonus = 0.05 if snapshot.is_verified else 0.0
        if snapshot.is_verified:
            notes.append("Verified pool on TON DEX registry")

        score = (
            liquidity_score * 0.35
            + volume_score * 0.3
            + activity_score * 0.2
            + momentum_score * 0.15
            + verification_bonus
            - volatility_penalty
        )

        score = max(0.0, min(score, 1.0))

        tier = "caution"
        if score >= 0.75:
            tier = "prime"
        elif score >= 0.5:
            tier = "watchlist"

        if snapshot.liquidity_usd is None:
            notes.append("Missing liquidity data")
        elif snapshot.liquidity_usd < self.min_liquidity_usd:
            notes.append(
                f"Liquidity ${snapshot.liquidity_usd:,.0f} below minimum ${self.min_liquidity_usd:,.0f}"
            )

        if snapshot.volume_24h_usd is None:
            notes.append("Missing 24h volume data")
        elif snapshot.volume_24h_usd < self.min_volume_24h_usd:
            notes.append(
                f"24h volume ${snapshot.volume_24h_usd:,.0f} below minimum ${self.min_volume_24h_usd:,.0f}"
            )

        if snapshot.transactions_24h is None:
            notes.append("Missing transaction count")
        elif snapshot.transactions_24h < self.min_transactions_24h:
            notes.append(
                f"Only {snapshot.transactions_24h} swaps in 24h (min {self.min_transactions_24h})"
            )

        if volatility_penalty > 0:
            notes.append(
                f"Volatility penalty applied ({volatility_penalty:.2f})"
            )

        return DexScannerSignal(
            pool=snapshot,
            score=score,
            tier=tier,
            liquidity_score=liquidity_score,
            volume_score=volume_score,
            activity_score=activity_score,
            momentum_score=momentum_score,
            volatility_penalty=volatility_penalty,
            notes=tuple(notes),
        )

    def rank_pools(self, snapshots: Iterable[DexPoolSnapshot]) -> list[DexScannerSignal]:
        """Score multiple pools and return the results sorted by score."""

        signals = [self.score_pool(snapshot) for snapshot in snapshots]
        return sorted(signals, key=lambda signal: signal.score, reverse=True)

    def _validate_snapshot(self, snapshot: DexPoolSnapshot) -> None:
        base = snapshot.base_token.upper()
        quote = snapshot.quote_token.upper()
        if base not in self.tracked_tokens and quote not in self.tracked_tokens:
            raise ValueError(
                f"Pool {snapshot.pool_address} does not involve tracked tokens {self.tracked_tokens}"
            )

    def _scale(self, value: float | int | None, minimum: float, target: float) -> float:
        if value is None:
            return 0.0

        if minimum <= 0:
            raise ValueError("minimum must be positive when scaling metrics")

        if target <= minimum:
            raise ValueError("target must be greater than minimum when scaling metrics")

        normalised = (float(value) - minimum) / (target - minimum)
        return max(0.0, min(normalised, 1.0))

    def _compute_momentum(self, snapshot: DexPoolSnapshot) -> tuple[float, float]:
        change_pct = snapshot.price_change_24h_pct
        if change_pct is None:
            return 0.5, 0.0

        momentum = 0.5
        volatility_penalty = 0.0

        if change_pct >= 0:
            momentum += min(change_pct / 40.0, 0.5)
        else:
            momentum += max(change_pct / 30.0, -0.5)

        if abs(change_pct) > self.high_volatility_threshold_pct:
            volatility_penalty = min((abs(change_pct) - self.high_volatility_threshold_pct) / 50.0, 0.3)

        return max(0.0, min(momentum, 1.0)), volatility_penalty


def build_scanner_for_tokens(tokens: Sequence[str]) -> DexScannerAlgo:
    """Convenience factory for constructing a TON DEX scanner."""

    return DexScannerAlgo(tracked_tokens=tokens)

