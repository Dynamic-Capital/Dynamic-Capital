# Exness Partnership Integration Playbook

This playbook maps the Exness Introducing Broker (IB) or white-label opportunity
onto the Dynamic Capital stack so you can move from the first outreach email to
measurable trading revenue.

## 1. Establish the partner relationship

1. **Qualify the engagement.** Document Exness' payout tiers, geo restrictions,
   and compliance requirements alongside your local obligations (e.g., Maldivian
   financial rules). Decide whether the IB or white-label path better matches
   your operational capacity.
2. **Request program assets.** Secure the Exness IB tracking link(s), branding
   guidelines, and any co-marketing materials you are permitted to reuse.
3. **Mirror terms in Dynamic Capital.** Capture the commercial basics—commission
   rate, eligible products, minimum deposit—in Supabase config tables or
   internal docs so everyone onboarding traders can reference the same facts.

## 2. Wire Exness into referral and promo flows

1. **Generate traceable Telegram entry points.** Issue trader-specific deep
   links with the `referral-link` edge function so every Exness campaign click
   resolves to `https://t.me/<bot>?startapp=ref_<id>` and is tied to a Telegram
   user ID on first
   launch.【F:supabase/functions/referral-link/index.ts†L7-L23】【F:docs/PHASE_08_GROWTH.md†L4-L12】
2. **Bundle promos with partner perks.** When you offer Exness-focused
   onboarding bonuses, run validation through `promo-validate` and redemption
   through `promo-redeem` so discounts, final checkout amounts, and usage
   analytics land in Supabase
   automatically.【F:supabase/functions/promo-validate/index.ts†L12-L82】【F:supabase/functions/promo-redeem/index.ts†L1-L86】【F:docs/PHASE_08_GROWTH.md†L4-L12】
3. **Log the funnel end to end.** Call `funnel-track` for IB steps (e.g.,
   "Clicked Exness CTA", "Completed Exness deposit") and feed web sessions into
   `web-app-analytics` so conversion tracking captures promo codes, plan IDs,
   and UTM tags for every referred
   trader.【F:supabase/functions/funnel-track/index.ts†L7-L34】【F:supabase/functions/web-app-analytics/index.ts†L1-L118】【F:docs/PHASE_08_GROWTH.md†L14-L20】

## 3. Surface the Exness CTA in the Telegram bot and mini app

1. **Refresh the welcome carousel.** Update the `bot_content` entries (e.g.,
   `welcome_message`, `miniapp_button_text`) so the main menu highlights Exness,
   leveraging the cached content helpers that pull active records from Supabase
   without redeploying
   code.【F:supabase/functions/_shared/config.ts†L163-L200】【F:supabase/functions/telegram-bot/index.ts†L827-L870】
2. **Align mini app copy.** Use the marketing components' `CONTENT_BATCH`
   requests to serve Exness messaging—CTA headline, trust signals, button
   labels—directly from the same `bot_content` keys, keeping Telegram and web
   touchpoints in
   sync.【F:apps/web/components/landing/CTASection.tsx†L18-L66】【F:supabase/functions/content-batch/index.ts†L1-L68】
3. **Expose referral rewards.** Keep the mini app profile section and plan
   selection screens pointed at the partner narrative so traders see Exness
   incentives right where they manage their Dynamic Capital
   subscription.【F:docs/PHASE_08_GROWTH.md†L22-L24】

## 4. Run education and retention loops

1. **Schedule partner drips.** Queue IB webinars, market updates, or deposit
   reminders via `broadcast-dispatch`; the dispatcher batches Telegram sends,
   respects rate limits, and records delivery stats so you can iterate on
   messaging
   cadence.【F:supabase/functions/broadcast-dispatch/index.ts†L1-L104】【F:docs/PHASE_08_GROWTH.md†L26-L32】
2. **Measure engagement.** Combine `broadcast` delivery metrics with
   `funnel-track` steps and `web-app-analytics` events to identify which assets
   move traders from interest to funded accounts. Close the loop by tagging
   Exness-specific promos in your analytics dashboards.
3. **Feed learnings back into content.** Because both the bot and site read from
   `bot_content`, you can adjust scripts, FAQs, or support replies for Exness
   cohorts without redeploying the bot—just update the relevant keys in
   Supabase.【F:supabase/functions/_shared/config.ts†L163-L200】【F:supabase/functions/telegram-bot/index.ts†L827-L870】【F:apps/web/components/landing/CTASection.tsx†L18-L66】

## 5. Choose the monetization path deliberately

1. **Introducing Broker (IB).** Prioritize speed: lean on referral deep links,
   promo incentives, and broadcast education to drive trade volume, then
   reconcile Exness payout reports with Supabase conversion data to monitor
   lifetime value.
2. **White-label solution.** Scope the additional lift—KYC, client servicing,
   platform customization—and decide which Dynamic Capital surfaces (bot menus,
   mini app modules, marketing site) need Exness branding versus native copy.
   Use `CONTENT_BATCH`-backed sections to toggle between offers quickly during
   pilot
   phases.【F:apps/web/components/landing/CTASection.tsx†L18-L66】【F:supabase/functions/content-batch/index.ts†L1-L68】

## 6. Compliance and governance checkpoints

1. **Embed legal review.** Before launch, have counsel vet your messaging,
   referral terms, and onboarding scripts against Maldivian regulations,
   especially for financial promotions.
2. **Audit tracking data.** Confirm that the analytics captured in Supabase
   (promo usage, funnel steps, conversion events) align with the disclosures in
   your privacy policy and Exness' partner agreement.
3. **Plan support escalation.** Document how traders escalate Exness-specific
   issues (account verification, trade disputes) and keep those pathways visible
   in `bot_content` so the support CTA routes users
   correctly.【F:supabase/functions/telegram-bot/index.ts†L827-L870】

Following these steps keeps your partnership launch grounded in Dynamic
Capital's existing automation—referrals, promos, broadcasts, and analytics—while
giving Growth and Compliance the levers they need to iterate without extra
deployments.
