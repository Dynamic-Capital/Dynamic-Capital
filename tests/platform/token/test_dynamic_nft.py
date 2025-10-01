import sys
from datetime import datetime
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[4]
TESTS_ROOT = PROJECT_ROOT / "tests"
sys.path.insert(0, str(PROJECT_ROOT))
sys.path = [p for p in sys.path if not p.startswith(str(TESTS_ROOT))]

from dynamic.platform.token.nft import DynamicNFTMinter


@pytest.fixture()
def minter() -> DynamicNFTMinter:
    return DynamicNFTMinter("dct")


def test_mint_creates_metadata(minter: DynamicNFTMinter) -> None:
    minted = minter.mint(
        "0xabc",
        analysis={"action": "buy", "confidence": 0.75},
        tags=["ai", "trade"],
    )

    assert minted.token_id == 1
    assert minted.owner == "0xabc"
    assert minted.metadata["symbol"] == "DCT"
    assert minted.metadata["sources"]["analysis"] is True
    assert minted.metadata["attributes"][0] == {
        "trait_type": "AI Action",
        "value": "BUY",
    }
    assert minted.metadata["attributes"][1]["trait_type"] == "AI Confidence"
    assert minted.metadata["attributes"][1]["value"] == pytest.approx(0.75)
    assert datetime.fromisoformat(minted.metadata["timestamp"])  # parses


def test_refresh_updates_metadata(minter: DynamicNFTMinter) -> None:
    minted = minter.mint("0xabc", analysis={"action": "buy"})
    original_timestamp = minted.metadata["timestamp"]

    updated = minter.refresh_metadata(minted.token_id, analysis={"action": "sell"})

    assert updated["attributes"][0]["value"] == "SELL"
    assert updated["timestamp"] != original_timestamp
    assert minter.get(minted.token_id).metadata is updated


def test_transfer_changes_owner(minter: DynamicNFTMinter) -> None:
    minted = minter.mint("0xabc", analysis={"action": "buy"})

    transferred = minter.transfer(minted.token_id, "0xdef")

    assert transferred.owner == "0xdef"
    assert minter.get(minted.token_id).owner == "0xdef"


@pytest.mark.parametrize("bad_symbol", ["", "   ", None])
def test_invalid_symbol_raises(bad_symbol) -> None:
    with pytest.raises(ValueError):
        DynamicNFTMinter(bad_symbol)  # type: ignore[arg-type]


@pytest.mark.parametrize("bad_owner", ["", "   ", None])
def test_invalid_owner_raises(minter: DynamicNFTMinter, bad_owner) -> None:
    with pytest.raises(ValueError):
        minter.mint(bad_owner)  # type: ignore[arg-type]
