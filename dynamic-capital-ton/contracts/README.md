# Dynamic Capital Token (DCT) Jetton

This directory contains the Tact implementation of the Dynamic Capital Token
(DCT) jetton master and wallet contracts alongside a FunC reference
implementation that is compatible with TON Discovery scanners. The contracts are
based on the standard jetton template with the following extensions:

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

## Governance addresses

All governance addresses live in [`config.yaml`](../config.yaml) and should be
kept in sync with production deployments. The friendly forms are base64url
representations suitable for most wallets, while the raw column surfaces the
`workchain:hash` pair that explorers expose in developer tooling.

| Role          | Friendly address                                                                 | Raw (`workchain:hash`)                                                    | Tonviewer link                                                                 |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Admin multisig | `UQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOK0G` (non-bounceable, canonical)<br/>`EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD` (bounceable companion) | `0:f5cc024f6193187f763d07848bedf44b154f9583957b45c2cc9c4bb61ff70d38` | [tonviewer.com/EQD1z…OPDD](https://tonviewer.com/EQD1zAJPYZMYf3Y9B4SL7fRLFU-Vg5V7RcLMnEu2H_cNOPDD) |
| Treasury wallet | `EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq` | `0:26cdc2a0ddec9b50dcec4f896526b8e80deec5c02e759d246124430008276789` | [tonviewer.com/EQAmz…iYhq](https://tonviewer.com/EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq) |
| Primary DEX router | `EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt` | `0:779dcc815138d9500e449c5291e7f12738c23d575b5310000f6a253bd607384e` | [tonviewer.com/EQB3n…TiUt](https://tonviewer.com/EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt) |

### Discovery-compliant FunC master contract

The `jetton/discoverable` folder ships a drop-in FunC master contract
(`master.fc`) that mirrors the governance logic from the Tact version while
exposing the Discovery wallet lookup interface. The `get_discovery_data`
getter returns the Discovery protocol version alongside the wallet code so
indexers can confirm compatibility before calling `provide_wallet_address`.
Compile it with the bundled imports:

```
func -o build/discoverable-master.fif \
  jetton/discoverable/master.fc
```

The helper modules under `jetton/discoverable/imports` wrap the shared standard
library, opcodes, and wallet utilities already present in this repository. Use
the same wallet code and content cells when migrating between the Tact and FunC
variants to keep balances and metadata consistent.

### Automated build pipeline

The repository now ships a unified compiler harness that produces all
deployable artifacts (Tact + FunC) in a single pass. Run it from the repository
root:

```
npm run ton:build-contracts -- --clean --verbose
```

- Tact contracts (`dao_dns_controller.tact`, `pool_allocator.tact`, jetton,
  and Theme Pass suites) are built with the upstream Tact stdlib and emitted to
  `dynamic-capital-ton/contracts/build/tact`.
- The FunC discovery master is compiled with the root-level `stdlib.fc`
  aggregator, which pins the include paths under `dynamic-capital-ton/contracts`
  so FunC toolchains no longer require ad-hoc `-I` flags.
- Pass `--skip-tact` or `--skip-func` to limit the run to a specific toolchain;
  omit `--clean` to reuse existing build outputs.
- The script automatically skips Tact builds on Node.js runtimes older than v22
  (the minimum required by the upstream compiler) and prints a reminder so CI
  jobs know when to upgrade.

### FunC regression tests

Compile-time regressions for the discoverable master are covered by a TypeScript
test harness under `contracts/tests`. Install the repository dependencies and
run the suite with:

```
npm install
npx tsx dynamic-capital-ton/contracts/tests/discovery-getter.test.ts
```

The test compiles `master.fc`, boots it inside the TON contract executor, and
asserts that `get_discovery_data` and `provide_wallet_address` respond with the
expected payloads.

### Signing the discoverable contract

Production deployments should be signed before broadcasting. Follow the
[`SIGNING.md`](./SIGNING.md) checklist to export the compiled master contract,
produce a state-init BoC, and create an offline signing request that can be
authorized with the Dynamic Capital Signer application or another compatible
tool.

### Tonviewer verification bundle

Tonviewer and Tonkeeper keep flagging the jetton as **Unverified** until the
team submits a verification package. Generate the canonical archive by running:

```
$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/generate-tonviewer-bundle.ts
```

The script collects the full FunC discoverable sources (including the `imports/`
helper modules), frozen metadata, this README, and a machine-readable manifest
(metadata checksum + governance summary) into
`build/tonviewer/dct-tonviewer-verification.zip`. Submit the ZIP through the
[Tonviewer verification portal](https://tonviewer.com/verification) and track
the workflow with the
[`docs/onchain/dct-tonviewer-verification.md`](../../docs/onchain/dct-tonviewer-verification.md)
runbook so the explorer badge flips to **Verified** across wallets.

After submitting, monitor the explorer status with the CLI at
`apps/tools/check-tonviewer-status.ts`. It compares the live Tonapi metadata
against `metadata.json` and exits with non-zero codes if either the verification
flag remains `none` or the hosted metadata drifts from the repository copy.

### Tonkeeper verification workflow

Tonkeeper displays an **Unverified Token** banner until the project submits the
jetton metadata through their [`ton-assets` repository pull request
process](https://tonkeeper.helpscoutdocs.com/article/127-tokennftverification).
Fork the repository, add the Dynamic Capital Token YAML manifest under
`jettons/`, and track any reviewer feedback directly on the pull request to keep
the wallet status aligned with the explorers above.

## Explorer verification shortcuts

Use the following canonical explorer pages to validate the on-chain jetton and
liquidity pool wallets. Tonscan includes both the raw workchain and friendly
addresses so the link works regardless of which representation a wallet shows.

| Platform     | Scope                      | Canonical link(s) |
| ------------ | -------------------------- | ----------------- |
| Tonscan      | Jetton overview            | [Friendly](https://tonscan.org/jetton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) · [Raw](https://tonscan.org/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7) |
| Tonviewer    | Jetton overview            | [tonviewer.com/jetton/0:d29…96c7](https://tonviewer.com/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7) |
| TON Explorer | Jetton account             | [explorer.toncoin.org/account?account=EQDSm…x_6y](https://explorer.toncoin.org/account?account=EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| TON.cx       | Jetton account             | [ton.cx/address/EQDSm…x_6y](https://ton.cx/address/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| DYOR         | Token intelligence profile | [dyor.io/token/EQDSm…x_6y](https://dyor.io/token/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| STON.fi      | pTON/DCT liquidity         | [Pool wallet](https://tonviewer.com/EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI) · [LP jetton](https://tonviewer.com/jetton/0:31876bc3dd431f36b176f692a5e96b0ecf1aedebfa76497acd2f3661d6fbacd3) · [Swap](https://app.ston.fi/swap?from=TON&to=DCT&chartVisible=true&chartInterval=24h&ft=TON&tt=EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| DeDust       | TON/DCT liquidity          | [Pool wallet](https://tonviewer.com/EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm) · [LP jetton](https://tonviewer.com/jetton/0:d3278947b93e817536048a8f7d50c64d0bd873950f937e803d4c7aefcab2ee98) · [Swap](https://dedust.io/swap/TON/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) |
| Swap.Coffee  | TON/DCT liquidity & routing | [Token hub](https://swap.coffee/dex?st=EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) · [Pool wallet](https://tonviewer.com/EQAD5WGuM2uwnkBq30PBS_RmlwP5VAj-KzXa3lj9jJkFaj-D) |
| DEX Screener | Liquidity analytics        | [Token hub](https://dexscreener.com/ton/EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y) · [STON.fi pair](https://dexscreener.com/ton/eqaxh2vd3umfnrf29pkl6wsozxrt6_p2sxrnlzzh1vus0_mi) · [DeDust pair](https://dexscreener.com/ton/eqdtj4lhut6bdtyeio99umznc9hzlq-tfoa9thrvyrlumefm) |
### Metadata guardrails

Run the validation script after editing `metadata.json` to ensure the `sameAs`
block stays canonical and continues to reference the jetton, pool, and DEX
routes without drift. The checker now also verifies the DEX Screener token API
and fetches each swap/metadata endpoint to detect stale links:

```sh
deno run -A dynamic-capital-ton/apps/tools/validate-jetton-links.ts
```

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
