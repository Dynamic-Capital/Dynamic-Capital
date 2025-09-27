"""Tests for the Dynamic Accounting System primitives."""

from __future__ import annotations

import pytest

from dynamic_accounting import (
    Account,
    AccountType,
    BalanceSheet,
    IncomeStatement,
    JournalEntry,
    JournalLine,
    Ledger,
    TrialBalance,
)


def _build_ledger() -> Ledger:
    ledger = Ledger(base_currency="USD")
    ledger.add_account(Account("1000", "Cash", AccountType.ASSET))
    ledger.add_account(Account("2000", "Accounts Payable", AccountType.LIABILITY))
    ledger.add_account(Account("3000", "Common Stock", AccountType.EQUITY))
    ledger.add_account(Account("4000", "Sales Revenue", AccountType.REVENUE))
    ledger.add_account(Account("5000", "Operating Expense", AccountType.EXPENSE))
    return ledger


def test_ledger_posts_balanced_entries() -> None:
    ledger = _build_ledger()
    sale = JournalEntry(
        reference="INV-001",
        lines=(
            JournalLine("1000", debit=150.0, memo="Client settlement"),
            JournalLine("4000", credit=150.0, memo="Revenue recognition"),
        ),
    )
    expense = JournalEntry(
        reference="BILL-001",
        lines=(
            JournalLine("5000", debit=45.0, memo="Cloud spend"),
            JournalLine("1000", credit=45.0, memo="Cash payment"),
        ),
    )

    ledger.record_entry(sale)
    ledger.record_entry(expense)

    cash = ledger.get_account("1000")
    revenue = ledger.get_account("4000")
    cost = ledger.get_account("5000")

    assert cash.balance == pytest.approx(105.0)
    assert revenue.balance == pytest.approx(150.0)
    assert cost.balance == pytest.approx(45.0)

    trial: TrialBalance = ledger.trial_balance()
    assert trial.is_balanced()
    assert trial.total_debits == pytest.approx(trial.total_credits)

    income: IncomeStatement = ledger.income_statement()
    assert income.revenue == pytest.approx(150.0)
    assert income.expenses == pytest.approx(45.0)
    assert income.net_income == pytest.approx(105.0)

    sheet: BalanceSheet = ledger.balance_sheet()
    assert sheet.assets == pytest.approx(105.0)
    assert sheet.liabilities == pytest.approx(0.0)
    assert sheet.equity == pytest.approx(105.0)
    assert sheet.is_balanced()


def test_journal_entry_requires_balance() -> None:
    with pytest.raises(ValueError):
        JournalEntry(
            reference="BAD-ENTRY",
            lines=(
                JournalLine("1000", debit=25.0),
                JournalLine("4000", credit=24.0),
            ),
        )


def test_record_entry_rejects_unknown_account() -> None:
    ledger = Ledger()
    ledger.add_account(Account("1000", "Cash", AccountType.ASSET))
    entry = JournalEntry(
        reference="PAYROLL",
        lines=(
            JournalLine("9999", debit=100.0),
            JournalLine("1000", credit=100.0),
        ),
    )
    with pytest.raises(KeyError):
        ledger.record_entry(entry)


def test_rebalance_recomputes_totals() -> None:
    ledger = _build_ledger()
    entry = JournalEntry(
        reference="ADJ-001",
        lines=(
            JournalLine("1000", debit=200.0),
            JournalLine("4000", credit=200.0),
        ),
    )
    ledger.record_entry(entry)

    ledger.get_account("1000").balance = 9999.0
    ledger.rebalance()

    assert ledger.get_account("1000").balance == pytest.approx(200.0)
    assert ledger.get_account("4000").balance == pytest.approx(200.0)


def test_get_account_unknown() -> None:
    ledger = Ledger()
    with pytest.raises(KeyError):
        ledger.get_account("4040")
