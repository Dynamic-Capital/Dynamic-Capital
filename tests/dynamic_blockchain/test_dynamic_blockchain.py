from __future__ import annotations

import pytest

from dynamic_blockchain import DynamicBlockchain


def test_mining_appends_block_and_rewards_miner() -> None:
    blockchain = DynamicBlockchain(difficulty=2, reward=12.5)
    blockchain.add_transaction("alice", "bob", 5)
    blockchain.add_transaction("carol", "dave", 3.5)

    block = blockchain.mine_pending_transactions(miner_address="eve")

    assert block.hash.startswith("0" * blockchain.difficulty)
    recipients = {tx.recipient for tx in block.transactions}
    assert {"bob", "dave", "eve"}.issubset(recipients)
    assert not blockchain.pending_transactions
    assert blockchain.validate_chain() is True


def test_chain_validation_detects_tampering() -> None:
    blockchain = DynamicBlockchain(difficulty=2, reward=0)
    blockchain.add_transaction("alpha", "beta", 1.0)
    block = blockchain.mine_pending_transactions(miner_address=None)
    assert blockchain.validate_chain() is True

    block.transactions[0].amount = 42  # type: ignore[misc]
    assert blockchain.validate_chain() is False


def test_balance_reflects_transactions_and_rewards() -> None:
    blockchain = DynamicBlockchain(difficulty=1, reward=2.0)
    blockchain.add_transaction("zoe", "yan", 1.5)
    blockchain.mine_pending_transactions(miner_address="mina")

    blockchain.add_transaction("yan", "zoe", 0.5)
    blockchain.mine_pending_transactions(miner_address="mina")

    assert pytest.approx(blockchain.get_balance("zoe"), rel=1e-6) == -1.0
    assert pytest.approx(blockchain.get_balance("yan"), rel=1e-6) == 1.0
    assert pytest.approx(blockchain.get_balance("mina"), rel=1e-6) == 4.0
