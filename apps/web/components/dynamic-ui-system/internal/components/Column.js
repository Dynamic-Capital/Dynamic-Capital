"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Flex } from ".";
const Column = forwardRef(({ children, ...rest }, ref) => {
  return (_jsx(Flex, {
    direction: "column",
    ref: ref,
    ...rest,
    children: children,
  }));
});
Column.displayName = "Column";
export { Column };
//# sourceMappingURL=Column.js.map
