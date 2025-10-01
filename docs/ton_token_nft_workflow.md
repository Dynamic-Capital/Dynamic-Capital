# TON Token and NFT Creation Workflow

This playbook breaks down the practical steps for launching fungible jettons
(TIP-3 tokens) and NFT collections on The Open Network (TON). It covers both
command-line tooling and marketplace-assisted paths, plus Tonkeeper verification
requirements for removing the "Unverified" label.

## Prerequisites

- A funded TON wallet (Tonkeeper or equivalent) with access to the private/seed
  phrase.
- Familiarity with the
  [TON CLI tooling](https://github.com/ton-community/toncli) or a trusted
  marketplace such as [Getgems](https://getgems.io/).
- Ability to sign transactions from the owner wallet. Keep the seed phrase and
  any keystores offline.

## 1. Launching a Jetton (TIP-3 Token)

### Option A — Command-line workflow (toncli/tondev)

1. **Create the project**
   - Install toncli (`pip install toncli`) and initialise a project:
     `toncli start my_jetton`.
   - Add a jetton minter contract template or clone an audited implementation
     (e.g. from
     [ton-community/token-contracts](https://github.com/ton-community/token-contracts)).
2. **Configure token metadata**
   - Update the jetton parameters: `name`, `symbol`, `decimals`, initial supply
     and owner address inside the config (`deploy.config.json` or equivalent).
   - Prepare an off-chain metadata file (JSON) with icon URL and description for
     wallets that support metadata fetch.
3. **Compile and deploy**
   - Run `toncli build` to compile the contract.
   - Use `toncli deploy --network mainnet` (or `testnet`) supplying the owner
     wallet keys. Confirm the deployment transaction hash and store it securely.
4. **Mint or distribute supply**
   - Call the `mint` function (via `toncli run` or an SDK script) to mint
     additional supply to specified addresses.
   - Alternatively, transfer balances from the owner wallet if the initial
     supply was pre-minted.
5. **Automate administration**
   - Optional scripts can be written with the TON SDKs (TypeScript, Python) for
     airdrops, treasury minting, or burning.

### Option B — Web deployment assistants

1. Choose a trusted jetton deployment service and connect your Tonkeeper wallet.
2. Input the same metadata (name, symbol, decimals, icon URL, total supply) and
   confirm the generated contract parameters.
3. Approve the deployment transaction from Tonkeeper and note the minter
   address.
4. Use the interface or Tonkeeper to transfer minted tokens to recipients.

### Tonkeeper jetton verification (ton-assets PR)

1. Fork [`tonkeeper/ton-assets`](https://github.com/tonkeeper/ton-assets) and
   clone your fork locally.
2. Create a new file under `jettons/<token-symbol>.yaml` containing:
   ```yaml
   name: Example Token
   symbol: EXMPL
   address: <jetton-minter-address>
   decimals: 9
   description: >-
     Short token blurb.
   social:
     - https://example.com
   ```
3. Commit the file, push, and open a Pull Request against the upstream
   repository following their contribution checklist.
4. Wait for Tonkeeper maintainers to review. Once merged, the wallet removes the
   "Unverified Token" badge.

## 2. Launching an NFT Collection

### Option A — Getgems marketplace workflow

1. **Connect and configure**
   - Visit [Getgems Create](https://getgems.io/create) and connect your
     Tonkeeper wallet.
   - Choose "Collection" and fill in collection name, symbol, description,
     royalties, and media hosting (IPFS/Arweave recommended).
2. **Upload metadata**
   - Provide item media (images, video, etc.), JSON attributes, and royalty
     recipient address.
   - Double-check hosted URLs are permanent before minting.
3. **Mint collection**
   - Approve the deployment transaction for the collection contract.
   - Mint items individually or via batch upload (CSV/JSON) depending on the
     Getgems UI options.
4. **List and manage sales**
   - Set listing price per item and sign sale listings from Tonkeeper.
   - Monitor offers, accept bids, or transfer NFTs directly from the marketplace
     dashboard.
5. **Support**
   - Refer to the Getgems FAQ/support links for platform-specific
     troubleshooting.

### Option B — Command-line workflow

1. **Clone an NFT collection contract** (e.g. from
   [ton-community/nft-contracts](https://github.com/ton-community/nft-contracts)).
2. **Populate metadata**
   - Prepare an off-chain metadata manifest with collection-level data and
     per-item JSON files pointing to the media.
   - Update contract configuration to reference the manifest URLs.
3. **Compile and deploy**
   - Use `toncli build` followed by `toncli deploy` (or equivalent SDK
     deployment script) to publish the collection and NFT item contracts.
4. **Mint items**
   - Invoke the mint function with recipient addresses and metadata indices.
     Track minted item IDs and transaction hashes.
5. **Marketplace listings**
   - Once items exist on-chain, they can be listed on Getgems or any TON
     marketplace by connecting the owner wallet.

### Tonkeeper NFT verification (ton-assets PR)

1. In your `ton-assets` fork, add `collections/<collection-name>.yaml`
   describing the collection address, metadata URL, and links.
2. Follow the same PR workflow as jettons. Ensure the collection already exists
   on-chain before submitting.

## 3. Operational and Security Notes

- Back up owner keys, mnemonic phrases, and deployment configs offline. Consider
  multisig control for treasuries.
- Use testnet to rehearse deployments before committing real funds.
- Avoid duplicate entries or prohibited content in `ton-assets` PRs—maintainers
  may reject submissions without detailed reasoning.
- Monitor deployed contracts for suspicious activity and keep a runbook for
  pausing minting or rotating admin keys if supported.
- Communicate supply, vesting, and royalty policies transparently to holders.

Provide your preferred tooling path (command-line vs. marketplace) if you need a
more granular walkthrough or automation scripts.
