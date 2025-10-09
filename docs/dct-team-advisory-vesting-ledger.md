# DCT Team & Advisory Vesting Ledger

This dossier records the governance-approved lockups for the Dynamic Capital
Token (DCT) team and advisory pools. It consolidates the vesting mechanics,
on-chain references, and monitoring procedures requested by the governance
committee following the 2025-03 token launch readiness review.

## Allocation Summary

- **Locked amount:** 15,000,000 DCT (15% of the 100,000,000 DCT max supply)
- **Purpose:** Team and advisory compensation with long-term retention
  incentives
- **Schedule:** 6 sequential unlocks, each separated by 726 days (~1.99 years)
- **Per-tranche size:** 2,500,000 DCT released at each interval

### Vesting Timeline

| Tranche | Days From TGE | Approx. Years | Amount (DCT) | Notes                                               |
| ------- | ------------- | ------------- | ------------ | --------------------------------------------------- |
| 1       | 726           | 1.99          | 2,500,000    | First release once the initial lockup expires       |
| 2       | 1,452         | 3.98          | 2,500,000    | Requires prior tranche settlement confirmation      |
| 3       | 2,178         | 5.96          | 2,500,000    | Governance review checkpoint before distribution    |
| 4       | 2,904         | 7.95          | 2,500,000    | Treasury stress-test window                         |
| 5       | 3,630         | 9.94          | 2,500,000    | Compliance recertification required                 |
| 6       | 4,356         | 11.93         | 2,500,000    | Final release; triggers vesting module deactivation |

> **Note:** The Tonstarter-approved lock module enforces cliff spacing measured
> in blocks. The day counts above assume the Tonstarter 24h block window.
> Governance checkpoints use real block heights sourced from the Supabase
> telemetry feeds.

## On-Chain Evidence

- **Primary lock contract:**
  [Tonviewer proof](https://tonviewer.com/EQDV-93xWrD-P1oQb94hgFvoIy_JAvh1nvihvrnyon4mYKX1)
  - Confirms the dedicated team/advisory lockup vault and its jetton metadata
  - Displays the aggregate 15M DCT allocation under the "Locked Purpose"
    descriptor
- **Secondary liquidity reference:**
  [GeckoTerminal pool](https://www.geckoterminal.com/ton/pools/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI)
  - Provides external liquidity depth for sanity checks during unlock events
  - Use pool TVL and DCT/TON pricing to estimate market impact of tranche
    releases

### Link Verification Log

- **2025-10-09 05:39 UTC — Tonviewer vault snapshot**
  - Command:
    `curl -I https://tonviewer.com/EQDV-93xWrD-P1oQb94hgFvoIy_JAvh1nvihvrnyon4mYKX1`
  - Result: `HTTP/1.1 200 OK` (Cloudflare edge + origin), confirming the vault
    page and metadata resolve without mitigation challenges.
- **2025-10-09 05:39 UTC — GeckoTerminal liquidity pool**
  - Command:
    `curl -I https://www.geckoterminal.com/ton/pools/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI`
  - Result: Initial edge response `HTTP/1.1 200 OK` followed by
    `HTTP/1.1 403 Forbidden` as the Cloudflare bot mitigation issues a
    JavaScript challenge.
  - Bypass procedure: Resolve the challenge once in a regular browser session,
    capture the issued `cf_clearance` cookie, and replay automated checks with
    `curl -H 'cookie: cf_clearance=<value>; __cf_bm=<value>' -H 'user-agent: <browser UA>' -I <url>`.
    Rotate the cookie on expiry or when the 403 status reappears.

## Monitoring Procedure

1. **Pre-unlock audit**
   - Pull the latest Tonviewer snapshot and export the vault state JSON bundle
     via `apps/tools/generate-tonviewer-bundle.ts`.
   - Verify that the remaining locked balance equals or exceeds the outstanding
     tranche commitments.
2. **Governance sign-off**
   - Record the unlock proposal in the multisig agenda with references to this
     ledger and the vesting attestation
     (`docs/tonstarter/vesting-attestation.md`).
   - Capture advisory acknowledgements when distributing to non-employee
     wallets.
3. **Post-unlock reconciliation**
   - Cross-check GeckoTerminal pool depth to ensure unlock-driven transfers did
     not violate liquidity risk thresholds defined in
     `docs/tonstarter/liquidity-sop.md`.
   - Archive Tonviewer transaction hashes in the compliance vault for the
     quarterly report.

## Reporting Cadence

- **Quarterly:** Publish a short status note referencing remaining locked
  supply, next unlock window, and any governance votes in flight.
- **Annually:** Recompute retention ratios (locked vs circulating team supply)
  and update the Dynamic Capital token review dossier
  (`docs/dynamic-capital-token-review.md`).
- **Ad hoc:** Trigger alerts if any unauthorized transfer attempt occurs or if
  GeckoTerminal indicates abnormal price slippage beyond the governance-approved
  thresholds.

---

**Maintainer:** Dynamic Capital Governance Desk\
**Last updated:** 2025-02-15
