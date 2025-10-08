# Duplicated Asset Remediation Plan — 2025-11-10

## Objectives

- Merge or retire duplicated UI components, hooks, and scripts highlighted in
  the November 2025 hygiene audits.
- Improve runtime performance by eliminating redundant bundles and dead code
  paths.
- Reduce operational risk by promoting scripted workflows into observable,
  automated entry points.
- Increase visibility by documenting ownership, telemetry, and follow-up checks
  for the remediated areas.

## Inputs & Evidence

- Component and script duplication inventory captured in the **Component &
  Script Hygiene Audit — 2025-11-09** report.
- Missing artifact and workflow coverage gaps recorded in the **Missing Artifact
  Audit — 2025-11-08** report.
- Source tree review of the duplicated assets (`apps/web/components/welcome/*`,
  `apps/web/components/miniapp/*`, `apps/web/hooks/useToast.ts`,
  `apps/web/hooks/use-toast.ts`, `scripts/audit/*`, `collect_tradingview.py`).

## Guiding Principles

1. **Prefer consolidation over deletion** when functionality is still relevant;
   otherwise archive with clear changelog entries.
2. **Introduce telemetry and CI hooks** around any resurrected flows to prevent
   silent regressions.
3. **Document ownership** for each consolidated module and script with updated
   runbooks.
4. **Measure before/after bundle size and CI runtime** to confirm
   performance/security improvements.

## Remediation Roadmap

### 1. Unify Toast Notification Hooks (Week 1)

1. Inventory all imports of `@/hooks/useToast` and `@/hooks/use-toast` via `rg`.
2. Promote `apps/web/hooks/useToast.ts` as the canonical implementation and
   extend it to cover any mini-app behaviors still required.
3. Update mini-app consumers to import the canonical hook; delete
   `apps/web/hooks/use-toast.ts`.
4. Add regression tests (unit + Playwright smoke) for toast dismissal and
   stacking behavior.
5. Capture before/after bundle size deltas in the Webpack/Next.js stats to
   validate performance gains.

### 2. Consolidate Welcome Experience Components (Week 1-2)

1. Review `apps/web/components/welcome/AnimatedWelcome.tsx` and
   `.../WelcomeMessage.tsx` alongside
   `apps/web/components/miniapp/AnimatedWelcomeMini.tsx` to design a single
   reusable welcome surface.
2. Extract shared Supabase content fetch logic into a service module under
   `apps/web/lib/welcome.ts`.
3. Wire the consolidated component into the home route (`apps/web/app/page.tsx`)
   or document deprecation with stakeholder approval.
4. Remove unused variants after confirming parity; capture screenshots and
   Storybook stories for the canonical component.
5. Enable logging/analytics events when the welcome component renders to improve
   visibility.

### 3. Reconcile VIP Promo Popup Assets (Week 2)

1. Audit `apps/web/components/miniapp/VipLaunchPromoPopup.tsx` against current
   checkout flows.
2. If still relevant, integrate dialog/toast logic into `PaymentOptions` and
   ensure the marketing toggle lives in configuration (Supabase/feature flags).
3. Remove duplicated toast utilities introduced solely for the popup once Step 1
   completes.
4. Add e2e coverage verifying promo activation, dismissal, and analytics
   beacons.

### 4. Promote Dormant Automation Scripts (Week 2-3)

1. Assess `scripts/audit/run.sh`, `report.mjs`, and `read_meta.mjs` for
   currency; convert to a single Deno/Node entry point registered under
   `package.json` (e.g., `npm run audit:metadata`).
2. Add `.env.example` variables and secure secret handling for any credentials.
3. Create a GitHub Actions workflow to execute the audit on a schedule and
   publish artifacts to `docs/reports/`.
4. For `collect_tradingview.py`, either containerize and schedule via GitHub
   Actions/Supabase Edge or document its deprecation with a replacement
   ingestion path.
5. Instrument logging and alerting for failure states to raise operator
   visibility.

### 5. Close Missing Artifact Gaps (Week 3)

1. Re-run the November 8 artifact checklist and confirm `.out` workflow
   artefacts, OneDrive dumps, and XAUUSD metadata are generated.
2. Update runbooks with storage locations and retention policies.
3. Ensure CI uploads artefacts to an auditable bucket (S3/Supabase storage) with
   lifecycle policies for security.
4. Track verification status in a shared issue tracker (e.g., GitHub Projects)
   to maintain accountability.

### 6. Security & Observability Hardening (Continuous)

- Conduct dependency review on the touched packages using `npm audit` and
  `pnpm audit` equivalents; file CVE remediations immediately.
- Enable lint rules to flag duplicate component exports and unused scripts
  during CI (`eslint-plugin-unused-imports`, custom lint rules for `/scripts`).
- Add Datadog/New Relic tracing (or existing stack) for the revived flows to
  surface latency/perf regressions.
- Document a quarterly review cadence to purge newly orphaned assets before they
  accumulate.

## Deliverables

- Pull requests consolidating the duplicated components/hooks/scripts with
  linked Jira tickets or GitHub issues.
- CI dashboards or workflow summaries demonstrating automated execution of the
  audit and ingestion scripts.
- Updated `docs/runbooks/*` entries detailing execution steps and ownership.
- A final post-remediation report comparing bundle sizes, CI runtimes, and
  security posture before vs. after the cleanup.

## Success Metrics

- **Performance:** ≥5% reduction in initial JavaScript bundle size and removal
  of unused component payloads.
- **Security:** Zero outstanding high-severity `npm audit` findings tied to the
  remediated areas.
- **Visibility:** All previously manual scripts now emit logs and alerts
  captured by the central observability stack.
- **Maintainability:** No duplicate toast hooks or dormant welcome/promo
  components remaining in the repository (verified via automated lint checks).

---

_Prepared by Quantum Finance AGI on 2025-11-10 to guide the consolidation of
duplicated assets and elevate project hygiene._
