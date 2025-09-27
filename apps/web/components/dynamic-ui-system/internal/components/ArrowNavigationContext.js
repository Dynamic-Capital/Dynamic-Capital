"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef } from "react";
import { useArrowNavigation } from "../hooks/useArrowNavigation";
import { FocusTrap } from "./FocusTrap";
const ArrowNavigationContext = createContext(null);
export const ArrowNavigation = ({
  layout,
  itemCount,
  columns,
  onSelect,
  onFocusChange,
  wrap,
  initialFocusedIndex,
  itemSelector,
  autoFocus,
  disabled,
  children,
  className,
  style,
  role,
  "aria-label": ariaLabel,
  trapFocus = false,
  focusTrapActive = true,
  onEscape,
  autoFocusTrap = true,
  restoreFocus = true,
}) => {
  const containerRef = useRef(null);
  const navigation = useArrowNavigation({
    layout,
    itemCount,
    columns,
    containerRef,
    onSelect,
    onFocusChange,
    wrap,
    initialFocusedIndex,
    itemSelector,
    autoFocus,
    disabled,
  });
  // Focus the container when autoFocus is enabled
  useEffect(() => {
    if (autoFocus && containerRef.current && !disabled) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.focus();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);
  // Determine the appropriate role based on layout if not provided
  const defaultRole = layout === "grid" ? "grid" : "listbox";
  // Create the navigation container
  const navigationContainer = _jsx("div", {
    ref: containerRef,
    className: className,
    style: { ...style, outline: "none" },
    onKeyDown: (e) => {
      navigation.handleKeyDown(e);
    },
    role: role || defaultRole,
    "aria-label": ariaLabel,
    tabIndex: -1,
    children: children,
  });
  return (_jsx(ArrowNavigationContext.Provider, {
    value: navigation,
    children: trapFocus
      ? (_jsx(FocusTrap, {
        active: focusTrapActive,
        onEscape: onEscape,
        autoFocus: autoFocusTrap,
        restoreFocus: restoreFocus,
        children: navigationContainer,
      }))
      : navigationContainer,
  }));
};
/**
 * Hook to access the ArrowNavigation context
 */
export const useArrowNavigationContext = () => {
  const context = useContext(ArrowNavigationContext);
  if (!context) {
    throw new Error(
      "useArrowNavigationContext must be used within an ArrowNavigation component",
    );
  }
  return context;
};
/**
 * Higher-order component to make a component navigable with arrow keys
 */
export function withArrowNavigation(Component, options) {
  return (
    { children, ...props },
  ) => (_jsx(ArrowNavigation, {
    ...options,
    children: _jsx(Component, { ...props, children: children }),
  }));
}
export default ArrowNavigation;
//# sourceMappingURL=ArrowNavigationContext.js.map
