"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Column, Row } from ".";
const Dropdown = forwardRef(
  (
    { selectedOption, className, children, onEscape, onSelect, ...flex },
    ref,
  ) => {
    const handleSelect = (event) => {
      // Only handle clicks on elements that have a data-value attribute
      const target = event.target;
      const value = target.getAttribute("data-value") ||
        target.closest("[data-value]")?.getAttribute("data-value");
      if (onSelect && value) {
        onSelect(value);
      }
    };
    return (_jsx(Row, {
      ref: ref,
      role: "listbox",
      onClick: handleSelect,
      flex: 1,
      border: "neutral-medium",
      background: "surface",
      overflow: "hidden",
      ...flex,
      children: _jsx(Column, {
        flex: 1,
        overflowY: "auto",
        gap: "2",
        children: children,
      }),
    }));
  },
);
Dropdown.displayName = "Dropdown";
export { Dropdown };
//# sourceMappingURL=Dropdown.js.map
