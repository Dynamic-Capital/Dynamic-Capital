# UI & UX Scorecard

This scorecard translates key product experiences into measurable outcomes that
we can monitor now that analytics instrumentation is in place.

## Coverage Summary

| Experience                          | Primary Surfaces                             | Purpose                                    | Instrumentation Anchors                                                           | Core Metrics                                                                       |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Acquisition hero & quick navigation | Marketing landing (`MultiLlmLandingPage`)    | Drive visitors into gated product journeys | `hero_*` CTA events, `section_scroll_*`, `quick_menu_open`                        | CTA click-through rate, scroll initiation rate, menu engagement rate               |
| VIP membership packages             | Dynamic portfolio app (`VipPackagesSection`) | Convert prospects to plans and checkout    | `plan_view`, `plan_checkout_cta`, `plan_preview_payment`, `plans_*` fallback CTAs | Plan view-to-checkout start rate, checkout initiation per plan, fallback CTA usage |
| Theme adoption                      | Global UI toggle (`ThemeToggle`)             | Track comfort with light/dark/system modes | `theme_toggle` events                                                             | Theme preference distribution, resolved theme stability after toggle               |

## Metric Definitions

| Metric                           | Calculation                                                                   | Target / Guardrail                           | Notes                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| Hero CTA click-through rate      | `(hero_invest_now + hero_join_telegram + hero_learn_more) / hero_impressions` | ≥ 12% weekly                                 | Hero impressions derived from `page_view` for `/` with `theme` context. |
| Section scroll initiation rate   | `section_scroll_<anchor> / page_view`                                         | ≥ 35% to "academy" and "pricing" anchors     | Signals depth of content consumption.                                   |
| Quick menu engagement rate       | `quick_menu_open / page_view`                                                 | Monitor baseline, flag if < 5%               | Indicates discovery of secondary journeys.                              |
| Plan view-to-checkout start rate | `plan_checkout_cta / plan_view` (per plan)                                    | ≥ 25% for spotlighted plan, ≥ 15% for others | Use plan metadata captured in `interaction_data`.                       |
| Checkout initiation volume       | Sum of `plan_checkout_cta` events                                             | Track vs. forecast                           | Break down by `source` to tune placements.                              |
| Fallback CTA usage               | `plans_empty_*` + `plans_footer_*` events                                     | Should trend ↓ over time                     | High counts imply pricing gaps or data sync issues.                     |
| Theme preference distribution    | Share of `theme_toggle` events where `resolved_theme_after_toggle` = value    | Balance usage across themes                  | Watch for drop-offs caused by accessibility regressions.                |

## Reporting Cadence

- **Weekly:** Export analytics events to Supabase and refresh a Looker (or
  Tableau) board with the metrics above.
- **Monthly:** Review trends against activation targets and annotate significant
  UI launches.
- **Quarterly:** Pair the quantitative metrics with qualitative user interviews
  to validate UX hypotheses.

## Ownership & Actions

| Domain             | Owner               | Immediate Follow-ups                                                                            |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------- |
| Analytics pipeline | Growth Engineering  | Backfill one month of historical `page_view` events for `/` from server logs to seed baselines. |
| Marketing UX       | Design Systems Lead | A/B test hero CTA ordering if click-through stalls below 12% for two consecutive weeks.         |
| Product UX         | Portfolio PM        | Instrument checkout completion events in the next sprint to close the funnel measurement gap.   |

## Data Hygiene Checklist

1. Validate that `page_view` events include `theme` metadata for every render
   (verify via Supabase logs).
2. Confirm that `plan_view` and `plan_checkout_cta` events carry `plan_id`,
   `plan_name`, `price`, and `currency` fields.
3. Investigate any `ton_storage_status=FAIL` alerts from the nightly workflow
   before promoting new bundles.
4. Document any manual analytics backfills or data patching within the release
   runbook.

## Recommended Next Steps

- Automate Supabase exports into the BI warehouse so scorecard metrics refresh
  without manual CSV pulls.
- Introduce funnel completion tracking (checkout success, failed payments) to
  capture end-to-end conversion.
- Layer qualitative insights (support tickets, Telegram feedback) onto the
  scorecard each quarter to explain outliers.
