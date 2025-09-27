"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { Column, CountFx, Flex, Text } from ".";
const ProgressBar = forwardRef(
  (
    {
      value,
      min = 0,
      max = 100,
      label = true,
      barBackground = "brand-strong",
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const percent = Math.max(
      0,
      Math.min(100, ((value - min) / (max - min)) * 100),
    );
    return (_jsxs(Column, {
      horizontal: "center",
      gap: "16",
      fillWidth: true,
      ref: ref,
      style: style,
      className: classNames(className),
      ...rest,
      children: [
        _jsx(Flex, {
          background: "neutral-medium",
          border: "neutral-alpha-weak",
          fillWidth: true,
          radius: "full",
          overflow: "hidden",
          height: "8",
          role: "progressbar",
          "aria-valuenow": value,
          "aria-valuemin": min,
          "aria-valuemax": max,
          children: _jsx(Flex, {
            style: {
              width: `${percent}%`,
              transition: "width 1000ms ease-in-out",
            },
            fillHeight: true,
            solid: barBackground,
            radius: "full",
          }),
        }),
        label &&
        (_jsxs(Text, {
          align: "center",
          children: [
            _jsx(CountFx, {
              value: value,
              speed: 1000,
              duration: 1000,
              easing: "ease-in-out",
            }),
            "%",
          ],
        })),
      ],
    }));
  },
);
ProgressBar.displayName = "ProgressBar";
export { ProgressBar };
//# sourceMappingURL=ProgressBar.js.map
