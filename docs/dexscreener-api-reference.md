# DEX Screener API Reference

> **Purpose**: Quick reference for integrating Dynamic Capital services with the public [DEX Screener API](https://docs.dexscreener.com/).

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Latest Token Profiles](#latest-token-profiles)
  - [Latest Boosted Tokens](#latest-boosted-tokens)
  - [Top Boosted Tokens](#top-boosted-tokens)
  - [Token Orders](#token-orders)
  - [Pair Lookup](#pair-lookup)
  - [Pair Search](#pair-search)
  - [Token Pools](#token-pools)
  - [Token Snapshot](#token-snapshot)
- [Usage Notes](#usage-notes)

---

## Overview

The DEX Screener API provides public market data across multiple blockchains. It is suitable for fetching token metadata, pair statistics, active boosts, and tracking paid services ("orders") for specific tokens. All endpoints are read-only and respond with JSON.

- **Base URL**: `https://api.dexscreener.com`
- **Transport**: HTTPS with standard REST semantics
- **Content Type**: `application/json`

## Authentication

No API key is required. All endpoints are available anonymously, but you must observe the documented rate limits to avoid throttling.

## Rate Limits

The following limits are enforced per IP address:

| Endpoint group | Limit |
| -------------- | ----- |
| Token profiles & boosts | 60 requests per minute |
| DEX data (pairs, search, token snapshots) | 300 requests per minute |

Exponential backoff is recommended if you receive HTTP `429 Too Many Requests` responses.

## Error Handling

The API returns conventional HTTP status codes:

- `200` range signals a successful response.
- `400` range indicates malformed requests (for example, invalid `chainId` values).
- `404` is returned when a requested token or pair cannot be found.
- `429` indicates a rate-limit violation—back off and retry after a short delay.
- `500` range reflects transient server errors. Implement retries with jitter for resiliency.

Responses may include additional metadata such as `message` or `errors` fields when an error occurs; log these details for observability.

## Endpoints

### Latest Token Profiles

Fetch the most recent profile submissions created through DEX Screener.

- **Method**: `GET`
- **Path**: `/token-profiles/latest/v1`
- **Rate Limit**: 60 RPM

#### Sample Request

```http
GET /token-profiles/latest/v1 HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
{
  "url": "https://example.com",
  "chainId": "solana",
  "tokenAddress": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  "icon": "https://example.com/icon.png",
  "header": "https://example.com/header.png",
  "description": "Community submitted profile details",
  "links": [
    {
      "type": "twitter",
      "label": "Official X",
      "url": "https://twitter.com/example"
    }
  ]
}
```

### Latest Boosted Tokens

List active token boosts (paid promotions) in chronological order.

- **Method**: `GET`
- **Path**: `/token-boosts/latest/v1`
- **Rate Limit**: 60 RPM

#### Sample Request

```http
GET /token-boosts/latest/v1 HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
{
  "url": "https://dexscreener.com/solana/example",
  "chainId": "solana",
  "tokenAddress": "A55XjvzRU4KtR3Lrys8PpLZQvPojPqvnv5bJVHMYy3Jv",
  "amount": 12,
  "totalAmount": 48,
  "icon": "https://example.com/icon.png",
  "header": "https://example.com/header.png",
  "description": "Boost campaign details",
  "links": [
    {
      "type": "website",
      "label": "Token Site",
      "url": "https://example.com"
    }
  ]
}
```

### Top Boosted Tokens

Identify tokens with the highest number of active boosts.

- **Method**: `GET`
- **Path**: `/token-boosts/top/v1`
- **Rate Limit**: 60 RPM

#### Sample Request

```http
GET /token-boosts/top/v1 HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
{
  "url": "https://dexscreener.com/solana/example",
  "chainId": "solana",
  "tokenAddress": "A55XjvzRU4KtR3Lrys8PpLZQvPojPqvnv5bJVHMYy3Jv",
  "amount": 24,
  "totalAmount": 96,
  "icon": "https://example.com/icon.png",
  "header": "https://example.com/header.png",
  "description": "Top boosted token",
  "links": [
    {
      "type": "telegram",
      "label": "Community",
      "url": "https://t.me/example"
    }
  ]
}
```

### Token Orders

Check paid order status (e.g., token profile purchases) for a given token address.

- **Method**: `GET`
- **Path**: `/orders/v1/{chainId}/{tokenAddress}`
- **Rate Limit**: 60 RPM

| Path Parameter | Type | Description |
| -------------- | ---- | ----------- |
| `chainId` | string | Blockchain identifier (e.g., `solana`) |
| `tokenAddress` | string | Token mint or contract address |

#### Sample Request

```http
GET /orders/v1/solana/A55XjvzRU4KtR3Lrys8PpLZQvPojPqvnv5bJVHMYy3Jv HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
[
  {
    "type": "tokenProfile",
    "status": "processing",
    "paymentTimestamp": 1717171717
  }
]
```

### Pair Lookup

Retrieve up-to-date statistics for one or multiple pairs on a specific chain.

- **Method**: `GET`
- **Path**: `/latest/dex/pairs/{chainId}/{pairId}`
- **Rate Limit**: 300 RPM

| Path Parameter | Type | Description |
| -------------- | ---- | ----------- |
| `chainId` | string | Blockchain identifier |
| `pairId` | string | Pair address or comma-separated list of addresses |

#### Sample Request

```http
GET /latest/dex/pairs/solana/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
{
  "schemaVersion": "1.0",
  "pairs": [
    {
      "chainId": "solana",
      "dexId": "raydium",
      "url": "https://dexscreener.com/solana/JUP-USDC",
      "pairAddress": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "labels": ["featured"],
      "baseToken": {
        "address": "JUP...",
        "name": "Jupiter",
        "symbol": "JUP"
      },
      "quoteToken": {
        "address": "So111...",
        "name": "Solana",
        "symbol": "SOL"
      },
      "priceNative": "0.85",
      "priceUsd": "1.94",
      "txns": {
        "h24": {
          "buys": 124,
          "sells": 97
        }
      },
      "volume": {
        "h24": 2500000
      },
      "priceChange": {
        "h24": 3.5
      },
      "liquidity": {
        "usd": 3500000,
        "base": 1800000,
        "quote": 1700000
      },
      "fdv": 950000000,
      "marketCap": 850000000,
      "pairCreatedAt": 1680300000000,
      "info": {
        "imageUrl": "https://example.com/jup.png",
        "websites": [
          {
            "url": "https://jup.ag"
          }
        ],
        "socials": [
          {
            "platform": "twitter",
            "handle": "jupiter"
          }
        ]
      },
      "boosts": {
        "active": 2
      }
    }
  ]
}
```

### Pair Search

Search for trading pairs by token symbols, names, or addresses.

- **Method**: `GET`
- **Path**: `/latest/dex/search`
- **Rate Limit**: 300 RPM

| Query Parameter | Type | Description |
| --------------- | ---- | ----------- |
| `q` | string | Search string (e.g., `SOL/USDC`, token symbol, or address) |

#### Sample Request

```http
GET /latest/dex/search?q=SOL%2FUSDC HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
{
  "schemaVersion": "1.0",
  "pairs": [
    {
      "chainId": "solana",
      "dexId": "orca",
      "url": "https://dexscreener.com/solana/sol-usdc",
      "pairAddress": "8HoQnePDTfKqFq8Sqk8V2YEQVyhC7z4p2er8GkV1G3Zz",
      "labels": ["popular"],
      "baseToken": {
        "address": "So11111111111111111111111111111111111111112",
        "name": "Solana",
        "symbol": "SOL"
      },
      "quoteToken": {
        "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "name": "USD Coin",
        "symbol": "USDC"
      },
      "priceNative": "1",
      "priceUsd": "157.25",
      "txns": {
        "h24": {
          "buys": 1820,
          "sells": 1775
        }
      },
      "volume": {
        "h24": 48000000
      },
      "priceChange": {
        "h24": -1.2
      },
      "liquidity": {
        "usd": 125000000,
        "base": 400000,
        "quote": 63000000
      },
      "fdv": 70000000000,
      "marketCap": 68000000000,
      "pairCreatedAt": 1612137600000,
      "info": {
        "imageUrl": "https://example.com/sol.png"
      },
      "boosts": {
        "active": 0
      }
    }
  ]
}
```

### Token Pools

Enumerate all trading pools associated with a specific token address on a chain.

- **Method**: `GET`
- **Path**: `/token-pairs/v1/{chainId}/{tokenAddress}`
- **Rate Limit**: 300 RPM

| Path Parameter | Type | Description |
| -------------- | ---- | ----------- |
| `chainId` | string | Blockchain identifier |
| `tokenAddress` | string | Token mint or contract address |

#### Sample Request

```http
GET /token-pairs/v1/solana/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
[
  {
    "chainId": "solana",
    "dexId": "raydium",
    "url": "https://dexscreener.com/solana/jup-usdc",
    "pairAddress": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    "labels": ["primary"],
    "baseToken": {
      "address": "JUP...",
      "name": "Jupiter",
      "symbol": "JUP"
    },
    "quoteToken": {
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "name": "USD Coin",
      "symbol": "USDC"
    },
    "priceNative": "0.85",
    "priceUsd": "1.94",
    "txns": {
      "h24": {
        "buys": 124,
        "sells": 97
      }
    },
    "volume": {
      "h24": 2500000
    },
    "priceChange": {
      "h24": 3.5
    },
    "liquidity": {
      "usd": 3500000,
      "base": 1800000,
      "quote": 1700000
    },
    "fdv": 950000000,
    "marketCap": 850000000,
    "pairCreatedAt": 1680300000000,
    "info": {
      "imageUrl": "https://example.com/jup.png",
      "websites": [
        {
          "url": "https://jup.ag"
        }
      ],
      "socials": [
        {
          "platform": "twitter",
          "handle": "jupiter"
        }
      ]
    },
    "boosts": {
      "active": 1
    }
  }
]
```

### Token Snapshot

Request one or more token snapshots to retrieve the most relevant trading pair per token.

- **Method**: `GET`
- **Path**: `/tokens/v1/{chainId}/{tokenAddresses}`
- **Rate Limit**: 300 RPM

| Path Parameter | Type | Description |
| -------------- | ---- | ----------- |
| `chainId` | string | Blockchain identifier |
| `tokenAddresses` | string | Comma-separated list of up to 30 token addresses |

#### Sample Request

```http
GET /tokens/v1/solana/So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v HTTP/1.1
Host: api.dexscreener.com
Accept: */*
```

#### Sample Response

```json
[
  {
    "chainId": "solana",
    "dexId": "orca",
    "url": "https://dexscreener.com/solana/sol-usdc",
    "pairAddress": "8HoQnePDTfKqFq8Sqk8V2YEQVyhC7z4p2er8GkV1G3Zz",
    "labels": ["primary"],
    "baseToken": {
      "address": "So11111111111111111111111111111111111111112",
      "name": "Solana",
      "symbol": "SOL"
    },
    "quoteToken": {
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "name": "USD Coin",
      "symbol": "USDC"
    },
    "priceNative": "1",
    "priceUsd": "157.25",
    "txns": {
      "h24": {
        "buys": 1820,
        "sells": 1775
      }
    },
    "volume": {
      "h24": 48000000
    },
    "priceChange": {
      "h24": -1.2
    },
    "liquidity": {
      "usd": 125000000,
      "base": 400000,
      "quote": 63000000
    },
    "fdv": 70000000000,
    "marketCap": 68000000000,
    "pairCreatedAt": 1612137600000,
    "info": {
      "imageUrl": "https://example.com/sol.png"
    },
    "boosts": {
      "active": 0
    }
  }
]
```

## Usage Notes

- Responses are schemaless; expect additional properties as the API evolves.
- Values such as `priceNative`, `priceUsd`, and timestamps are returned as strings; convert them to numeric types as needed.
- When batching token addresses (`/tokens/v1`), the API caps the list at **30** entries.
- Always handle HTTP errors gracefully and implement caching to reduce redundant calls within the rate limits.

---

_Last updated: 2025-10-03_
