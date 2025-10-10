# Token Listing on DEX Screener

All tokens are listed on DEX Screener automatically as soon as they are added to
a liquidity pool and have at least one transaction. You can use the search bar
to look up a specific token by name, symbol, token address, or pair address.

## Updating Token Information

DEX Screener automatically pulls token metadata (for example, descriptions and
social links) from external token lists such as CoinGecko. Once a token appears
on one of these lists, its details will populate on DEX Screener automatically.

> **Need faster updates?** If you want token information to surface on DEX
> Screener without waiting for third-party listings, consider
> [**Enhanced Token Info**](https://marketplace.dexscreener.com/product/token-info).
> Enhanced Token Info is tailored for new or rapidly growing tokens that want to
> build their communities and engage with DEX Screener’s audience quickly.

## FDV and Market Cap Calculations

DEX Screener calculates fully diluted valuation (FDV) using the following
formula:

```
FDV = (total supply - burned supply) * price
```

In many cases FDV equals market cap, but there are exceptions. If a project does
not burn the portion of its supply that is outside circulation, DEX Screener
will look for a self-reported circulating supply from Enhanced Token Info or
CoinGecko and use that figure to compute market cap instead.
