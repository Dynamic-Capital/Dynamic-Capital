# Dynamic Capital Token (DCT) Jetton

This directory contains the Tact implementation of the Dynamic Capital Token
(DCT) jetton master and wallet contracts. The contracts are based on the
standard jetton template with the following extensions:

- **Hard-cap supply** — minting is only allowed while `genesisClosed == false`,
  and the total supply can never exceed 100,000,000 DCT (with 9 decimals).
- **Holder burn** — any wallet can invoke `burn(amount)` which forwards the burn
  to the master contract.
- **Timelocked admin controls** — pausing transfers, updating the transfer tax,
  treasury, or DEX router must be scheduled and executed after the configured
  timelock window.
- **Transfer tax hook** — an optional 0-100 bps tax can be enabled and routed to
  the treasury address once the timelock action executes.

## Deployment checklist

1. Configure the `admin`, `treasury`, and `dexRouter` addresses when deploying
   the master contract.
2. Mint the genesis allocation, respecting the 100M hard cap, and call
   `closeGenesis` (opcode `0x44435401`) to permanently lock further minting.
3. Distribute wallets via the standard jetton wallet code in `wallet.tact`.
4. Use the schedule/execute opcode pairs to stage governance actions behind the
   multisig + timelock (48h by default).
5. Emit governance messages for front-ends and off-chain indexers when actions
   are scheduled/executed.

Refer to `config.yaml` for the default deployment parameters. The pool allocator
(`../pool_allocator.tact`) expects the timelocked router and treasury addresses
exposed by the master contract, so deploy it alongside the jetton and reuse the
same multisig administrator when configuring the vault.

## Theme collection deployment

The Theme Pass collection (`theme/theme_collection.tact`) is a TIP-4 compliant
NFT collection configured for DAO-managed content updates. Use the following
steps when deploying and managing the collection:

1. Compile and deploy `theme_collection.tact` with the DAO multisig, collection
   owner, royalty configuration, and compiled Theme Pass item code from
   `theme_item.tact`. The deployment values are tracked under the `themePasses`
   section in `../config.yaml`.
2. Initialize the collection content dictionary with the planned mint indices
   and URIs listed in `config.yaml`. Each mint can be assigned an initial
   priority (higher numbers surface earlier in the front-end) during deployment.
3. Grant the DAO multisig exclusive rights to update or freeze item metadata by
   keeping the `dao` address in the collection contract synchronized with the
   governance configuration.

### Updating content

DAO proposals must target opcode `0x544d4331` (`OP_SET_CONTENT`) on the
collection. The message body layout is:

```
bits[32]  -> opcode
bits[64]  -> Theme Pass index
ref       -> metadata/content cell (e.g., off-chain URI)
bits[32]  -> priority score
```

Successful calls emit a `ThemeContentEvent` event with opcode `0x544d4531`,
allowing indexers to pick up URI and priority updates. Any attempt from a
non-DAO sender fails with `"theme: unauthorized"`.

### Freezing metadata

To permanently lock an item's metadata, the DAO submits opcode `0x544d4332`
(`OP_FREEZE`) with the 64-bit item index. The collection persists the frozen
flag and emits a `ThemeFrozenEvent` (`0x544d4532`). Once frozen, future content
updates for that item will be rejected both on-chain and in the mirroring NFT
item contracts. This protects milestone Theme Pass art drops after approval.

## TON DNS domain item contract

The `dns` directory contains the FunC sources for a DNS domain smart contract
that implements the standard NFT item interface (TIP-4). The implementation is
based on the official TON DNS contracts and exposes the same auction
functionality, governance hooks, and DNS record management helpers.

To compile the contract, invoke `func` with the provided standard library and
supporting modules:

```
func -o build/domain-item.fif \
  dns/stdlib.fc dns/op-codes.fc dns/params.fc dns/dns-utils.fc dns/nft-item.fc
```

The resulting Fift assembly can then be assembled and deployed using the TON
toolchain. Refer to `dns-utils.fc` for auction timings, DNS pricing logic, and
configuration constants such as `dns_config_id`.
