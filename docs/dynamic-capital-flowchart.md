# Dynamic Capital Web3 App Flow & Onboarding Screens

This document translates the latest sitemap into an actionable flowchart and a
set of onboarding screen blueprints. Use it alongside
[`docs/web-site-map.md`](./web-site-map.md) to keep navigation, automation
hooks, and integrations synchronized.

## Snapshot

- **Primary objective**: keep design, product, and engineering teams aligned on
  navigation, onboarding intent, instrumentation, and integration requirements
  for the Dynamic Capital Web3 experience.
- **Key outputs**: the Mermaid flow below, onboarding journey specs, and a
  module interaction matrix to operationalize automation hooks across Market,
  Signals, Learn & Earn, and Settings surfaces.
- **Stakeholder touchpoints**: Growth (Learn & Earn), Trading (Market +
  Signals), Compliance (Settings), and the Intelligence Oracle workstream.

## Unified Navigation Flow

```mermaid
flowchart TD
    Home["Home Dashboard\nHeader + Sidebar"] --> Market["Dynamic Market"]
    Home --> Signals["Dynamic Signals"]
    Home --> LearnEarn["Dynamic Learn & Earn"]
    Home --> Settings["Settings & Profile"]

    Market --> MarketWatchlist["Market Watchlist\n(DCT pairs, trends, alerts)"]
    Market --> MarketSnapshot["Market Snapshot\nMomentum, Volatility, Heatmap"]
    Market --> MarketOverview["Market Overview\nTrend cards & panels"]
    Market --> EconomicCalendar["Dynamic Economic Calendar\nMacro events & filters"]
    Market --> FundamentalNews["Fundamental News Hub\nResearch feeds"]

    FundamentalNews --> NewsOverview["News Overview\nSentiment & sources"]
    FundamentalNews --> NewsAlerts["News Alerts\nPush & in-app"]

    Signals --> PortfolioSummary["Portfolio Summary\nBalance & P/L"]
    Signals --> Actions["Trade Actions\nTransfer / Pool Trading"]
    Signals --> LiveWallet["Live Wallet\nAddress, Balance, Volume"]

    LearnEarn --> Mentorship["Mentorship Modules\nDynamic, Free, Web3, Literacy"]
    LearnEarn --> GrowthTracker["Growth Tracker\nROI, Balance, Connect"]
    LearnEarn --> Promotions["Promotions\nSeasonal offers"]

    Settings --> Language["Language Toggle\nDhivehi-first"]
    Settings --> Notifications["Notifications"]
    Settings --> WalletIntegration["Wallet Integration"]
    Settings --> Compliance["Compliance & Privacy"]

    subgraph Future[Future Expansion]
        Oracle["Intelligence Oracle"]
        Oracle --> AGIScoring["AGI Scoring Dashboard"]
        Oracle --> Quantum["Quantum Module Sync"]
        Oracle --> TelegramBot["Telegram Bot Integration"]
        Oracle --> FeedbackLoop["Feedback Loop Visualizer"]
    end

    Signals -.-> Oracle
    Market -.-> Oracle
    LearnEarn -.-> Oracle
```

The dashed connections indicate candidate data sources for the future
Intelligence Oracle, reinforcing where real-time metrics can enrich AGI scoring
and automation.

## Onboarding Screen Blueprint

| Screen                        | Primary Goal                                             | Hero Content                                                                                                | Key Components                                                                                                         | Automation & Analytics                                                                                      |
| ----------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Welcome Launchpad**         | Orient newcomers with the Dynamic Capital value promise. | Headline + subheadline matching marketing copy, localized Dhivehi toggle, primary **Continue to Home** CTA. | Social proof cards, countdown-style clock, language switcher tooltip.                                                  | Track `cta_continue_home_clicked`; hydrate localization preference for downstream sessions.                 |
| **Personal Home Hub**         | Surface top actions after first login.                   | Personalized greeting from mentorship lead, highlight of DCT balance snapshot.                              | Quick-start checklist, mini watchlist, Learn & Earn teaser tile.                                                       | Fetch `/api/welcome-context`; emit `cta_explore_home_clicked` when checklist launched.                      |
| **Signals Primer**            | Explain how dynamic signals drive confident trades.      | Animated signal strength meter with Dhivehi legend.                                                         | Portfolio summary widget, long/short ratios, mentor commentary feed.                                                   | Connect to Supabase real-time stream; label analytics with `signals_stream_engaged`.                        |
| **Learn & Earn Invitation**   | Motivate ongoing education and mentorship enrollment.    | Rotating mentorship avatars with cultural motifs.                                                           | Module carousel (Dynamic Mentorship, Free Course, Web3 Education, DC Token Literacy), ROI tracker, Connect Wallet CTA. | Start drip campaign via Gmail API when **Connect Wallet** tapped; sync Telegram tag for follow-up.          |
| **Market Intelligence Pulse** | Encourage traders to configure macro and news alerts.    | Animated macro countdown with Dhivehi annotations and top three headlines.                                  | Economic calendar list, news sentiment heatmap, alert setup CTA.                                                       | Emit `calendar_alert_configured` and `news_alert_subscribed`; hydrate quiet-hour preferences from Settings. |

## Onboarding Journey Sequence

1. **Discovery → Welcome Launchpad**
   - Trigger: first-time wallet connect or marketing CTA.
   - Data preload: localization preference, referral code, and expected asset
     focus (trader vs. learner).
   - KPIs: `cta_continue_home_clicked`, time-to-first action, Dhivehi toggle
     adoption.
2. **Welcome Launchpad → Personal Home Hub**
   - Trigger: continue CTA or checklist auto-progress.
   - Data preload: snapshot of DCT balance (if connected), recommended Signals
     watchlist, mentorship tier suggestion.
   - KPIs: `cta_explore_home_clicked`, watchlist pin rate, ROI widget hover
     events.
3. **Personal Home Hub → Signals Primer**
   - Trigger: selecting Signals tile, mentor prompt, or alert notification.
   - Data preload: Supabase stream session token, TradingView alert context,
     Dhivehi commentary thread.
   - KPIs: `signals_stream_engaged`, alert follow-through, mentorship chat
     opens.
4. **Signals Primer → Learn & Earn Invitation**
   - Trigger: education CTA, automation from portfolio loss thresholds, or
     Oracle recommendation.
   - Data preload: mentorship availability, Gmail drip status, Telegram tagging,
     ROI baseline.
   - KPIs: `learn_invite_wallet_connected`, module enrollment conversions, drip
     open rates.
5. **Personal Home Hub → Market Intelligence Pulse**
   - Trigger: macro-heavy weeks, user enabling news alerts, or Oracle risk
     advisory.
   - Data preload: preferred assets, quiet-hour schedule, prior news alert
     interactions.
   - KPIs: `calendar_alert_configured`, alert engagement rate, time-to-first
     headline read.

## Module Interaction Blueprint

| Module                   | Core Views                                                                                   | Data Inputs                                                                                      | Automation Hooks                                                                              | Integration Targets                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Dynamic Market**       | Market Watchlist, Snapshot, Overview panels, **Economic Calendar**, **Fundamental News Hub** | Oracle pricing feeds, localized token labels, volatility metrics, macro calendars, newsroom APIs | Smart alerts, price momentum badges, heatmap refresh cadence, news alerts, calendar reminders | TradingView overlays, Oracle data lake, localization service, ForexFactory/Calendar APIs, newswire integrations |
| **Dynamic Signals**      | Portfolio Summary, Trade Actions, Live Wallet                                                | Supabase real-time signals, wallet sync, mentor commentary                                       | Alert routing, transfer reminders, AGI score contributions                                    | Supabase, MetaMask / TON wallet bridge, PostHog analytics                                                       |
| **Dynamic Learn & Earn** | Mentorship Modules, Growth Tracker, Promotions                                               | Mentorship CMS, course completion data, ROI tracker inputs                                       | Drip campaign sequencer, reward unlocks, Telegram nudges                                      | Gmail API, Telegram bot, Supabase profile store                                                                 |
| **Settings & Profile**   | Language, Notifications, Wallet Integration, Compliance                                      | Localization preferences, notification matrix, KYC status                                        | Dhivehi-first toggle persistence, compliance reminders, wallet binding events                 | MetaMask/TON connectors, compliance ledger, localization service                                                |
| **Intelligence Oracle**  | AGI Scoring Dashboard, Quantum Sync, Telegram bot, Feedback Visualizer                       | Aggregated signals, mentorship progress, compliance data                                         | Scoring recalculations, predictive prompts, anomaly alerts                                    | AGI engine, Supabase analytics warehouse, PostHog funnels                                                       |

## Dynamic Economic Calendar Experience

- **Primary outcomes**: keep traders ahead of macro catalysts and regional
  holidays impacting liquidity. Surface Dhivehi-localized notes for Maldivian
  market hours.
- **Event tiers**: distinguish between global high-impact events (e.g., FOMC,
  CPI) and localized regional updates with color-coded intensity bars and
  countdown timers.
- **User flows**:
  - From **Market Watchlist**, allow a quick jump into the calendar filtered by
    relevant trading pairs.
  - Offer “Add to Signals” CTA to convert a calendar event into a conditional
    alert routed through the Signals module.
- **Automation**: sync event metadata via ForexFactory/ICS feeds, push reminders
  24h/1h before the event, and archive outcomes to feed the Intelligence Oracle.

## Fundamental News Overview & Alerts

- **News overview panel**: group headlines by asset tags, sentiment, and source
  credibility. Offer toggleable lenses for Technical vs. Fundamental focus.
- **Alerting model**: empower traders to subscribe to breaking news keywords and
  specify delivery (push, in-app banner, Telegram). Alerts should inherit
  localization and quiet-hour settings from Settings & Profile.
- **Editorial insights**: weave mentor commentary or AI-generated summaries into
  each story card. Display confidence scores and link back to the Market
  Overview for impact tracking.
- **Data partnerships**: integrate newsroom APIs (e.g., CryptoPanic, CoinDesk)
  and compliance filters to avoid disallowed jurisdictions.

### Newsroom Component Patterns

- **Headline cards**: use stacked layout with source badge, timestamp, and
  sentiment pill. Include quick actions for “Add Alert,” “Share,” and “Mark as
  Read.”
- **Live ticker**: provide a horizontal marquee of urgent headlines atop the
  Market module. Employ throttled updates and pause-on-hover for accessibility.
- **Alert composer**: modal with keyword inputs, asset filters, and frequency
  selectors. Prefill suggestions based on watchlist activity and mentorship
  recommendations.

## Component Architecture & Usage Recommendations

### Dashboard Flow Structure

- Anchor a three-column mental model: fixed sidebar navigation, adaptive main
  content canvas, and optional tertiary panels for intelligence overlays.
- Preserve the sitemap hierarchy with a flow similar to the diagram below to
  keep Market, Signals, and Learn & Earn interactions within a single scroll
  context while reserving space for future Oracle hooks.

```mermaid
flowchart LR
    Dashboard[Dashboard Layout] --> TopNav[Top Navigation Bar]
    Dashboard --> Sidebar[Sidebar Navigation]
    Dashboard --> MainArea[Main Content Area]
    MainArea --> Tabs[Tab Switcher]
    MainArea --> Carousel[Card Grid Carousel]
    Carousel --> MarketCards[Market Cards]
    Carousel --> ChartWidgets[Chart Widgets]
    Carousel --> InfoCards[Info Cards]
    MainArea --> DetailPanels[Detail Panels]
```

### Tabbed Navigation & Status Filters

Use pill-style buttons with rounded corners for the Market Watchlist ↔ Snapshot
toggle. Variants should communicate state using brand hues.

```tsx
<Row gap="8" horizontal="center" paddingY="16">
  <Button
    size="m"
    variant={activeTab === "watchlist" ? "primary" : "tertiary"}
    onClick={() => setActiveTab("watchlist")}
    data-border="rounded"
  >
    Dynamic Market Watchlist
  </Button>
  <Button
    size="m"
    variant={activeTab === "snapshot" ? "primary" : "tertiary"}
    onClick={() => setActiveTab("snapshot")}
    data-border="rounded"
  >
    Dynamic Market Snapshot
  </Button>
</Row>;
```

Layer badge clusters for Hot, Favorites, Trending, and Live states so traders
can filter volatility quickly.

```tsx
<Row gap="8" wrap horizontal="center">
  <Tag size="s" background="error-strong" prefixIcon="flame">
    Hot
  </Tag>
  <Tag size="s" background="error-medium" prefixIcon="heart">
    Favorites
  </Tag>
  <Tag size="s" background="error-medium" prefixIcon="trending-up">
    Trending
  </Tag>
</Row>;
```

### Market Data Card Composition

Cards should emphasize pair metrics, sparkline context, and contextual actions
(e.g., Quick Entrance) with glassmorphism accents.

```tsx
<Column
  background="surface"
  border="brand-alpha-weak"
  radius="xl"
  padding="20"
  gap="16"
  minWidth={20}
  fillWidth
  style={{
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease",
  }}
  className="hover:shadow-lg hover:scale-[1.02]"
>
  <Row horizontal="space-between" vertical="center">
    <Text variant="label-default-s" onBackground="neutral-weak">
      DCT/TON
    </Text>
    <Row gap="4" vertical="center">
      <Text variant="heading-strong-m" onBackground="success-strong">
        +690.5
      </Text>
      <Tag size="s" background="success-alpha-weak">
        +12.86%
      </Tag>
    </Row>
  </Row>
  <Row fillWidth style={{ height: "80px" }}>
    {/* Sparkline component */}
  </Row>
  <Column gap="8">
    <Row
      background="surface-secondary"
      radius="m"
      padding="12"
      gap="8"
      vertical="center"
    >
      <Icon name="zap" size="s" onBackground="brand-medium" />
      <Column gap="2" fillWidth>
        <Text variant="label-strong-xs">Quick Entrance</Text>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Description text here
        </Text>
      </Column>
      <Icon name="arrow-right" size="xs" />
    </Row>
  </Column>
</Column>;
```

### Horizontal Card Carousel

Provide horizontal scroll with snap alignment to surface multiple pairs and
mentorship promos without overwhelming the viewport.

```tsx
<Row
  gap="16"
  paddingX="16"
  style={{
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    WebkitOverflowScrolling: "touch",
  }}
  className="scrollbar-hide"
>
  {marketData.map((item) => (
    <div
      key={item.id}
      style={{
        scrollSnapAlign: "start",
        minWidth: "280px",
        maxWidth: "320px",
      }}
    >
      <MarketCard data={item} />
    </div>
  ))}
</Row>;
```

### Sidebar Navigation

Keep the sidebar fixed with iconography mirroring Maldivian nautical motifs and
provide 48px tappable targets for accessibility.

```tsx
<Column
  position="fixed"
  style={{ left: 0, top: "50%", transform: "translateY(-50%)" }}
  gap="16"
  paddingX="12"
  paddingY="24"
  background="surface"
  border="brand-alpha-weak"
  radius="r"
>
  {navItems.map((item) => (
    <Button
      key={item.id}
      size="m"
      variant={activeNav === item.id ? "primary" : "ghost"}
      aria-label={item.label}
      onClick={() => setActiveNav(item.id)}
      style={{ width: "48px", height: "48px", padding: 0 }}
    >
      <Icon name={item.icon} />
    </Button>
  ))}
</Column>;
```

### Main Layout Skeleton

The top navigation balances quick module switches with live status indicators.
Center the Dynamic Capital brand and expose hero CTAs for Pool Trading, Learn &
Earn, and Signals.

```tsx
<Column fillWidth minHeight="screen" background="page-background">
  <Row
    as="header"
    fillWidth
    paddingX="24"
    paddingY="16"
    background="surface"
    border="neutral-alpha-weak"
    horizontal="space-between"
    vertical="center"
  >
    <Row gap="16" vertical="center">
      <Heading variant="heading-strong-l" onBackground="brand-strong">
        Dynamic Capital
      </Heading>
      <Row gap="8">
        <Button variant="primary" size="s">Dynamic Pool Trading</Button>
        <Button variant="tertiary" size="s">Dynamic Learn And Earn</Button>
        <Button variant="tertiary" size="s" prefixIcon="activity">
          <Badge>324</Badge> Dynamic Signals
        </Button>
      </Row>
    </Row>
    <Row gap="12" vertical="center">
      <Row gap="6" vertical="center">
        <Pulse size="xs" variant="success" />
        <Text variant="label-default-s">Live</Text>
      </Row>
      <Text variant="heading-default-m">12:18 PM</Text>
    </Row>
  </Row>
  <Row fillWidth flex style={{ minHeight: "calc(100vh - 80px)" }}>
    <SidebarNavigation />
    <Column flex fillWidth padding="24" gap="24">
      <TabSwitcher />
      <ScrollableCardGrid />
      <DetailPanels />
    </Column>
  </Row>
</Column>;
```

### Styling & Responsiveness

- Favor brand blues/cyans for primary actions, success greens for profit, and
  error reds for loss states. Neutrals carry typography and borders.
- Apply a subtle gradient + blur background on cards to reinforce the premium
  financial aesthetic.

```ts
const cardStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(135deg, hsl(var(--brand) / 0.03) 0%, hsl(var(--accent) / 0.02) 100%)",
  border: "1px solid hsl(var(--brand) / 0.12)",
  backdropFilter: "blur(12px)",
  boxShadow: "0 8px 32px hsl(var(--neutral) / 0.06)",
};
```

- Build layouts mobile-first and allow card wrapping before tablet breakpoints.

```tsx
<Row gap="16" wrap horizontal="center" fillWidth>
  <Column
    gap="12"
    fillWidth
    style={{
      minWidth: "280px",
      maxWidth: "min(100%, 320px)",
    }}
  >
    {/* Card content */}
  </Column>
</Row>;
```

### Data Visualization & Interaction States

- Use lightweight charts (Recharts or Visx) for sparklines and ensure updates
  animate smoothly when WebSocket data arrives.

```tsx
<ResponsiveContainer width="100%" height={80}>
  <LineChart data={chartData}>
    <Line
      type="monotone"
      dataKey="value"
      stroke="hsl(var(--success-strong))"
      strokeWidth={2}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>;
```

- Provide tactile feedback with transition utilities and explicit loading pulses
  for asynchronous calls.

```tsx
<div className="transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
  <Pulse size="m" variant="brand" />
</div>;
```

These guidelines align the visual system with the sitemap deliverables, ensuring
component reuse, Maldivian-inspired branding, and readiness for live market
integrations.

## Future-facing Wireframe Notes

- **Intelligence Oracle integration**: reserve a tertiary navigation icon and
  modal entry point on the Home dashboard. The AGI scoring dashboard should
  ingest market momentum, wallet health, and mentorship progress simultaneously.
- **Mentorship proof logic**: log completion artifacts (quizzes, webinars,
  mentorship chats) against the learner profile to unlock tiered rewards in the
  Learn & Earn module.
- **Dhivehi-first localization**: ensure typography scales for Thaana script
  across hero, navigation, and data tables. Reuse the toggle state for
  compliance notifications to avoid redundant prompts.

## Intelligence Oracle Enablement

- **Data ingestion**
  - Market momentum snapshots (`market_momentum_stream` topic) sampled every 5
    minutes for AGI score smoothing.
  - Signals alert ledger with provenance metadata (`signals_alert_feed`) to
    trace recommendations back to TradingView triggers.
  - Learn & Earn mastery ledger capturing quiz/webinar artifacts and mentorship
    transcripts (`mentorship_proof_log`).
- **Computation & scoring**
  - Baseline scoring weights: 40% trading discipline (Signals), 35% educational
    progress (Learn & Earn), 25% wallet health (Settings + Market risk posture).
  - Incorporate qualitative mentor feedback as modifiers (±10%) with
    explainability tags surfaced in the dashboard tooltip.
- **Experience surfaces**
  - Home dashboard badge summarizing the current AGI tier and next best action.
  - Oracle modal with drill-down tabs (Momentum, Mentorship, Compliance) that
    share styling tokens with the primary modules.
  - Telegram bot notifications that mirror AGI recommendations and include
    quick-action deep links back to the web app.
- **Compliance & governance**
  - Capture consent state for AGI insights and store in the compliance ledger
    alongside privacy policy acknowledgements.
  - Version integration contracts in the shared playbook; include data retention
    SLAs for each upstream source.

## Implementation Checklist

1. Align UI kit tokens (color, spacing, iconography) across Market, Signals, and
   Learn & Earn sections before building the flow.
2. Define event schemas for every CTA above so analytics teams can stitch cohort
   journeys between web and Telegram experiences.
3. Coordinate integrations:
   - **Signals** → Supabase + TradingView for real-time metrics, with alert
     icons mapping to severity tokens.
   - **Learn & Earn** → Gmail API + Telegram for drip campaigns and mentorship
     reminders.
   - **Market** → Oracle feeds to populate localized token names and smart
     alerts.
   - **Wallet** → MetaMask and TON Wallet sync, labelled with Dhivehi
     descriptors for clarity.
4. Document dependencies and API contracts in the shared integration playbook to
   accelerate the Intelligence Oracle roadmap.

Use this flow and onboarding outline as the backbone for interactive prototypes
or developer stories.
