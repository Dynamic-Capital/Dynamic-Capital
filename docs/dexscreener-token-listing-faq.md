# Token Listing on DEX Screener

DEX Screener automatically indexes on-chain liquidity pools. As soon as a new
pool is created for a token and at least one trade settles, the token appears on
DEX Screener without any manual review queue. The same logic applies whether the
pool lives on a major network or a niche EVM sidechain.

## How automatic listings work

1. **Liquidity pool detected.** DEX Screener watches supported networks for new
   pools. Once a pool is discovered, the token address, pair address, and pool
   metadata are ingested.
2. **First swap confirmed.** After the first transaction executes in that pool,
   the token becomes searchable on DEX Screener.
3. **Pair metrics populated.** Market data such as price, volume, liquidity, and
   transaction history populate in real time for each trading pair.

Use the search bar to look up tokens by **name**, **symbol**, **token address**,
**pair address**, or by pasting a full URL. Token pages aggregate every
available pool so you can review liquidity depth across venues.

## Updating token information

DEX Screener automatically pulls token metadata (for example, descriptions,
logos, and social links) from reputable third-party token lists such as
CoinGecko. Once a token is present on a supported list, DEX Screener
synchronizes its profile details without any additional work from the project
team.

> **Need faster updates?** If you want token information to surface on DEX
> Screener without waiting for third-party listings, consider
> [**Enhanced Token Info**](https://marketplace.dexscreener.com/product/token-info).
> Enhanced Token Info lets you submit rich metadata (logo, description,
> headlines, social links, and more) directly to DEX Screener so your community
> sees the most accurate information immediately.

## FDV and market cap calculations

DEX Screener calculates fully diluted valuation (FDV) using the following
formula:

```
FDV = (total supply - burned supply) * price
```

In many cases FDV equals market cap, but there are exceptions. If a project does
not burn the portion of its supply that is outside circulation, DEX Screener
looks for a self-reported circulating supply from Enhanced Token Info or
CoinGecko and uses that figure to compute market cap instead.

## Key takeaways

- Tokens list automatically once a pool exists and sees its first transaction.
- Search supports names, symbols, token addresses, pair addresses, and full
  URLs.
- Metadata is sourced from trusted token lists, with Enhanced Token Info
  providing the fastest update path.
- FDV multiplies price by the circulating supply after accounting for burned
  tokens; market cap may differ when projects report a circulating amount.
