"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Column, Grid, Icon, Row } from ".";
import styles from "./Accordion.module.scss";
import classNames from "classnames";
const Accordion = forwardRef(
  (
    {
      title,
      children,
      open = false,
      onToggle,
      iconRotation = 180,
      radius = "m",
      icon = "chevronDown",
      size = "m",
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(open);
    useEffect(() => {
      setIsOpen(open);
    }, [open]);
    // Use controlled state when onToggle is provided, otherwise use internal state
    const isAccordionOpen = onToggle ? open : isOpen;
    const toggleAccordion = useCallback(() => {
      if (onToggle) {
        // If onToggle is provided, let the parent control the state
        onToggle();
      } else {
        // Otherwise, manage state internally
        setIsOpen((prev) => !prev);
      }
    }, [onToggle]);
    useImperativeHandle(ref, () => {
      const methods = {
        toggle: toggleAccordion,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      };
      return Object.assign(document.createElement("div"), methods);
    }, [toggleAccordion]);
    return (_jsxs(Column, {
      fillWidth: true,
      children: [
        _jsxs(Row, {
          tabIndex: 0,
          className: classNames(styles.accordion, className),
          style: style,
          cursor: "interactive",
          transition: "macro-medium",
          paddingY: size === "s" ? "8" : size === "m" ? "12" : "16",
          paddingX: size === "s" ? "12" : size === "m" ? "16" : "20",
          vertical: "center",
          horizontal: "between",
          onClick: toggleAccordion,
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleAccordion();
            }
          },
          "aria-expanded": isAccordionOpen,
          "aria-controls": "accordion-content",
          radius: radius,
          role: "button",
          children: [
            _jsx(Row, {
              fillWidth: true,
              textVariant: "heading-strong-s",
              children: title,
            }),
            _jsx(Icon, {
              name: icon,
              size: size === "s" ? "xs" : "s",
              onBackground: isAccordionOpen ? "neutral-strong" : "neutral-weak",
              style: {
                display: "flex",
                transform: isAccordionOpen
                  ? `rotate(${iconRotation}deg)`
                  : "rotate(0deg)",
                transition: "var(--transition-micro-medium)",
              },
            }),
          ],
        }),
        _jsx(Grid, {
          id: "accordion-content",
          fillWidth: true,
          transition: "macro-medium",
          style: {
            gridTemplateRows: isAccordionOpen ? "1fr" : "0fr",
          },
          "aria-hidden": !isAccordionOpen,
          children: _jsx(Row, {
            fillWidth: true,
            minHeight: 0,
            overflow: "hidden",
            children: _jsx(Column, {
              fillWidth: true,
              paddingX: size === "s" ? "12" : size === "m" ? "16" : "20",
              paddingTop: "8",
              paddingBottom: "16",
              ...rest,
              children: children,
            }),
          }),
        }),
      ],
    }));
  },
);
Accordion.displayName = "Accordion";
export { Accordion };
//# sourceMappingURL=Accordion.js.map
