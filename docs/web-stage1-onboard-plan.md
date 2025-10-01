# Stage 1 Onboard & Orient Implementation Plan

## Objectives

- Deliver a mirrored hero experience on `/` and `/miniapp` that communicates the
  Dynamic Capital value proposition consistently while capturing analytics on
  the "Continue to Home" CTA.
- Launch personalized welcome hubs on `/investor` and `/miniapp/home` that
  hydrate the same tokens, instrumentation, and guardrails from a shared data
  contract.

## Hero Alignment Workstream (`/` and `/miniapp`)

### Copy & Content

```text
Headline: "Dynamic Capital keeps your next move confident."
Subheadline: "Real-time intelligence, guided execution, and treasury-backed stability in one investor cockpit."
CTA label: "Continue to Home"
Supporting proof: Rotating strip of top three mentor testimonials, each under 90 characters.
```

- Store the copy in a shared `heroContent` config exported by both the web and
  mini app bundles to prevent drift.
- Reference the same illustration (`hero-dynamic-capital-welcome.svg`) with
  responsive variants at 1x, 2x, and dark-mode-optimized tints.
- Ensure localization keys are consistent: `hero.headline`, `hero.subheadline`,
  `cta.continue_home`.

### Analytics & Instrumentation

- Emit a unified Segment event named `cta_continue_home_clicked` with the
  following schema:
  - `surface`: enum `web` | `miniapp`
  - `user_status`: enum `anonymous` | `authenticated`
  - `experiment_bucket`: optional string for A/B variants
  - `timestamp`: ISO8601 string provided by the client clock
- Validate analytics parity by replaying the event payloads through the staging
  pipeline and confirming they appear with identical field ordering in the
  warehouse mirror.
- Gate the CTA behind a debounce of 300ms and include
  `data-testid="continue-home-cta"` for automated Cypress coverage.

### Acceptance Criteria

- Snapshot tests demonstrate the hero copy, CTA label, and testimonial rotation
  are identical across surfaces.
- Accessibility review confirms minimum 4.5:1 contrast for text and focus states
  for the CTA.
- Analytics dashboard exposes a single chart for the shared event with surface
  filters only.

## Personalized Welcome Hub Workstream (`/investor` and `/miniapp/home`)

### Data Contract

| Field             | Type     | Description                                                       | Fallback                               |
| ----------------- | -------- | ----------------------------------------------------------------- | -------------------------------------- |
| `displayName`     | string   | Preferred investor name sourced from profile                      | `"Investor"`                           |
| `riskProfile`     | enum     | `conservative` \| `balanced` \| `growth`, derived from onboarding | `"balanced"`                           |
| `checklistStatus` | string[] | Outstanding onboarding steps                                      | `[]`                                   |
| `mentorMatch`     | object   | `{ name: string; availability: string }`                          | `{ name: "TBD", availability: "24h" }` |
| `lastSignal`      | object   | `{ title: string; publishedAt: string }`                          | `null`                                 |

- Serve the payload via `/api/welcome-context` with shared cache headers
  (`max-age=60`, `stale-while-revalidate=300`).
- Authenticate Telegram sessions using the signed init data bridge and reuse the
  same JWT for the web hub.
- Implement optimistic hydration: render skeleton cards while the shared hook
  (`useWelcomeContext`) resolves.

### CTA Tracking & Guardrails

- Instrument the **Explore Home** CTA with a `cta_explore_home_clicked` event
  mirroring the hero schema plus:
  - `personalization_level`: enum `full` | `partial` based on available tokens
  - `checklist_remaining`: integer count derived from `checklistStatus.length`
- Track CTA conversion funnels in Productboard, ensuring stage-to-stage drop-off
  is comparable between web and mini app.
- Apply rate limiting (1 click per second) and disable the button while the
  navigation promise is pending to stop duplicate analytics events.

### Acceptance Criteria

- Contract tests assert both clients deserialize the payload successfully and
  respect fallback defaults.
- Visual regression coverage (Chromatic or Percy) shows card layout parity
  across desktop, tablet, and mobile breakpoints.
- Support receives a single audit trail entry per profile update regardless of
  entry point.

## Quality Gates & Timeline

- **Week 1:** Finalize copy, illustration audit, and analytics schema reviews.
  Kick off shared config refactor.
- **Week 2:** Implement hero alignment, wire Segment events, and complete
  accessibility testing.
- **Week 3:** Ship personalization API, hydrate both clients, and run contract
  plus visual regression tests.
- **Week 4:** Conduct integrated QA, finalize analytics dashboards, and schedule
  go/no-go review with product and support stakeholders.

## Dependencies & Owners

- **Design:** Provide responsive illustration assets and testimonial content
  (Owner: Design Lead).
- **Frontend Web:** Implement shared hero module, personalization hook, and
  analytics wiring (Owner: Web Tech Lead).
- **Mini App:** Integrate shared config, Telegram auth bridge, and analytics
  parity (Owner: Mini App Tech Lead).
- **Data/Analytics:** Validate event schemas and warehouse ingestion (Owner:
  Data Analyst).
- **Support Ops:** Define audit trail expectations and go-live readiness
  checklist (Owner: Support Manager).

## Reporting & Follow-Up

- Publish weekly status updates in `#dynamic-web-launch` including checklist
  progress and outstanding risks.
- Capture pre/post launch metrics: CTA click-through rate, onboarding completion
  time, and mentor chat initiation rate.
- After launch, schedule a 2-week retrospective to review telemetry, support
  tickets, and recommended Stage 2 prep work.
