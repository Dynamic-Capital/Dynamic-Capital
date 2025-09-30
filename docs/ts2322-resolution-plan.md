# Plan to Resolve TS2322 Errors in Enhanced Interaction Button and Smart Card

## Context
`npm run typecheck` currently fails due to two `TS2322` assignment errors when Framer Motion components receive DOM `drag` event handlers from the React DOM attribute types that our components extend. Framer Motion expects pointer/mouse/touch event signatures for `onDrag`-related props, while `React.ButtonHTMLAttributes` and `React.HTMLAttributes` provide `DragEvent` signatures. The mismatch causes TypeScript to reject the spread props we forward into `<motion.button>` and `<motion.div>`.

## Goals
- Restore successful `npm run typecheck` runs for `apps/web` without suppressing type safety.
- Ensure `EnhancedInteractionButton` and `SmartCard` keep the same external API surface while remaining ergonomic for Framer Motion usage.
- Avoid regressions to existing UI behavior (loading states, ripple effects, interactive motion variants).

## Step-by-step Plan
1. **Audit Prop Interfaces**
   - Review `EnhancedInteractionButtonProps` and `SmartCardProps` to catalog the DOM attributes and Framer Motion props we want to support.
   - Identify the exact set of drag-related DOM props (`onDrag`, `onDragStart`, etc.) that conflict with Framer Motion's `HTMLMotionProps` signatures.

2. **Define Motion-Compatible Base Props**
   - Introduce helper utility types (e.g., `type MotionButtonBaseProps = Omit<HTMLMotionProps<"button">, "ref">`) that capture Framer Motion's expectations.
   - Compose our public props from these motion-aware bases while selectively mixing in standard DOM attributes that remain compatible (e.g., `type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, DragHandlers>`).

3. **Merge Custom Component Props Safely**
   - Extend the new base types with existing variant props (`VariantProps<typeof ...>`) and custom options (`loading`, `hoverEffect`, etc.).
   - Ensure any overlapping keys (such as `onClick`, `children`, `className`) preserve the correct typing order using `Omit` to avoid conflicts.

4. **Propagate Refs Correctly**
   - Keep using `React.forwardRef` but update the implementation so the forwarded ref is assigned to the underlying motion element (e.g., combine `ref` with internal `buttonRef` via `useImperativeHandle`).
   - Verify that the imperative handle respects the new typing (possibly using `useMergedRef` helper or manual callback ref) so we do not regress ripple logic.

5. **Update Component Implementations**
   - Replace the current spread order (`{...props}`) with explicit separation if needed to prevent conflicting handler types from leaking through.
   - If some handlers should still be exposed, re-map them to Framer Motion's pointer-based signatures with adapter functions.

6. **Regression Testing**
   - Run `npm run typecheck` to confirm the `TS2322` errors are resolved.
   - Execute `npm run lint` and relevant Storybook/manual QA (if available) to ensure no linting or runtime issues appear.
   - Optionally add lightweight unit/interaction tests covering ripple/haptic toggles and interactive cards to guard against future regressions.

7. **Documentation & Follow-up**
   - Document the new prop typing approach in component comments or internal docs so future contributors understand how to extend these motion-based components safely.
   - Monitor downstream usage to ensure no consumers relied on the removed drag event typings; provide migration guidance if necessary.

## Risks & Mitigations
- **Breaking consumer expectations**: Removing DOM drag handler props could affect callers. Mitigate by scanning the codebase (`rg "onDrag" apps/web`) to check usage and offering alternative pointer-based handlers if needed.
- **Ref wiring regressions**: Updating `forwardRef` logic might disrupt existing `ref` usage. Mitigate by adding a regression test or Storybook check verifying imperative ref calls still work.
- **Type drift with Framer Motion updates**: Encapsulate motion types in a helper module so we can adjust in one place if Framer Motion changes signatures.

## Timeline
- **Day 1**: Implement prop type refactor for `EnhancedInteractionButton`, update ref handling, run checks.
- **Day 2**: Apply the same strategy to `SmartCard`, add documentation, and re-run the tooling suite.
- **Day 3**: Address any downstream usage impacts, add regression tests if feasible, and finalize documentation.
