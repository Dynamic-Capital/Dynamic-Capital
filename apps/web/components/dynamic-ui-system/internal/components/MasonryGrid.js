import { jsx as _jsx } from "react/jsx-runtime";
import React, { forwardRef } from "react";
import { Column } from "./Column";
import classNames from "classnames";
import styles from "./MasonryGrid.module.scss";
import { Flex } from "./Flex";
function parseToken(value, type) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return `${value}rem`;
  }
  if (
    [
      "0",
      "1",
      "2",
      "4",
      "8",
      "12",
      "16",
      "20",
      "24",
      "32",
      "40",
      "48",
      "56",
      "64",
      "80",
      "104",
      "128",
      "160",
    ].includes(value)
  ) {
    return `var(--static-space-${value})`;
  }
  if (["xs", "s", "m", "l", "xl"].includes(value)) {
    return `var(--responsive-${type}-${value})`;
  }
  return undefined;
}
const MasonryGrid = forwardRef(
  (
    { children, gap = "8", columns = 3, style, className, l, m, s, ...flex },
    ref,
  ) => {
    const gapValue = parseToken(gap, "width") ?? "var(--static-space-8)";
    const classes = classNames(
      columns && styles[`columns-${columns}`],
      l?.columns && styles[`l-columns-${l.columns}`],
      m?.columns && styles[`m-columns-${m.columns}`],
      s?.columns && styles[`s-columns-${s.columns}`],
      className,
    );
    return (_jsx(Flex, {
      fillWidth: true,
      className: classes,
      ref: ref,
      ...flex,
      style: {
        display: "block",
        columnGap: gapValue,
        ...style,
      },
      children: React.Children.map(
        children,
        (
          child,
          idx,
        ) => (_jsx(Column, {
          fillWidth: true,
          fitHeight: true,
          style: {
            breakInside: "avoid",
            marginBottom: gapValue,
          },
          children: child,
        }, idx)),
      ),
    }));
  },
);
export { MasonryGrid };
MasonryGrid.displayName = "MasonryGrid";
//# sourceMappingURL=MasonryGrid.js.map
