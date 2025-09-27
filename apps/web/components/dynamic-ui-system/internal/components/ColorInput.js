"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useRef } from "react";
import { Flex, Icon, IconButton, Input } from ".";
const ColorInput = forwardRef(
  ({ label, id, value, onChange, ...props }, ref) => {
    const colorInputRef = useRef(null);
    const handleHexClick = () => {
      if (colorInputRef.current) {
        colorInputRef.current.click();
      }
    };
    const handleReset = () => {
      onChange({
        target: { value: "" },
      });
    };
    return (_jsx(Input, {
      style: { cursor: "pointer" },
      id: id,
      ref: colorInputRef,
      label: label,
      type: "color",
      value: value,
      ...props,
      hasPrefix: _jsxs(Flex, {
        children: [
          _jsx(Flex, {
            style: {
              width: value ? "var(--static-space-0)" : "var(--static-space-20)",
              transform: value ? "scale(0)" : "scale(1)",
              opacity: value ? "0" : "1",
              transition: "0.2s ease-in-out all",
            },
            children: _jsx(Flex, {
              padding: "2",
              children: _jsx(Icon, {
                size: "xs",
                name: "eyeDropper",
                onBackground: "neutral-medium",
              }),
            }),
          }),
          _jsx(Flex, {
            border: "neutral-strong",
            className: `prefix ${value ? "" : "hidden"}`,
            onClick: handleHexClick,
            height: "20",
            radius: "xs",
            style: {
              backgroundColor: value,
              cursor: "pointer",
              width: value ? "var(--static-space-20)" : "var(--static-space-0)",
              transform: value ? "scale(1)" : "scale(0)",
              opacity: value ? "1" : "0",
              transition: "0.2s ease-in-out all",
            },
          }),
        ],
      }),
      hasSuffix: _jsxs(Flex, {
        className: `suffix ${value ? "" : "hidden"}`,
        position: "absolute",
        style: {
          left: "var(--static-space-48)",
          cursor: "pointer",
          width: "calc(100% - var(--static-space-48))",
        },
        children: [
          _jsx(Flex, {
            onClick: handleHexClick,
            fillWidth: true,
            style: {
              opacity: value ? "1" : "0",
              transition: "opacity 0.2s ease-in-out",
            },
            children: value,
          }),
          value &&
          (_jsx(IconButton, {
            onClick: handleReset,
            variant: "secondary",
            tooltip: "Remove",
            tooltipPosition: "left",
            icon: "close",
            style: {
              position: "absolute",
              right: "var(--static-space-12)",
              transform: "translateY(-50%)",
            },
          })),
        ],
      }),
      onChange: onChange,
    }));
  },
);
ColorInput.displayName = "ColorInput";
export { ColorInput };
//# sourceMappingURL=ColorInput.js.map
