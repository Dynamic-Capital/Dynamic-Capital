import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import styles from "./StatusIndicator.module.scss";
import { Flex } from ".";
const StatusIndicator = forwardRef(
  (
    {
      size = "m",
      color = "blue",
      ariaLabel = `${color} status indicator`,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    return (_jsx(Flex, {
      ref: ref,
      style: style,
      className: classNames(
        styles.statusIndicator,
        styles[size],
        styles[color],
        className,
      ),
      "aria-label": ariaLabel,
      radius: "full",
      ...rest,
    }));
  },
);
StatusIndicator.displayName = "StatusIndicator";
export { StatusIndicator };
//# sourceMappingURL=StatusIndicator.js.map
