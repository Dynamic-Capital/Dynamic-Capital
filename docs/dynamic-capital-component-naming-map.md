# Dynamic Capital Component Naming Map

## Purpose

This reference consolidates the short names, full component names, and primary
responsibilities that appear across the Dynamic Capital ecosystem. Use it when
you need a quick lookup for protocol discussions, documentation, or cross-team
alignment.

- **Scope** — Covers protocol, intelligence, outreach, frontend, and
  regenerative subsystems that regularly appear in roadmap and architecture
  briefs.
- **Usage** — Link to this map from feature specs, onboarding decks, or
  governance proposals so contributors have a shared vocabulary.

> 💡 **Tip:** Pair this glossary with the visual protocol diagrams in
> `dynamic_ecosystem/` to give stakeholders both textual and spatial context for
> each component.

## Core Protocol & Tokenomics

| Short Name | Full Name                  | Purpose                                                |
| ---------- | -------------------------- | ------------------------------------------------------ |
| `DCT`      | Dynamic Capital Token      | Main token for burns, buybacks, and pricing sync.      |
| `DCM`      | Dynamic Core Module        | Central logic for trading, mentorship, and governance. |
| `DCG`      | Dynamic Capital Governance | Voting, proposals, and ethics enforcement.             |
| `DCP`      | Dynamic Capital Pricing    | Token pricing sync with AGI Oracle.                    |

## Intelligence & Scoring

| Short Name | Full Name               | Purpose                                                |
| ---------- | ----------------------- | ------------------------------------------------------ |
| `AGI-O`    | AGI Intelligence Oracle | Scores mentorship, trading accuracy, and engagement.   |
| `AGI-R`    | AGI Resonance Layer     | Encodes intelligence growth as wavelength/phase logic. |
| `AGI-S`    | AGI Signal Sync         | Syncs signals with scoring and burn triggers.          |
| `AGI-M`    | AGI Mentorship Index    | Tracks mentor impact and community feedback.           |

## Telegram & TON Integration

| Short Name | Full Name           | Purpose                                                |
| ---------- | ------------------- | ------------------------------------------------------ |
| `TON-OB`   | TON Onboarding      | Telegram bot + mini app onboarding flow.               |
| `TON-V`    | TON Verification    | Payment and identity verification via smart contracts. |
| `TON-SC`   | TON Smart Contracts | DCT-linked contracts for automation and compliance.    |
| `TON-MA`   | TON Mini App        | GUI for onboarding, signals, and mentorship access.    |

## Outreach & Automation

| Short Name   | Full Name              | Purpose                                                 |
| ------------ | ---------------------- | ------------------------------------------------------- |
| `DC-DRIP`    | Dynamic Drip Engine    | Cold mail and drip campaign logic with reply detection. |
| `DC-COMPLY`  | Compliance Logic       | Ensures outreach meets legal and ethical standards.     |
| `DC-API`     | Outreach API Layer     | Supabase + Gmail API integration for automation.        |
| `DC-RESPOND` | Reply Detection Module | Flags replies and triggers next steps in campaigns.     |

## GUI & Frontend Sync

| Short Name | Full Name        | Purpose                                          |
| ---------- | ---------------- | ------------------------------------------------ |
| `DC-GUI`   | Dynamic GUI Sync | Unified frontend for mini app and static site.   |
| `DC-FRONT` | Frontend Layer   | React + Tailwind + Framer Motion components.     |
| `DC-VIEW`  | TradingView Sync | Embeds charts and signals into mentorship flows. |

## Regenerative & Biological Layers

| Short Name | Full Name           | Purpose                                                    |
| ---------- | ------------------- | ---------------------------------------------------------- |
| `DC-CELL`  | Protocol Cell Layer | Biological metaphor for modular intelligence growth.       |
| `DC-BIO`   | Bio-Aware Modules   | Energy-aware, regenerative design logic.                   |
| `DC-MAP`   | Living Protocol Map | Visualizes sync between market, AGI, and community layers. |

## Next Steps

- Add diagrams or sequence maps that visualize interactions between adjacent
  components when presenting to stakeholders.
- Embed this table into README files or dashboards that need a lightweight
  glossary for DCT and TON initiatives.
- Extend the map with ownership metadata (e.g. maintainer squad, Slack channels,
  or Notion docs) to accelerate cross-team handoffs.

## README Snippet

Include the following excerpt in team-specific READMEs to highlight how the
modules connect back to the broader ecosystem:

```md
## Dynamic Capital Touchpoints

| Layer            | Component | Quick Purpose                                           |
| ---------------- | --------- | ------------------------------------------------------- |
| Tokenomics       | DCT       | Drives burns, buybacks, and market-pricing alignment.   |
| Intelligence     | AGI-O     | Scores mentorship accuracy and trading performance.     |
| Outreach         | DC-DRIP   | Automates cold outreach with compliance guardrails.     |
| Frontend & TON   | TON-MA    | Surfaces onboarding, signals, and mentorship workflows. |
| Regenerative Map | DC-MAP    | Visualizes sync between market, AGI, and community.     |
```

## Schema Tags

When instrumenting Supabase tables or telemetry events, reuse the following
schema tags to maintain consistent naming across services:

```yaml
components:
  - key: DCT
    tags: [tokenomics, pricing, burns]
  - key: DCM
    tags: [core-logic, governance, mentorship]
  - key: AGI-O
    tags: [intelligence, scoring, oracle]
  - key: TON-MA
    tags: [frontend, ton, onboarding]
  - key: DC-DRIP
    tags: [outreach, automation, compliance]
  - key: DC-MAP
    tags: [visualization, regenerative, ecosystem]
```
