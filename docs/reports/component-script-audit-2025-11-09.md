# Component & Script Hygiene Audit — 2025-11-09

## Scope & Approach

- **Objective:** Identify missing integrations, dead React components, dormant
  scripts, and reuse opportunities across the Dynamic Capital web app and
  supporting tooling.
- **Methodology:**
  - Pattern search via `rg` to locate components and scripts without downstream
    imports or runtime entry points.
  - Manual inspection of candidate files to confirm export signatures and
    runtime dependencies.
  - Cross-reference with workspace scripts (`package.json`, `deno.json`) and
    documentation to determine orchestration coverage.
- **Source Material:** Dynamic Capital monorepo (apps/web, scripts, top-level
  automation utilities) as of 2025-11-09.

## Findings

### Dormant React components (not wired into any route)

| Asset                                                                                                   | Evidence                                                                                                                                                                                | Impact                                                                                                                    | Recommendation                                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/components/welcome/AnimatedWelcome.tsx`                                                       | Component is exported but only referenced in its own file and sibling mini-app variant.【98ae3e†L1-L9】【F:apps/web/components/welcome/AnimatedWelcome.tsx†L1-L160】                    | Supabase-backed welcome copy never renders in production, so content pipeline is effectively dark.                        | Either mount within the marketing landing page or remove in favor of `DynamicChatLanding` to avoid stale dependencies.         |
| `apps/web/components/welcome/WelcomeMessage.tsx` & `apps/web/components/admin/WelcomeMessageEditor.tsx` | Both files self-reference the “welcome message” flow but have no consuming route or admin surface imports.【0fdfb5†L1-L23】【F:apps/web/components/welcome/WelcomeMessage.tsx†L1-L200】 | Duplicate Supabase fetch/checkout logic bloats bundle and diverges from current mini-app checkout.                        | Consolidate Supabase plan logic into a shared service and either surface the editor in `/admin` or archive the pair.           |
| `apps/web/components/miniapp/AnimatedWelcomeMini.tsx`                                                   | No imports outside of its declaration file.【13d0bb†L1-L5】【F:apps/web/components/miniapp/AnimatedWelcomeMini.tsx†L1-L200】                                                            | Idle animation code adds maintenance overhead but never ships with the mini-app tabs.                                     | Fold its motion patterns into `HomeLanding` if animated onboarding is still desired; otherwise delete to reduce bundle weight. |
| `apps/web/components/miniapp/VipLaunchPromoPopup.tsx`                                                   | Only defined, never imported by any mini-app container.【b94f84†L1-L2】【F:apps/web/components/miniapp/VipLaunchPromoPopup.tsx†L1-L149】                                                | Promotional workflow (promo code toast + dialog) is disconnected from checkout, so marketing cannot launch the VIP offer. | Reuse the dialog from within `PaymentOptions` or remove to eliminate duplicate toast dependencies.                             |

```bash
rg "AnimatedWelcome" -g"*.tsx" -g"*.ts"
rg "WelcomeMessage" -g"*.tsx" -g"*.ts"
rg "AnimatedWelcomeMini" -g"*.tsx" -g"*.ts"
rg "VipLaunchPromoPopup" -g"*.tsx" -g"*.ts"
```

### Duplicate toast hooks causing inconsistent UX

- `apps/web/hooks/useToast.ts` (ShadCN reducer-based implementation) co-exists
  with `apps/web/hooks/use-toast.ts` (simpler local state
  hook).【F:apps/web/hooks/useToast.ts†L1-L192】【F:apps/web/hooks/use-toast.ts†L1-L45】
- Admin and shared surfaces import `@/hooks/useToast`, whereas mini-app
  components import `@/hooks/use-toast`, leading to two divergent toast state
  containers in the same bundle.【844be2†L1-L45】【de1ec8†L1-L4】
- **Recommendation:** Pick one implementation (ideally the reducer-based hook
  powering the global toaster) and update mini-app consumers to import it.
  Remove the redundant hook to prevent inconsistent dismissal behavior.

### Dormant or manual-only scripts

| Script                                                              | Evidence                                                                                                                                                        | Risk                                                                                                          | Recommendation                                                                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `scripts/audit/run.sh` + companions (`report.mjs`, `read_meta.mjs`) | Only referenced within the script bundle itself and historical inventory docs; no npm/deno task wires them up.【ceecda†L1-L2】【f4e7b0†L1-L2】【13c2f7†L1-L17】 | Without an npm entry point the audit suite quietly rots and requires manual invocation with bespoke env vars. | Promote into an npm script (e.g., `npm run audit:metadata`) or archive the folder to avoid confusion.                      |
| `collect_tradingview.py`                                            | Documented in README/env docs but absent from workflows or package scripts.【4ecd3f†L1-L17】【7cebb1†L1-L1】                                                    | Analyst insight ingestion is manual-only, so scheduled runs can silently fail.                                | Add a GitHub Actions workflow or Supabase Edge job invoking the script, or deprecate and document replacement ingest path. |

### Missing integration paths

- The welcome message content pipeline (edge function `CONTENT_BATCH`) has no UI
  entrypoint, so editorial updates are invisible despite Supabase fetch logic in
  the dormant
  components.【98ae3e†L5-L9】【F:apps/web/components/welcome/AnimatedWelcome.tsx†L85-L118】
- VIP promo dialog never reaches `PaymentOptions`, so marketing cannot trigger
  campaign copy despite completed dialog
  UI.【F:apps/web/components/miniapp/VipLaunchPromoPopup.tsx†L21-L149】

### Reuse opportunities & next steps

1. **Rationalize welcome experience:** Mount `AnimatedWelcome` or
   `WelcomeMessage` within `apps/web/app/page.tsx` to reuse existing Supabase
   content, or remove to prevent drift.【F:apps/web/app/page.tsx†L1-L5】
2. **Unify toast notifications:** Update mini-app components to consume the
   canonical hook and delete `use-toast.ts` to reduce duplicated state
   machines.【F:apps/web/components/miniapp/VipLaunchPromoPopup.tsx†L1-L27】【F:apps/web/hooks/useToast.ts†L1-L192】
3. **Automate audits and ingest scripts:** Surface `scripts/audit` utilities and
   `collect_tradingview.py` through npm tasks or CI jobs so operators know how
   to execute them without spelunking.【ceecda†L1-L2】【4ecd3f†L1-L17】

## Suggested remediation plan

1. **Week 1:** Delete or reintegrate dormant components, starting with the
   welcome suite and VIP promo popup, after stakeholder review.
2. **Week 2:** Consolidate toast hooks, ship regression tests around the shared
   `useToast`, and update Storybook/Playwright coverage if applicable.
3. **Week 3:** Wire the audit/report scripts and TradingView collector into CI
   (scheduled job or manual workflow) with `.env` guardrails, documenting in
   `docs/runbooks` for operator reuse.

---

_Prepared by Quantum Finance AGI on 2025-11-09 to restore component hygiene and
maximize reuse of existing tooling._
