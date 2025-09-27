"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Row, Text } from "../../components";
import { Swatch } from ".";
import { useDataTheme } from "../../contexts/DataThemeProvider";
const Legend = (
  {
    payload,
    labels = "both",
    position = "top-left",
    direction,
    colors,
    variant = useDataTheme().variant,
  },
) => {
  if (!payload || !payload.length) {
    return null;
  }
  const getPositionStyle = () => {
    switch (position) {
      case "top-left":
        return {
          paddingLeft: labels === "y" || labels === "both"
            ? "var(--static-space-80)"
            : "var(--static-space-20)",
          top: "var(--static-space-12)",
        };
      case "top-right":
        return {
          paddingRight: "var(--static-space-20)",
          top: "var(--static-space-12)",
          justifyContent: "flex-end",
        };
      case "bottom-left":
        return {
          paddingLeft: "var(--static-space-20)",
          bottom: "var(--static-space-12)",
        };
      case "bottom-right":
        return {
          paddingRight: "var(--static-space-20)",
          bottom: "var(--static-space-12)",
          justifyContent: "flex-end",
        };
      case "top-center":
        return {
          left: "50%",
          top: "var(--static-space-12)",
          transform: "translateX(-50%)",
        };
      case "bottom-center":
        return {
          left: "50%",
          bottom: "var(--static-space-12)",
          transform: "translateX(-50%)",
        };
      default:
        return {
          paddingLeft: labels === "y" || labels === "both"
            ? "var(--static-space-80)"
            : "var(--static-space-20)",
          top: "0.75rem",
        };
    }
  };
  const positionStyle = getPositionStyle();
  return (_jsx(Row, {
    wrap: true,
    fillWidth: true,
    horizontal: position === "top-left" ||
        position === "top-right" ||
        position === "bottom-left" ||
        position === "bottom-right"
      ? "start"
      : "center",
    vertical: "center",
    position: "absolute",
    gap: "16",
    pointerEvents: "none",
    direction: direction,
    style: positionStyle,
    children: payload.map((entry, index) => {
      const color = colors && colors[index]
        ? colors[index]
        : entry.stroke || entry.color;
      return (_jsxs(Row, {
        vertical: "center",
        gap: "8",
        children: [
          _jsx(Swatch, { color: color, size: "m", variant: variant }),
          _jsx(Text, {
            variant: "label-default-s",
            wrap: "nowrap",
            children: entry.value,
          }),
        ],
      }, index));
    }),
  }));
};
export { Legend };
//# sourceMappingURL=Legend.js.map
