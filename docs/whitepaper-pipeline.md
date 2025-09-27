# Dynamic Whitepaper Pipeline

Dynamic Capital whitepapers are now compiled from structured JSON definitions so
the protocol collateral stays synchronized with tokenomics changes. This
document explains the workflow for maintaining those sources, adding new
collateral, and regenerating the Markdown exports that live in `docs/`.

## Directory Layout

- `content/whitepapers/` — JSON configuration files describing each whitepaper.
- `scripts/whitepaper/generate.ts` — TypeScript generator that converts
  configurations into Markdown.
- `docs/dynamic-capital-ton-whitepaper.md` — Generated output for the DCT token
  (regenerate instead of editing directly).

## Configuration Schema

Each JSON file follows a structured schema covering the token profile, incentive
programs, and roadmap:

- `slug`, `outputPath`, `title` — identifies the document and final output
  location.
- `token` — name, symbol, network, and hard-capped supply for context headers.
- `abstract`, `overview`, `tokenomics` — paragraph arrays rendered as prose
  sections.
- `priceStrategy` — grouped bullet lists for launch mechanics, secondary
  support, long-term levers, governance, and monitoring.
- `distributionTable`, `saleRounds` — tabular definitions for supply allocation
  and raise milestones.
- `utilityPrograms`, `treasury`, `governance`, `reporting` — structured bullet
  lists that roll up into dedicated sections.
- `roadmap`, `compliance`, `glossary` — phase plans, assurance notes, and
  reference definitions.

Use plural arrays for bullets and tables so the generator can add or remove rows
without manual formatting.

## Adding or Updating a Whitepaper

1. Create or edit a configuration file in `content/whitepapers/` (use `dct.json`
   as a template).
2. Run the generator:

   ```bash
   npm run docs:whitepapers            # rebuild every whitepaper
   npm run docs:whitepapers -- slug    # optional: only rebuild a specific slug
   ```

3. Review the regenerated Markdown in `docs/` to confirm the changes.
4. Update dependent checklists (e.g., `docs/tonstarter/tokenomics-tables.md`) if
   supply values shifted.

> **Reminder:** Do not hand-edit `docs/dynamic-capital-ton-whitepaper.md`;
> changes will be overwritten the next time the generator runs.

## Quality Checklist

- Validate JSON syntax before committing
  (`jq . content/whitepapers/<slug>.json`).
- Ensure numeric totals (supply, allocations) continue to align with treasury
  models.
- Run `npm run format` so Deno reformats the generated Markdown consistently.
- Include supporting evidence links or on-chain references in the JSON notes
  where applicable.

Maintaining whitepapers through code review keeps investor-facing collateral
auditable, versioned, and aligned with treasury automation.
