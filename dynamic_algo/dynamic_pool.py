"""Capital pool accounting utilities for investor share tracking.

This module mirrors the behaviour of the Supabase edge functions that manage
the private fund pool.  It provides a lightweight, in-memory implementation
that can be used in research notebooks or tests to reason about how deposits,
withdrawals, and mark-to-market adjustments influence investor ownership.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Iterable, Mapping, MutableMapping, Optional, Tuple

__all__ = [
    "PoolDeposit",
    "PoolWithdrawal",
    "InvestorAllocation",
    "PoolSnapshot",
    "DynamicPoolAlgo",
]


def _coerce_datetime(value: Optional[datetime]) -> datetime:
    """Return a timezone-aware :class:`datetime` for *value*.

    ``None`` values default to ``datetime.now(timezone.utc)``.  Naive datetimes
    are assumed to be UTC which mirrors the behaviour of our edge functions.
    """

    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _round_currency(value: float, *, decimals: int = 2) -> float:
    """Round *value* using the currency precision employed on Supabase."""

    factor = 10 ** decimals
    return round(value * factor) / factor


def _round_token(value: float, *, decimals: int = 6) -> float:
    """Round token balances to the precision used for DCT on-chain."""

    factor = 10 ** decimals
    return round(value * factor) / factor


@dataclass(slots=True)
class PoolDeposit:
    """Normalised representation of a pool deposit entry."""

    investor_id: str
    amount_usd: float
    valuation_usd: float
    dct_amount: float = 0.0
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if not self.investor_id:
            raise ValueError("investor_id is required")
        self.investor_id = str(self.investor_id)
        if self.amount_usd <= 0:
            raise ValueError("amount_usd must be positive")
        if self.valuation_usd <= 0:
            raise ValueError("valuation_usd must be positive")
        self.amount_usd = _round_currency(float(self.amount_usd))
        self.valuation_usd = _round_currency(float(self.valuation_usd))
        self.dct_amount = _round_token(max(float(self.dct_amount), 0.0))
        self.timestamp = _coerce_datetime(self.timestamp)


@dataclass(slots=True)
class PoolWithdrawal:
    """Normalised view of a net withdrawal applied to the pool."""

    investor_id: str
    amount_usd: float
    net_amount_usd: float
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if not self.investor_id:
            raise ValueError("investor_id is required")
        self.investor_id = str(self.investor_id)
        if self.amount_usd <= 0:
            raise ValueError("amount_usd must be positive")
        if self.net_amount_usd <= 0:
            raise ValueError("net_amount_usd must be positive")
        if self.net_amount_usd > self.amount_usd:
            raise ValueError("net_amount_usd cannot exceed amount_usd")
        self.amount_usd = _round_currency(float(self.amount_usd))
        self.net_amount_usd = _round_currency(float(self.net_amount_usd))
        self.timestamp = _coerce_datetime(self.timestamp)


@dataclass(slots=True)
class InvestorAllocation:
    """Computed ownership metrics for an investor."""

    investor_id: str
    contribution_usd: float
    share_percentage: float
    dct_balance: float
    marked_valuation_usd: float


@dataclass(slots=True)
class PoolSnapshot:
    """Aggregated state of the pool at a point in time."""

    total_contribution_usd: float
    total_marked_valuation_usd: float
    total_dct_balance: float
    mark_price: float | None
    updated_at: datetime
    allocations: Tuple[InvestorAllocation, ...]

    @property
    def investor_count(self) -> int:
        return len(self.allocations)


class DynamicPoolAlgo:
    """Track pool deposits, withdrawals, and investor share distribution."""

    def __init__(self, *, mark_price: Optional[float] = None) -> None:
        self.mark_price = float(mark_price) if mark_price is not None else None
        self._deposits: list[PoolDeposit] = []
        self._withdrawals: list[PoolWithdrawal] = []
        self._investors: set[str] = set()

    # ------------------------------------------------------------------ records
    def record_deposit(
        self,
        investor_id: str,
        amount_usd: float,
        *,
        valuation_usd: Optional[float] = None,
        dct_amount: Optional[float] = None,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Mapping[str, object]] = None,
    ) -> PoolDeposit:
        """Store a deposit event and return the normalised record."""

        valuation = amount_usd if valuation_usd is None else valuation_usd
        deposit = PoolDeposit(
            investor_id=investor_id,
            amount_usd=amount_usd,
            valuation_usd=valuation,
            dct_amount=dct_amount or 0.0,
            timestamp=timestamp or datetime.now(timezone.utc),
            metadata=metadata,
        )
        self._deposits.append(deposit)
        self._investors.add(deposit.investor_id)
        return deposit

    def record_withdrawal(
        self,
        investor_id: str,
        amount_usd: float,
        *,
        net_amount_usd: Optional[float] = None,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Mapping[str, object]] = None,
    ) -> PoolWithdrawal:
        """Store a withdrawal event (after applying lockups/fees)."""

        withdrawal = PoolWithdrawal(
            investor_id=investor_id,
            amount_usd=amount_usd,
            net_amount_usd=net_amount_usd if net_amount_usd is not None else amount_usd,
            timestamp=timestamp or datetime.now(timezone.utc),
            metadata=metadata,
        )
        self._withdrawals.append(withdrawal)
        self._investors.add(withdrawal.investor_id)
        return withdrawal

    def set_mark_price(self, price: Optional[float]) -> None:
        """Update the mark price used when computing valuations."""

        self.mark_price = float(price) if price is not None else None

    # ------------------------------------------------------------- computations
    def _compute_state(
        self,
        mark_price: Optional[float],
        *,
        updated_at: Optional[datetime] = None,
    ) -> PoolSnapshot:
        live_price = float(mark_price) if mark_price is not None else None

        contributions: MutableMapping[str, float] = {}
        dct_balances: MutableMapping[str, float] = {}
        marked_valuations: MutableMapping[str, float] = {}

        # Process deposits first to seed contributions and balances
        for entry in self._deposits:
            contributions[entry.investor_id] = contributions.get(entry.investor_id, 0.0) + entry.valuation_usd
            if entry.dct_amount > 0:
                dct_balances[entry.investor_id] = dct_balances.get(entry.investor_id, 0.0) + entry.dct_amount
            mark = (
                _round_currency(entry.dct_amount * live_price)
                if live_price is not None and entry.dct_amount > 0
                else entry.valuation_usd
            )
            marked_valuations[entry.investor_id] = marked_valuations.get(entry.investor_id, 0.0) + mark

        # Apply withdrawals (approved/fulfilled)
        for withdrawal in self._withdrawals:
            net = max(withdrawal.net_amount_usd, 0.0)
            if net <= 0:
                continue
            prev_contribution = contributions.get(withdrawal.investor_id, 0.0)
            next_contribution = max(prev_contribution - net, 0.0)
            contributions[withdrawal.investor_id] = next_contribution

            prev_marked = marked_valuations.get(withdrawal.investor_id, prev_contribution)
            next_marked = max(prev_marked - net, 0.0)
            marked_valuations[withdrawal.investor_id] = _round_currency(next_marked)

            if live_price and live_price > 0:
                prev_dct = dct_balances.get(withdrawal.investor_id, 0.0)
                if prev_dct > 0:
                    delta = _round_token(net / live_price)
                    next_dct = max(prev_dct - delta, 0.0)
                    dct_balances[withdrawal.investor_id] = _round_token(next_dct)

        all_investors = sorted(self._investors.union(contributions.keys()))
        total_contribution = sum(max(value, 0.0) for value in contributions.values())
        allocations: list[InvestorAllocation] = []

        for investor_id in all_investors:
            contribution = _round_currency(max(contributions.get(investor_id, 0.0), 0.0))
            share = (contribution / total_contribution * 100.0) if total_contribution > 0 else 0.0
            dct_balance = _round_token(max(dct_balances.get(investor_id, 0.0), 0.0))
            marked = _round_currency(max(marked_valuations.get(investor_id, contribution), 0.0))
            allocations.append(
                InvestorAllocation(
                    investor_id=investor_id,
                    contribution_usd=contribution,
                    share_percentage=round(share, 6),
                    dct_balance=dct_balance,
                    marked_valuation_usd=marked,
                )
            )

        total_marked = _round_currency(sum(allocation.marked_valuation_usd for allocation in allocations))
        total_dct = _round_token(sum(allocation.dct_balance for allocation in allocations))

        return PoolSnapshot(
            total_contribution_usd=_round_currency(total_contribution),
            total_marked_valuation_usd=total_marked,
            total_dct_balance=total_dct,
            mark_price=live_price,
            updated_at=_coerce_datetime(updated_at),
            allocations=tuple(allocations),
        )

    def snapshot(self, *, mark_price: Optional[float] = None) -> PoolSnapshot:
        """Return the aggregated pool state.

        When *mark_price* is provided it overrides the stored mark price for the
        computation.  The snapshot timestamp reflects when the method was
        invoked, matching behaviour of the edge functions that recompute shares
        on demand.
        """

        price = mark_price if mark_price is not None else self.mark_price
        return self._compute_state(price, updated_at=datetime.now(timezone.utc))

    # ----------------------------------------------------------------- metadata
    @property
    def deposits(self) -> Tuple[PoolDeposit, ...]:
        return tuple(self._deposits)

    @property
    def withdrawals(self) -> Tuple[PoolWithdrawal, ...]:
        return tuple(self._withdrawals)

    def clear(self) -> None:
        """Reset tracked state."""

        self._deposits.clear()
        self._withdrawals.clear()
        self._investors.clear()

