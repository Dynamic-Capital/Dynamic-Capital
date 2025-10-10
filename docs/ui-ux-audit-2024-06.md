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
