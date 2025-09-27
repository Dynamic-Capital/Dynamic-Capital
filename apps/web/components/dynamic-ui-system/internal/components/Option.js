"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import classNames from "classnames";
import { Column, ElementType, Row, Text } from ".";
import styles from "./Option.module.scss";
import { forwardRef, useEffect, useRef, useState } from "react";
const Option = forwardRef(
  (
    {
      label,
      value,
      href,
      hasPrefix,
      hasSuffix,
      description,
      danger,
      selected,
      disabled = false,
      highlighted,
      tabIndex,
      onClick,
      onLinkClick,
      children,
      ...flex
    },
    ref,
  ) => {
    // Track if the element has the highlighted class applied by ArrowNavigation
    const [isHighlightedByClass, setIsHighlightedByClass] = useState(false);
    // Use a more generic type that works with ElementType
    const elementRef = useRef(null);
    // Check for highlighted class applied by ArrowNavigation
    useEffect(() => {
      if (!elementRef.current) {
        return;
      }
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            (mutation.attributeName === "class" ||
              mutation.attributeName === "data-highlighted")
          ) {
            if (mutation.target instanceof HTMLElement) {
              const element = mutation.target;
              setIsHighlightedByClass(
                element.classList.contains("highlighted") ||
                  element.getAttribute("data-highlighted") === "true",
              );
            }
          }
        });
      });
      observer.observe(elementRef.current, {
        attributes: true,
        attributeFilter: ["class", "data-highlighted"],
      });
      // Initial check
      setIsHighlightedByClass(
        elementRef.current.classList.contains("highlighted") ||
          elementRef.current.getAttribute("data-highlighted") === "true",
      );
      return () => observer.disconnect();
    }, []);
    return (_jsx(ElementType, {
      tabIndex: tabIndex,
      ref: (el) => {
        // Forward the ref
        if (typeof ref === "function") {
          ref(el);
        } else if (ref) {
          ref.current = el;
        }
        // Store our own ref
        elementRef.current = el;
      },
      href: href,
      disabled: disabled,
      className: "reset-button-styles fill-width",
      onLinkClick: onLinkClick,
      onClick: () => onClick?.(value),
      "data-value": value,
      role: "option",
      "aria-selected": selected,
      "aria-disabled": disabled,
      onKeyDown: (e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          e.stopPropagation();
          elementRef.current?.click();
        }
      },
      children: _jsxs(Row, {
        fillWidth: true,
        vertical: "center",
        paddingX: "12",
        paddingY: "8",
        gap: "12",
        radius: "m",
        tabIndex: -1,
        borderWidth: 1,
        borderStyle: "solid",
        cursor: disabled ? "not-allowed" : "interactive",
        transition: "micro-medium",
        onBackground: "neutral-strong",
        className: classNames(styles.option, {
          [styles.danger]: danger,
          [styles.selected]: selected,
          [styles.highlighted]: highlighted || isHighlightedByClass,
          [styles.disabled]: disabled,
        }),
        ...flex,
        children: [
          hasPrefix &&
          _jsx(Row, { className: styles.prefix, children: hasPrefix }),
          children,
          _jsxs(Column, {
            horizontal: "start",
            style: {
              whiteSpace: "nowrap",
            },
            fillWidth: true,
            children: [
              _jsx(Text, {
                onBackground: "neutral-strong",
                variant: "label-default-s",
                children: label,
              }),
              description &&
              (_jsx(Text, {
                variant: "body-default-xs",
                onBackground: "neutral-weak",
                children: description,
              })),
            ],
          }),
          hasSuffix &&
          _jsx(Row, { className: styles.suffix, children: hasSuffix }),
        ],
      }),
    }));
  },
);
Option.displayName = "Option";
export { Option };
//# sourceMappingURL=Option.js.map
