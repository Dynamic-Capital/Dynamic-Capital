"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useDataTheme } from "../../contexts/DataThemeProvider";
const getStopsByVariant = (variant = "gradient", isRadial = false) => {
  if (isRadial) {
    // For radial gradients, we invert the opacity for better visual effect
    switch (variant) {
      case "flat":
        return [
          { offset: "0%", opacity: 1 },
          { offset: "100%", opacity: 1 },
        ];
      case "outline":
        return [
          { offset: "0%", opacity: 0 },
          { offset: "100%", opacity: 0 },
        ];
      case "gradient":
      default:
        return [
          { offset: "0%", opacity: 0 },
          { offset: "100%", opacity: 1 },
        ];
    }
  } else {
    // For linear gradients
    switch (variant) {
      case "flat":
        return [
          { offset: "0%", opacity: 1 },
          { offset: "100%", opacity: 1 },
        ];
      case "outline":
        return [
          { offset: "0%", opacity: 0 },
          { offset: "100%", opacity: 0 },
        ];
      case "gradient":
      default:
        return [
          { offset: "0%", opacity: 1 },
          { offset: "100%", opacity: 0 },
        ];
    }
  }
};
export const LinearGradient = (
  {
    id,
    color,
    x1 = "0",
    y1 = "0",
    x2 = "0",
    y2 = "1",
    stops,
    variant = useDataTheme().variant,
  },
) => {
  const gradientStops = stops || getStopsByVariant(variant);
  return (_jsx("linearGradient", {
    id: id,
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    children: gradientStops.map((
      stop,
      index,
    ) => (_jsx("stop", {
      offset: stop.offset,
      stopColor: color,
      stopOpacity: stop.opacity,
    }, index))),
  }));
};
export const RadialGradient = (
  {
    id,
    color,
    cx = "50%",
    cy = "50%",
    r = "50%",
    fx = "50%",
    fy = "50%",
    stops,
    variant = useDataTheme().variant,
  },
) => {
  const gradientStops = stops || getStopsByVariant(variant, true);
  return (_jsx("radialGradient", {
    id: id,
    cx: cx,
    cy: cy,
    r: r,
    fx: fx,
    fy: fy,
    children: gradientStops.map((
      stop,
      index,
    ) => (_jsx("stop", {
      offset: stop.offset,
      stopColor: color,
      stopOpacity: stop.opacity,
    }, index))),
  }));
};
//# sourceMappingURL=Gradient.js.map
