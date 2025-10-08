# TON Upstream Jetton Minter Alignment

The official TON Foundation jetton minter reference implementation lives in the
[`ton-blockchain/minter-contract`](https://github.com/ton-blockchain/minter-contract)
repository. This dossier summarizes how Dynamic Capital tracks upstream changes
and the touch points with the DCT governance flow.

## Repository Overview

- **Entry point** –
  [`minter.fc`](https://github.com/ton-blockchain/minter-contract/blob/master/contracts/ft/jetton/minter.fc)
  exposes the standard jetton master logic with helper modules under
  `contracts/ft/jetton/lib`.
- **Wallet code** –
  [`wallet.fc`](https://github.com/ton-blockchain/minter-contract/blob/master/contracts/ft/jetton/wallet.fc)
  implements the TIP-3 jetton wallet used by wallets and exchanges.
- **Deployment utilities** – the `wrappers/` folder contains Python scripts and
  ABI helpers for automated deployment and integration testing.

Refer to the upstream README for canonical build instructions and the complete
contract tree when auditing governance-sensitive updates.

## Alignment Checklist

When the upstream repository publishes an update tagged as security or consensus
critical, run the following review to determine whether Dynamic Capital must
adopt the change:

1. **Fetch upstream tags**
   ```sh
   git remote add ton-minter https://github.com/ton-blockchain/minter-contract.git
   git fetch ton-minter --tags
   ```
2. **Diff the jetton master logic**
   ```sh
   git diff ton-minter/main -- contracts/ft/jetton/minter.fc
   ```
   Focus on opcode handling, access control, and supply accounting changes.
3. **Compare wallet behaviour**
   ```sh
   git diff ton-minter/main -- contracts/ft/jetton/wallet.fc
   ```
   Confirm inbound transfer guards remain compatible with
   `dynamic-capital-ton/contracts/pool_allocator.tact` and the DCT treasury
   workflow.
4. **Document the outcome** – update this dossier with any required migration
   notes and cross-link to the tracked task in `IMPLEMENTATION_PLAN.md`.

## Integration Strategy

Dynamic Capital maintains the DCT jetton contracts in Tact with a FunC
`discoverable` mirror for Ton Discovery scanners. When upstream changes are
adopted:

- Port security-critical logic into both the Tact implementation and the FunC
  mirror, keeping opcode values and error strings synchronized.
- Refresh the Tonviewer verification bundle via
  `dynamic-capital-ton/apps/tools/generate-tonviewer-bundle.ts` after the new
  bytecode is published.
- Re-run `npm run ton:mainnet-status` to confirm the production contracts remain
  active and no unexpected storage deltas appear during redeployment.

## Audit Trail

Record upstream review decisions in the table below to keep the security history
transparent for internal and external auditors.

| Date       | Upstream tag/commit | Summary                                   | Action | Notes                              |
| ---------- | ------------------- | ----------------------------------------- | ------ | ---------------------------------- |
| 2024-10-12 | `v0.5.0`            | Baseline review for Tonstarter diligence. | None   | No opcode changes relevant to DCT. |

Update the table whenever a new upstream tag is evaluated.
