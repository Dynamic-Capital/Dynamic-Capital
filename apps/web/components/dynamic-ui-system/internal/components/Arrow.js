"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import classNames from "classnames";
import styles from "./Arrow.module.scss";
import { Flex } from ".";
const Arrow = (
  { trigger, scale = 0.8, color = "onBackground", style, className, ...flex },
) => {
  const ref = useRef(null);
  useEffect(() => {
    const triggerElement = document.querySelector(trigger);
    if (triggerElement && ref.current) {
      const handleMouseOver = () => {
        ref.current?.classList.add(styles.active);
      };
      const handleMouseOut = () => {
        ref.current?.classList.remove(styles.active);
      };
      triggerElement.addEventListener("mouseenter", handleMouseOver);
      triggerElement.addEventListener("mouseleave", handleMouseOut);
      return () => {
        triggerElement.removeEventListener("mouseenter", handleMouseOver);
        triggerElement.removeEventListener("mouseleave", handleMouseOut);
      };
    }
  }, [trigger]);
  return (_jsxs(Flex, {
    ref: ref,
    center: true,
    className: classNames(styles.arrowContainer, className),
    style: {
      transform: `scale(${scale})`,
      ...style,
    },
    ...flex,
    children: [
      _jsx(Flex, {
        radius: "full",
        position: "absolute",
        className: classNames(styles.arrowHead, styles[color]),
        height: 0.0875,
      }),
      _jsx(Flex, {
        radius: "full",
        position: "absolute",
        className: classNames(styles.arrowHead, styles[color]),
        height: 0.0875,
      }),
    ],
  }));
};
Arrow.displayName = "Arrow";
export { Arrow };
//# sourceMappingURL=Arrow.js.map
