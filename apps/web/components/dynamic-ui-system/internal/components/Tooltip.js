import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { Flex, Icon } from ".";
const Tooltip = forwardRef(
  ({ label, prefixIcon, suffixIcon, className, style, ...flex }, ref) => {
    return (_jsxs(Flex, {
      m: { hide: true },
      ref: ref,
      style: {
        whiteSpace: "nowrap",
        userSelect: "none",
        ...style,
      },
      vertical: "center",
      gap: "4",
      zIndex: 1,
      background: "surface",
      paddingY: "4",
      paddingX: "8",
      radius: "s",
      border: "neutral-medium",
      role: "tooltip",
      className: classNames(className),
      ...flex,
      children: [
        prefixIcon && _jsx(Icon, { name: prefixIcon, size: "xs" }),
        _jsx(Flex, {
          paddingX: "2",
          vertical: "center",
          textVariant: "body-default-xs",
          onBackground: "neutral-strong",
          children: label,
        }),
        suffixIcon && _jsx(Icon, { name: suffixIcon, size: "xs" }),
      ],
    }));
  },
);
Tooltip.displayName = "Tooltip";
export { Tooltip };
//# sourceMappingURL=Tooltip.js.map
