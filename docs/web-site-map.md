# Dynamic Capital Unified Site Map

Dynamic Capital guides first-time and seasoned investors through one coordinated journey that spans the responsive web app and the Telegram mini app. Each touchpoint uses minimalist layouts, confident tone, and concise CTAs so beginners always understand the next action.

## Unified Experience Matrix

| Journey stage | Experience | Web route & CTA | Telegram mini app route & CTA | Why it helps beginners |
| --- | --- | --- | --- | --- |
| Onboard & orient | Welcome launch pad | `/` → **Continue to Home** button reiterates the value promise beside social proof. | `/miniapp` → auto-redirect with matching hero copy and **Continue to Home** confirmation. | Sets expectations immediately and keeps the welcome story identical on every device. |
| Onboard & orient | Personalized home hub | `/investor` → **Explore Home** cards highlight top tasks and a quick-start checklist. | `/miniapp/home` → **Explore Home** cards tailored via Telegram authentication. | Keeps guidance familiar whether investors begin on web or Telegram. |
| Research & readiness | Fund transparency | `/token` → **Review Fund Metrics** button alongside plain-language charts on supply, utility, and allocation. | `/miniapp/fund` → **Review Fund Metrics** button above mirrored tokenomics visuals. | Explains token mechanics without jargon so investors can evaluate value quickly. |
| Research & readiness | Signal feed | `/investor` → signals tab with **Follow Signals** button near mentor commentary. | `/miniapp/signals` → **Follow Signals** button with live tips for interpreting each alert. | Couples every alert with coaching so research and action stay aligned. |
| Research & readiness | Watchlist builder | `/investor` → watchlist tab with **Update Watchlist** button synced to planning tools. | `/miniapp/watchlist` → **Update Watchlist** button for managing the same basket inside Telegram. | Maintains a single watchlist across channels, reducing duplicate work. |
| Execute & monitor | Trading desk | `/investor` → trade workspace with **Place a Trade** button framed by guardrails and position sizing helpers. | `/miniapp/trade` → **Place a Trade** button inside a compact panel with identical safeguards. | Reinforces disciplined execution with consistent controls. |
| Execute & monitor | Portfolio overview | `/investor` → overview tab with **View Portfolio** button next to performance trends. | `/miniapp/overview` → **View Portfolio** button for quick check-ins. | Provides a familiar health snapshot so investors stay confident. |
| Support & upkeep | Mentorship access | `/support` → **Start Mentorship Chat** button connecting to mentors, FAQs, and playbooks. | `/miniapp/mentorship` → **Start Mentorship Chat** button for on-demand coaching. | Keeps human reassurance one tap away. |
| Support & upkeep | Account center | `/investor` → account tools with **Manage Account** button covering billing, concierge access, and status updates. | `/miniapp/account` → **Manage Account** button with mirrored preferences. | Syncs billing and preferences automatically so upkeep stays simple. |

## Web App Route List

- `/` — Welcome launch pad that introduces Dynamic Capital and drives the **Continue to Home** action.
- `/investor` — Personalized hub containing **Explore Home**, trading, signals, watchlist, overview, and account tabs.
- `/token` — Fund transparency dashboard with the **Review Fund Metrics** CTA.
- `/support` — Mentorship and help center offering the **Start Mentorship Chat** CTA.

## Telegram Mini App Route List

- `/miniapp` — Stable entry redirect that confirms the **Continue to Home** action.
- `/miniapp/home` — Personalized home hub surfaced via Telegram authentication.
- `/miniapp/trade` — Trading workspace replicating web guardrails and the **Place a Trade** CTA.
- `/miniapp/fund` — Tokenomics dashboard supporting the **Review Fund Metrics** CTA.
- `/miniapp/signals` — Live signal feed with the **Follow Signals** CTA and beginner tips.
- `/miniapp/overview` — Snapshot view for portfolio health and the **View Portfolio** CTA.
- `/miniapp/mentorship` — Mentor chat access triggered by the **Start Mentorship Chat** CTA.
- `/miniapp/account` — Account management center anchored by the **Manage Account** CTA.
- `/miniapp/watchlist` — Synced watchlist management with the **Update Watchlist** CTA.

## Dynamic AGI Enhancements to Explore

1. **Adaptive onboarding coach** — Use conversational AGI to gauge experience level and risk comfort, then surface tailored checklists across `/investor` and `/miniapp/home`.
2. **Signal confidence labels** — Attach AGI-generated confidence scores and one-line rationales to `/investor` and `/miniapp/signals` alerts.
3. **Smart fund digest** — Publish weekly AGI summaries explaining changes on `/token` and `/miniapp/fund` so beginners stay current.
4. **Scenario rehearsal mode** — Offer AGI-simulated trade walk-throughs inside `/investor` and `/miniapp/trade` for safe practice.
5. **Portfolio health nudges** — Monitor `/investor` overview and `/miniapp/overview` data to send proactive diversification or cash-buffer reminders.
6. **Success roadmap generator** — Turn mentorship milestones into next-step learning plans surfaced in `/support` and `/miniapp/account`.

## Implementation Checklist

### Stage 1 — Onboard & Orient
- [ ] Align hero copy, visuals, and analytics events across `/` and `/miniapp` to keep the welcome promise identical.
  - Reuse the same headline, subheadline, and supporting copy in both hero sections.
  - Confirm the hero art direction (illustration, animation, or photo) stays consistent and adapts responsively.
  - Emit a shared analytics event name and payload when the **Continue to Home** CTA is tapped.
- [ ] Build personalized welcome states on `/investor` and `/miniapp/home`, tracking taps on the **Explore Home** CTA.
  - Surface the same personalization tokens (name, risk profile, onboarding checklist) in both experiences.
  - Ensure authentication gates enable Telegram profile data to hydrate the web view and vice versa.
  - Record **Explore Home** CTA engagements with a unified event schema for funnel comparisons.

### Stage 2 — Research & Readiness
- [ ] Serve the same data source to `/token` and `/miniapp/fund`, validating metric parity.
  - Point both clients to the canonical fund metrics endpoint with matching query parameters.
  - Add automated tests or dashboards that flag drift across supply, utility, and allocation values.
  - Document cache/refresh policies so latency optimizations do not fork the numbers presented.
- [ ] Standardize alert formatting and the **Follow Signals** CTA across `/investor` and `/miniapp/signals`.
  - Harmonize typography, iconography, and urgency color tokens for each alert severity level.
  - Keep mentor commentary slots and AGI tooltips in identical positions.
  - Instrument the **Follow Signals** CTA with shared analytics and success states.
- [ ] Enable near-real-time syncing between `/investor` and `/miniapp/watchlist` edits.
  - Stream watchlist mutations through a central pub/sub layer with optimistic UI support.
  - Resolve conflicts with a clear last-write-wins or merge rule documented for product and support teams.
  - Provide user feedback (toasts or banners) confirming cross-platform synchronization.

### Stage 3 — Execute & Monitor
- [ ] Match guardrails, order flows, and the **Place a Trade** CTA between `/investor` and `/miniapp/trade`.
  - Audit risk limits, position sizing helpers, and confirmation dialogs for parity.
  - Validate that order review summaries display identical data points before submission.
  - Track conversion events on **Place a Trade** with the same funnel step naming.
- [ ] Mirror portfolio calculations and labeling between `/investor` overview and `/miniapp/overview`.
  - Centralize portfolio math (returns, allocations, cash buffers) in a shared service or library.
  - Reuse label copy and tooltip definitions to avoid investor confusion.
  - Render performance charts with equivalent axes, scales, and time range presets.

### Stage 4 — Support & Upkeep
- [ ] Connect mentor routing, transcripts, and satisfaction tracking across `/support` and `/miniapp/mentorship`.
  - Route mentor assignments through the same availability engine for both surfaces.
  - Store conversation transcripts in a unified repository with consistent retention rules.
  - Trigger satisfaction surveys with identical questions and scoring logic.
- [ ] Centralize billing and status updates so changes on `/investor` account tools appear instantly in `/miniapp/account`.
  - Share billing webhooks and account status events through a common notification service.
  - Synchronize UI badges and messaging when membership tiers or payment states change.
  - Maintain a single audit trail that support can reference regardless of entry point.
- [ ] Trigger beginner-friendly surveys after mentorship and account sessions to confirm clarity and confidence.
  - Launch surveys with tailored copy based on the session type (mentorship vs. account maintenance).
  - Capture qualitative feedback alongside a confidence score to monitor improvements over time.
  - Feed survey results into the product analytics stack for follow-up experiments.

