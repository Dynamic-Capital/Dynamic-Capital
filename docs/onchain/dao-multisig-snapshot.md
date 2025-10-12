# DAO Multisig On-Chain Snapshot — 2025-10-12

This record captures the latest observed state for the Dynamic Capital DAO
governance multisig, the contract responsible for executing resolver updates and
stewardship actions tied to `dynamiccapital.ton`.

## Account overview

| Field     | Value                                              | Notes                                                          |
| --------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Address   | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | Friendly (bounceable) format used across DNS payloads.         |
| Balance   | `0.0917 TON`                                       | Snapshot from Tonviewer at **2025-10-12 01:39 UTC**.           |
| Code hash | `mg+Y3W+/Il7vgWXk5kQX7pMffuoABlNDnntdzcBkTNY=`     | Confirms the multisig uses the expected wallet implementation. |
| Data hash | `DyGKxO1CXdoOwJtbV6Mxpmi8h5rweETYPfMBkJLEtXk=`     | Verifies the current configuration cell committed on-chain.    |

## Verification workflow

Use the existing tooling to regenerate this summary directly from Toncenter so
audit logs remain reproducible:

1. Query Toncenter for the multisig state (requires either a paid API key or a
   throttled public key):

   ```bash
   curl "https://toncenter.com/api/v3/accountStates?address=EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y&include_boc=true" \
     -H "accept: application/json" \
     -H "X-API-Key: $TONCENTER_API_KEY" > /tmp/dao-account.json
   ```

2. Pipe the response through the raw inspector to extract the hashes used above:

   ```bash
   node scripts/ton/inspect-account-raw.ts /tmp/dao-account.json
   ```

3. Update the table if any values drift (for example, after a migration) and
   archive the Tonviewer screenshot or Toncenter payload alongside the
   compliance package.

Document the updated snapshot date at the top of this file whenever you refresh
the entry so downstream playbooks inherit the latest verified parameters.
