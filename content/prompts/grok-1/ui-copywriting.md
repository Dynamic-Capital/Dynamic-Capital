# UI Copywriting Prompt Template (Grok-1)

## Objective
Draft empathetic, compliance-safe copy for Telegram Mini App modules and broadcast cards without deviating from Dynamic Capital's voice.

## Required Inputs
1. **Module Definition** – Component or card ID plus layout constraints (character limit, CTA labels).
2. **Audience Segment** – Link to the relevant CRM or Supabase segment description.
3. **Current Tone Guide** – Paste excerpts from `content/prompts/shared/tone.md` or brand docs.
4. **Compliance Checklist** – Include the applicable bullets from `docs/compliance/disclosures.md`.

## Prompt Skeleton
```
You are shaping customer-facing copy for Dynamic Capital.
- Surface: <Mini App module | Telegram broadcast>
- Audience segment: <details>
- Desired outcome: <conversion | education | retention>
- Guardrails: <disclosures, disclaimers, tone requirements>

Deliverables:
1. Primary headline (<= 60 characters).
2. Supporting body copy (<= 220 characters) with one clear CTA.
3. 2-button CTA labels and destinations.
4. Mandatory disclaimer referencing the correct regulatory citation.

Return JSON with keys `headline`, `body`, `ctas` (array of `{label, action}`), and `disclaimer`. Keep formatting production ready.
```

## Usage Notes
- Validate CTA actions against `apps/web/app/telegram/routes.ts` before shipping.
- If Grok recommends a new module, cross-check with `apps/web/app/telegram/modules/registry.ts` and note follow-up work.
- Store approved copy variants under `content/prompts/grok-1/ui-history/` with metadata for A/B experiments.
