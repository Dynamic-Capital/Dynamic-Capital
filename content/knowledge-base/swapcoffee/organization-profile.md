# swap.coffee Organization Profile

## Overview

swap.coffee is a TON-native decentralized exchange (DEX) aggregator headquartered in the United Arab Emirates. The organization maintains a small portfolio of open-source tooling that supports cross-venue liquidity routing, TonConnect connectivity, and partner integrations. The public profile lists a direct integration contact at `dev@swap.coffee` alongside social updates via `@swap_coffee_ton`.

## GitHub Footprint

| Repository | Description | Primary Tech | Stars | Forks | License |
| ---------- | ----------- | ------------ | ----- | ----- | ------- |
| `sdk` | SDK for embedding swap.coffee routing into partner applications. | TypeScript | 13 | 1 | MIT |
| `ui-sdk` | UI component toolkit that wraps swap.coffee flows. | Vue | 2 | 1 | MIT |
| `rs-bridge` | Server-sent events bridge implementation for TonConnect v2. | Rust | 5 | 1 | MIT |
| `documentation` | Static documentation site backing `docs.swap.coffee`. | MDX | 0 | 1 | MIT |
| `dex` | Core aggregator stack (private licensing details not published). | TypeScript | 24 | 4 | Unspecified (NOASSERTION) |
| `i18n` | Localization resources for the product suite. | n/a | 0 | 1 | Unspecified |
| `yield-integration` | Yield interface components for ecosystem partners. | Kotlin | 0 | 3 | Unspecified |

*Snapshot generated from the public GitHub API on 2025-06-05.*

## Integration Notes

- The `sdk` package targets TypeScript environments and is suited for direct integration in TON wallet or DeFi partner frontends.
- `rs-bridge` exposes a TonConnect-compatible bridge that can be deployed to provide reliable session streaming between wallets and backend services.
- `yield-integration` indicates ongoing work to extend aggregator coverage into yield platforms, suggesting deeper collaboration opportunities with TON-native income products.

## Contact Channels

- Website: <https://swap.coffee>
- Email: <dev@swap.coffee>
- Social: [@swap_coffee_ton](https://x.com/swap_coffee_ton)
- Headquarters: United Arab Emirates

## Dynamic Capital Integration

- The TON data pipeline now treats swap.coffee as a first-class venue, deriving pool reserves and fees directly from the on-chain
  `get_pool_data` method exposed through TonAPI. This feeds the DynamicTonEngine scoring models and liquidity monitors alongside
  STON.fi and DeDust.
- Treasury runbooks and the DCT action pad include swap.coffee swap, explorer, and jetton wallet links so operations staff can
  reconcile liquidity across all supported venues without manual lookups.
- DNS inventory scripts publish the swap.coffee pool, metadata, and jetton wallet references, keeping downstream integrations in
  sync with the new venue and making the records auditable.

## Liquidity Token Reference

| Field | Value |
| ----- | ----- |
| Token name | Coffee DEX: TON/DCT LP |
| Symbol | TON/DCT LP |
| Decimals | 9 |
| Contract address | `0:03E561AE336BB09E406ADF43C14BF4669703F95408FE2B35DADE58FD8C99056A` |
| Image | <https://lp.swap.coffee/0:03E561AE336BB09E406ADF43C14BF4669703F95408FE2B35DADE58FD8C99056A/image> |
| Description | LP token for Toncoin and Dynamic Capital Token on swap.coffee DEX. |

*The token metadata above maps to the swap.coffee liquidity pool pairing Toncoin with the Dynamic Capital Token (DCT).*

## Activity Snapshot

- GitHub organization created on 2024-06-04 and last updated on 2025-06-05.
- Currently lists 33 followers and 7 public repositories.
