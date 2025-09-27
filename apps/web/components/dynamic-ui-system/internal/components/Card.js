"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Flex } from ".";
import styles from "./Card.module.scss";
import { ElementType } from "./ElementType";
import classNames from "classnames";
const Card = forwardRef(
  ({ children, href, onClick, style, className, fillHeight, ...rest }, ref) => {
    return (_jsx(ElementType, {
      tabIndex: onClick || href ? 0 : undefined,
      className: classNames(
        "reset-button-styles",
        "display-flex",
        "fill-width",
        fillHeight ? "fill-height" : undefined,
        "min-width-0",
        (onClick || href) && "focus-ring",
        (onClick || href) && "radius-l",
      ),
      href: href,
      onClick: onClick && onClick,
      role: onClick ? "button" : href ? "link" : "none",
      ref: ref,
      children: _jsx(Flex, {
        background: "surface",
        onBackground: "neutral-strong",
        transition: "macro-medium",
        border: "neutral-medium",
        cursor: "interactive",
        align: "left",
        className: classNames(styles.card, className),
        onClick: onClick && onClick,
        style: {
          ...style,
        },
        ...rest,
        children: children,
      }),
    }));
  },
);
Card.displayName = "Card";
export { Card };
//# sourceMappingURL=Card.js.map
