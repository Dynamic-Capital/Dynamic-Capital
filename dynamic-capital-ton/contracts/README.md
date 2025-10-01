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

## TON NFT opcode reference

The following FunC helpers mirror the TIP-4/TIP-65 opcode layout used by the
standard NFT collection and editable item interfaces. They are useful when
building off-chain tooling or authoring low-level contracts that need to craft
or decode NFT messages manually.

### Opcode helpers

- **TIP-4 base flow** — covers transfers, ownership updates, static data, and
  royalty queries between NFT items, collections, and wallets.
  - `transfer` (`0x5fcc3d14`): request ownership change from a wallet.
  - `ownership_assigned` (`0x05138d91`): confirm a transfer to the new owner.
  - `excesses` (`0xd53276db`): return unspent gas or bounced value.
  - `get_static_data` (`0x2fcb26a2`): ask a collection for immutable metadata.
  - `report_static_data` (`0x8b771735`): return the static metadata response.
  - `get_royalty_params` (`0x693d3950`): request royalty configuration.
  - `report_royalty_params` (`0xa8cb00ad`): respond with royalty fields.
- **TIP-65 editable flow** — extends TIP-4 with editorship management hooks.
  - `edit_content` (`0x1a0b9d51`): submit new content or metadata for review.
  - `transfer_editorship` (`0x1c04412a`): hand off editing rights to another
    address.
  - `editorship_assigned` (`0x511a4463`): acknowledge the new editor.

```func
int op::transfer() asm "0x5fcc3d14 PUSHINT";
int op::ownership_assigned() asm "0x05138d91 PUSHINT";
int op::excesses() asm "0xd53276db PUSHINT";
int op::get_static_data() asm "0x2fcb26a2 PUSHINT";
int op::report_static_data() asm "0x8b771735 PUSHINT";
int op::get_royalty_params() asm "0x693d3950 PUSHINT";
int op::report_royalty_params() asm "0xa8cb00ad PUSHINT";

;; NFTEditable
int op::edit_content() asm "0x1a0b9d51 PUSHINT";
int op::transfer_editorship() asm "0x1c04412a PUSHINT";
int op::editorship_assigned() asm "0x511a4463 PUSHINT";
```

Keep this reference in sync with the official TON NFT standards to avoid
breaking compatibility with wallets and indexers.
