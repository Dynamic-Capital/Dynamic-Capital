# DAO Multisig On-Chain Snapshot — 2025-10-12

This dossier preserves the latest observed state of the Dynamic Capital DAO
governance multisig. The contract executes resolver updates and other
stewardship operations linked to `dynamiccapital.ton`, so keeping an auditable
snapshot prevents accidental drift.

## Current account state

| Field              | Value                                                                | Notes                                                                                 |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Address            | `UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G`                   | Canonical non-bounceable form published in DNS (`root_wallet`) and resolver payloads. |
| Bounceable         | `EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD`                   | Use for explorers and wallets that prefer the bounceable friendly representation.     |
| Raw workchain:hash | `0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38` | Handy when reconciling explorer API payloads and FunC tooling.                        |
| Balance            | `0.354375612 TON`                                                    | Toncenter balance sampled at **2025-10-12 19:08 UTC**.                                |
| Code hash          | `IINLe3KxEhR+Gy+0V7hOdNGjDwT3N9T2KmaOlVLSty8=`                       | Confirms the wallet uses the vetted multisig implementation.                          |
| Data hash          | `nGNSvzi/hjTPuE2UNsOBXY64O1ycXmzAYtKUL4OELR4=`                       | Validates that the configuration cell has not changed unexpectedly.                   |
| State init*        | _See workflow below_                                                 | Recompute when regenerating the snapshot to detect init cell changes.                 |

> ✨ _State init hash is derived from the account's code and data cells and acts
> as a compact fingerprint for migrations. Always recompute it when you refresh
> the snapshot so unexpected redeploys surface immediately._

## End-to-end verification workflow

Use the reproducible flow below whenever you refresh the snapshot. It produces
all hashes, balance data, and an auditable payload you can archive.

### 1. Capture the raw account state

Request the current multisig state from Toncenter. Supply your paid API key (or
a throttled public key for manual runs) and persist the JSON locally:

```bash
curl "https://toncenter.com/api/v3/accountStates?address=UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G&include_boc=true" \
  -H "accept: application/json" \
  -H "X-API-Key: $TONCENTER_API_KEY" \
  --compressed \
  --output /tmp/dao-account.json
```

### 2. Summarise hashes with the raw inspector

Run the project inspector to decode the BOCs and display the hashes that power
the table above. The tool also emits the derived state init hash and any
human-readable ASCII hints embedded in the contract cells.

```bash
node scripts/ton/inspect-account-raw.ts /tmp/dao-account.json
```

Record the resulting values in the table, updating the snapshot date and balance
as needed.

### 3. Cross-check with Tonviewer (optional but recommended)

Load `https://tonviewer.com/EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD`
and confirm the displayed balance and code hash match the inspector output. Save
the Tonviewer screenshot or the Toncenter JSON payload alongside the compliance
package for a fully auditable trail.

### 4. Commit the refreshed snapshot

When the data changes, update this document and commit the new snapshot date.
Downstream playbooks (DNS resolvers, deployment guards, and treasury controls)
rely on this file, so treating it as the canonical state prevents configuration
regressions.
