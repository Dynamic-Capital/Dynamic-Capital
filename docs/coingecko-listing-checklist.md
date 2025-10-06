# CoinGecko Listing Readiness Checklist

Use this checklist to confirm Dynamic Capital has everything CoinGecko requires
before submitting the token listing request. Gather verifiable evidence
(screenshots, explorer URLs, signed PDFs) for each item so the application
reviewer can validate details without back-and-forth emails.

> [!TIP]
> Maintain a shared folder that mirrors this checklist. Store supporting
> evidence, form drafts, and correspondence in sub-folders that match the
> section titles below so the operations team can hand off the package quickly.

## Readiness snapshot

Track the latest assessment for each domain below. Use the emoji legend to keep
status changes legible in reviews: ✅ Completed · 🟡 In progress · 🔴 Blocked ·
⬜ Not started.

| Category                          | Status | Owner | Notes                                        |
| --------------------------------- | ------ | ----- | -------------------------------------------- |
| Application prerequisites         | ⬜     |       | Gather explorer links & ownership statements |
| Project identity & communications | ⬜     |       | Confirm domains, socials, and PR log         |
| Token economics & documentation   | ⬜     |       | Finalize allocation table + risk review      |
| Market & trading data             | ⬜     |       | Compile exchange evidence + volume snapshots |
| Security, audits & compliance     | ⬜     |       | Collect audit PDFs & compliance attestations |
| Submission package & evidence     | ⬜     |       | Assemble zipped archive and form draft       |
| Post-submission follow-up         | ⬜     |       | Assign owners for inbox monitoring           |

## 1. Application prerequisites

| Status | Requirement                                                                                                                                                                                                                                      | Evidence to capture                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| ⬜     | **Contract(s) verified on-chain** – Publish the token source code on each chain’s official block explorer (e.g., Etherscan, BscScan, TON viewer) and confirm the contract address matches the whitepaper and documentation.                      | Explorer verification pages, contract source hash, screenshot of verification status |
| ⬜     | **Immutable token parameters recorded** – Document name, symbol, decimals, total supply, and mint/burn permissions. Capture screenshots from the explorer plus a JSON export from the deployment scripts.                                        | Parameter snapshot PDF/PNG, deployment JSON export                                   |
| ⬜     | **Circulating supply methodology documented** – Provide a reproducible calculation that excludes team, treasury, vesting, or locked addresses. Include on-chain proofs (multisig addresses, vesting contracts) and a dated CSV showing balances. | Circulating supply spreadsheet + methodology doc                                     |
| ⬜     | **Bridges or wrapped assets disclosed** – If the token exists on multiple chains, list canonical bridges, wrapped contract addresses, and the entity managing each bridge.                                                                       | Bridge inventory table with maintainer contacts                                      |
| ⬜     | **Smart-contract ownership & control statements** – Outline admin keys, multisig owners, and timelock delays. If ownership is renounced, link the transaction hash that executed the renounce call.                                              | Ownership statement, multisig signer roster, renounce TX hash                        |

## 2. Project identity & communications

| Status | Requirement                                                                                                                                                                                                                  | Evidence to capture                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| ⬜     | **Official domains live & secured** – Primary marketing site and dashboard respond over HTTPS, include up-to-date branding, and reference the token contract exactly as listed above.                                        | HTTPS screenshots, SSL report, contract references |
| ⬜     | **Whitepaper / litepaper hosted** – Provide a stable URL (or uploaded PDF) describing token utility, supply schedule, and roadmap.                                                                                           | Final PDF + checksum, hosting URL                  |
| ⬜     | **Support & compliance contacts** – Dedicated email (e.g., `listings@dynamic.capital`) monitored by the listings team plus an escalation contact for urgent CoinGecko questions.                                             | Shared mailbox credentials or routing SOP          |
| ⬜     | **Active social channels** – Twitter/X, Telegram, Discord, and any other official community surfaces publicly linked from the website. Collect follower counts and engagement metrics from the past 30 days.                 | Social profile links, analytics export             |
| ⬜     | **Press & partnerships log** – Maintain a list of notable announcements, exchange launches, or integrations with publication dates and URLs. CoinGecko reviewers often cross-check brand legitimacy against public coverage. | Press tracker spreadsheet, announcement archive    |
| ⬜     | **Editorial standards verified** – Review the [Dynamic Capital Content Editorial Guidelines](./dynamic-capital-content-editorial-guidelines.md) so every submission asset, disclaimer, and narrative aligns with approved tone and fact-checking requirements. | Checklist confirmation noted in submission brief   |

## 3. Token economics & documentation

| Status | Requirement                                                                                                                                                                                       | Evidence to capture                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| ⬜     | **Token allocation table finalized** – Provide percentages and token counts for team, investors, community, liquidity, ecosystem, and reserves. Include vesting schedules and cliff dates.        | Tokenomics slide, CSV with allocations and cliffs |
| ⬜     | **Lockup proofs** – Link to on-chain lockers, staking contracts, or custodial attestations for locked allocations. Capture timestamps that show lock durations exceed CoinGecko’s review horizon. | Locker TX hashes, custodial attestations          |
| ⬜     | **Treasury policy summary** – Document how treasury funds are governed, with links to multisig signers or DAO proposals where applicable.                                                         | Governance policy doc, multisig signer list       |
| ⬜     | **Utility & revenue descriptions** – Summarize real product usage (e.g., bot subscription tiers, revenue share) and note where token utility intersects with regulatory disclosures.              | Product metrics snapshot, utility narrative       |
| ⬜     | **Risk disclaimers reviewed** – Ensure legal/compliance has approved any disclaimers in marketing materials and the submission form.                                                              | Legal approval email, disclaimer doc              |

## 4. Market & trading data

| Status | Requirement                                                                                                                                                                                                | Evidence to capture                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| ⬜     | **Supported exchanges verified** – Confirm the token trades on at least one CoinGecko-integrated exchange (CEX or DEX) with public APIs. Record trading pairs, ticker symbols, and integration status.     | Exchange listing confirmations, API endpoints |
| ⬜     | **Liquidity & volume snapshots** – Capture 24h volume, liquidity depth, and spread data from each exchange. Include DEX analytics links (e.g., Uniswap Info, PancakeSwap, STON.fi) or exchange dashboards. | Analytics screenshots, CSV exports            |
| ⬜     | **Market maker contacts** – If liquidity partners are engaged, document point-of-contact details and contractual terms relevant to public data disclosures.                                                | Contact roster, agreement summary             |
| ⬜     | **Price feed integrity checks** – Validate there are no major discrepancies across exchanges (±2% spread). Store screenshots or JSON exports to show parity at the time of submission.                     | Price comparison chart, API snapshots         |
| ⬜     | **Token ticker collision search** – Verify no live CoinGecko listings currently use the same ticker; if conflicts exist, prepare an alternative ticker or justification statement.                         | CoinGecko search results, contingency plan    |

## 5. Security, audits & compliance

| Status | Requirement                                                                                                                                                                          | Evidence to capture                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| ⬜     | **Smart contract audits** – Provide the latest security audit reports (PDF) with executive summaries, resolution status, and auditor contact information.                            | Audit PDFs, remediation tracker           |
| ⬜     | **Bug bounty / disclosure policy** – Link to a published responsible disclosure policy or bug bounty program that covers the token contract and associated infrastructure.           | Public disclosure page, bounty scope      |
| ⬜     | **KYC or team verification** – If applicable, include completed KYC attestations (e.g., CertiK KYC, exchange-level verification) or notarized documents proving key team identities. | Verification certificates, notarized docs |
| ⬜     | **Regulatory stance** – Document any legal opinions, registrations, or statements clarifying token classification in relevant jurisdictions.                                         | Legal opinions, filings                   |
| ⬜     | **Chain analytics monitoring** – Note the tooling (Nansen, TRM, Chainalysis) used to watch for illicit flows, plus escalation steps if alerts trigger during the review window.      | Monitoring playbook, tool access list     |

## 6. Submission package & evidence bundle

| Status | Requirement                                                                                                                                                                                | Evidence to capture                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| ⬜     | **High-resolution token icon** – 500×500 PNG or SVG with transparent background, along with a 200×200 fallback. Confirm file names follow CoinGecko’s naming convention (`symbol.png`).    | Final assets stored in `/brand/token/` |
| ⬜     | **Completed CoinGecko form draft** – Fill every required field in a shared document before entering data into the live form. Peer review the answers for accuracy and consistent branding. | Draft form doc, peer review notes      |
| ⬜     | **Exchange trade links** – Prepare direct URLs to token trading pairs (both web UI and API endpoints) requested in the form.                                                               | URL inventory, API sample responses    |
| ⬜     | **Explorer references** – Collect links to contract verification, top holder lists, and supply analytics for each chain.                                                                   | Explorer URL list, top holders export  |
| ⬜     | **Evidence archive packaged** – Zip the shared folder with all proofs, label it `coingecko-readiness-<YYYYMMDD>.zip`, and store it in the internal compliance drive.                       | ZIP archive path, checksum             |

## 7. Post-submission follow-up

| Status | Requirement                                                                                                                                                   | Evidence to capture                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| ⬜     | **Monitor support inbox** – Assign an owner to respond to CoinGecko requests within one business day.                                                         | Support rotation calendar, SLA acknowledgement |
| ⬜     | **Track status updates** – Log submission date, ticket number, and follow-up timestamps in the listings tracker (Notion/Jira/Sheets).                         | Tracker entry screenshot, timestamp log        |
| ⬜     | **Prepare announcement plan** – Draft social copy and blog posts announcing the listing, contingent on approval.                                              | Announcement doc, approval checklist           |
| ⬜     | **Set up data monitoring** – Once listed, verify prices, volume, and supply metrics match internal dashboards. Plan corrective steps if discrepancies appear. | Monitoring dashboard link, alert rules         |

### Submission data sheet template

Use this template to collect all required form entries and cross-check them
before submission:

```markdown
## Project overview

- Token name:
- Symbol (ticker):
- Contract address(es):
- Chain(s):
- Official website:
- Whitepaper:
- Support email:

## Token metrics

- Total supply:
- Circulating supply calculation:
- Max supply (if capped):
- Token standard:

## Markets

- Exchange 1: <name> — Pair: <symbol/quote> — API URL:
- Exchange 2: <optional> — Pair: <symbol/quote> — API URL:

## Documentation & security

- Audit report link:
- KYC / verification link:
- Bug bounty:
- Legal contact:
```

Keep this data sheet in sync with the evidence archive. Update both whenever
contracts, markets, or branding change so the team can re-submit quickly if
CoinGecko requests revisions.
