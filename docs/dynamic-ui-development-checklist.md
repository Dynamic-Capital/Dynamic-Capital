# Dynamic UI Frontend & Backend Checklist

Use this checklist when you scope, build, and verify Dynamic Capital surfaces
that rely on the Dynamic UI design system (landing page, mini app shells, admin
tooling). Track each checkbox in issues or PRs so reviewers can see coverage at
a glance.

## 0. Align on Scope

- [ ] Confirm which surfaces (landing page, mini app, admin dashboard, marketing
      embeds) require Dynamic UI updates and whether they are SSR, SSG, or
      client-rendered.
- [ ] Review related docs: [Development Workflow](./DEVELOPMENT_WORKFLOW.md),
      [code structure](./code-structure.md), and any flow runbooks (Mini App,
      Checkout, Admin) that describe impacted routes.
- [ ] Capture acceptance criteria for both the visual layer and data
      interactions (loading states, optimistic updates, admin-specific
      permissions).
- [ ] Identify dependencies on Supabase, Supabase Edge Functions, Go services,
      or queues so backend contracts stay compatible with UI expectations.

## 1. Prepare Dynamic UI Foundation

- [ ] Verify Dynamic UI assets are available to the target app
      (`dynamic-ui.css`/`dynamic-ui.js` via static import, bundler entry, or
      module federation) and match the version consumed by the React components
      in `apps/web/components/dynamic-ui/`.
- [ ] Document any required global styles (body background, typography) or
      layout constraints (grid, spacing tokens) before coding to avoid ad-hoc
      overrides.
- [ ] Plan responsive breakpoints and theme variants (light/dark) using Dynamic
      UI tokens so components remain consistent across surfaces.
- [ ] Decide whether custom Dynamic UI components should live alongside existing
      shared components or in an app-specific folder; create stubs with prop
      signatures when collaboration is needed.
- [ ] Ensure the target React surface wraps its root layout with
      `MotionConfigProvider` so reduced-motion preferences are respected
      automatically.

## 2. Frontend Implementation

### Layout & Components

- [ ] Reuse or extend existing layout wrappers (`dynamic-container`, shared page
      shells) instead of redefining grid and spacing utilities.
- [ ] Reach for the motion-enabled Dynamic UI primitives (`<DynamicContainer>`,
      `<DynamicButton>`) before composing raw `motion.*` elements so animation
      tokens stay centralized.
- [ ] Ensure Dynamic UI components accept data via typed props and expose
      slots/hooks for dynamic states (loading, empty, error) rather than
      hardcoding copy.
- [ ] Encapsulate repeated UI into composable components and update
      Storybook/MDX (if applicable) or inline docs that explain usage
      constraints.

### Styling & Theming

- [ ] Apply semantic Dynamic UI classes (`dynamic-btn`, `primary`, `outline`,
      typography helpers) or Tailwind tokens that map to the same palette; avoid
      raw hex colors or inline styles except for prototypes.
- [ ] Confirm interactive states (hover, focus, pressed, disabled) respect
      accessibility contrast and use the shared transition durations.
- [ ] Keep custom CSS scoped via module files or `:where` selectors so global
      Dynamic UI styles remain unmodified.
- [ ] Route theme toggles through `useTheme` so updates persist via `theme-save`
      and immediately reflect across the marketing shell, Telegram Mini App, and
      dashboard surfaces.
- [ ] Use the shared motion tokens exported from `@/lib/motion-variants`
      (`dynamicMotionVariants`, `DYNAMIC_MOTION_SPRINGS`, etc.) instead of
      redefining easing, durations, or stagger timings.

### Accessibility & Interaction

- [ ] Provide accessible names, roles, and ARIA attributes for interactive
      Dynamic UI components (buttons, dialogs, tabs) and ensure keyboard
      navigation flows match WCAG.
- [ ] Wire up form validation and error messaging so assistive tech announces
      issues; include server-error fallback copy.
- [ ] Test front-end logic with sample data (approved payment, manual review,
      failure) to confirm state machines render the correct Dynamic UI variants.
- [ ] Verify both React (`useReducedMotion`) and static (`data-dynamic-reveal`)
      surfaces honour `prefers-reduced-motion` and still present content when
      JavaScript is disabled.

## 3. Backend UI Support

- [ ] Audit API routes, Supabase RPCs, and Edge Functions that feed the UI to
      confirm they expose all fields required for Dynamic UI components (labels,
      icons, status flags, pagination counts).
- [ ] Guarantee idempotent endpoints (especially webhook-backed flows) still
      return quickly with HTTP 200 while queueing heavy work, per the bot’s hard
      rules.
- [ ] Validate data contracts with unit/integration tests or Swagger/OpenAPI
      notes when UI expects new payload shapes.
- [ ] Add feature flags or configuration switches for Dynamic UI rollouts so you
      can gate new components by tenant, plan, or environment.

## 4. QA & Launch

- [ ] Run automated checks relevant to the touchpoints (`npm run lint`,
      `npm run test`, `npm run verify`, `bash scripts/fix_and_check.sh`, or
      service-specific builds like `npm run build:miniapp`).
- [ ] Execute manual QA across viewports (mobile, tablet, desktop) and theme
      variants; capture screenshots or recordings that demonstrate the Dynamic
      UI changes.
- [ ] Verify hydration/SSR boundaries in Next.js apps
      (`npm run build && npm run start` locally or preview deploy) and ensure no
      hydration mismatch warnings occur.
- [ ] Document schema or API changes in the appropriate `docs/` guide and link
      the checklist in the PR description with notes on data migrations, feature
      flags, and manual QA evidence.
- [ ] Monitor Supabase logs, queue workers, and browser consoles after
      deployment to catch regressions; plan rollback steps if Dynamic UI
      components impact protected payment flows.
- [ ] Smoke test static marketing pages that rely on `dynamic-ui.js` helpers to
      confirm `window.OnceUI.observeReveals` works for dynamically injected
      nodes and that content remains visible without JavaScript.
