import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Row } from ".";
import styles from "./Pulse.module.scss";
const Pulse = forwardRef(
  (
    { children, className, style, size = "m", variant = "brand", ...flex },
    ref,
  ) => {
    return (_jsxs(Row, {
      ref: ref,
      minWidth: size === "s" ? "16" : size === "m" ? "24" : "32",
      minHeight: size === "s" ? "16" : size === "m" ? "24" : "32",
      center: true,
      "data-solid": "color",
      className: className,
      style: style,
      ...flex,
      children: [
        _jsx(Row, {
          position: "absolute",
          className: styles.position,
          children: _jsx(Row, {
            solid: `${variant}-medium`,
            radius: "full",
            className: styles.dot,
            width: size === "s" ? "32" : size === "m" ? "48" : "64",
            height: size === "s" ? "32" : size === "m" ? "48" : "64",
          }),
        }),
        _jsx(Row, {
          solid: `${variant}-strong`,
          minWidth: size === "s" ? "4" : size === "m" ? "8" : "12",
          minHeight: size === "s" ? "4" : size === "m" ? "8" : "12",
          radius: "full",
        }),
      ],
    }));
  },
);
Pulse.displayName = "Pulse";
export { Pulse };
//# sourceMappingURL=Pulse.js.map
