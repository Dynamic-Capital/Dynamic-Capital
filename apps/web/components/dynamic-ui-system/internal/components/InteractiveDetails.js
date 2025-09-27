"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Column, IconButton, Row, Text } from ".";
const InteractiveDetails = forwardRef(
  (
    { label, description, iconButtonProps, onClick, className, id, disabled },
    ref,
  ) => {
    return (_jsxs(Column, {
      ref: ref,
      cursor: disabled ? "not-allowed" : undefined,
      className: className,
      onClick: onClick,
      id: id,
      children: [
        _jsxs(Row, {
          gap: "4",
          vertical: "center",
          children: [
            _jsx(Text, {
              as: "span",
              variant: "label-default-m",
              onBackground: disabled ? "neutral-weak" : "neutral-strong",
              children: label,
            }),
            iconButtonProps?.tooltip &&
            (_jsx("div", {
              onClick: (e) => e.stopPropagation(),
              children: _jsx(IconButton, {
                size: "s",
                variant: "ghost",
                icon: "help",
                ...iconButtonProps,
              }),
            })),
          ],
        }),
        description &&
        (_jsx(Text, {
          as: "span",
          variant: "body-default-s",
          onBackground: "neutral-weak",
          children: description,
        })),
      ],
    }));
  },
);
InteractiveDetails.displayName = "InteractiveDetails";
export { InteractiveDetails };
//# sourceMappingURL=InteractiveDetails.js.map
