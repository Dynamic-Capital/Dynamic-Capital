# Dynamic Capital DAO DNS Governance Playbook

## Objective

Transition DNS updates for `dynamiccapital.ton` from manual operations to an
end-to-end governance loop stewarded by the DAO. The target flow is:

1. Member proposes a DNS payload.
2. DAO votes and reaches quorum.
3. DAO contract signs and dispatches the update to the treasury wallet.
4. Treasury wallet publishes the DNS record.
5. Edge automation verifies that on-chain state and DNS are in sync.

## On-Chain Controller

The `DaoDnsController` Tact contract coordinates authorised DNS payloads. The
contract lives alongside the primary DAO multisig and enforces the following
controls:

- Only the configured DAO multisig can create proposals, register votes, sync
  member power, or execute updates.
- Each proposal stores the serialized DNS record, a running approval weight, and
  the quorum threshold captured at creation time.
- Execution is blocked until the approval weight divided by total DAO voting
  power meets or exceeds the quorum percentage (default 60%).
- Successful executions emit a `DnsUpdateEvent` that downstream keepers can
  consume when preparing treasury wallet transactions.

Key op codes:

| Operation              | Code         | Purpose                                       |
| ---------------------- | ------------ | --------------------------------------------- |
| `OP_NEW_PROPOSAL`      | `0x44445031` | Register proposal payload + quorum snapshot   |
| `OP_REGISTER_VOTE`     | `0x44445631` | Increment approval weight for a proposal      |
| `OP_EXECUTE_PROPOSAL`  | `0x44444531` | Finalise proposal and emit DNS update event   |
| `OP_SYNC_MEMBER_POWER` | `0x44444d31` | Synchronise DAO voting power total for quorum |

See
[`dynamic-capital-ton/contracts/dao_dns_controller.tact`](../dynamic-capital-ton/contracts/dao_dns_controller.tact)
for the full implementation.

## Supabase Governance Schema

A dedicated schema records proposals, the DAO roster, and individual vote
entries. Migration file:
[`supabase/migrations/20250310090000_dao_dns_governance.sql`](../supabase/migrations/20250310090000_dao_dns_governance.sql)

### Tables

- **`dao_members`** – DAO wallet roster with voting power snapshots and active
  status flags.
- **`dns_proposals`** – JSONB payloads for proposed DNS records plus quorum and
  execution metadata.
- **`dns_proposal_votes`** – Ledger of per-voter ballots including the voting
  weight captured at cast time. A unique constraint prevents duplicate votes per
  proposal.

Row-level security allows authenticated readers to audit history while the
service role (used by Edge Functions) manages mutations.

## Edge Functions

Four Supabase Edge Functions orchestrate DNS governance workflows. They are
registered with JWT verification disabled via `supabase/config.toml` to allow
service-role execution by keepers.

| Function           | Path                             | Responsibility                                                          |
| ------------------ | -------------------------------- | ----------------------------------------------------------------------- |
| `dao-dns-proposal` | `/functions/v1/dao-dns-proposal` | Persist new DNS proposals and broadcast notifications.                  |
| `vote-dns`         | `/functions/v1/vote-dns`         | Validate DAO voters, apply ballots, and refresh tallies.                |
| `execute-dns`      | `/functions/v1/execute-dns`      | Confirm quorum, notify execution webhooks, and mark proposals executed. |
| `dns-verify`       | `/functions/v1/dns-verify`       | Compare the latest executed payload against the live DNS JSON.          |

### Proposal Creation

`dao-dns-proposal` stores the payload (ensuring `domain` is included) and posts
an optional webhook to `DAO_WEBHOOK_URL` for DAO awareness. Quorum defaults to
60% but can be overridden per proposal (bounded between 1–100%). Payloads must
also include `token_symbol: "DCT"` so downstream verifiers reject attempts to
publish inconsistent tickers.

### Voting

`vote-dns` guarantees that the voter exists in `dao_members`, is active, and has
positive voting power. Votes are upserted to permit switching sides while
maintaining the single-vote constraint. Tallies are recomputed after each
ballot.

### Execution

`execute-dns` validates quorum by comparing total approvals with the active DAO
voting power. When successful it serialises the DNS payload to base64 for the
`DAO_EXECUTION_WEBHOOK_URL` and updates proposal metadata (`executed`,
`executed_at`, `onchain_tx`).

### Verification

`dns-verify` retrieves the latest executed proposal and compares it with the
JSON served at `https://dynamiccapital.ton/dns-records.json` (configurable via
`sourceUrl`). Differences are reported path-by-path to ease debugging. The
function returns HTTP 200 when records match and 409 otherwise.

## Front-End Governance Panel

A minimal governance dashboard should expose:

- **Proposals List** – Status chips for Pending, Voting, Executed, along with
  quorum percentage and approval ratios.
- **Proposal Detail** – JSON diff between `current` and `proposed_record` plus
  execution metadata (TX hash, timestamps).
- **Voting Controls** – Approve / Reject buttons wired to `/vote-dns`, blocking
  interaction for inactive wallets or executed proposals.
- **Execution Log** – Display results from `/execute-dns` including quorum math
  and webhook delivery status.
- **DAO Stats** – Aggregated member count, total voting power, quorum threshold,
  and participation metrics (votes cast vs active members).

## Security Considerations

- Only the DAO multisig can invoke contract operations; treasury wallet updates
  require both DAO and treasury confirmations.
- `dao_members` controls who can vote and the relative weight of each ballot.
- Treasury wallet keys are rotated quarterly. Any change must be proposed and
  approved through the same governance process.
- Edge Functions rely on service-role keys. Store secrets
  (`SUPABASE_SERVICE_ROLE_KEY`, `DAO_WEBHOOK_URL`, `DAO_EXECUTION_WEBHOOK_URL`)
  in Supabase environment variables, not source control.

## Automation Schedule

| Function            | Frequency       | Purpose                                               |
| ------------------- | --------------- | ----------------------------------------------------- |
| `/dns-verify`       | Daily cron      | Alert on drift between executed payload and live DNS. |
| `/dao-dns-proposal` | Manual (UI/API) | Capture new DNS payloads.                             |
| `/vote-dns`         | Manual (UI/API) | Record DAO member ballots.                            |
| `/execute-dns`      | 10-minute cron  | Automatically execute proposals that reach quorum.    |

## Reference DNS Payload

The live JSON served at [`public/dns/active.json`](../public/dns/active.json)
mirrors the canonical structure:

```json
{
  "domain": "dynamiccapital.ton",
  "records": {
    "ton_alias": "dynamiccapital.ton",
    "token_symbol": "DCT",
    "jetton_master": "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
    "treasury_wallet": "EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq",
    "stonfi_pool": "EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
    "stonfi_pool_metadata": "https://meta.ston.fi/lp/v1/0:31876BC3DD431F36B176F692A5E96B0ECF1AEDEBFA76497ACD2F3661D6FBACD3.json",
    "stonfi_jetton_wallet": "EQAtgX_AkOJEEDxYICWRlS9HtNFMrujgruQJLanYHJURCxB3",
    "wallet_v5r1": "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm",
    "dedust_pool": "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm",
    "dedust_pool_metadata": "https://api.dedust.io/v2/pools/0:d3278947b93e817536048a8f7d50c64d0bd873950f937e803d4c7aefcab2ee98/metadata",
    "dedust_jetton_wallet": "EQC_W1HQhQhf3XyyNd-FW-K6lWFfSbDi5L2GqbJ7Px2eZzVz",
    "dao_contract": "EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
    "jetton_tonviewer": "https://tonviewer.com/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
    "jetton_tonscan": "https://tonscan.org/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
    "jetton_dyor": "https://dyor.io/token/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
    "dexscreener_token": "https://dexscreener.com/ton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y",
    "dexscreener_stonfi": "https://dexscreener.com/ton/eqaxh2vd3umfnrf29pkl6wsozxrt6_p2sxrnlzzh1vus0_mi",
    "dexscreener_dedust": "https://dexscreener.com/ton/eqdtj4lhut6bdtyeio99umznc9hzlq-tfoa9thrvyrlumefm",
    "metadata": "https://dynamiccapital.ton/jetton-metadata.json",
    "metadata_fallback": "https://dynamic.capital/jetton-metadata.json",
    "api": "https://api.dynamiccapital.ton",
    "api_fallback": "https://dynamic.capital/api",
    "manifest": "https://dynamiccapital.ton/tonconnect-manifest.json",
    "manifest_fallback": "https://dynamic.capital/tonconnect-manifest.json",
    "docs": "https://dynamiccapital.ton/docs",
    "docs_fallback": "https://dynamic.capital/docs",
    "updated": "2025-10-09"
  },
  "signatures": {
    "dao": "base64:abc123...",
    "treasury": "base64:def456..."
  }
}
```

This payload should always be the output of the latest executed proposal and the
source-of-truth for verification jobs.
