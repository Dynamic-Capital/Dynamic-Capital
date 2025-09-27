import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Row } from "./Row";
const Banner = forwardRef(({ children, ...flex }, ref) => (_jsx(Row, {
  fillWidth: true,
  paddingX: "16",
  paddingY: "8",
  solid: "brand-medium",
  onSolid: "brand-strong",
  textVariant: "label-default-s",
  align: "center",
  center: true,
  gap: "12",
  ref: ref,
  ...flex,
  children: children,
})));
Banner.displayName = "Banner";
export { Banner };
//# sourceMappingURL=Banner.js.map
