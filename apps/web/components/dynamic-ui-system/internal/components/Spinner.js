import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import styles from "./Spinner.module.scss";
import { Flex } from ".";
import classNames from "classnames";
const Spinner = forwardRef(
  ({ size = "m", ariaLabel = "Loading", className, style, ...rest }, ref) => {
    return (_jsx(Flex, {
      center: true,
      style: style,
      className: className,
      ...rest,
      children: _jsx(Flex, {
        ref: ref,
        center: true,
        className: styles[size],
        role: "status",
        "aria-label": ariaLabel,
        children: _jsxs(Flex, {
          fill: true,
          children: [
            _jsx(Flex, {
              className: classNames(styles.size),
              borderStyle: "solid",
              fill: true,
              radius: "full",
              border: "neutral-alpha-medium",
              position: "absolute",
            }),
            _jsx(Flex, {
              className: classNames(styles.spinner, styles.size),
              borderStyle: "solid",
              fill: true,
              radius: "full",
            }),
          ],
        }),
      }),
    }));
  },
);
Spinner.displayName = "Spinner";
export { Spinner };
//# sourceMappingURL=Spinner.js.map
