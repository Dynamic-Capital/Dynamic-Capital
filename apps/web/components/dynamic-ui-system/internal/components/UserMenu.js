"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import classNames from "classnames";
import { Column, DropdownWrapper, User } from ".";
import styles from "./UserMenu.module.scss";
const UserMenu = (
  {
    selected = false,
    dropdown,
    minWidth,
    maxWidth,
    minHeight,
    placement,
    className,
    style,
    ...userProps
  },
) => {
  return (_jsx(DropdownWrapper, {
    minWidth: minWidth,
    maxWidth: maxWidth,
    minHeight: minHeight,
    placement: placement,
    style: {
      borderRadius: "var(--radius-full)",
    },
    trigger: _jsx(Column, {
      tabIndex: 0,
      padding: "4",
      radius: "full",
      cursor: "interactive",
      border: selected ? "neutral-medium" : "transparent",
      background: selected ? "neutral-strong" : "transparent",
      className: classNames(
        className || "",
        selected ? styles.selected : "",
        styles.wrapper,
      ),
      style: style,
      children: _jsx(User, { ...userProps }),
    }),
    dropdown: dropdown,
  }));
};
UserMenu.displayName = "UserMenu";
export { UserMenu };
//# sourceMappingURL=UserMenu.js.map
