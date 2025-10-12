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

## FunC compilation entrypoint

Auditors that rely on the [`func`](https://github.com/ton-blockchain/ton)
compiler can generate the `fift` artifact directly from this directory. The
`jetton-minter.fc` shim wraps the discoverable master implementation so that the
following command produces `output.fif` without navigating the nested
directories:

```sh
func -o output.fif -SPA jetton-minter.fc
```

The command was verified with `func` v0.4.6, which resolves the `discoverable/`
imports without any extra include flags when run from this directory.

The shim simply includes the `discoverable/master.fc` source while preserving
the relative include paths into `discoverable/imports/`, ensuring the compiler
resolves the supporting libraries correctly.

## Governance addresses

The canonical governance addresses ship with this repository inside
[`config.yaml`](../config.yaml). Keep them aligned with live deployments so the
tooling and documentation remain accurate.

| Role               | Friendly address                                   | Raw (`workchain:hash`)                                               | Tonviewer link                                                                                     |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Admin multisig     | `UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G` (non-bounceable, canonical)<br/>`EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD` (bounceable companion) | `0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38` | [tonviewer.com/EQD1z…OPDD](https://tonviewer.com/EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD) |
| Treasury wallet    | `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` | `0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789` | [tonviewer.com/EQAmz…iYhq](https://tonviewer.com/EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq) |
| Primary DEX router | `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` | `0:779dcc815138d9500e449c5291e7f12738c23d575b5310000f6a253bd607384e` | [tonviewer.com/EQB3n…TiUt](https://tonviewer.com/EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt) |

## Metadata

The off-chain jetton metadata lives in `metadata.json`. It surfaces the token
name, symbol, decimals (9), and canonical project URL so wallets and explorers
can render DCT consistently. Publish the file to IPFS or your preferred static
host and point the master contract's metadata URI to the hosted JSON artifact.
After updating the JSON, run the validation helper to confirm the verification
links remain intact:

```sh
deno run -A ../../apps/tools/validate-jetton-links.ts
```
