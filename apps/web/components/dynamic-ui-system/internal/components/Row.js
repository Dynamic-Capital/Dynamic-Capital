"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Flex } from ".";
const Row = forwardRef(({ children, ...rest }, ref) => {
  return (_jsx(Flex, { ref: ref, ...rest, children: children }));
});
Row.displayName = "Row";
export { Row };
//# sourceMappingURL=Row.js.map
