import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import styles from "./InlineCode.module.scss";
import { Flex } from ".";
import classNames from "classnames";
const InlineCode = forwardRef(
  ({ children, className, style, ...flex }, ref) => {
    return (_jsx(Flex, {
      as: "span",
      inline: true,
      fit: true,
      ref: ref,
      radius: "s",
      vertical: "center",
      paddingX: "4",
      paddingY: "1",
      textType: "code",
      background: "neutral-alpha-weak",
      border: "neutral-alpha-medium",
      className: classNames(styles.inlineCode, className),
      style: style,
      ...flex,
      children: children,
    }));
  },
);
InlineCode.displayName = "InlineCode";
export { InlineCode };
//# sourceMappingURL=InlineCode.js.map
