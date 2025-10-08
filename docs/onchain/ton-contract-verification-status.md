# TON Smart Contract Verification Status

This note captures the automated checks that confirm whether the Dynamic Capital
TON contracts remain verifiable before onboarding new integrators.

## How to run the verification sweep

Use the consolidated tooling script to audit the jetton metadata parity and the
core wallet contracts published in DNS records:

```bash
$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/check-ton-contracts.ts
```

The command performs three groups of checks:

1. **Jetton metadata integrity** – compares the on-chain metadata exposed via
   Tonapi with the repository copy (`contracts/jetton/metadata.json`) and prints
   a diff table if any field
   drifts.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L7-L173】【F:dynamic-capital-ton/contracts/jetton/metadata.json†L1-L36】
2. **Verification flag** – surfaces the Tonviewer/Tonapi verification status so
   operations know whether the badge is still pending
   follow-up.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L111-L162】
3. **Account heartbeat** – pings the treasury, liquidity pools, and canonical
   wallets declared in `storage/dns-records.txt` to confirm each contract is
   active on-chain before onboarding
   stakeholders.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L139-L162】【F:dynamic-capital-ton/storage/dns-records.txt†L1-L18】

Exit codes escalate as follows: `0` (all good), `2` (metadata drift), `3`
(jetton still unverified), `4` (inactive accounts), `5` (fetch errors). CI and
runbooks can key off the highest code to trigger the appropriate escalation.

## Operational guidance

- **Onboarding gate:** run the sweep immediately before provisioning new DAO
  signers or liquidity partners. A non-zero exit code should pause onboarding
  until the root cause is resolved.
- **Metadata drift:** if Tonapi reports a different image URL or symbol, update
  the repository copy (`metadata.json`) or republish the hosted JSON so both
  sources match before re-running the
  check.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L62-L110】
- **Unverified flag:** if the jetton remains unverified, follow the escalation
  plan in the Tonviewer runbook and include the latest sweep output in the
  support ticket.【F:docs/onchain/dct-tonviewer-verification.md†L1-L69】
- **Inactive wallets:** coordinate with operations to investigate paused
  accounts. For liquidity pools this typically signals a stuck upgrade or a
  misconfigured router address that must be corrected before integrations go
  live.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L139-L162】

Document the sweep results alongside onboarding paperwork so compliance has a
timestamped proof that the smart contracts were healthy when access was granted.
