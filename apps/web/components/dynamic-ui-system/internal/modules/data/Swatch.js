"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { Row } from "../../components";
import { useDataTheme } from "../../contexts";
export const Swatch = (
  { color, size = "m", variant = useDataTheme().variant },
) => {
  const sizeMap = {
    s: {
      minWidth: "12",
      minHeight: "12",
      radius: "xs",
    },
    m: {
      minWidth: "16",
      minHeight: "16",
      radius: "s",
    },
  };
  const getStyleByVariant = () => {
    const baseStyle = {
      backgroundClip: "padding-box",
      border: `1px solid ${color}`,
    };
    switch (variant) {
      case "flat":
        return {
          ...baseStyle,
          background: color,
        };
      case "outline":
        return {
          ...baseStyle,
          background: "transparent",
        };
      case "gradient":
      default:
        return {
          ...baseStyle,
          background:
            `linear-gradient(to bottom, ${color} 0%, transparent 100%)`,
        };
    }
  };
  return (_jsx(Row, {
    style: getStyleByVariant(),
    minWidth: sizeMap[size].minWidth,
    minHeight: sizeMap[size].minHeight,
    radius: sizeMap[size].radius,
  }));
};
//# sourceMappingURL=Swatch.js.map
