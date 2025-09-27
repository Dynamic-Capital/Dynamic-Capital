"""Stake-weighted consensus utilities with deterministic validator selection."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from typing import Iterator, Mapping, MutableSequence, Sequence


__all__ = [
    "DynamicProofOfStake",
    "StakeBlock",
    "StakeValidator",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_optional_identifier(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _coerce_positive_float(value: float | int) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("value must be numeric") from exc
    if result <= 0:
        raise ValueError("value must be positive")
    return result


def _coerce_non_negative_float(value: float | int) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("value must be numeric") from exc
    if result < 0:
        raise ValueError("value must be non-negative")
    return result


def _coerce_index(value: int) -> int:
    try:
        index = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("index must be an integer") from exc
    if index < 0:
        raise ValueError("index must be non-negative")
    return index


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _serialise_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _hash_payload(payload: Mapping[str, object]) -> str:
    # JSON encoding would introduce additional dependencies; a deterministic tuple works too.
    encoded = repr(sorted(payload.items())).encode("utf-8")
    return sha256(encoded).hexdigest()


def _normalise_transactions(
    transactions: Sequence["Transaction" | Mapping[str, object]] | None,
) -> tuple["Transaction", ...]:
    if not transactions:
        return ()
    normalised: list[Transaction] = []
    for entry in transactions:
        if isinstance(entry, Transaction):
            normalised.append(entry)
            continue
        if not isinstance(entry, Mapping):  # pragma: no cover - defensive guard
            raise TypeError("transaction must be a Transaction or mapping")
        normalised.append(Transaction(**entry))
    return tuple(normalised)


@dataclass(slots=True)
class Transaction:
    """A value transfer tracked inside proof-of-stake blocks."""

    sender: str
    recipient: str
    amount: float
    timestamp: datetime | None = None
    metadata: Mapping[str, object] | None = None
    signature: str | None = None

    def __post_init__(self) -> None:
        self.sender = _normalise_identifier(self.sender)
        self.recipient = _normalise_identifier(self.recipient)
        self.amount = _coerce_positive_float(self.amount)
        self.timestamp = _ensure_utc(self.timestamp)
        self.metadata = _coerce_metadata(self.metadata)
        self.signature = _normalise_optional_identifier(self.signature)

    def to_payload(self) -> Mapping[str, object]:
        return {
            "sender": self.sender,
            "recipient": self.recipient,
            "amount": self.amount,
            "timestamp": _serialise_datetime(self.timestamp),
            "metadata": self.metadata,
            "signature": self.signature,
        }


@dataclass(slots=True)
class StakeValidator:
    """Represents a validator participating in the stake-weighted lottery."""

    identifier: str
    bonded_stake: float
    delegated_stake: float = 0.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.bonded_stake = _coerce_positive_float(self.bonded_stake)
        self.delegated_stake = _coerce_non_negative_float(self.delegated_stake)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def total_stake(self) -> float:
        return self.bonded_stake + self.delegated_stake

    def bond(self, amount: float | int) -> None:
        self.bonded_stake += _coerce_positive_float(amount)

    def delegate(self, amount: float | int) -> None:
        self.delegated_stake += _coerce_positive_float(amount)

    def slash(self, amount: float | int) -> None:
        penalty = _coerce_positive_float(amount)
        if penalty > self.total_stake:
            raise ValueError("slash amount exceeds validator stake")
        bonded_penalty = min(self.bonded_stake, penalty)
        self.bonded_stake -= bonded_penalty
        self.delegated_stake -= penalty - bonded_penalty


@dataclass(slots=True)
class StakeBlock:
    """A block signed by the validator chosen via proof-of-stake."""

    index: int
    previous_hash: str
    validator: str
    transactions: tuple[Transaction, ...] = field(default_factory=tuple)
    timestamp: datetime | None = None
    seed: str | None = None
    metadata: Mapping[str, object] | None = None

    _hash: str = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.index = _coerce_index(self.index)
        self.previous_hash = _normalise_identifier(self.previous_hash)
        self.validator = _normalise_identifier(self.validator)
        self.transactions = _normalise_transactions(self.transactions)
        self.timestamp = _ensure_utc(self.timestamp)
        self.seed = _normalise_optional_identifier(self.seed)
        self.metadata = _coerce_metadata(self.metadata)
        self._hash = self.compute_hash()

    @property
    def hash(self) -> str:
        return self._hash

    def _base_payload(self) -> Mapping[str, object]:
        return {
            "index": self.index,
            "previous_hash": self.previous_hash,
            "validator": self.validator,
            "transactions": [tx.to_payload() for tx in self.transactions],
            "timestamp": _serialise_datetime(self.timestamp),
            "seed": self.seed,
            "metadata": self.metadata,
        }

    def compute_hash(self) -> str:
        return _hash_payload(self._base_payload())

    def refresh_hash(self) -> str:
        self._hash = self.compute_hash()
        return self._hash


class DynamicProofOfStake:
    """Coordinates stake registration, selection, and block production."""

    def __init__(
        self,
        *,
        minimum_validator_stake: float = 1.0,
        reward: float = 0.0,
        genesis_transactions: Sequence[Transaction | Mapping[str, object]] | None = None,
    ) -> None:
        if minimum_validator_stake <= 0:
            raise ValueError("minimum_validator_stake must be positive")
        self.minimum_validator_stake = float(minimum_validator_stake)
        self.reward = float(reward)
        self._validators: dict[str, StakeValidator] = {}
        self._pending: MutableSequence[Transaction] = []
        self._chain: list[StakeBlock] = [
            StakeBlock(
                index=0,
                previous_hash="0" * 64,
                validator="__genesis__",
                transactions=_normalise_transactions(genesis_transactions),
                timestamp=_utcnow(),
                seed="genesis",
            )
        ]

    @property
    def chain(self) -> tuple[StakeBlock, ...]:
        return tuple(self._chain)

    @property
    def pending_transactions(self) -> tuple[Transaction, ...]:
        return tuple(self._pending)

    @property
    def last_block(self) -> StakeBlock:
        return self._chain[-1]

    def register_validator(
        self,
        identifier: str,
        *,
        bonded_stake: float,
        delegated_stake: float = 0.0,
        metadata: Mapping[str, object] | None = None,
    ) -> StakeValidator:
        if identifier in self._validators:
            raise ValueError("validator already registered")
        validator = StakeValidator(
            identifier=identifier,
            bonded_stake=bonded_stake,
            delegated_stake=delegated_stake,
            metadata=metadata,
        )
        if validator.total_stake < self.minimum_validator_stake:
            raise ValueError("validator does not meet minimum stake requirement")
        self._validators[validator.identifier] = validator
        return validator

    def update_metadata(self, identifier: str, metadata: Mapping[str, object] | None) -> StakeValidator:
        validator = self._require_validator(identifier)
        validator.metadata = _coerce_metadata(metadata)
        return validator

    def bond_stake(self, identifier: str, amount: float | int) -> StakeValidator:
        validator = self._require_validator(identifier)
        validator.bond(amount)
        return validator

    def delegate_stake(self, identifier: str, amount: float | int) -> StakeValidator:
        validator = self._require_validator(identifier)
        validator.delegate(amount)
        return validator

    def slash_validator(self, identifier: str, amount: float | int) -> StakeValidator:
        validator = self._require_validator(identifier)
        validator.slash(amount)
        if validator.total_stake < self.minimum_validator_stake:
            del self._validators[validator.identifier]
            raise ValueError("validator removed due to insufficient stake after slashing")
        return validator

    def _require_validator(self, identifier: str) -> StakeValidator:
        try:
            return self._validators[_normalise_identifier(identifier)]
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise ValueError("unknown validator") from exc

    def add_transaction(
        self,
        sender: str,
        recipient: str,
        amount: float,
        *,
        timestamp: datetime | None = None,
        metadata: Mapping[str, object] | None = None,
        signature: str | None = None,
    ) -> Transaction:
        transaction = Transaction(
            sender=sender,
            recipient=recipient,
            amount=amount,
            timestamp=timestamp,
            metadata=metadata,
            signature=signature,
        )
        self._pending.append(transaction)
        return transaction

    def _derive_entropy(self, entropy: str | None = None) -> str:
        base = f"{self.last_block.hash}:{self.last_block.seed or ''}:{len(self._chain)}"
        if entropy:
            base = f"{base}:{entropy.strip()}"
        return sha256(base.encode("utf-8")).hexdigest()

    def select_validator(self, entropy: str | None = None) -> StakeValidator:
        if not self._validators:
            raise ValueError("no validators registered")
        eligible = [
            validator
            for validator in self._validators.values()
            if validator.total_stake >= self.minimum_validator_stake
        ]
        if not eligible:
            raise ValueError("no validators meet the minimum stake requirement")
        total_stake = sum(validator.total_stake for validator in eligible)
        if total_stake <= 0:  # pragma: no cover - defensive guard
            raise ValueError("total stake must be positive")
        digest = int(self._derive_entropy(entropy), 16)
        ticket = digest / float(1 << 256)
        cumulative = 0.0
        for validator in sorted(eligible, key=lambda entry: entry.identifier):
            cumulative += validator.total_stake / total_stake
            if ticket <= cumulative:
                return validator
        return eligible[-1]

    def forge_block(
        self,
        *,
        validator: str | None = None,
        entropy: str | None = None,
        timestamp: datetime | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> StakeBlock:
        if not self._pending and self.reward <= 0:
            raise ValueError("no transactions available to forge")
        selected = self.select_validator(entropy) if validator is None else self._require_validator(validator)
        if selected.total_stake < self.minimum_validator_stake:
            raise ValueError("selected validator does not meet minimum stake requirement")
        reward_transactions: list[Transaction] = []
        if self.reward > 0:
            reward_transactions.append(
                Transaction(
                    sender="__network__",
                    recipient=selected.identifier,
                    amount=self.reward,
                )
            )
        block_transactions = tuple(self._pending) + tuple(reward_transactions)
        block = StakeBlock(
            index=len(self._chain),
            previous_hash=self.last_block.hash,
            validator=selected.identifier,
            transactions=block_transactions,
            timestamp=_ensure_utc(timestamp),
            seed=self._derive_entropy(entropy),
            metadata=metadata,
        )
        block.refresh_hash()
        self._chain.append(block)
        self._pending.clear()
        return block

    def validate_chain(self) -> bool:
        if not self._chain:
            return True
        for index in range(1, len(self._chain)):
            current = self._chain[index]
            previous = self._chain[index - 1]
            if current.previous_hash != previous.hash:
                return False
            if current.hash != current.compute_hash():
                return False
            if current.validator not in self._validators and current.validator != "__genesis__":
                return False
        return True

    def iter_transactions(self) -> Iterator[Transaction]:
        for block in self._chain:
            for transaction in block.transactions:
                yield transaction

    def get_balance(self, identifier: str) -> float:
        identifier = _normalise_identifier(identifier)
        balance = 0.0
        for transaction in self.iter_transactions():
            if transaction.sender == identifier:
                balance -= transaction.amount
            if transaction.recipient == identifier:
                balance += transaction.amount
        return balance

    def snapshot(self) -> Mapping[str, object]:
        return {
            "minimum_validator_stake": self.minimum_validator_stake,
            "reward": self.reward,
            "validators": {
                identifier: {
                    "bonded": validator.bonded_stake,
                    "delegated": validator.delegated_stake,
                    "metadata": validator.metadata,
                }
                for identifier, validator in sorted(self._validators.items())
            },
            "pending": [tx.to_payload() for tx in self._pending],
            "chain": [
                {
                    "index": block.index,
                    "previous_hash": block.previous_hash,
                    "hash": block.hash,
                    "validator": block.validator,
                    "timestamp": _serialise_datetime(block.timestamp),
                    "seed": block.seed,
                    "transactions": [tx.to_payload() for tx in block.transactions],
                    "metadata": block.metadata,
                }
                for block in self._chain
            ],
        }
