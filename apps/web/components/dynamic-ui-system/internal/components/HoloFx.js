"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import styles from "./HoloFx.module.scss";
import { Flex } from ".";
import classNames from "classnames";
const formatMask = (maskPosition = "100 200") => {
  const [x, y] = maskPosition.split(" ");
  const formattedX = `${x}%`;
  const formattedY = `${y ? y : x}%`;
  return `radial-gradient(ellipse ${formattedX} ${formattedY} at var(--gradient-pos-x, 50%) var(--gradient-pos-y, 50%), black 50%, transparent 100%)`;
};
const getMaskStyle = (mask) => {
  return mask?.maskPosition ? formatMask(mask.maskPosition) : formatMask();
};
const HoloFx = ({ children, shine, burn, texture, ...rest }) => {
  const ref = useRef(null);
  const lastCallRef = useRef(0);
  const shineDefaults = {
    opacity: 30,
    blending: "color-dodge",
    mask: getMaskStyle(shine?.mask),
    ...shine,
  };
  const burnDefaults = {
    opacity: 30,
    filter: "brightness(0.2) contrast(2)",
    blending: "color-dodge",
    mask: getMaskStyle(burn?.mask),
    ...burn,
  };
  const textureDefaults = {
    opacity: 10,
    blending: "color-dodge",
    image:
      "repeating-linear-gradient(-45deg, var(--static-white) 0, var(--static-white) 1px, transparent 3px, transparent 2px)",
    mask: getMaskStyle(texture?.mask),
    ...texture,
  };
  useEffect(() => {
    const handleMouseMove = (event) => {
      const now = Date.now();
      if (now - lastCallRef.current < 16) {
        return;
      }
      lastCallRef.current = now;
      const element = ref.current;
      if (!element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const deltaX = ((offsetX - centerX) / centerX) * 100;
      const deltaY = ((offsetY - centerY) / centerY) * 100;
      element.style.setProperty("--gradient-pos-x", `${deltaX}%`);
      element.style.setProperty("--gradient-pos-y", `${deltaY}%`);
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
  return (_jsxs(Flex, {
    overflow: "hidden",
    className: styles.holoFx,
    ref: ref,
    ...rest,
    children: [
      _jsx(Flex, { fill: true, className: styles.base, children: children }),
      _jsx(Flex, {
        m: { hide: true },
        position: "absolute",
        fill: true,
        pointerEvents: "none",
        className: classNames(styles.overlay, styles.burn),
        style: {
          ["--burn-opacity"]: burnDefaults.opacity + "%",
          filter: burnDefaults.filter,
          mixBlendMode: burnDefaults.blending,
          maskImage: burnDefaults.mask,
        },
        children: children,
      }),
      _jsx(Flex, {
        m: { hide: true },
        position: "absolute",
        fill: true,
        pointerEvents: "none",
        className: classNames(styles.overlay, styles.shine),
        style: {
          ["--shine-opacity"]: shineDefaults.opacity + "%",
          filter: shineDefaults.filter,
          mixBlendMode: shineDefaults.blending,
          maskImage: shineDefaults.mask,
        },
        children: children,
      }),
      _jsx(Flex, {
        m: { hide: true },
        position: "absolute",
        fill: true,
        pointerEvents: "none",
        className: classNames(styles.overlay, styles.texture),
        style: {
          ["--texture-opacity"]: textureDefaults.opacity + "%",
          backgroundImage: textureDefaults.image,
          filter: textureDefaults.filter,
          mixBlendMode: textureDefaults.blending,
          maskImage: textureDefaults.mask,
        },
      }),
    ],
  }));
};
HoloFx.displayName = "HoloFx";
export { HoloFx };
//# sourceMappingURL=HoloFx.js.map
