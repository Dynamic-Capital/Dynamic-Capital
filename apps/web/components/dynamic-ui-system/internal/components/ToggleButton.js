"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { ElementType, Flex, Icon } from ".";
import styles from "./ToggleButton.module.scss";
const ToggleButton = forwardRef(({
  label,
  selected = false,
  variant = "ghost",
  size = "m",
  radius,
  horizontal = "center",
  fillWidth = false,
  weight = "default",
  truncate = false,
  prefixIcon,
  suffixIcon,
  className,
  style,
  children,
  href,
  ...props
}, ref) => {
  return (_jsxs(ElementType, {
    ref: ref,
    href: href,
    className: classNames(
      styles.button,
      styles[variant],
      styles[size],
      selected && styles.selected,
      radius === "none"
        ? "radius-none"
        : radius
        ? `radius-${size}-${radius}`
        : `radius-${size}`,
      "text-decoration-none",
      "button",
      "cursor-interactive",
      {
        ["fill-width"]: fillWidth,
        ["fit-width"]: !fillWidth,
        ["justify-" + horizontal]: horizontal,
      },
      className,
    ),
    style: style,
    ...props,
    children: [
      prefixIcon &&
      _jsx(Icon, { name: prefixIcon, size: size === "l" ? "s" : "xs" }),
      (label || children) && (_jsx(Flex, {
        fillWidth: fillWidth,
        horizontal: horizontal,
        textWeight: weight,
        paddingX: size === "s" ? "2" : "4",
        textSize: size === "l" ? "m" : "s",
        className: "font-label",
        position: "static",
        children: label || children,
      })),
      suffixIcon &&
      _jsx(Icon, { name: suffixIcon, size: size === "l" ? "s" : "xs" }),
    ],
  }));
});
ToggleButton.displayName = "ToggleButton";
export { ToggleButton };
//# sourceMappingURL=ToggleButton.js.map
