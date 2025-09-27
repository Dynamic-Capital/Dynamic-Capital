"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { forwardRef } from "react";
import { Arrow, Flex, Icon, SmartLink } from ".";
import styles from "./Badge.module.scss";
import classNames from "classnames";
const Badge = forwardRef(
  (
    {
      title,
      icon,
      href,
      arrow = href ? true : false,
      children,
      effect = true,
      className,
      style,
      id,
      ...rest
    },
    ref,
  ) => {
    const content = _jsxs(Flex, {
      id: id || "badge",
      paddingX: "20",
      paddingY: "12",
      fitWidth: true,
      className: classNames(effect ? styles.animation : undefined, className),
      style: style,
      vertical: "center",
      radius: "full",
      background: "neutral-weak",
      onBackground: "brand-strong",
      border: "brand-alpha-medium",
      textVariant: "label-strong-s",
      ...rest,
      children: [
        icon &&
        _jsx(Icon, {
          marginRight: "8",
          size: "s",
          name: icon,
          onBackground: "brand-medium",
        }),
        title,
        children,
        arrow && _jsx(Arrow, { trigger: `#${id || "badge"}` }),
      ],
    });
    if (href) {
      return (_jsx(SmartLink, {
        unstyled: true,
        className: className,
        style: {
          borderRadius: "var(--radius-full)",
          ...style,
        },
        href: href,
        ref: ref,
        children: content,
      }));
    }
    return React.cloneElement(content, {
      ref: ref,
    });
  },
);
Badge.displayName = "Badge";
export { Badge };
//# sourceMappingURL=Badge.js.map
