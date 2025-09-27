"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { Icon, Row, Text } from ".";
import styles from "./Tag.module.scss";
const Tag = forwardRef(
  (
    {
      variant = "neutral",
      size = "m",
      label = "",
      prefixIcon,
      suffixIcon,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const paddingX = size === "s" ? "8" : size === "m" ? "8" : "12";
    const paddingY = size === "s" ? "1" : size === "m" ? "2" : "4";
    return (_jsxs(Row, {
      fitWidth: true,
      background: variant !== "gradient" ? `${variant}-weak` : undefined,
      border: variant !== "gradient"
        ? `${variant}-alpha-medium`
        : "brand-medium",
      onBackground: variant !== "gradient" ? `${variant}-medium` : undefined,
      paddingX: paddingX,
      paddingY: paddingY,
      vertical: "center",
      radius: "s",
      gap: "4",
      ref: ref,
      className: classNames(
        styles.tag,
        variant === "gradient" ? styles.gradient : undefined,
        className,
      ),
      ...rest,
      children: [
        prefixIcon && _jsx(Icon, { name: prefixIcon, size: "xs" }),
        _jsx(Row, {
          style: { userSelect: "none" },
          vertical: "center",
          children: _jsx(Text, {
            variant: "label-default-s",
            children: label || children,
          }),
        }),
        suffixIcon && _jsx(Icon, { name: suffixIcon, size: "xs" }),
      ],
    }));
  },
);
Tag.displayName = "Tag";
export { Tag };
//# sourceMappingURL=Tag.js.map
