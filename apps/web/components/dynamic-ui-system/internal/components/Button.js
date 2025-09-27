"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { ElementType } from "./ElementType";
import classNames from "classnames";
import { Arrow, Flex, Icon, Spinner } from ".";
import styles from "./Button.module.scss";
const Button = forwardRef(({
  variant = "primary",
  size = "m",
  radius,
  label,
  weight = "strong",
  children,
  prefixIcon,
  suffixIcon,
  loading = false,
  disabled = false,
  fillWidth = false,
  horizontal = "center",
  href,
  id,
  arrowIcon = false,
  className,
  style,
  ...props
}, ref) => {
  const iconSize = size === "l" ? "s" : size === "m" ? "s" : "xs";
  const radiusSize = size === "s" || size === "m" ? "m" : "l";
  return (_jsxs(ElementType, {
    id: id,
    href: href,
    ref: ref,
    disabled: disabled,
    className: classNames(
      styles.button,
      styles[variant],
      styles[size],
      radius === "none"
        ? "radius-none"
        : radius
        ? `radius-${radiusSize}-${radius}`
        : `radius-${radiusSize}`,
      "text-decoration-none",
      "button",
      disabled ? "cursor-not-allowed" : "cursor-interactive",
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
      prefixIcon && !loading &&
      _jsx(Icon, { name: prefixIcon, size: iconSize }),
      loading && _jsx(Spinner, { size: size }),
      (label || children) &&
      (_jsx(Flex, {
        paddingX: "4",
        paddingY: "0",
        textWeight: weight,
        textSize: size,
        className: "font-label",
        children: label || children,
      })),
      arrowIcon && (_jsx(Arrow, {
        style: {
          marginLeft: "calc(-1 * var(--static-space-4))",
        },
        trigger: "#" + id,
        scale: size === "s" ? 0.8 : size === "m" ? 0.9 : 1,
        color: variant === "primary" ? "onSolid" : "onBackground",
      })),
      suffixIcon && _jsx(Icon, { name: suffixIcon, size: iconSize }),
    ],
  }));
});
Button.displayName = "Button";
export { Button };
//# sourceMappingURL=Button.js.map
