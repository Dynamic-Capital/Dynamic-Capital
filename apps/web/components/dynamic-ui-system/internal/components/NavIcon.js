import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import styles from "./NavIcon.module.scss";
import { Flex } from ".";
import classNames from "classnames";
const NavIcon = forwardRef(
  ({ className, isActive, style, onClick, ...rest }, ref) => {
    return (_jsxs(Flex, {
      ref: ref,
      tabIndex: 0,
      radius: "m",
      cursor: "interactive",
      width: "40",
      height: "40",
      minHeight: "40",
      minWidth: "40",
      className: className,
      style: style,
      onClick: onClick,
      ...rest,
      children: [
        _jsx("div", {
          className: classNames(styles.line, isActive && styles.active),
        }),
        _jsx("div", {
          className: classNames(styles.line, isActive && styles.active),
        }),
      ],
    }));
  },
);
NavIcon.displayName = "NavIcon";
export { NavIcon };
//# sourceMappingURL=NavIcon.js.map
