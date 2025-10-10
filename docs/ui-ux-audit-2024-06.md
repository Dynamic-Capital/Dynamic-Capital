# Dynamic Capital UI/UX Audit — June 2024

## Approach

- Reviewed primary web workspace implemented in `apps/web`, including
  navigation, landing control tower, tool workspaces, checkout, and support
  surfaces.
- Audited copy and content definitions sourced from `@/resources` to understand
  messaging tone and link coverage.
- Inspected shared data sources and widgets to assess whether critical UI relies
  on live telemetry or static mock data.

## Key Themes

- Navigation and command surfaces over-emphasize style at the cost of
  scan-ability and responsive clarity.
- Several flagship modules (chat, market review, investor desk) still present
  placeholder audits or static data, which erodes trust in live readiness.
- Support and checkout funnels push users into Telegram by default, limiting
  choice and raising compliance questions.
- Long-form marketing copy dominates key pages without progressive disclosure,
  making it hard for newcomers to extract next steps quickly.

## Latest Change Review — October 2025

### 1. Navigation dataset refresh

- **Finding:** The new route registry hardcodes primary ordering inside
  `PRIMARY_NAV_SEQUENCE`, so adding a nav item requires touching both the route
  definition and the sequencing array. In practice, secondary surfaces (for
  example new tools) silently fall out of the mobile nav because they never get
  sequenced.【F:apps/web/config/route-registry.ts†L1234-L1289】 **Improvement:**
  Derive ordering directly from each route's `nav.order`, using the registry as
  the single source of truth, and fall back to alphabetical ordering when no
  explicit rank is provided.
- **Finding:** The generated `step` label defaults to "Hint N" for every entry
  and is rendered verbatim in the mobile bottom bar, so users see "Hint 1, Hint
  2…" instead of meaningful actions like "Chat" or "Markets". The term also gets
  voiced by screen readers before the actual link text, increasing
  confusion.【F:apps/web/config/route-registry.ts†L1234-L1289】【F:apps/web/components/navigation/MobileBottomNav.tsx†L138-L166】
  **Improvement:** Replace the generic counter with purposeful helper text (for
  example "Start", "Markets", "Desk"), or hide it entirely on compact
  navigation.

### 2. Route hint trail legibility

- **Finding:** Route hints render their lead tag in all caps with 0.24em letter
  spacing on an 11px font, which fails WCAG readability guidelines on smaller
  breakpoints and blurs once the glassmorphism backdrop
  activates.【F:apps/web/components/navigation/RouteHintTrail.tsx†L36-L51】
  **Improvement:** Swap to sentence-case 13–14px text, remove forced tracking,
  and let the background token adapt to high-contrast mode.
- **Finding:** Only the first three tags are displayed in the trail with no
  overflow indicator, so critical context (for example "Automation" or
  "Mentorship") disappears on routes that carry more than three
  labels.【F:apps/web/components/navigation/RouteHintTrail.tsx†L28-L49】
  **Improvement:** Introduce a "+N" badge or horizontal scroller that reveals
  the remaining tags on focus/hover.

### 3. TON miniapp live plan pricing

- **Finding:** When the live pricing sync fails, the miniapp prints the raw
  error string from Supabase straight into the alert, exposing internal stack
  hints and confusing traders who only need recovery
  guidance.【F:dynamic-capital-ton/apps/miniapp/app/page.tsx†L2023-L2045】
  **Improvement:** Map failures to human-readable status copy ("Live pricing is
  offline, retrying in 30s") and log the original error to console or a
  telemetry sink instead.
- **Finding:** The plan snapshot trims adjustment factors to the first four
  entries with no disclosure, so larger repricing mixes hide funding tweaks that
  risk/compliance teams expect to
  audit.【F:dynamic-capital-ton/apps/miniapp/app/page.tsx†L2816-L2864】
  **Improvement:** Add a "View full adjustment log" expander or collapse the
  list with a clear "+N additional" counter.

### 4. Theme minting console

- **Finding:** Each mint card surfaces a raw content URI string without
  affordances to copy or open it, forcing operators to long-press and hope their
  browser surfaces context
  actions.【F:dynamic-capital-ton/apps/miniapp/app/page.tsx†L2291-L2308】
  **Improvement:** Render the URI as a tappable link with a "Copy" icon button
  and label whether it points to IPFS, Arweave, or Ton Storage.
- **Finding:** After a mint completes, the call-to-action remains in the
  viewport with the label "Mint scheduled" but no success badge, so it's unclear
  whether operators can safely move to the next card or need to await further
  confirmation.【F:dynamic-capital-ton/apps/miniapp/app/page.tsx†L2316-L2338】
  **Improvement:** Swap the button for a non-interactive success pill, surface
  the completion timestamp alongside the helper text, and auto-focus the next
  actionable mint.

### 5. TON site gateway resilience

- **Finding:** The new `/ton-site` edge route simply streams upstream responses
  (including 503s) without a branded fallback, so visitors hit raw gateway
  errors when the DigitalOcean origin goes down—as already recorded in the
  latest DNS verification log.【F:apps/web/app/ton-site/[[...path]]/route.ts†L116-L159】【F:dns/dynamiccapital.ton.json†L52-L75】
  **Improvement:** Detect non-2xx statuses in the proxy, render a friendly
  outage page with retry guidance, and log the incident to analytics before
  surfacing the raw response.
- **Finding:** Marketing CTAs like “Invest now” point straight to
  `resolveTonSiteUrl("app")`, so a gateway outage instantly breaks the primary
  conversion path with no status banner or alternate
  channel.【F:apps/web/components/landing/MultiLlmLandingPage.tsx†L56-L60】【F:apps/web/components/landing/MultiLlmLandingPage.tsx†L561-L589】【F:shared/ton/site.ts†L1-L75】
  **Improvement:** Gate external CTAs behind a lightweight uptime check (or
  cached status from the health feed) and present fallback options—Telegram
  concierge, email—whenever the TON bundle is offline.

### 6. Landing quick navigation regressions

- **Finding:** The hero “Learn more” button still links to `#academy`, but that
  anchor no longer exists in the home navigation config, so the action just
  flashes the hash without scrolling
  anywhere.【F:apps/web/components/landing/MultiLlmLandingPage.tsx†L56-L60】【F:apps/web/components/landing/MultiLlmLandingPage.tsx†L590-L603】【F:apps/web/components/landing/home-navigation-config.ts†L16-L60】
  **Improvement:** Re-point the CTA to a live section (`#dct-token` or
  `#investor-mini-app`) or restore a matching Academy block so the jump actually
  lands.
- **Finding:** The refreshed TradingView cards only swap the iframe for a
  single-line error string when the script fails, leaving an empty chart shell
  with no data or follow-up
  guidance.【F:apps/web/components/landing/MultiLlmLandingPage.tsx†L338-L440】
  **Improvement:** Pair the failure state with timestamped snapshot data, a
  “View on TradingView.com” link, or a status badge so users still understand
  market direction when embeds are unavailable.

### 7. System health communication

- **Finding:** The System Health card now exposes raw Supabase error messages
  (for example `JWT expired` or edge stack traces) directly to operators whenever
  the edge function call
  fails.【F:apps/web/components/ui/system-health.tsx†L566-L583】 **Improvement:**
  Map internal errors to operator-friendly guidance, retain the technical
  payload in logs/console, and summarize next steps (retry, check Supabase
  status) inside the alert.
- **Finding:** When the overall status is “healthy”, the widget disappears
  entirely (`return null`), so teams lose the timestamp of the last check until
  something breaks—undermining confidence in always-on monitoring.【F:apps/web/components/ui/system-health.tsx†L520-L584】
  **Improvement:** Keep a minimized “All clear” card with the latest check time
  and a manual refresh button so stakeholders can confirm coverage even during
  calm periods.

## Detailed Findings & Improvements

### 1. Global navigation & layout

- **Finding:** The desktop navigation renders all-primary links in uppercase
  with 0.24em tracking, which reduces readability and consumes horizontal space
  on mid-sized
  viewports.【F:apps/web/components/navigation/DesktopNav.tsx†L23-L52】
  **Improvement:** Introduce sentence-case labels with responsive typography
  tokens, and surface an active indicator that does not rely solely on color.
- **Finding:** Header actions duplicate the wallet connection button for desktop
  and mobile without reflecting connection state, and “Support”/“Sign in” links
  collapse into the mobile cluster, creating noise during
  scroll.【F:apps/web/components/navigation/SiteHeader.tsx†L50-L118】
  **Improvement:** Consolidate actions into a primary CTA plus overflow menu,
  and show a connected-wallet pill or status badge once `useWalletConnect`
  succeeds.
- **Finding:** Tool hero layout renders identical gradient cards with eyebrow
  tags for every workspace, so differentiated contexts (checkout vs. investor
  desk) blend
  together.【F:apps/web/components/workspaces/ToolWorkspaceLayout.tsx†L139-L219】
  **Improvement:** Supply workspace-specific imagery or illustrations and allow
  metadata to toggle between gradient, solid, or minimal hero variants.

### 2. Landing workspace (Dynamic Chat Hub)

- **Finding:** The “Workspace audit” card lists internal TODOs (“Interface still
  mirrors developer scaffolding”, “Module renders static notes”) directly to end
  users, signaling unfinished
  work.【F:apps/web/components/chat/DynamicChatLanding.tsx†L648-L698】
  **Improvement:** Replace audit copy with user-facing status metrics, keeping
  backlog notes in admin-only views.
- **Finding:** Quick links surface VIP plan health based solely on Supabase
  fetch success and otherwise instruct operators to run scripts, exposing
  implementation details in the
  UI.【F:apps/web/components/chat/DynamicChatLanding.tsx†L577-L646】
  **Improvement:** Swap technical guidance for empathetic messaging (“Pricing
  refresh required — ping support”) and log remediation steps internally.
- **Finding:** Device support tables list coverage claims without referencing
  actual telemetry or documentation, risking over-promising
  compatibility.【F:apps/web/components/chat/DynamicChatLanding.tsx†L525-L572】
  **Improvement:** Link each support row to validation evidence (release notes,
  responsive screenshots) and downgrade statuses until tests exist.

### 3. Tool workspaces & data integrity

- **Finding:** Investor desk hero promises copy trading, decentralized
  withdrawals, and token credits, yet the page mainly links to checkout and
  static highlight cards with no functional
  integrations.【F:apps/web/app/tools/dynamic-portfolio/page.tsx†L146-L190】
  **Improvement:** Gate aspirational messaging behind feature flags, or surface
  concrete steps (e.g., broker integrations available today) with progress
  indicators.
- **Finding:** Signals widget and other telemetry components rely on hardcoded
  mock datasets, meaning “Active” statuses and percentages never reflect real
  markets.【F:apps/web/lib/mock-data.ts†L1-L83】【F:apps/web/components/trading/SignalsWidget.tsx†L4-L111】
  **Improvement:** Wire widgets to live sources (Supabase, WebSocket feeds) and
  show skeleton loaders plus last-updated timestamps when data lags.

### 4. Support & communication flows

- **Finding:** Support cards for “Ping the concierge” and “Desk coverage” both
  deep link to the same Telegram URL, while the third card points to blog
  guides, limiting omnichannel
  coverage.【F:apps/web/app/support/page.tsx†L25-L118】 **Improvement:** Add
  form/email escalation, SLA summary, and compliance contact, and differentiate
  CTA destinations (chat vs. ticket vs. knowledge base).
- **Finding:** Footer “Connect” list similarly centers Telegram, email, phone,
  and location without setting expectations on response time or availability
  windows.【F:apps/web/components/navigation/SiteFooter.tsx†L1-L102】
  **Improvement:** Annotate each channel with support hours and integrate a
  status indicator (online, typical reply time).

### 5. Checkout & membership purchase

- **Finding:** Checkout component manages extensive state for promos, Telegram
  detection, bank instructions, and manual receipt upload, exposing
  edge-function errors directly to
  buyers.【F:apps/web/components/checkout/WebCheckout.tsx†L125-L213】
  **Improvement:** Split the flow into smaller, wizard-like steps with inline
  validation summaries, and abstract technical failure messaging behind
  user-friendly alerts.
- **Finding:** Payment selector defaults to “Continue in Telegram (Recommended)”
  and the primary button reflects that choice, effectively forcing most users
  into another
  channel.【F:apps/web/components/checkout/PaymentMethodSelector.tsx†L38-L104】
  **Improvement:** Offer web-native payment (card, TON intent) as the default,
  and explain why Telegram may be required only when benefits exist.

### 6. Content & messaging

- **Finding:** Homepage and resource copy leans on dense, jargon-heavy sentences
  (“Benchmark responses, enforce routing policies…”) with minimal scannable
  structure.【F:apps/web/resources/content.tsx†L142-L204】 **Improvement:**
  Introduce tiered headings, TL;DR summaries, and bullets that translate desk
  value into user outcomes.
- **Finding:** About page showcases deep professional achievements without quick
  credibility proof (credentials, logos, stats) and hides the calendar CTA
  entirely.【F:apps/web/app/about/page.tsx†L24-L120】 **Improvement:** Surface a
  highlight reel banner (e.g., “12+ years, 300 members mentored”) and restore a
  visible scheduling CTA where available.

## Suggested Next Steps

1. Prioritise navigation and checkout refinements to reduce friction in core
   conversion paths.
2. Replace placeholder audit copy and mock data with either live integrations or
   intentionally labeled previews.
3. Restructure long-form content with progressive disclosure and updated CTAs
   before broader marketing pushes.
4. Expand support/contact flows beyond Telegram to meet compliance and
   accessibility expectations.
