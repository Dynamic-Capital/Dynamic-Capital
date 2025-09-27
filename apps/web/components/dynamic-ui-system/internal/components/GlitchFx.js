"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useState } from "react";
import styles from "./GlitchFx.module.scss";
import { Flex } from ".";
import classNames from "classnames";
const GlitchFx = forwardRef(
  (
    {
      children,
      speed = "medium",
      interval = 2500,
      trigger = "instant",
      continuous = true,
      ...rest
    },
    ref,
  ) => {
    const [isGlitching, setIsGlitching] = useState(
      continuous || trigger === "instant",
    );
    useEffect(() => {
      if (continuous || trigger === "instant") {
        setIsGlitching(true);
      }
    }, [continuous, trigger]);
    const handleMouseEnter = () => {
      if (trigger === "hover") {
        setIsGlitching(true);
      }
    };
    const handleMouseLeave = () => {
      if (trigger === "hover") {
        setIsGlitching(false);
      }
    };
    const triggerGlitch = useCallback(() => {
      if (trigger === "custom") {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 500);
      }
    }, [trigger]);
    useEffect(() => {
      if (trigger === "custom") {
        const glitchInterval = setInterval(triggerGlitch, interval);
        return () => clearInterval(glitchInterval);
      }
    }, [trigger, interval, triggerGlitch]);
    const speedClass = styles[speed];
    return (_jsxs(Flex, {
      ref: ref,
      inline: true,
      zIndex: 0,
      className: classNames(speedClass, isGlitching && styles.active),
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ...rest,
      children: [
        _jsx(Flex, {
          fillWidth: true,
          inline: true,
          zIndex: 1,
          children: children,
        }),
        _jsx(Flex, {
          inline: true,
          position: "absolute",
          top: "0",
          left: "0",
          fill: true,
          zIndex: 0,
          opacity: 50,
          className: classNames(styles.glitchLayer, styles.blueShift),
          children: children,
        }),
        _jsx(Flex, {
          inline: true,
          position: "absolute",
          top: "0",
          left: "0",
          fill: true,
          zIndex: 0,
          opacity: 50,
          className: classNames(styles.glitchLayer, styles.redShift),
          children: children,
        }),
      ],
    }));
  },
);
GlitchFx.displayName = "GlitchFx";
export { GlitchFx };
//# sourceMappingURL=GlitchFx.js.map
