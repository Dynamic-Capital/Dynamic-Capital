from __future__ import annotations

import json
from typing import Any, Iterable

import pytest

from algorithms.python.smart_contract_architect import (
    ArchitectureRequest,
    SmartContractArchitect,
)


class StubClient:
    def __init__(self, responses: Iterable[str]) -> None:
        self.responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self.responses:
            raise AssertionError("No stubbed response available")
        return self.responses.pop(0)


@pytest.fixture()
def request_payload() -> ArchitectureRequest:
    return ArchitectureRequest(
        objective="Deploy cross-chain yield aggregator",
        networks=("Ethereum", "Arbitrum"),
        token_standards=("ERC-4626",),
        participants=("Liquidity providers", "Strategy council"),
        throughput="Handle 20 tx/minute per chain",
        compliance=("MiCA", "US FinCEN"),
        integration_points=("Chainlink", "Fireblocks"),
        risk_tolerance="conservative",
    )


def test_architect_synthesises_plan(request_payload: ArchitectureRequest) -> None:
    grok_outline = json.dumps(
        {
            "modules": [
                {
                    "name": "TreasuryModule",
                    "responsibilities": ["Manage pooled assets", "Route yield"],
                    "storage": [
                        "balances: mapping(address => uint256)",
                        "strategies: address[]",
                    ],
                    "functions": [
                        {
                            "name": "deposit",
                            "description": "Accept user deposits",
                            "visibility": "public",
                        },
                        {
                            "name": "rebalance",
                            "description": "Allocate across strategies",
                            "visibility": "governance",
                        },
                    ],
                    "events": ["Deposit(address indexed user, uint256 amount)"],
                    "dependencies": ["OracleModule"],
                },
                {
                    "name": "OracleModule",
                    "responsibilities": ["Provide pricing"],
                    "storage": ["latestPrice: int256"],
                    "functions": ["updateOracle"],
                },
            ],
            "governance": "Time-locked multisig with emergency brake",
            "upgradeability": "UUPS proxy behind governance timelock",
            "offchain_services": ["Chainlink feeds", "Fireblocks signer"],
            "notes": ["Use OpenZeppelin libraries"],
        }
    )
    deepseek_security = json.dumps(
        {
            "threats": ["Reentrancy", "Oracle manipulation"],
            "mitigations": [
                "Use reentrancy guards",
                "Enforce price deviation circuit breaker",
            ],
            "monitoring": ["Emit events for vault metrics"],
            "testing": [
                "Fuzz deposit/withdraw flows",
                "Property test oracle bounds",
            ],
            "compliance": ["Align reporting with MiCA"],
            "notes": ["Set withdrawal limits during volatility"],
            "upgradeability": "Apply 48h timelock and guardian veto",
        }
    )
    grok_client = StubClient([grok_outline])
    deepseek_client = StubClient([deepseek_security])
    architect = SmartContractArchitect(
        grok_client=grok_client,
        deepseek_client=deepseek_client,
        outline_temperature=0.05,
        security_temperature=0.1,
    )

    architecture = architect.design(request_payload)

    assert architecture.governance == "Time-locked multisig with emergency brake"
    assert architecture.upgradeability == "UUPS proxy behind governance timelock"
    assert architecture.offchain_services == ["Chainlink feeds", "Fireblocks signer"]
    assert [module.name for module in architecture.modules] == ["TreasuryModule", "OracleModule"]
    assert architecture.modules[0].functions[1].visibility == "governance"
    assert "Reentrancy" in architecture.threat_model
    assert architecture.mitigations[-1] == "Enforce price deviation circuit breaker"
    assert architecture.testing[0].startswith("Fuzz deposit")
    assert architecture.compliance == ["Align reporting with MiCA"]
    serialised = architecture.to_dict()
    assert serialised["modules"][0]["functions"][0]["name"] == "deposit"

    assert grok_client.calls[0]["temperature"] == 0.05
    assert "yield aggregator" in grok_client.calls[0]["prompt"]
    assert "Modules:" in deepseek_client.calls[0]["prompt"]
    assert deepseek_client.calls[0]["temperature"] == 0.1


def test_architect_handles_free_form_outputs(request_payload: ArchitectureRequest) -> None:
    grok_client = StubClient([
        "Consider modular vaults; emphasise circuit breakers and upgrade delays.",
    ])
    deepseek_client = StubClient([
        "Focus on reentrancy and oracle drift; audit per jurisdiction.",
    ])
    architect = SmartContractArchitect(grok_client=grok_client, deepseek_client=deepseek_client)

    architecture = architect.design(request_payload)

    assert architecture.modules == []
    assert any("circuit breakers" in note for note in architecture.notes)
    assert any("oracle drift" in note for note in architecture.notes)
    assert architecture.raw_outline.startswith("Consider modular vaults")
    assert architecture.raw_security_review.startswith("Focus on reentrancy")
