"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Column } from ".";
const List = forwardRef(
  ({ as = "ul", className, children, style, ...props }, ref) => {
    if (as === "ol") {
      return (_jsx(Column, {
        as: "ol",
        fillWidth: true,
        margin: "0",
        paddingY: "0",
        paddingRight: "0",
        paddingLeft: "20",
        ref: ref,
        className: className,
        style: style,
        ...props,
        children: children,
      }));
    }
    return (_jsx(Column, {
      as: "ul",
      fillWidth: true,
      margin: "0",
      paddingY: "0",
      paddingRight: "0",
      paddingLeft: "20",
      ref: ref,
      className: className,
      style: style,
      ...props,
      children: children,
    }));
  },
);
List.displayName = "List";
export { List };
//# sourceMappingURL=List.js.map
