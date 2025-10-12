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

| Role          | Friendly address                                                                 | Raw (`workchain:hash`)                                                    | Tonviewer link                                                                 |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Admin multisig | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7` | [tonviewer.com/EQDSm…x_6y](https://tonviewer.com/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| Treasury wallet | `EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y` | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7` | [tonviewer.com/EQDSm…x_6y](https://tonviewer.com/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
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

Use `npx tsx ../../../scripts/ton/build-jetton-content-cell.ts` to refresh the
on-chain content cell (`metadata-content.json`). The script also writes
`metadata-content.boc` locally for convenience, but the file is
`.gitignore`d because it is reproducible from the JSON metadata and URI. The
summary JSON captures the cell hash and base64 payload so the master contract
can reference the latest hosted metadata URI and checksum without versioning a
binary artifact.
