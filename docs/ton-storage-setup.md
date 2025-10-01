# TON Storage Setup Guide

## Overview

TON Storage is the decentralized file hosting layer in the TON ecosystem. It distributes content across storage providers (nodes) and exposes it through deterministic bag IDs—hashes that act like content addresses. You can publish static websites, media assets, or other files and surface them under a `.ton` domain so wallets and compatible browsers can resolve them without centralized infrastructure.

## Prerequisites

- **TON wallet** – Tonkeeper, TON Wallet, or MyTonWallet. Fund it with TON coins purchased from exchanges such as OKX, KuCoin, or Bybit so you can cover upload and contract transactions.
- **TON Storage access** – Either install the official TON Storage client to run your own node or sign up with a community storage provider that offers an upload interface.
- **Files to host** – Prepare the folder that contains your website or data (for example `index.html`, `style.css`, and `script.js`). Minify or compress assets where possible to reduce storage fees.
- **`.ton` domain (optional)** – If you want decentralized website delivery, register a `.ton` domain that will later point to your stored content.

## Step-by-step setup

### 1. Install the TON Storage client or choose a provider

- **Run your own node (advanced):**
  1. Download the latest TON Storage binaries from [ton.org](https://ton.org) or the official GitHub repository (`ton-storage`).
  2. Install any dependencies referenced in the project documentation (for example Node.js, Rust, or specific libraries).
  3. Configure the daemon (`ton-storage`) so it joins the TON network as a storage provider or client. Supply the recommended configuration files and let the node synchronize with the blockchain.
- **Use a third-party provider (easier):**
  - Select a TON Storage provider listed by the TON community (many announce on X or Telegram). These services usually integrate with Tonkeeper or expose a web dashboard where you can upload files without operating your own node.

### 2. Connect and fund your TON wallet

1. Open your wallet and verify that you hold enough TON coins for storage and transaction fees (uploads generally cost fractions of a TON).
2. When using the command-line client, configure the wallet connection—either through a seed phrase (stored securely) or by providing the public address as required by the client tooling.

### 3. Upload your files

- **Using the TON Storage client:**
  1. Start the daemon (`ton-storage start`).
  2. Run the upload command, for example `ton-storage upload /path/to/site`. The CLI returns a bag ID (hash) that uniquely represents the uploaded bundle.
  3. Approve the upload transaction in your wallet to pay the associated fee.
- **Using a provider UI:**
  1. Sign in with your wallet and choose the upload option.
  2. Select your prepared files/folder and confirm the transaction when prompted.

### 4. Create a storage contract

1. Through the CLI or provider interface, deploy a storage contract that references your bag ID.
2. Choose the storage provider(s), define the retention period, and allocate TON coins to pay for the storage duration.
3. Broadcast the contract deployment transaction from your wallet and record the resulting contract address for future management.

### 5. Link your `.ton` domain (optional)

1. Open the DNS management view in your wallet or the TON DNS Manager.
2. Add a record that maps your domain to the bag ID or storage contract (for example `storage=BagID:E6...`). If hosting a website, ensure the record points to the root `index.html`.
3. Sign the DNS update transaction and wait for confirmation, then resolve `yourname.ton` in a TON-compatible browser or wallet to verify the site loads.

### 6. Manage payments and monitor status

- Track storage balances so payments to providers do not lapse. You can configure auto-renewal in the storage contract if your wallet maintains enough funds.
- Periodically inspect contract status via the CLI, provider dashboards, or TON blockchain explorers such as tonscan.org or tonviewer.com.
- Troubleshoot availability issues by checking that DNS records are accurate, the bag ID matches your upload, and your storage providers remain online.

## Additional recommendations

- **Optimize assets:** Minify HTML, CSS, and JavaScript, compress media, and split large sites into multiple bags when it improves performance or cost efficiency.
- **Secure credentials:** Keep wallet seed phrases offline and restrict access to configuration files that connect the storage client to your wallet.
- **Maintain backups:** Retain local copies of all uploaded data so you can re-deploy quickly if you change providers or need to refresh the storage contract.
- **Engage with the community:** Follow TON developer channels, X accounts, or Telegram groups for new tooling, provider announcements, and best practices.

## Cost planning

- **Upload transactions:** Expect roughly 0.05–0.1 TON per transaction, depending on current network fees.
- **Storage fees:** Budget around 0.01 TON per MB per month (rates vary by provider and network usage).
- **DNS updates:** Updating `.ton` records typically costs about 0.05 TON per change.
- Monitor exchange rates and network congestion so you can adjust funding levels for long-term hosting.

## Resources

- TON developer documentation: [https://ton.org/docs](https://ton.org/docs)
- TON Storage repositories and releases: [https://github.com/ton-blockchain/ton](https://github.com/ton-blockchain/ton)
- TON blockchain explorers: [https://tonscan.org](https://tonscan.org), [https://tonviewer.com](https://tonviewer.com)
- Wallet downloads and ecosystem links: [https://ton.org/ecosystem](https://ton.org/ecosystem)
