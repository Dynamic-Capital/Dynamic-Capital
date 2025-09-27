"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Flex, Icon, Media, Skeleton, StatusIndicator, Text } from ".";
import styles from "./Avatar.module.scss";
const sizeMapping = {
  xs: 20,
  s: 24,
  m: 32,
  l: 48,
  xl: 160,
};
const statusIndicatorSizeMapping = {
  xs: "s",
  s: "s",
  m: "m",
  l: "m",
  xl: "l",
};
const Avatar = forwardRef(
  (
    {
      size = "m",
      value,
      src,
      loading,
      empty,
      statusIndicator,
      className,
      style = {},
      ...rest
    },
    ref,
  ) => {
    const sizeInRem = typeof size === "number" ? `${size}rem` : undefined;
    const sizeStyle = sizeInRem
      ? {
        width: sizeInRem,
        height: sizeInRem,
        minWidth: sizeInRem,
        minHeight: sizeInRem,
        ...style,
      }
      : style;
    const isEmpty = empty || (!src && !value);
    if (value && src) {
      throw new Error("Avatar cannot have both 'value' and 'src' props.");
    }
    if (loading) {
      return (_jsx(Skeleton, {
        ...rest,
        border: "neutral-medium",
        shape: "circle",
        width: typeof size === "number" ? "m" : size,
        height: typeof size === "number" ? "m" : size,
        className: `${styles.avatar} ${className}`,
        "aria-busy": "true",
        "aria-label": "Loading avatar",
      }));
    }
    const renderContent = () => {
      if (isEmpty) {
        return (_jsx(Icon, {
          onBackground: "neutral-medium",
          name: "person",
          size: "m",
          style: typeof size === "number"
            ? { fontSize: `${size / 3}rem` }
            : undefined,
          className: styles.icon,
          "aria-label": "Empty avatar",
        }));
      }
      if (src) {
        return (_jsx(Media, {
          radius: "full",
          src: src,
          fill: true,
          alt: "Avatar",
          aspectRatio: "1",
          sizes: typeof size === "string"
            ? `${sizeMapping[size]}px`
            : `${size * 16}px`,
          className: styles.image,
        }));
      }
      if (value) {
        return (_jsx(Text, {
          as: "span",
          onBackground: "neutral-weak",
          variant: `body-default-${typeof size === "string" ? size : "m"}`,
          className: styles.value,
          "aria-label": `Avatar with initials ${value}`,
          children: value,
        }));
      }
      return null;
    };
    return (_jsxs(Flex, {
      ref: ref,
      role: "img",
      horizontal: "center",
      vertical: "center",
      radius: "full",
      border: "neutral-strong",
      background: "surface",
      style: sizeStyle,
      className: `${styles.avatar} ${
        typeof size === "string" ? styles[size] : ""
      } ${className || ""}`,
      ...rest,
      children: [
        renderContent(),
        statusIndicator && (_jsx(StatusIndicator, {
          position: "absolute",
          size: typeof size === "string"
            ? statusIndicatorSizeMapping[size]
            : "l",
          color: statusIndicator.color,
          className: `${styles.className || ""} ${styles.indicator} ${
            size === "xl" || (typeof size === "number" && size >= 10)
              ? styles.position
              : ""
          }`,
          "aria-label": `Status: ${statusIndicator.color}`,
        })),
      ],
    }));
  },
);
Avatar.displayName = "Avatar";
export { Avatar };
//# sourceMappingURL=Avatar.js.map
