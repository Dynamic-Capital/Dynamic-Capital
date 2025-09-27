import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { useLayout } from "../contexts";
import { ClientGrid } from "./ClientGrid";
import { ServerGrid } from "./ServerGrid";
const Grid = forwardRef(
  ({ cursor, xl, l, m, s, xs, style, hide, ...props }, ref) => {
    // Check if component should be hidden based on layout context
    const shouldHide = () => {
      if (!hide && !xl?.hide && !l?.hide && !m?.hide && !s?.hide && !xs?.hide) {
        return false;
      }
      try {
        const { isBreakpoint } = useLayout();
        // Get the current breakpoint from the layout context
        const currentBreakpoint = isBreakpoint("xs")
          ? "xs"
          : isBreakpoint("s")
          ? "s"
          : isBreakpoint("m")
          ? "m"
          : isBreakpoint("l")
          ? "l"
          : "xl";
        // Max-width CSS-like behavior: check from largest to smallest breakpoint
        // Only apply hiding when hide is explicitly true
        // Check xl breakpoint
        if (currentBreakpoint === "xl") {
          // For xl, we only apply the default hide prop
          return hide === true;
        }
        // Check large breakpoint
        if (currentBreakpoint === "l") {
          // If l.hide is explicitly set, use that value
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          // Otherwise fall back to default hide prop
          return hide === true;
        }
        // Check medium breakpoint
        if (currentBreakpoint === "m") {
          // If m.hide is explicitly set, use that value
          if (m?.hide !== undefined) {
            return m.hide === true;
          }
          // Otherwise check if l.hide is set (cascading down)
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          // Finally fall back to default hide prop
          return hide === true;
        }
        // Check small breakpoint
        if (currentBreakpoint === "s") {
          // If s.hide is explicitly set, use that value
          if (s?.hide !== undefined) {
            return s.hide === true;
          }
          // Otherwise check if m.hide is set (cascading down)
          if (m?.hide !== undefined) {
            return m.hide === true;
          }
          // Otherwise check if l.hide is set (cascading down)
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          // Finally fall back to default hide prop
          return hide === true;
        }
        // Check xs breakpoint
        if (currentBreakpoint === "xs") {
          // For xs, we cascade down from all larger breakpoints
          if (s?.hide !== undefined) {
            return s.hide === true;
          }
          if (m?.hide !== undefined) {
            return m.hide === true;
          }
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          return hide === true;
        }
        // Default fallback
        return hide === true;
      } catch {
        // If LayoutProvider is not available, fall back to CSS classes
        return false;
      }
    };
    // Check if we need client-side functionality
    const needsClientSide = () => {
      // Custom cursor requires client-side
      if (typeof cursor === "object" && cursor) {
        return true;
      }
      // Responsive props require client-side
      if (xl || l || m || s || xs) {
        return true;
      }
      // Dynamic styles require client-side
      if (
        style &&
        typeof style === "object" &&
        Object.keys(style).length > 0
      ) {
        return true;
      }
      return false;
    };
    // If component should be hidden, don't render it
    if (shouldHide()) {
      return null;
    }
    // Use client component if any client-side functionality is needed
    if (needsClientSide()) {
      return (_jsx(ClientGrid, {
        ref: ref,
        cursor: cursor,
        xl: xl,
        l: l,
        m: m,
        s: s,
        xs: xs,
        style: style,
        hide: hide,
        ...props,
      }));
    }
    // Use server component for static content
    return _jsx(ServerGrid, { ref: ref, cursor: cursor, hide: hide, ...props });
  },
);
Grid.displayName = "Grid";
export { Grid };
//# sourceMappingURL=Grid.js.map
