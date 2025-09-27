"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import styles from "./Skeleton.module.scss";
import { Flex } from ".";
const Skeleton = forwardRef(
  (
    {
      shape = "line",
      width = "m",
      height = "m",
      delay,
      style,
      className,
      ...props
    },
    ref,
  ) => {
    return (_jsx(Flex, {
      ...props,
      ref: ref,
      style: style,
      radius: shape === "line" || shape === "circle" ? "full" : undefined,
      inline: true,
      className: classNames(
        styles.skeleton,
        styles[shape],
        width && styles["w-" + width],
        height && styles["h-" + height],
        delay && styles["delay-" + delay],
        className,
      ),
    }));
  },
);
Skeleton.displayName = "Skeleton";
export { Skeleton };
//# sourceMappingURL=Skeleton.js.map
