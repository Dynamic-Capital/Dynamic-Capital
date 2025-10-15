# Hallucination Guard Toolkit

## Overview

These scripts surface potential hallucinations introduced by AI-generated or
manual code changes. They focus on static TypeScript analysis to highlight
symbols, modules, and exports that the compiler cannot resolve—common markers of
hallucinated code paths.

## Usage

Run the consolidated scan from the repository root:

```
npm run hallucination:scan
```

Pass individual files to focus the analysis on staged or changed modules:

```
npm run hallucination:scan -- --file apps/web/components/tools/DynamicChat.tsx
```

Generate machine-readable output for CI pipelines or editor integrations:

```
npm run hallucination:scan -- --json > hallucination-report.json
```

## Interpretation Guidance

The report groups issues by category (missing module, undefined symbol, missing
export, etc.) and supplies remediation advice for each finding. Treat every
flagged diagnostic as a high-risk regression until the underlying reference is
verified against actual implementations or dependencies.

## Recommended Next Steps

- Integrate `npm run hallucination:scan` into local pre-commit checks and CI to
  block hallucinated references from merging.
- Extend the toolkit with language-specific scanners (for example Python or Go)
  following the same pattern when those surfaces become high-risk.
- Pair the scanner with review checklists that require a human confirmation of
  any newly introduced dependency or API surface.
