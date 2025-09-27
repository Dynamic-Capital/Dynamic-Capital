"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from "react";
import { Flex, Icon, IconButton, Row } from ".";
import classNames from "classnames";
import styles from "./Toast.module.scss";
const iconMap = {
  success: "check",
  danger: "danger",
};
const Toast = forwardRef(
  ({ variant, className, icon = true, onClose, action, children }, ref) => {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
      const timer = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
      if (!visible && onClose) {
        onClose();
      }
    }, [visible, onClose]);
    return (_jsx(Flex, {
      ref: ref,
      fillWidth: true,
      background: "surface",
      radius: "l",
      paddingY: "12",
      paddingX: "20",
      border: "neutral-medium",
      role: "alert",
      "aria-live": "assertive",
      className: classNames(className, styles.toast, styles[variant], {
        [styles.visible]: visible,
        [styles.hidden]: !visible,
      }),
      children: _jsxs(Flex, {
        fillWidth: true,
        vertical: "center",
        gap: "8",
        children: [
          icon &&
          _jsx(Icon, {
            size: "s",
            onBackground: `${variant}-medium`,
            name: iconMap[variant],
          }),
          _jsx(Row, {
            fillWidth: true,
            textVariant: "body-default-s",
            children: children,
          }),
          action && action,
          onClose &&
          (_jsx(IconButton, {
            variant: "ghost",
            icon: "close",
            size: "m",
            tooltip: "Hide",
            tooltipPosition: "top",
            onClick: () => setVisible(false),
          })),
        ],
      }),
    }));
  },
);
Toast.displayName = "Toast";
export { Toast };
//# sourceMappingURL=Toast.js.map
