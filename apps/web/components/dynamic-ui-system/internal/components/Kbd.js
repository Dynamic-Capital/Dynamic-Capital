import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Flex, Text } from ".";
const Kbd = forwardRef((
  { label, children, className, style, ...rest },
  ref,
) => (_jsx(Flex, {
  as: "kbd",
  ref: ref,
  horizontal: "center",
  minWidth: "32",
  background: "neutral-strong",
  radius: "s",
  paddingX: "4",
  paddingY: "2",
  onBackground: "neutral-medium",
  border: "neutral-strong",
  className: className,
  style: style,
  ...rest,
  children: _jsx(Text, {
    as: "span",
    variant: "label-default-s",
    children: label || children,
  }),
})));
Kbd.displayName = "Kbd";
export { Kbd };
//# sourceMappingURL=Kbd.js.map
