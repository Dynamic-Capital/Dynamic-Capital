# TON Domain Lookup Guidance

## Overview

The TON blockchain database snapshot in this repository exposes tables for
TON-native domain records such as `.ton` and `.t.me`. Generic DNS names (for
example, starter domains issued by DigitalOcean) are not indexed, so they cannot
be mapped directly to wallet accounts by querying the available tables.

## Available Tables

The relevant tables are:

- `getmethods.get_domain`: stores TON domain names without the `.ton` suffix
  along with the owning account ID.
- `getmethods.get_full_domain`: stores TON and Telegram (`.t.me`) domains with
  their owning account IDs.
- `getmethods.dnsresolve`: stores the DNS records associated with an account,
  including wallet addresses for TON domains.

## Why Generic Domains Cannot Be Resolved

Domains such as `dynamic-capital-qazf2.ondigitalocean.app` are not registered
through the TON domain service. Because the schema only tracks TON-native names,
there is no record linking this DigitalOcean starter domain to a wallet account.
Consequently, no SQL query can confirm a relationship using the provided tables.

## Example Query for TON Domains

If you need to verify a TON domain (for example, `dynamic-capital.ton`), you can
use the following SQL to join the domain and DNS resolution tables:

```sql
SELECT
  d.domain,
  r.records -> 'wallet' ->> 'address' AS wallet_account_id
FROM getmethods.get_domain AS d
JOIN getmethods.dnsresolve AS r
  ON d.account_id = r.account_id
WHERE d.domain = 'dynamic-capital';
```

This query returns the TON wallet address only when the domain exists in the TON
registry. Replace `'dynamic-capital'` with the TON domain label you want to
inspect.

## CLI Helper

You can run an on-demand lookup using the repository helper script, which
proxies the `tonapi.io` DNS endpoint via `curl` (useful when the native Node.js
`fetch` API is blocked by corporate proxies):

```bash
npx tsx scripts/ton/query-ton-domain.ts dynamiccapital.ton
```

The script prints the resolver contract, owning wallet, and expiration timestamp
when the domain is registered. Generic Web2 domains such as
`dynamic-capital-qazf2.ondigitalocean.app` return `entity not found`, confirming
that no TON wallet mapping exists for those hosts.
