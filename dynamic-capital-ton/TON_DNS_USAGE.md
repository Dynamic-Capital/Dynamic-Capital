# TON DNS Best Usage Guide

## Overview
The TON DNS standard (TEP-81) extends TON smart contracts with human-readable names that resolve to wallet addresses, smart contracts, and decentralized resources. It enables readable identifiers for dApps, simplifying user interactions across wallets, marketplaces, and services.

## Core Components
- **Root DNS Contract**: Maintains top-level domains (`.ton`, `.t.me`, etc.) and delegates control to subdomain owners.
- **NFT-based Subdomains**: Each domain/subdomain is represented as an NFT that can be traded or assigned to smart contracts, as seen in the official [TON DNS contracts](https://github.com/ton-blockchain/dns-contract).
- **Resolvers**: Smart contracts that store and return records (wallet addresses, content hashes). Subresolvers allow hierarchical domain management, aligning with the [TON resolver guidelines](https://docs.ton.org/v3/guidelines/web3/ton-dns/subresolvers).

## Best Usage Scenarios
1. **Human-Friendly Wallet Addresses**
   - Map long raw TON addresses to readable names (e.g., `alice.ton`). Wallets can query the resolver to route payments.
   - Ensure subresolvers handle wallet updates atomically to prevent stale records.

2. **Service Discovery for dApps**
   - Publish service endpoints (DEX, NFT marketplace) via DNS records. Clients resolve contract addresses dynamically, minimizing hard-coded addresses.
   - Use structured TXT records or custom record types for metadata.

3. **NFT Collections and Branding**
   - Register branded domains and delegate subdomains to NFT collections (e.g., `collection.project.ton`). Marketplaces such as [tonscan collections](https://tonscan.org/collection/EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi) showcase how domains enhance discoverability.

4. **Decentralized Websites**
   - Combine TON DNS with TON Sites by pointing records to content storage (IPFS, TON Storage). Browsers and wallets that support TON Sites can render decentralized content from DNS records.

5. **Programmable Access Control**
   - Subresolvers can implement custom logic (e.g., multi-sig approval) before updating records, ensuring secure delegation across teams or DAOs.

## Implementation Tips
- Follow the official [TON DNS contract repository](https://github.com/ton-blockchain/dns-contract) for reference implementations, particularly for deploying root and subdomain contracts.
- Adhere to TEP-81’s record schema to maintain compatibility with wallets and explorers.
- Cache resolver responses carefully—respect TTL semantics if defined to avoid stale mappings.
- Monitor domain ownership on explorers like [tonscan collection 1](https://tonscan.org/collection/EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz) to prevent squatting or expired records that affect your integration.

## Security Considerations
- Validate resolver contract code before trusting records to prevent spoofing.
- Use multisignature wallets for domain ownership to protect high-value domains.
- Implement off-chain monitoring for unauthorized resolver changes and rotate secrets when necessary.

## Further Resources
- [TON DNS Contracts](https://github.com/ton-blockchain/dns-contract)
- [TON DNS Subresolver Guidelines](https://docs.ton.org/v3/guidelines/web3/ton-dns/subresolvers)
- [TEP-81 DNS Standard](https://github.com/ton-blockchain/TEPs/blob/master/text/0081-dns-standard.md)
