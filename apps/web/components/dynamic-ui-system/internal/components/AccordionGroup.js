"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useState } from "react";
import { Accordion, Column, Line } from ".";
const AccordionGroup = (
  { items, size = "m", style, className, autoCollapse = true, ...rest },
) => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const handleAccordionToggle = useCallback((index) => {
    if (autoCollapse) {
      // If clicking the same accordion, close it
      if (openAccordion === index) {
        setOpenAccordion(null);
      } else {
        // Otherwise, open the clicked accordion and close others
        setOpenAccordion(index);
      }
    }
    // If autoCollapse is false, let each accordion handle its own state
  }, [autoCollapse, openAccordion]);
  if (!items || items.length === 0) {
    return null;
  }
  return (_jsx(Column, {
    fillWidth: true,
    radius: "m",
    border: "neutral-alpha-medium",
    overflow: "hidden",
    style: style,
    className: className || "",
    ...rest,
    children: items.map((item, index) => (_jsxs(React.Fragment, {
      children: [
        _jsx(Accordion, {
          title: item.title,
          size: size,
          open: autoCollapse ? openAccordion === index : undefined,
          onToggle: () => handleAccordionToggle(index),
          children: item.content,
        }),
        index < items.length - 1 &&
        _jsx(Line, { background: "neutral-alpha-medium" }),
      ],
    }, index))),
  }));
};
AccordionGroup.displayName = "AccordionGroup";
export { AccordionGroup };
//# sourceMappingURL=AccordionGroup.js.map
