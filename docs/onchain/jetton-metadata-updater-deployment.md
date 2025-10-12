# Jetton Metadata Updater Deployment Runbook

This playbook explains how to deploy the lightweight Jetton metadata forwarder
that relays governance-approved URI updates from the Dynamic Capital DAO
multisig to the DCT jetton master contract. Follow the checklist below whenever
you need to rotate the metadata host or stage a new manifest hash.

## Prerequisites

- **Tooling**
  - Node.js **22.x** or newer (required by the Tact compiler).
  - `npm` **10.x** (ships with Node 22). Install via
    [fnm](https://github.com/Schniz/fnm) or [volta](https://volta.sh/) to keep
    versions sandboxed.
  - `tact` CLI (`npm install -g @tact-lang/compiler`) or run through `npx tact`
    as shown below.
  - A funded deployment wallet (the DAO multisig or a signer acting on its
    behalf) with at least **0.3 TON** to cover the contract deployment and the
    forwarded metadata call.
- **Environment variables**
  - `TACT_IMPORT_PREFIX=$(pwd)/dynamic-capital-ton/contracts` ensures `@stdlib`
    imports resolve without patching source files.
  - `TACT_STDLIB=$(pwd)/node_modules/@tact-lang/compiler/stdlib` when invoking
    `tact` outside of the bundled build harness.
- **Configuration**
  - Owner / jetton master addresses from the on-chain snapshot:
    - Owner (DAO multisig):
      `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`
    - Jetton master:
      `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`

## 1. Compile the contract

```bash
TACT_IMPORT_PREFIX=$(pwd)/dynamic-capital-ton/contracts \
TACT_STDLIB=$(pwd)/node_modules/@tact-lang/compiler/stdlib \
npx tact contracts/tact/JettonMetadataUpdater.tact --output build/metadata-updater
```

The command emits:

- `build/metadata-updater/JettonMetadataUpdater.code.boc`
- `build/metadata-updater/JettonMetadataUpdater.data.boc`
- `build/metadata-updater/JettonMetadataUpdater.compiled.json`

Commit the compiled JSON into the release artefact directory alongside the
deployment record for reproducibility.

## 2. Derive the deployment payload

```bash
npx tsx scripts/ton/deploy-jetton-metadata-updater.ts \
  --owner EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y \
  --jetton EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y \
  --code build/metadata-updater/JettonMetadataUpdater.code.boc \
  --state /tmp/metadata-updater.json \
  --topup 0.2
```

The helper script computes and prints:

- Bounceable / non-bounceable contract addresses.
- The `workchain:hash` form for audit logs.
- Base64url-encoded state-init BOC ready for broadcast.
- A TON Connect QR payload (saved to `--state`) you can pass to Tonkeeper for a
  multisig deployment signing session.

## 3. Broadcast the deployment

Use one of the following pathways:

- **Tonkeeper / Tonhub**: import the JSON generated above and approve the
  deployment message from the DAO multisig signer set.
- **toncenter**: send the state-init and deployment message manually:
  ```bash
  curl "https://toncenter.com/api/v3/sendDeploy?address=$(jq -r '.address' /tmp/metadata-updater.json)" \
    -H "X-API-Key: $TONCENTER_API_KEY" \
    -d @<(jq -r '.stateInit' /tmp/metadata-updater.json)
  ```
- **lite-client**: assemble the message with the signed BOC from `/tmp` and use
  `sendfile` to push it onto the network. Attach the signed BOC to the
  deployment record so auditors can replay the transaction.

The deployment wallet must transfer at least **0.15 TON** to the updater so it
can forward `0.1 TON` with each metadata change without exhausting the balance.

## 4. Post-deployment verification

1. Confirm the contract appears on Tonviewer using the address printed by the
   helper script.
2. Run the `get_owner` and `get_jetton_master` getters via Tonviewer or `toncli`
   to ensure both fields match the DAO multisig and jetton master.
3. Trigger a dry-run metadata update on testnet (if possible) or broadcast a
   production change with a small memo update to confirm the jetton master
   accepts the forwarded message.
4. Update the DAO runbook with the deployment transaction hash and archive the
   compiled artefacts + signed BOC.

## 5. Operational notes

- Every metadata update must originate from the DAO multisig. The contract
  rejects calls from any other address.
- The updater forwards opcode `0x01` (`set_content`) to the jetton master with
  the provided URI. Keep URIs under 4 KB to avoid exceeding a single-cell limit.
- Top up the updater wallet whenever its balance drops below **0.15 TON** to
  avoid failed governance actions.
- Record each metadata change (URI, TON transaction hash, timestamp) in the
  compliance ledger for downstream tooling.
