"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Flex } from ".";
import styles from "./CursorCard.module.scss";
const CursorCard = forwardRef(
  (
    { trigger, overlay, placement = "bottom-left", className, style, ...flex },
    ref,
  ) => {
    const [isHovering, setIsHovering] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const cardRef = useRef(null);
    const triggerRef = useRef(null);
    useImperativeHandle(ref, () => cardRef.current);
    useEffect(() => {
      const checkTouchDevice = () => {
        return "ontouchstart" in window;
      };
      setIsTouchDevice(checkTouchDevice());
    }, []);
    const handleMouseMove = useCallback((e) => {
      if (isHovering && !isTouchDevice) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    }, [isHovering, isTouchDevice]);
    useEffect(() => {
      if (!isTouchDevice) {
        document.addEventListener("mousemove", handleMouseMove);
        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
        };
      }
    }, [handleMouseMove, isTouchDevice]);
    // Create a portal container if it doesn't exist
    useEffect(() => {
      if (typeof document !== "undefined") {
        let portalContainer = document.getElementById("cursor-card-portal");
        if (!portalContainer) {
          portalContainer = document.createElement("div");
          portalContainer.id = "cursor-card-portal";
          document.body.appendChild(portalContainer);
        }
      }
      return () => {
        if (typeof document !== "undefined") {
          const portalContainer = document.getElementById("cursor-card-portal");
          if (portalContainer && portalContainer.childNodes.length === 0) {
            document.body.removeChild(portalContainer);
          }
        }
      };
    }, []);
    return (_jsxs(_Fragment, {
      children: [
        trigger && (_jsx(Flex, {
          ref: triggerRef,
          onMouseEnter: () => !isTouchDevice && setIsHovering(true),
          onMouseLeave: () => !isTouchDevice && setIsHovering(false),
          children: trigger,
        })),
        isHovering &&
        !isTouchDevice &&
        typeof document !== "undefined" &&
        createPortal(
          _jsx(Flex, {
            zIndex: 10,
            position: "fixed",
            top: "0",
            left: "0",
            pointerEvents: "none",
            ref: cardRef,
            className: `${styles.fadeIn} ${className || ""}`,
            style: {
              isolation: "isolate",
              transform: `translate(calc(${mousePosition.x}px ${
                placement.includes("left")
                  ? "- 100%"
                  : placement.includes("right")
                  ? ""
                  : "- 50%"
              }), calc(${mousePosition.y}px ${
                placement.includes("top")
                  ? "- 100%"
                  : placement.includes("bottom")
                  ? ""
                  : "- 50%"
              }))`,
              ...style,
            },
            ...flex,
            children: overlay,
          }),
          document.getElementById("cursor-card-portal") || document.body,
        ),
      ],
    }));
  },
);
CursorCard.displayName = "CursorCard";
export { CursorCard };
//# sourceMappingURL=CursorCard.js.map
