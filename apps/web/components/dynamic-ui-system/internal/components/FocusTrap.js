"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
const FocusTrap = (
  {
    children,
    active,
    onEscape,
    containerRef: externalRef,
    className,
    style,
    initialFocusRef,
    returnFocusRef,
    restoreFocus = true,
    autoFocus = true,
  },
) => {
  const internalRef = useRef(null);
  const containerRef = externalRef || internalRef;
  const previouslyFocusedElement = useRef(null);
  // Store the previously focused element when the trap becomes active
  useEffect(() => {
    if (active) {
      previouslyFocusedElement.current = document.activeElement;
      if (autoFocus) {
        // Focus the specified initial element or the first focusable element
        if (initialFocusRef && initialFocusRef.current) {
          initialFocusRef.current.focus({ preventScroll: true });
        } else if (containerRef.current) {
          const focusableElements = getFocusableElements(containerRef.current);
          if (focusableElements.length > 0) {
            focusableElements[0].focus({ preventScroll: true });
          } else {
            // If no focusable elements, focus the container itself
            containerRef.current.focus({ preventScroll: true });
          }
        }
      }
    } else if (!active && restoreFocus && previouslyFocusedElement.current) {
      // When deactivated, return focus to the specified element or the previously focused element
      const elementToFocus = returnFocusRef?.current ||
        previouslyFocusedElement.current;
      if (elementToFocus && typeof elementToFocus.focus === "function") {
        elementToFocus.focus({ preventScroll: true });
      }
    }
  }, [
    active,
    autoFocus,
    initialFocusRef,
    returnFocusRef,
    restoreFocus,
    containerRef,
  ]);
  // Handle keyboard events for focus trapping
  const handleKeyDown = (e) => {
    if (!active) {
      return;
    }
    // Handle escape key
    if (e.key === "Escape" && onEscape) {
      e.preventDefault();
      onEscape();
      return;
    }
    // Don't handle arrow keys - let ArrowNavigation handle them
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      return;
    }
    // Handle tab key for focus trapping
    if (e.key === "Tab" && containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length === 0) {
        return;
      }
      // Get the first and last focusable elements
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      // Handle tab and shift+tab to cycle through focusable elements
      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus({ preventScroll: true });
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus({ preventScroll: true });
        }
      }
    }
  };
  // Helper function to get all focusable elements within a container
  const getFocusableElements = (container) => {
    return Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
  };
  return (_jsx("div", {
    ref: containerRef,
    className: className,
    style: style,
    onKeyDown: handleKeyDown,
    tabIndex: -1,
    children: children,
  }));
};
FocusTrap.displayName = "FocusTrap";
export { FocusTrap };
//# sourceMappingURL=FocusTrap.js.map
