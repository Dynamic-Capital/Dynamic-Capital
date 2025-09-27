"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { forwardRef } from "react";
import { Cursor, ServerFlex } from ".";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLayout } from "..";
const ClientFlex = forwardRef(
  ({ cursor, hide, xl, l, m, s, xs, ...props }, ref) => {
    const elementRef = useRef(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const { currentBreakpoint } = useLayout();
    // Combine refs
    const combinedRef = (node) => {
      elementRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };
    const appliedResponsiveStyles = useRef(new Set());
    const baseStyleRef = useRef({});
    // Responsive styles logic (client-side only)
    const applyResponsiveStyles = useCallback(() => {
      if (!elementRef.current) {
        return;
      }
      const element = elementRef.current;
      // Update base styles when style prop changes
      if (props.style) {
        baseStyleRef.current = { ...props.style };
      }
      // Determine which responsive props to apply based on current breakpoint
      let currentResponsiveProps = null;
      if (currentBreakpoint === "xl" && xl) {
        currentResponsiveProps = xl;
      } else if (currentBreakpoint === "l" && l) {
        currentResponsiveProps = l;
      } else if (currentBreakpoint === "m" && m) {
        currentResponsiveProps = m;
      } else if (currentBreakpoint === "s" && s) {
        currentResponsiveProps = s;
      } else if (currentBreakpoint === "xs" && xs) {
        currentResponsiveProps = xs;
      }
      // Clear only responsive styles, not base styles
      appliedResponsiveStyles.current.forEach((key) => {
        element.style[key] = "";
      });
      appliedResponsiveStyles.current.clear();
      // Reapply base styles
      if (baseStyleRef.current) {
        Object.entries(baseStyleRef.current).forEach(([key, value]) => {
          element.style[key] = value;
        });
      }
      // Apply new responsive styles if we have them for current breakpoint
      if (currentResponsiveProps) {
        if (currentResponsiveProps.style) {
          Object.entries(currentResponsiveProps.style).forEach(
            ([key, value]) => {
              element.style[key] = value;
              appliedResponsiveStyles.current.add(key);
            },
          );
        }
        if (currentResponsiveProps.aspectRatio) {
          element.style.aspectRatio = currentResponsiveProps.aspectRatio;
          appliedResponsiveStyles.current.add("aspect-ratio");
        }
      }
    }, [xl, l, m, s, xs, props.style, currentBreakpoint]);
    useEffect(() => {
      applyResponsiveStyles();
    }, [applyResponsiveStyles]);
    // Detect touch device
    useEffect(() => {
      const checkTouchDevice = () => {
        const hasTouch = "ontouchstart" in window ||
          navigator.maxTouchPoints > 0;
        const hasPointer = window.matchMedia("(pointer: fine)").matches;
        setIsTouchDevice(hasTouch && !hasPointer);
      };
      checkTouchDevice();
      const mediaQuery = window.matchMedia("(pointer: fine)");
      const handlePointerChange = () => checkTouchDevice();
      mediaQuery.addEventListener("change", handlePointerChange);
      return () => {
        mediaQuery.removeEventListener("change", handlePointerChange);
      };
    }, []);
    // Determine if we should hide the default cursor
    const shouldHideCursor = typeof cursor === "object" && cursor &&
      !isTouchDevice;
    // Determine if we should apply the hide class based on current breakpoint
    const shouldApplyHideClass = () => {
      try {
        const { currentBreakpoint } = useLayout();
        // Logic matching the shouldHide function in Flex component
        if (currentBreakpoint === "xl") {
          if (xl?.hide !== undefined) {
            return xl.hide === true;
          }
          return hide === true;
        }
        if (currentBreakpoint === "l") {
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          return hide === true;
        }
        if (currentBreakpoint === "m") {
          if (m?.hide !== undefined) {
            return m.hide === true;
          }
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          if (xl?.hide !== undefined) {
            return xl.hide === true;
          }
          return hide === true;
        }
        if (currentBreakpoint === "s") {
          if (s?.hide !== undefined) {
            return s.hide === true;
          }
          if (m?.hide !== undefined) {
            return m.hide === true;
          }
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          if (xl?.hide !== undefined) {
            return xl.hide === true;
          }
          return hide === true;
        }
        if (currentBreakpoint === "xs") {
          if (xs?.hide !== undefined) {
            return xs.hide === true;
          }
          if (s?.hide !== undefined) {
            return s.hide === true;
          }
          if (m?.hide !== undefined) {
            return m.hide === true;
          }
          if (l?.hide !== undefined) {
            return l.hide === true;
          }
          if (xl?.hide !== undefined) {
            return xl.hide === true;
          }
          return hide === true;
        }
        return hide === true;
      } catch {
        return hide === true;
      }
    };
    // Apply hide class only if it should be hidden at current breakpoint
    const effectiveHide = shouldApplyHideClass();
    return (_jsxs(_Fragment, {
      children: [
        _jsx(ServerFlex, {
          ...props,
          xl: xl,
          l: l,
          m: m,
          s: s,
          xs: xs,
          hide: effectiveHide,
          ref: combinedRef,
          style: {
            ...props.style,
            cursor: shouldHideCursor ? "none" : props.style?.cursor,
          },
        }),
        typeof cursor === "object" && cursor && !isTouchDevice &&
        (_jsx(Cursor, { cursor: cursor, elementRef: elementRef })),
      ],
    }));
  },
);
ClientFlex.displayName = "ClientFlex";
export { ClientFlex };
//# sourceMappingURL=ClientFlex.js.map
