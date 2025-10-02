"""Wallet analytics and intervention planning for Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "WalletAccount",
    "WalletBalance",
    "WalletExposure",
    "WalletAction",
    "WalletSummary",
    "WalletUserLink",
    "DynamicWalletEngine",
]


_ALLOWED_RISK_TIERS = {"conservative", "standard", "aggressive"}
_ALLOWED_PRIORITIES = {"low", "normal", "high"}
_RISK_BUFFER_TARGETS = {"conservative": 0.35, "standard": 0.2, "aggressive": 0.1}


def _normalise_text(value: str) -> str:
    if not isinstance(value, str):  # pragma: no cover - defensive guard
        raise TypeError("value must be a string")
    text = value.strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _normalise_upper(value: str) -> str:
    return _normalise_text(value).upper()


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(tags: Iterable[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    cleaned: list[str] = []
    for tag in tags:
        text = tag.strip()
        if text:
            cleaned.append(text.lower())
    return tuple(dict.fromkeys(cleaned))


def _ensure_non_negative(value: float) -> float:
    coerced = float(value)
    if coerced < 0:
        raise ValueError("value must be non-negative")
    return coerced


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, float(value)))


def _normalise_ton_domain(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip().lower()
    if not text:
        return None
    if "." not in text or not text.endswith(".ton"):
        raise ValueError("ton_domain must end with .ton")
    return text


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping if provided")
    return dict(metadata)


@dataclass(slots=True)
class WalletAccount:
    """Metadata describing a managed wallet."""

    address: str
    owner: str
    risk_tier: str = "standard"
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.address = _normalise_upper(self.address)
        self.owner = _normalise_text(self.owner)
        risk = _normalise_lower(self.risk_tier)
        if risk not in _ALLOWED_RISK_TIERS:
            allowed = ", ".join(sorted(_ALLOWED_RISK_TIERS))
            raise ValueError(f"risk_tier must be one of {allowed}")
        self.risk_tier = risk
        self.tags = _normalise_tags(self.tags)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class WalletBalance:
    """Balance snapshot for a given asset."""

    asset: str
    total: float
    available: float | None = None
    locked: float = 0.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.asset = _normalise_upper(self.asset)
        self.total = _ensure_non_negative(self.total)
        self.locked = _ensure_non_negative(self.locked)
        if self.available is None:
            self.available = max(self.total - self.locked, 0.0)
        else:
            self.available = min(self.total, _ensure_non_negative(self.available))
        if self.available + self.locked - self.total > 1e-9:
            raise ValueError("available plus locked exceeds total balance")
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    @property
    def utilisation(self) -> float:
        if self.total == 0:
            return 0.0
        return _clamp(1.0 - (self.available / self.total))


@dataclass(slots=True)
class WalletExposure:
    """Derived exposure metrics for a wallet asset."""

    asset: str
    balance_total: float
    balance_available: float
    balance_locked: float
    usd_value: float
    share: float
    utilisation: float

    def __post_init__(self) -> None:
        self.asset = _normalise_upper(self.asset)
        self.balance_total = _ensure_non_negative(self.balance_total)
        self.balance_available = _ensure_non_negative(self.balance_available)
        self.balance_locked = _ensure_non_negative(self.balance_locked)
        self.usd_value = max(0.0, float(self.usd_value))
        self.share = _clamp(self.share)
        self.utilisation = _clamp(self.utilisation)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "asset": self.asset,
            "balance_total": self.balance_total,
            "balance_available": self.balance_available,
            "balance_locked": self.balance_locked,
            "usd_value": self.usd_value,
            "share": self.share,
            "utilisation": self.utilisation,
        }


@dataclass(slots=True)
class WalletAction:
    """Actionable recommendation for a wallet operator."""

    category: str
    description: str
    priority: str = "normal"
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.category = _normalise_lower(self.category)
        self.description = _normalise_text(self.description)
        priority = _normalise_lower(self.priority)
        if priority not in _ALLOWED_PRIORITIES:
            allowed = ", ".join(sorted(_ALLOWED_PRIORITIES))
            raise ValueError(f"priority must be one of {allowed}")
        self.priority = priority
        self.metadata = _coerce_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "category": self.category,
            "description": self.description,
            "priority": self.priority,
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class WalletUserLink:
    """Mapping between a Telegram user and their TON wallet."""

    telegram_id: str
    wallet_address: str
    ton_domain: str | None = None
    wallet_app: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.telegram_id = _normalise_text(self.telegram_id)
        self.wallet_address = _normalise_upper(self.wallet_address)
        self.ton_domain = _normalise_ton_domain(self.ton_domain)
        self.wallet_app = (
            _normalise_lower(self.wallet_app) if self.wallet_app is not None else None
        )
        self.metadata = _coerce_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "telegram_id": self.telegram_id,
            "wallet_address": self.wallet_address,
            "metadata": dict(self.metadata or {}),
        }
        if self.ton_domain:
            payload["ton_domain"] = self.ton_domain
        if self.wallet_app:
            payload["wallet_app"] = self.wallet_app
        return payload


@dataclass(slots=True)
class WalletSummary:
    """Aggregated analytics for a wallet."""

    account: WalletAccount
    total_value_usd: float
    available_value_usd: float
    buffer_ratio: float
    diversification_score: float
    exposures: tuple[WalletExposure, ...]
    actions: tuple[WalletAction, ...]
    alerts: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "account": {
                "address": self.account.address,
                "owner": self.account.owner,
                "risk_tier": self.account.risk_tier,
                "tags": list(self.account.tags),
            },
            "total_value_usd": self.total_value_usd,
            "available_value_usd": self.available_value_usd,
            "buffer_ratio": self.buffer_ratio,
            "diversification_score": self.diversification_score,
            "exposures": [exposure.as_dict() for exposure in self.exposures],
            "actions": [action.as_dict() for action in self.actions],
            "alerts": list(self.alerts),
        }


class DynamicWalletEngine:
    """Analyse wallet health and highlight operational interventions."""

    def __init__(
        self,
        *,
        exposure_limits: Mapping[str, float] | None = None,
        base_buffer_target: float = 0.18,
    ) -> None:
        self._accounts: dict[str, WalletAccount] = {}
        self._balances: dict[str, dict[str, WalletBalance]] = {}
        self._wallet_users: dict[str, WalletUserLink] = {}
        self._wallet_to_user: dict[str, str] = {}
        limits: dict[str, float] = {}
        for asset, limit in (exposure_limits or {}).items():
            limits[_normalise_upper(asset)] = _clamp(limit)
        self._exposure_limits = limits
        self._base_buffer_target = _clamp(base_buffer_target)

    def register_account(self, account: WalletAccount) -> None:
        if account.address in self._accounts:
            raise ValueError(f"wallet {account.address} already registered")
        self._accounts[account.address] = account
        self._balances.setdefault(account.address, {})

    def ingest_balances(self, address: str, balances: Sequence[WalletBalance]) -> None:
        wallet = self._require_account(address)
        snapshot: dict[str, WalletBalance] = {}
        for balance in balances:
            snapshot[balance.asset] = balance
        self._balances[wallet.address] = snapshot

    def evaluate_wallet(
        self,
        address: str,
        price_map: Mapping[str, float],
    ) -> WalletSummary:
        wallet = self._require_account(address)
        balances = self._balances.get(wallet.address, {})
        if not balances:
            raise ValueError(f"no balances recorded for wallet {wallet.address}")

        prices = {asset.upper(): max(0.0, float(price)) for asset, price in price_map.items()}
        exposures: list[WalletExposure] = []
        total_value = 0.0
        available_value = 0.0
        alerts: list[str] = []

        for asset, balance in sorted(balances.items()):
            price = prices.get(asset)
            if price is None:
                alerts.append(f"Missing price for {asset}; assuming zero valuation")
                price = 0.0
            usd_value = balance.total * price
            total_value += usd_value
            available_value += balance.available * price
            exposures.append(
                WalletExposure(
                    asset=asset,
                    balance_total=balance.total,
                    balance_available=balance.available,
                    balance_locked=balance.locked,
                    usd_value=usd_value,
                    share=0.0,  # placeholder updated below
                    utilisation=balance.utilisation,
                )
            )

        if total_value == 0:
            diversification = 1.0
            shares = [0.0 for _ in exposures]
        else:
            shares = [exposure.usd_value / total_value for exposure in exposures]
            diversification = 1.0 - sum(share**2 for share in shares)

        actions: list[WalletAction] = []
        for index, share in enumerate(shares):
            exposure = exposures[index]
            exposures[index] = WalletExposure(
                asset=exposure.asset,
                balance_total=exposure.balance_total,
                balance_available=exposure.balance_available,
                balance_locked=exposure.balance_locked,
                usd_value=exposure.usd_value,
                share=share,
                utilisation=exposure.utilisation,
            )
            limit = self._exposure_limits.get(exposure.asset)
            if limit is not None and share > limit:
                actions.append(
                    WalletAction(
                        category="rebalance",
                        description=(
                            f"Reduce {exposure.asset} exposure to <= {limit:.0%} of portfolio (currently {share:.0%})."
                        ),
                        priority="high",
                        metadata={
                            "asset": exposure.asset,
                            "share": share,
                            "limit": limit,
                        },
                    )
                )

        target_buffer = max(self._base_buffer_target, _RISK_BUFFER_TARGETS[wallet.risk_tier])
        buffer_ratio = 1.0 if total_value == 0 else _clamp(available_value / total_value)
        if buffer_ratio < target_buffer:
            actions.append(
                WalletAction(
                    category="liquidity",
                    description=(
                        "Increase liquid reserves; buffer below target "
                        f"({buffer_ratio:.0%} vs {target_buffer:.0%})."
                    ),
                    priority="high" if wallet.risk_tier != "aggressive" else "normal",
                    metadata={
                        "buffer_ratio": buffer_ratio,
                        "target_buffer": target_buffer,
                    },
                )
            )

        if diversification < 0.35 and total_value > 0:
            actions.append(
                WalletAction(
                    category="diversify",
                    description="Diversification score is weak; evaluate adding non-correlated assets.",
                    priority="normal",
                    metadata={"diversification_score": diversification},
                )
            )

        return WalletSummary(
            account=wallet,
            total_value_usd=total_value,
            available_value_usd=available_value,
            buffer_ratio=buffer_ratio,
            diversification_score=_clamp(diversification),
            exposures=tuple(exposures),
            actions=tuple(actions),
            alerts=tuple(alerts),
        )

    def _require_account(self, address: str) -> WalletAccount:
        key = _normalise_upper(address)
        try:
            return self._accounts[key]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise ValueError(f"wallet {key} is not registered") from exc

    def configure_wallet_user(self, link: WalletUserLink) -> Mapping[str, object]:
        """Register a Telegram ⇄ TON wallet link and return its serialised form."""

        existing = self._wallet_users.get(link.telegram_id)
        if existing is not None and existing.wallet_address != link.wallet_address:
            raise ValueError("telegram user already linked to a different wallet")

        owner = self._wallet_to_user.get(link.wallet_address)
        if owner is not None and owner != link.telegram_id:
            raise ValueError("wallet address already linked to another telegram user")

        if existing is not None:
            merged_metadata: dict[str, object] = {}
            if existing.metadata:
                merged_metadata.update(existing.metadata)
            if link.metadata:
                merged_metadata.update(link.metadata)
            link = WalletUserLink(
                telegram_id=existing.telegram_id,
                wallet_address=existing.wallet_address,
                ton_domain=link.ton_domain or existing.ton_domain,
                wallet_app=link.wallet_app or existing.wallet_app,
                metadata=merged_metadata,
            )

        self._wallet_users[link.telegram_id] = link
        self._wallet_to_user[link.wallet_address] = link.telegram_id
        return link.as_dict()

    def list_wallet_users(self) -> tuple[WalletUserLink, ...]:
        """Return registered wallet links for inspection."""

        return tuple(self._wallet_users.values())

    def export_wallet_users(self) -> list[Mapping[str, object]]:
        """Serialise all wallet links to dictionaries suitable for persistence."""

        return [link.as_dict() for link in self._wallet_users.values()]
