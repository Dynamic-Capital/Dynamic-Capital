"""Dynamic Accounting System primitives for double-entry bookkeeping."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "AccountNature",
    "AccountType",
    "Account",
    "JournalLine",
    "JournalEntry",
    "TrialBalanceLine",
    "TrialBalance",
    "IncomeStatement",
    "BalanceSheet",
    "Ledger",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str, *, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} must not be empty")
    return cleaned


def _normalise_code(value: str, *, field_name: str) -> str:
    cleaned = _normalise_text(value, field_name=field_name)
    return cleaned.upper()


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


class AccountNature(Enum):
    """Natures indicate whether debits or credits increase an account."""

    DEBIT = "debit"
    CREDIT = "credit"


class AccountType(Enum):
    """Enumeration of supported account categories."""

    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"
    CONTRA_ASSET = "contra_asset"
    CONTRA_LIABILITY = "contra_liability"
    CONTRA_EQUITY = "contra_equity"
    OTHER_INCOME = "other_income"
    OTHER_EXPENSE = "other_expense"

    @property
    def nature(self) -> AccountNature:
        if self in {
            AccountType.ASSET,
            AccountType.EXPENSE,
        }:
            return AccountNature.DEBIT
        return AccountNature.CREDIT

    @property
    def base_type(self) -> "AccountType":
        if self == AccountType.CONTRA_ASSET:
            return AccountType.ASSET
        if self == AccountType.CONTRA_LIABILITY:
            return AccountType.LIABILITY
        if self == AccountType.CONTRA_EQUITY:
            return AccountType.EQUITY
        return self


@dataclass(slots=True)
class Account:
    """Represents an individual account inside the ledger."""

    code: str
    name: str
    account_type: AccountType
    balance: float = 0.0
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.code = _normalise_code(self.code, field_name="code")
        self.name = _normalise_text(self.name, field_name="name")
        self.balance = float(self.balance)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def nature(self) -> AccountNature:
        return self.account_type.nature

    def apply(self, *, debit: float = 0.0, credit: float = 0.0) -> None:
        """Apply debit/credit amounts to this account."""

        if debit < 0 or credit < 0:
            raise ValueError("Amounts must be non-negative")
        if debit and credit:
            raise ValueError("Line must not contain both debit and credit")
        if debit == 0 and credit == 0:
            return

        if self.nature is AccountNature.DEBIT:
            delta = debit - credit
        else:
            delta = credit - debit
        self.balance += delta

    def trial_balance_view(self) -> tuple[float, float]:
        """Return (debit, credit) presentation for trial balance reporting."""

        if self.nature is AccountNature.DEBIT:
            debit = max(self.balance, 0.0)
            credit = max(-self.balance, 0.0)
        else:
            debit = max(-self.balance, 0.0)
            credit = max(self.balance, 0.0)
        return debit, credit


@dataclass(slots=True)
class JournalLine:
    """Single debit/credit line within a journal entry."""

    account_code: str
    debit: float = 0.0
    credit: float = 0.0
    memo: str | None = None

    def __post_init__(self) -> None:
        self.account_code = _normalise_code(self.account_code, field_name="account_code")
        self.debit = float(self.debit)
        self.credit = float(self.credit)
        if self.debit < 0 or self.credit < 0:
            raise ValueError("Debit and credit must be non-negative")
        if self.debit and self.credit:
            raise ValueError("Debit and credit cannot both be positive")
        if self.debit == 0 and self.credit == 0:
            raise ValueError("Line must have either debit or credit amount")
        if self.memo is not None:
            self.memo = _normalise_text(self.memo, field_name="memo")


def _coerce_lines(lines: Sequence[JournalLine]) -> tuple[JournalLine, ...]:
    validated = list(lines)
    if not validated:
        raise ValueError("journal entry requires at least one line")
    return tuple(validated)


@dataclass(slots=True)
class JournalEntry:
    """Balanced double-entry journal entry."""

    reference: str
    lines: Sequence[JournalLine]
    description: str | None = None
    timestamp: datetime = field(default_factory=_utcnow)
    tags: Sequence[str] | None = None
    metadata: Mapping[str, object] | None = None
    tolerance: float = 1e-6

    def __post_init__(self) -> None:
        self.reference = _normalise_text(self.reference, field_name="reference")
        self.lines = _coerce_lines(self.lines)
        if not self.lines:
            raise ValueError("Journal entry must contain at least one line")
        self.description = (
            _normalise_text(self.description, field_name="description")
            if self.description is not None
            else None
        )
        if self.tolerance <= 0:
            raise ValueError("tolerance must be positive")
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)

        if abs(self.total_debits - self.total_credits) > self.tolerance:
            raise ValueError("Journal entry must balance within tolerance")

    @property
    def total_debits(self) -> float:
        return sum(line.debit for line in self.lines)

    @property
    def total_credits(self) -> float:
        return sum(line.credit for line in self.lines)


@dataclass(slots=True)
class TrialBalanceLine:
    """Presentation of an account in the trial balance."""

    account_code: str
    account_name: str
    debit: float
    credit: float


@dataclass(slots=True)
class TrialBalance:
    """Collection of trial balance lines with totals."""

    lines: tuple[TrialBalanceLine, ...]
    total_debits: float
    total_credits: float

    def is_balanced(self, tolerance: float = 1e-6) -> bool:
        return abs(self.total_debits - self.total_credits) <= tolerance


@dataclass(slots=True)
class IncomeStatement:
    """Income statement summary."""

    revenue: float
    expenses: float

    @property
    def net_income(self) -> float:
        return self.revenue - self.expenses


@dataclass(slots=True)
class BalanceSheet:
    """Balance sheet summary."""

    assets: float
    liabilities: float
    equity: float

    def is_balanced(self, tolerance: float = 1e-6) -> bool:
        return abs(self.assets - (self.liabilities + self.equity)) <= tolerance


class Ledger:
    """Core ledger orchestrating accounts and journal entries."""

    def __init__(self, *, base_currency: str = "USD", tolerance: float = 1e-6) -> None:
        if tolerance <= 0:
            raise ValueError("tolerance must be positive")
        self.base_currency = _normalise_text(base_currency, field_name="base_currency")
        self.tolerance = float(tolerance)
        self._accounts: MutableMapping[str, Account] = {}
        self._entries: list[JournalEntry] = []

    def add_account(self, account: Account) -> None:
        if account.code in self._accounts:
            raise ValueError(f"Account {account.code} already exists")
        self._accounts[account.code] = account

    def upsert_account(self, account: Account) -> None:
        self._accounts[account.code] = account

    def get_account(self, code: str) -> Account:
        normalised = _normalise_code(code, field_name="code")
        try:
            return self._accounts[normalised]
        except KeyError as exc:  # pragma: no cover - exercised in tests
            raise KeyError(f"Unknown account: {normalised}") from exc

    def record_entry(self, entry: JournalEntry) -> JournalEntry:
        if abs(entry.total_debits - entry.total_credits) > self.tolerance:
            raise ValueError("Entry does not balance within ledger tolerance")

        for line in entry.lines:
            account = self._accounts.get(line.account_code)
            if account is None:
                raise KeyError(f"Unknown account: {line.account_code}")
            account.apply(debit=line.debit, credit=line.credit)

        self._entries.append(entry)
        return entry

    def accounts(self) -> tuple[Account, ...]:
        return tuple(self._accounts[code] for code in sorted(self._accounts))

    def entries(self) -> tuple[JournalEntry, ...]:
        return tuple(self._entries)

    def trial_balance(self) -> TrialBalance:
        lines: list[TrialBalanceLine] = []
        total_debits = 0.0
        total_credits = 0.0

        for account in self.accounts():
            debit, credit = account.trial_balance_view()
            total_debits += debit
            total_credits += credit
            lines.append(
                TrialBalanceLine(
                    account_code=account.code,
                    account_name=account.name,
                    debit=debit,
                    credit=credit,
                )
            )

        return TrialBalance(lines=tuple(lines), total_debits=total_debits, total_credits=total_credits)

    def income_statement(self) -> IncomeStatement:
        revenue = 0.0
        expenses = 0.0
        for account in self._accounts.values():
            if account.account_type in {AccountType.REVENUE, AccountType.OTHER_INCOME}:
                revenue += account.balance
            elif account.account_type in {AccountType.EXPENSE, AccountType.OTHER_EXPENSE}:
                expenses += account.balance
        return IncomeStatement(revenue=revenue, expenses=expenses)

    def balance_sheet(self, *, include_income: bool = True) -> BalanceSheet:
        assets = 0.0
        liabilities = 0.0
        equity = 0.0

        for account in self._accounts.values():
            if account.account_type == AccountType.ASSET:
                assets += account.balance
            elif account.account_type == AccountType.CONTRA_ASSET:
                assets -= account.balance
            elif account.account_type == AccountType.LIABILITY:
                liabilities += account.balance
            elif account.account_type == AccountType.CONTRA_LIABILITY:
                liabilities -= account.balance
            elif account.account_type == AccountType.EQUITY:
                equity += account.balance
            elif account.account_type == AccountType.CONTRA_EQUITY:
                equity -= account.balance

        if include_income:
            equity += self.income_statement().net_income

        return BalanceSheet(assets=assets, liabilities=liabilities, equity=equity)

    def rebalance(self) -> None:
        """Rebuild account balances from journal entries for consistency."""

        for account in self._accounts.values():
            account.balance = 0.0

        for entry in self._entries:
            for line in entry.lines:
                account = self._accounts.get(line.account_code)
                if account is None:
                    raise KeyError(f"Unknown account during rebalance: {line.account_code}")
                account.apply(debit=line.debit, credit=line.credit)

