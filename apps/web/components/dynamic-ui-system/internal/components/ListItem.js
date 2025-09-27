"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import styles from "./List.module.scss";
import { Text } from ".";
const ListItem = forwardRef(({ className, children, style, ...props }, ref) => {
  const listItemClass = classNames(styles.listItem, className);
  return (_jsx(Text, {
    as: "li",
    paddingY: "0",
    paddingRight: "0",
    paddingLeft: "8",
    className: listItemClass,
    style: style,
    ref: ref,
    ...props,
    children: children,
  }));
});
ListItem.displayName = "ListItem";
export { ListItem };
//# sourceMappingURL=ListItem.js.map
