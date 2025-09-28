"""Dynamic NFY market dimensions playbook implementation."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Mapping, MutableMapping, Sequence

from .engine import PlaybookContext, PlaybookEntry
from .sync import PlaybookSynchronizer

__all__ = [
    "build_dynamic_nfy_market_dimensions_playbook",
    "DEFAULT_DYNAMIC_NFY_ENTRIES",
]


_DEFAULT_CONTEXT: Mapping[str, object] = {
    "mission": "Dynamic NFY Market Dimensions Launch",
    "cadence": "Bi-weekly build and review",
    "risk_tolerance": 0.5,
    "automation_expectation": 0.55,
    "readiness_pressure": 0.65,
    "oversight_level": 0.68,
    "escalation_channels": (
        "Telegram VIP Council",
        "Core Ops",
    ),
    "scenario_focus": (
        "concept",
        "technical",
        "launch",
        "utility",
    ),
    "highlight_limit": 4,
}


_BASE_TIMESTAMP = datetime(2024, 1, 1, tzinfo=timezone.utc)


_ENTRY_SPECS: tuple[Mapping[str, object], ...] = (
    {
        "title": "Define Market Spirit Trait Layers",
        "objective": "Draft the primary art layers covering Market Spirits, Algorithmic Avatars, and Time Shards.",
        "stage": "Concept",
        "readiness": 0.6,
        "automation": 0.35,
        "risk": 0.38,
        "weight": 1.2,
        "tags": ("art", "traits", "branding"),
        "owners": ("artist/designer",),
        "metadata": {
            "trait_layers": {
                "background": 6,
                "aura": 5,
                "body": 5,
                "accessories": 4,
                "evolution_state": 3,
                "signature": 2,
            },
            "archetypes": ("Market Spirits", "Algorithmic Avatars", "Time Shards"),
        },
    },
    {
        "title": "Design Algorithmic Avatar Motion System",
        "objective": "Build generative logic for algorithmic avatar overlays and neon crystal effects.",
        "stage": "Concept",
        "readiness": 0.5,
        "automation": 0.45,
        "risk": 0.42,
        "weight": 1.0,
        "tags": ("art", "generative", "neon"),
        "dependencies": ("Define Market Spirit Trait Layers",),
        "owners": ("artist/designer", "vision"),
        "metadata": {
            "effects": ("neon", "crystal", "algo-inspired"),
            "render_pipeline": "Blender + shader stack",
        },
    },
    {
        "title": "Author Rarity Matrix",
        "objective": "Finalise rarity bands from common to legendary with token supply allocations.",
        "stage": "Modeling",
        "readiness": 0.55,
        "automation": 0.4,
        "risk": 0.46,
        "weight": 1.1,
        "tags": ("rarity", "supply", "tokenomics"),
        "dependencies": ("Define Market Spirit Trait Layers",),
        "owners": ("vision", "analyst"),
        "metadata": {
            "rarity_breakdown": {
                "common": 3000,
                "rare": 1200,
                "epic": 600,
                "legendary": 200,
            },
            "total_supply": 5000,
        },
    },
    {
        "title": "Render Marketing Mockups",
        "objective": "Produce animated and still previews for pre-mint campaigns.",
        "stage": "Marketing",
        "readiness": 0.48,
        "automation": 0.38,
        "risk": 0.44,
        "weight": 0.9,
        "tags": ("marketing", "mockups", "creative"),
        "dependencies": (
            "Define Market Spirit Trait Layers",
            "Design Algorithmic Avatar Motion System",
        ),
        "owners": ("artist/designer", "community"),
        "metadata": {
            "channels": ("Instagram", "Telegram", "TikTok"),
            "assets": ("teaser video", "animated loop", "static preview"),
        },
    },
    {
        "title": "Deploy NFT Smart Contracts",
        "objective": "Implement ERC-721/TON compatible contract with evolving metadata hooks.",
        "stage": "Technical",
        "readiness": 0.42,
        "automation": 0.55,
        "risk": 0.52,
        "weight": 1.3,
        "tags": ("contract", "ton", "ethereum"),
        "dependencies": ("Author Rarity Matrix",),
        "owners": ("smart contract dev",),
        "metadata": {
            "chain_options": ("TON", "Polygon", "Arbitrum"),
            "features": ("ERC-721", "oracle hooks", "upgrade-safe"),
        },
    },
    {
        "title": "Wire Oracle Driven Metadata",
        "objective": "Connect Chainlink/Pyth feeds to update NFT visuals with market data triggers.",
        "stage": "Technical",
        "readiness": 0.35,
        "automation": 0.62,
        "risk": 0.58,
        "weight": 1.4,
        "tags": ("oracle", "metadata", "automation"),
        "dependencies": (
            "Deploy NFT Smart Contracts",
        ),
        "owners": ("smart contract dev", "backend"),
        "metadata": {
            "feeds": ("BTCUSD", "XAUUSD", "DCTUSDT"),
            "behaviour": "glow/evolve on threshold breaches",
        },
    },
    {
        "title": "Integrate Telegram VIP Bot",
        "objective": "Extend VIP bot to validate NFY ownership and unlock mentorship rooms.",
        "stage": "Integration",
        "readiness": 0.44,
        "automation": 0.6,
        "risk": 0.48,
        "weight": 1.0,
        "tags": ("telegram", "vip", "integration"),
        "dependencies": ("Deploy NFT Smart Contracts",),
        "owners": ("web dev", "backend"),
        "metadata": {
            "features": ("ownership gating", "status refresh", "admin overrides"),
        },
    },
    {
        "title": "Launch Mint Dashboard",
        "objective": "Ship minting interface with live charts and whitelist controls.",
        "stage": "Launch",
        "readiness": 0.38,
        "automation": 0.52,
        "risk": 0.55,
        "weight": 1.2,
        "tags": ("dashboard", "mint", "web"),
        "dependencies": (
            "Deploy NFT Smart Contracts",
            "Integrate Telegram VIP Bot",
        ),
        "owners": ("web dev", "vision"),
        "metadata": {
            "mint_allocation": {
                "whitelist": 1000,
                "public_sale": 3500,
                "treasury": 500,
            },
            "pricing": {
                "whitelist_discount": 0.45,
                "currency": ("USDT", "DCT"),
            },
        },
    },
    {
        "title": "Execute Growth Campaign",
        "objective": "Coordinate influencer pushes and social teasers across channels.",
        "stage": "Marketing",
        "readiness": 0.46,
        "automation": 0.4,
        "risk": 0.43,
        "weight": 0.8,
        "tags": ("marketing", "influencer", "community"),
        "dependencies": ("Render Marketing Mockups",),
        "owners": ("community manager", "vision"),
        "metadata": {
            "channels": ("Instagram", "Telegram", "TikTok"),
            "cadence": "Daily teasers + AMA schedule",
        },
    },
    {
        "title": "Activate Utility Perks",
        "objective": "Roll out holder perks from archive access to private fund governance.",
        "stage": "Utility",
        "readiness": 0.32,
        "automation": 0.48,
        "risk": 0.56,
        "weight": 1.1,
        "tags": ("utility", "governance", "staking"),
        "dependencies": (
            "Wire Oracle Driven Metadata",
            "Integrate Telegram VIP Bot",
        ),
        "owners": ("vision", "community"),
        "metadata": {
            "tiers": {
                "common": "Signal archive access",
                "rare": "30-day VIP trial",
                "epic": "Recurring VIP + fee discounts",
                "legendary": "Lifetime VIP + private fund perks",
            },
            "staking": "Earn DCT rewards via locked NFY",
        },
    },
    {
        "title": "Enable Staking and Governance",
        "objective": "Open DCT staking pool and holder governance modules.",
        "stage": "Utility",
        "readiness": 0.3,
        "automation": 0.6,
        "risk": 0.6,
        "weight": 1.2,
        "tags": ("staking", "governance", "backend"),
        "dependencies": (
            "Activate Utility Perks",
        ),
        "owners": ("backend", "vision"),
        "metadata": {
            "pools": ("DCT staking", "mentor vault"),
            "governance": "Proposal + vote for bot upgrades",
        },
    },
    {
        "title": "Run Post-Mint Growth Phases",
        "objective": "Execute phased roadmap with evolving NFTs, reports, and phygital drops.",
        "stage": "Growth",
        "readiness": 0.28,
        "automation": 0.45,
        "risk": 0.54,
        "weight": 1.0,
        "tags": ("roadmap", "phases", "community"),
        "dependencies": (
            "Launch Mint Dashboard",
            "Activate Utility Perks",
        ),
        "owners": ("vision", "community"),
        "metadata": {
            "phases": {
                "0-3m": "Rarity reveal, gated rooms, staking",
                "3-6m": "Oracle evolution + mentorship vault",
                "6-12m": "Phygital collectibles + fund whitelist",
                "12m+": "Cross-chain expansion + DeFi collabs",
            },
        },
    },
)


def _build_default_entries() -> tuple[PlaybookEntry, ...]:
    entries: list[PlaybookEntry] = []
    for index, spec in enumerate(_ENTRY_SPECS):
        payload = dict(spec)
        payload.setdefault("timestamp", _BASE_TIMESTAMP + timedelta(minutes=index))
        entries.append(PlaybookEntry(**payload))
    return tuple(entries)


DEFAULT_DYNAMIC_NFY_ENTRIES: tuple[PlaybookEntry, ...] = _build_default_entries()


def build_dynamic_nfy_market_dimensions_playbook(
    *,
    synchronizer: PlaybookSynchronizer | None = None,
    context_overrides: Mapping[str, object] | None = None,
    additional_entries: Sequence[Mapping[str, object] | PlaybookEntry] | None = None,
) -> Mapping[str, object]:
    """Build the Dynamic NFY market dimensions playbook payload.

    Parameters
    ----------
    synchronizer:
        Optional synchronizer instance to reuse for chaining additional playbooks.
    context_overrides:
        Mapping of context field overrides, allowing callers to tailor mission metadata.
    additional_entries:
        Extra entries to merge alongside the default Dynamic NFY stack.
    """

    sync = synchronizer or PlaybookSynchronizer()
    sync.implement_many(DEFAULT_DYNAMIC_NFY_ENTRIES)

    if additional_entries:
        sync.implement_many(additional_entries)

    context_kwargs: MutableMapping[str, object] = dict(_DEFAULT_CONTEXT)
    if context_overrides:
        context_kwargs.update(context_overrides)

    context = PlaybookContext(**context_kwargs)
    return sync.sync_payload(context)
