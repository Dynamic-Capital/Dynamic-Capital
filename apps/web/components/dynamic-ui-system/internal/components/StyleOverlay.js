"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useState } from "react";
import { Background, Flex, IconButton, StylePanel } from ".";
import styles from "./StyleOverlay.module.scss";
const StyleOverlay = forwardRef(
  ({ iconButtonProps, children, zIndex = 2, ...rest }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const togglePanel = () => {
      setIsOpen(!isOpen);
    };
    return (_jsxs(Flex, {
      ref: ref,
      position: "static",
      zIndex: zIndex,
      children: [
        !isOpen && _jsx(Flex, { onClick: togglePanel, children: children }),
        _jsxs(Flex, {
          as: "aside",
          zIndex: 3,
          className: `${styles.panel} ${isOpen && styles.open}`,
          maxWidth: 28,
          style: {
            maxHeight: "calc(100% - var(--static-space-4))",
          },
          fillHeight: true,
          position: "absolute",
          shadow: "xl",
          top: "2",
          right: "2",
          transition: "macro-medium",
          background: "page",
          overflow: "hidden",
          radius: "xl",
          border: "neutral-medium",
          ...rest,
          children: [
            _jsx(StylePanel, { fill: true, overflowY: "scroll", padding: "8" }),
            _jsxs(Flex, {
              position: "absolute",
              paddingTop: "8",
              paddingRight: "12",
              top: "0",
              right: "0",
              children: [
                _jsx(Background, {
                  position: "absolute",
                  top: "0",
                  right: "8",
                  left: undefined,
                  width: 8,
                  height: 4,
                  mask: { x: 100, y: 0, radius: 7 },
                  dots: { display: true, size: "2", color: "page-background" },
                }),
                _jsx(IconButton, {
                  variant: "secondary",
                  onClick: togglePanel,
                  icon: "close",
                  ...iconButtonProps,
                }),
              ],
            }),
          ],
        }),
      ],
    }));
  },
);
StyleOverlay.displayName = "StyleOverlay";
export { StyleOverlay };
//# sourceMappingURL=StyleOverlay.js.map
