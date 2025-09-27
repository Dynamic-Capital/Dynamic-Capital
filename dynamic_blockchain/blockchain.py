"""A lightweight blockchain implementation with strong validation primitives."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from typing import Iterator, Mapping, MutableSequence, Sequence
import json

__all__ = [
    "Block",
    "DynamicBlockchain",
    "Transaction",
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


def _coerce_amount(value: float | int) -> float:
    try:
        amount = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("amount must be numeric") from exc
    if amount <= 0:
        raise ValueError("amount must be positive")
    return amount


def _coerce_difficulty(value: int) -> int:
    try:
        difficulty = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("difficulty must be an integer") from exc
    if difficulty < 1:
        raise ValueError("difficulty must be at least 1")
    return difficulty


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


def _serialise_transaction(transaction: Transaction) -> Mapping[str, object]:
    return {
        "sender": transaction.sender,
        "recipient": transaction.recipient,
        "amount": transaction.amount,
        "timestamp": _serialise_datetime(transaction.timestamp),
        "metadata": transaction.metadata,
        "signature": transaction.signature,
    }


def _hash_payload(payload: Mapping[str, object]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256(encoded).hexdigest()


def _normalise_transactions(transactions: Sequence[Transaction | Mapping[str, object]] | None) -> tuple[Transaction, ...]:
    if not transactions:
        return ()
    normalised: list[Transaction] = []
    for item in transactions:
        normalised.append(_coerce_transaction(item))
    return tuple(normalised)


def _coerce_transaction(value: Transaction | Mapping[str, object]) -> Transaction:
    if isinstance(value, Transaction):
        return value
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("transaction must be a Transaction or mapping")
    return Transaction(**value)


@dataclass(slots=True)
class Transaction:
    """A transfer of value between two identifiers."""

    sender: str
    recipient: str
    amount: float
    timestamp: datetime | None = None
    metadata: Mapping[str, object] | None = None
    signature: str | None = None

    def __post_init__(self) -> None:
        self.sender = _normalise_identifier(self.sender)
        self.recipient = _normalise_identifier(self.recipient)
        self.amount = _coerce_amount(self.amount)
        self.timestamp = _ensure_utc(self.timestamp)
        self.metadata = _coerce_metadata(self.metadata)
        self.signature = _normalise_optional_identifier(self.signature)

    def to_payload(self) -> Mapping[str, object]:
        return _serialise_transaction(self)


@dataclass(slots=True)
class Block:
    """A block groups transactions and secures them with proof-of-work."""

    index: int
    previous_hash: str
    transactions: tuple[Transaction, ...] = field(default_factory=tuple)
    timestamp: datetime | None = None
    nonce: int = 0
    difficulty: int = 1
    metadata: Mapping[str, object] | None = None

    _hash: str = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.index = _coerce_index(self.index)
        self.previous_hash = _normalise_identifier(self.previous_hash)
        self.transactions = _normalise_transactions(self.transactions)
        self.timestamp = _ensure_utc(self.timestamp)
        self.nonce = _coerce_index(self.nonce)
        self.difficulty = _coerce_difficulty(self.difficulty)
        self.metadata = _coerce_metadata(self.metadata)
        self._hash = self.compute_hash()

    @property
    def hash(self) -> str:
        return self._hash

    def _base_payload(self) -> Mapping[str, object]:
        return {
            "index": self.index,
            "previous_hash": self.previous_hash,
            "transactions": [tx.to_payload() for tx in self.transactions],
            "timestamp": _serialise_datetime(self.timestamp),
            "nonce": self.nonce,
            "difficulty": self.difficulty,
            "metadata": self.metadata,
        }

    def compute_hash(self) -> str:
        payload = self._base_payload()
        return _hash_payload(payload)

    def refresh_hash(self) -> str:
        self._hash = self.compute_hash()
        return self._hash

    def mine(self, difficulty: int | None = None) -> str:
        target = "0" * (difficulty or self.difficulty)
        nonce = self.nonce
        while True:
            self.nonce = nonce
            candidate = self.refresh_hash()
            if candidate.startswith(target):
                self.difficulty = difficulty or self.difficulty
                return candidate
            nonce += 1


class DynamicBlockchain:
    """Manages a sequence of blocks with validation and account balances."""

    def __init__(
        self,
        *,
        difficulty: int = 2,
        reward: float = 0.0,
        genesis_transactions: Sequence[Transaction | Mapping[str, object]] | None = None,
    ) -> None:
        self.difficulty = _coerce_difficulty(difficulty)
        self.reward = float(reward)
        self._pending: MutableSequence[Transaction] = []
        genesis_block = Block(
            index=0,
            previous_hash="0" * 64,
            transactions=_normalise_transactions(genesis_transactions),
            timestamp=_utcnow(),
            difficulty=self.difficulty,
        )
        # The genesis block acts as anchor and does not require mining difficulty checks.
        self._chain: list[Block] = [genesis_block]

    @property
    def chain(self) -> tuple[Block, ...]:
        return tuple(self._chain)

    @property
    def pending_transactions(self) -> tuple[Transaction, ...]:
        return tuple(self._pending)

    @property
    def last_block(self) -> Block:
        return self._chain[-1]

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

    def mine_pending_transactions(self, miner_address: str | None = None) -> Block:
        reward_transaction: list[Transaction] = []
        if self.reward > 0 and miner_address:
            reward_transaction.append(
                Transaction(
                    sender="__network__",
                    recipient=miner_address,
                    amount=self.reward,
                )
            )
        if not self._pending and not reward_transaction:
            raise ValueError("no transactions available to mine")

        transactions = tuple(self._pending) + tuple(reward_transaction)
        block = Block(
            index=len(self._chain),
            previous_hash=self.last_block.hash,
            transactions=transactions,
            timestamp=_utcnow(),
            difficulty=self.difficulty,
        )
        block.mine(self.difficulty)
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
            if not current.hash.startswith("0" * current.difficulty):
                return False
        return True

    def get_balance(self, identifier: str) -> float:
        identifier = _normalise_identifier(identifier)
        balance = 0.0
        for transaction in self.iter_transactions():
            if transaction.sender == identifier:
                balance -= transaction.amount
            if transaction.recipient == identifier:
                balance += transaction.amount
        return balance

    def iter_transactions(self) -> Iterator[Transaction]:
        for block in self._chain:
            for transaction in block.transactions:
                yield transaction

    def is_chain_valid_after(self, block: Block) -> bool:
        if block not in self._chain:
            raise ValueError("block must belong to the current chain")
        index = self._chain.index(block)
        subset = self._chain[index:]
        for offset in range(1, len(subset)):
            current = subset[offset]
            previous = subset[offset - 1]
            if current.previous_hash != previous.hash:
                return False
            if current.hash != current.compute_hash():
                return False
            if not current.hash.startswith("0" * current.difficulty):
                return False
        return True

    def snapshot(self) -> Mapping[str, object]:
        return {
            "difficulty": self.difficulty,
            "reward": self.reward,
            "pending": [tx.to_payload() for tx in self._pending],
            "chain": [
                {
                    "index": block.index,
                    "previous_hash": block.previous_hash,
                    "hash": block.hash,
                    "timestamp": _serialise_datetime(block.timestamp),
                    "transactions": [tx.to_payload() for tx in block.transactions],
                    "difficulty": block.difficulty,
                    "nonce": block.nonce,
                }
                for block in self._chain
            ],
        }
