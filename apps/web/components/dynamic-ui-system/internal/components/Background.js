"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { forwardRef, useEffect, useRef } from "react";
import { Flex, Mask } from ".";
import styles from "./Background.module.scss";
import classNames from "classnames";
function setRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && "current" in ref) {
    ref.current = value;
  }
}
const Background = forwardRef(
  (
    {
      gradient = {},
      dots = {},
      grid = {},
      lines = {},
      mask,
      children,
      className,
      style,
      ...rest
    },
    forwardedRef,
  ) => {
    const dotsColor = dots.color ?? "brand-on-background-weak";
    const dotsSize = "var(--static-space-" + (dots.size ?? "24") + ")";
    const backgroundRef = useRef(null);
    useEffect(() => {
      setRef(forwardedRef, backgroundRef.current);
    }, [forwardedRef]);
    const remap = (value, inputMin, inputMax, outputMin, outputMax) => {
      return ((value - inputMin) / (inputMax - inputMin)) *
          (outputMax - outputMin) + outputMin;
    };
    const adjustedX = gradient.x != null
      ? remap(gradient.x, 0, 100, 37.5, 62.5)
      : 50;
    const adjustedY = gradient.y != null
      ? remap(gradient.y, 0, 100, 37.5, 62.5)
      : 50;
    const renderContent = () => (_jsxs(_Fragment, {
      children: [
        gradient.display &&
        (_jsx(Flex, {
          position: "absolute",
          className: styles.gradient,
          opacity: gradient.opacity,
          pointerEvents: "none",
          style: {
            ["--gradient-position-x"]: `${adjustedX}%`,
            ["--gradient-position-y"]: `${adjustedY}%`,
            ["--gradient-width"]: gradient.width != null
              ? `${gradient.width / 4}%`
              : "25%",
            ["--gradient-height"]: gradient.height != null
              ? `${gradient.height / 4}%`
              : "25%",
            ["--gradient-tilt"]: gradient.tilt != null
              ? `${gradient.tilt}deg`
              : "0deg",
            ["--gradient-color-start"]: gradient.colorStart
              ? `var(--${gradient.colorStart})`
              : "var(--brand-background-strong)",
            ["--gradient-color-end"]: gradient.colorEnd
              ? `var(--${gradient.colorEnd})`
              : "var(--static-transparent)",
          },
        })),
        dots.display &&
        (_jsx(Flex, {
          position: "absolute",
          top: "0",
          left: "0",
          fill: true,
          pointerEvents: "none",
          className: styles.dots,
          opacity: dots.opacity,
          style: {
            "--dots-color": `var(--${dotsColor})`,
            "--dots-size": dotsSize,
          },
        })),
        lines.display &&
        (_jsx(Flex, {
          position: "absolute",
          top: "0",
          left: "0",
          fill: true,
          pointerEvents: "none",
          className: styles.lines,
          opacity: lines.opacity,
          style: {
            "--lines-angle": `${lines.angle ?? -45}deg`,
            "--lines-color": `var(--${
              lines.color ?? "brand-on-background-weak"
            })`,
            "--lines-thickness": `${lines.thickness ?? 1}px`,
            "--lines-spacing": `var(--static-space-${lines.size ?? "8"})`,
            background: `
                repeating-linear-gradient(
                  var(--lines-angle),
                  var(--static-transparent),
                  var(--static-transparent) calc(var(--lines-spacing) - var(--lines-thickness)),
                  var(--lines-color) calc(var(--lines-spacing) - var(--lines-thickness)),
                  var(--lines-color) var(--lines-spacing)
                )
              `,
          },
        })),
        grid.display &&
        (_jsx(Flex, {
          position: "absolute",
          top: "0",
          left: "0",
          fill: true,
          pointerEvents: "none",
          opacity: grid.opacity,
          style: {
            backgroundImage: `linear-gradient(to right, var(--${
              grid.color ?? "brand-on-background-weak"
            }) 1px, transparent 1px), linear-gradient(to bottom, var(--${
              grid.color ?? "brand-on-background-weak"
            }) 1px, transparent 1px)`,
            backgroundSize: `${grid.width ?? "80px"} ${grid.height ?? "80px"}`,
          },
        })),
        children,
      ],
    }));
    return (_jsx(Flex, {
      ref: backgroundRef,
      fill: true,
      className: classNames(className),
      zIndex: 0,
      overflow: "hidden",
      style: style,
      ...rest,
      children: mask
        ? (_jsx(Mask, {
          fill: true,
          position: "absolute",
          cursor: mask.cursor,
          radius: mask.radius,
          x: mask.x,
          y: mask.y,
          children: renderContent(),
        }))
        : (renderContent()),
    }));
  },
);
Background.displayName = "Background";
export { Background };
//# sourceMappingURL=Background.js.map
