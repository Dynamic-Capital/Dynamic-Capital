"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Flex } from ".";
import styles from "./Mask.module.scss";
import classNames from "classnames";
const Mask = forwardRef(
  (
    { cursor = false, x, y, radius = 50, children, className, style, ...rest },
    forwardedRef,
  ) => {
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [smoothPosition, setSmoothPosition] = useState({ x: 0, y: 0 });
    const maskRef = useRef(null);
    useEffect(() => {
      if (forwardedRef) {
        if (typeof forwardedRef === "function") {
          forwardedRef(maskRef.current);
        } else if (forwardedRef && "current" in forwardedRef) {
          forwardedRef.current = maskRef.current;
        }
      }
    }, [forwardedRef]);
    useEffect(() => {
      if (!cursor) {
        return;
      }
      const handleMouseMove = (event) => {
        if (maskRef.current) {
          const rect = maskRef.current.getBoundingClientRect();
          setCursorPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      };
      document.addEventListener("mousemove", handleMouseMove);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
      };
    }, [cursor]);
    useEffect(() => {
      if (!cursor) {
        return;
      }
      let animationFrameId;
      const updateSmoothPosition = () => {
        setSmoothPosition((prev) => {
          const dx = cursorPosition.x - prev.x;
          const dy = cursorPosition.y - prev.y;
          const easingFactor = 0.05;
          return {
            x: Math.round(prev.x + dx * easingFactor),
            y: Math.round(prev.y + dy * easingFactor),
          };
        });
        animationFrameId = requestAnimationFrame(updateSmoothPosition);
      };
      animationFrameId = requestAnimationFrame(updateSmoothPosition);
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }, [cursorPosition, cursor]);
    const maskStyle = () => {
      if (cursor) {
        return {
          "--mask-position-x": `${smoothPosition.x}px`,
          "--mask-position-y": `${smoothPosition.y}px`,
          "--mask-radius": `${radius}vh`,
        };
      }
      if (x != null && y != null) {
        return {
          "--mask-position-x": `${x}%`,
          "--mask-position-y": `${y}%`,
          "--mask-radius": `${radius}vh`,
        };
      }
      return {};
    };
    return (_jsx(Flex, {
      ref: maskRef,
      fill: true,
      className: classNames(styles.mask, className),
      top: "0",
      left: "0",
      zIndex: 0,
      overflow: "hidden",
      style: {
        ...maskStyle(),
        ...style,
      },
      ...rest,
      children: children,
    }));
  },
);
Mask.displayName = "Mask";
export { Mask };
//# sourceMappingURL=Mask.js.map
