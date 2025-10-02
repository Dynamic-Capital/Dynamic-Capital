# Miniapp Navigation Dropbox Integration Plan

## Objective
Design and implement a "Dropbox" navigation entry inside the Dynamic Capital miniapp header so that investors can quickly switch into Dropbox-powered workflows from the Dynamic Market shell.

## Background
- `apps/web/components/miniapp/NavigationHeader.tsx` renders the hero header and horizontal pill navigation based on the `MINIAPP_TABS` registry defined in `apps/web/components/miniapp/navigation.ts`.
- Analytics and haptic feedback for tab changes are wired through `@/lib/metrics` and `@/lib/telegram` respectively, so any new navigation affordance must remain compatible with the existing tracking semantics.
- The bottom navigation (`apps/web/components/miniapp/BottomNav.tsx`) mirrors the same tab registry to keep navigation surfaces aligned across the miniapp experience.

Adding a Dropbox destination requires extending the tab registry and visuals while preserving the existing animation, focus, and accessibility behaviours.

## Deliverables
1. New Dropbox tab metadata (label, eyebrow, description, icon, analytics event identifiers, tone/badges) in `MINIAPP_TABS`.
2. Header pill layout updates to gracefully accommodate the extra tab, including responsive adjustments if horizontal space becomes constrained.
3. Optional overflow/dropdown behaviour if visual QA shows pill crowding on small viewports.
4. Route scaffolding under `apps/web/app/(miniapp)/miniapp/(tabs)/` that resolves the Dropbox path to a real page, even if the content initially ships as a placeholder stub.
5. Analytics + haptic instrumentation updates to ensure Dropbox navigation is measurable and tactile feedback remains consistent with other tabs.
6. Test plan updates (unit tests and/or Storybook) covering the Dropbox tab rendering and navigation flow.

## Implementation Steps
1. **Audit requirements**
   - Confirm the final Dropbox naming, iconography, and analytics identifiers with product/design.
   - Validate that a corresponding page/module exists or define the minimal placeholder that satisfies routing.

2. **Extend navigation registry**
   - Update `apps/web/components/miniapp/navigation.ts` by appending a Dropbox `MiniAppTab` entry. Reuse an existing icon from `lucide-react` or supply a custom SVG if specified.
   - Ensure the new entry includes eyebrow, label, description, badge/meta config, analytics event names, and route path (e.g., `/miniapp/dynamic-dropbox`).

3. **Provision Dropbox route**
   - Create `apps/web/app/(miniapp)/miniapp/(tabs)/dynamic-dropbox/page.tsx` (or the agreed slug) with a stub component that reuses the shared layout wrapper.
   - Wire any required loaders/services so the Dropbox screen can hydrate with real data when available.

4. **Tighten header layout**
   - Review `NavigationHeader.tsx` spacing constants. If six pills cause overflow on small viewports, introduce responsive width adjustments or allow the carousel to scroll further.
   - If product mandates a dropdown rather than a pill, prototype a `NavigationMenu` component that wraps the Dropbox entry and displays nested links/actions.

5. **Sync other surfaces**
   - Mirror the Dropbox tab inside `apps/web/components/miniapp/BottomNav.tsx` to keep bottom navigation consistent.
   - Update any deep links, default redirects, or onboarding flows that assume the previous tab set.

6. **Instrumentation and feedback**
   - Register new analytics constants for Dropbox navigation in `@/lib/metrics` and ensure `track()` receives the new event when the tab is opened.
   - Confirm haptic feedback triggers with the correct intensity (likely `"medium"` on initial navigation).

7. **Quality gates**
   - Update or add Vitest coverage under `apps/web/components/miniapp/__tests__/` to assert the Dropbox tab renders and is marked active on navigation.
   - Run `npm run format`, `npm run lint`, and `npm run typecheck` to maintain repo standards.
   - Execute focused Vitest suites for `NavigationHeader`/`WatchlistPage` if they rely on the updated registry.

## Risks & Mitigations
- **UI crowding**: Additional pill may reduce readability on smaller devices. Mitigate with responsive spacing or overflow controls.
- **Analytics drift**: Forgetting to register the new event could lead to reporting gaps. Mitigate by pairing the code change with metrics schema updates and QA in staging.
- **Route conflicts**: Ensure the Dropbox slug does not collide with existing routes and that deep links update accordingly.

## Acceptance Criteria
- Dropbox tab appears in both header and bottom navigation, adopting the same interaction affordances as other tabs.
- Navigating to the Dropbox tab updates the header hero content (icon, eyebrow, description) and triggers analytics + haptic events.
- Route resolves without runtime errors and is covered by regression tests and lint/type checks.
