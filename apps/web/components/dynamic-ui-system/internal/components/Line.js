import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Flex } from ".";
const Line = forwardRef(({ vert, className, style, ...rest }, ref) => {
  return (_jsx(Flex, {
    ref: ref,
    minWidth: (vert && "1") || undefined,
    minHeight: (!vert && "1") || undefined,
    width: (vert && "1") || undefined,
    height: (!vert && "1") || undefined,
    fillWidth: !vert,
    fillHeight: vert,
    background: "neutral-strong",
    direction: vert ? "column" : "row",
    className: className,
    style: style,
    ...rest,
  }));
});
Line.displayName = "Line";
export { Line };
//# sourceMappingURL=Line.js.map
