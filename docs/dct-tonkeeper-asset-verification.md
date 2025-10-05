# Dynamic Capital Token (DCT) Tonkeeper Asset Verification Playbook

## Purpose

Tonkeeper flags Dynamic Capital Token (DCT) balances as **Unverified** until the
project submits an asset listing request and the Tonkeeper team reviews the
supporting evidence. This playbook captures the artifacts and process required
to move DCT from the default unverified state to a verified asset inside
Tonkeeper.

## Submission prerequisites

Gather the following canonical references before contacting Tonkeeper. Each item
is tracked in source control so reviewers can confirm that the submission
matches the deployed jetton.

- Jetton master address:
  `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`. Source
  of truth:
  [`dynamic-capital-ton/contracts/jetton/metadata.json`].【F:dynamic-capital-ton/contracts/jetton/metadata.json†L1-L23】
- Token name, symbol, decimals, supply cap, description, official links, and
  image URL as published in the same metadata
  file.【F:dynamic-capital-ton/contracts/jetton/metadata.json†L1-L28】
- Governance and treasury structure from [`dynamic-capital-ton/config.yaml`]
  (operations multisig, guarded window, and cap
  controls).【F:dynamic-capital-ton/config.yaml†L1-L31】
- Public website references for Dynamic Capital Token, particularly
  `https://dynamic.capital/token` (Tonkeeper requests public-facing material to
  validate links).【F:apps/web/resources/token.ts†L182-L241】
- Proof of launch allocation: link to the genesis mint transaction hash on
  Tonviewer along with the allocation table excerpt from the
  whitepaper.【F:docs/dynamic-capital-ton-whitepaper.md†L34-L50】
- Contact details for the compliance / operations owner who can respond to
  follow-up questions (email, Telegram handle).

## Submission workflow

1. **Complete the Tonkeeper asset sheet.** Submit the Google Form linked from
   `https://tonkeeper.com/asset-listing` (or the latest support URL). Include
   the canonical metadata above, upload the project logo, and paste the jetton
   master address without formatting.
2. **Attach verification artifacts.** Tonkeeper typically accepts a PDF or drive
   folder containing:
   - Jetton metadata JSON exported directly from
     [`dynamic-capital-ton/contracts/jetton/metadata.json`].
   - Screenshots of Tonviewer showing the jetton master page, supply figures,
     and transaction hash for the genesis mint.
   - Governance documentation snippets proving the multisig / timelock controls.
3. **File a support ticket.** After submitting the form, open a ticket via
   `support@tonkeeper.com` (or the designated channel) linking to the form
   submission and attaching the evidence bundle. Record the ticket ID in the
   compliance tracker so the team can reference it during audits.
4. **Confirm listing propagation.** Tonkeeper’s asset registry caches responses.
   Once support confirms approval, wait for the next registry refresh and then
   reload the wallet. The Unverified banner should disappear when the registry
   publishes the entry.

## Follow-up checks

- Monitor the ticket status weekly until Tonkeeper confirms completion.
- Document the ticket ID, approval date, and responding agent in the compliance
  archive.
- Update the DCT verification evidence pack with before/after wallet screenshots
  once the banner disappears.
- If Tonkeeper requests additional information (legal entity certificate, audit
  results, etc.), add those artifacts to this playbook and source control for
  repeatability.

## Quick reference data

| Field                  | Value                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Jetton master address  | `0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`                                                                |
| Name / symbol          | `Dynamic Capital Token` / `DCT`                                                                                                     |
| Decimals               | `9`                                                                                                                                 |
| Max supply             | `100000000`                                                                                                                         |
| Official site          | `https://dynamic.capital`                                                                                                           |
| Token hub page         | `https://dynamic.capital/token`                                                                                                     |
| Explorer canonical URL | `https://tonviewer.com/jetton/0:d29b3e11ac30451be4f58b3c1527bab576902ad662532eb2b0c8c6098a0e96c7`                                   |
| Governance reference   | `dynamic-capital-ton/config.yaml` guarded window and operations multisig configuration.【F:dynamic-capital-ton/config.yaml†L1-L31】 |

Store completed submissions and approvals alongside this document so future
reviews can cite the exact packet Tonkeeper accepted.
