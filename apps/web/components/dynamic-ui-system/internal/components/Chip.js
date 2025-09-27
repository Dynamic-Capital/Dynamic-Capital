"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { Flex, Icon, IconButton, Text } from ".";
import styles from "./Chip.module.scss";
const Chip = forwardRef(
  (
    {
      label,
      selected = true,
      prefixIcon,
      onRemove,
      onClick,
      children,
      iconButtonProps = {},
      ...rest
    },
    ref,
  ) => {
    const defaultIconButtonProps = {
      icon: "close",
      variant: "ghost",
      size: "s",
      tooltip: "Remove",
      onClick: (e) => {
        e.stopPropagation();
        if (onRemove) {
          onRemove();
        }
      },
    };
    const combinedIconButtonProps = {
      ...defaultIconButtonProps,
      ...iconButtonProps,
      onClick: (e) => {
        defaultIconButtonProps.onClick?.(e);
        iconButtonProps.onClick?.(e);
      },
    };
    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (onClick) {
          onClick(e);
        }
      }
    };
    return (_jsxs(Flex, {
      ref: ref,
      fit: true,
      vertical: "center",
      radius: "full",
      paddingX: "8",
      paddingY: "4",
      role: "button",
      tabIndex: 0,
      onClick: onClick,
      onKeyDown: handleKeyDown,
      "aria-pressed": selected,
      cursor: "interactive",
      transition: "micro-medium",
      className: classNames(styles.chip, {
        [styles.selected]: selected,
        [styles.unselected]: !selected,
      }),
      ...rest,
      children: [
        prefixIcon && _jsx(Icon, { name: prefixIcon, size: "s" }),
        _jsx(Flex, {
          paddingX: "8",
          paddingY: "2",
          children: _jsx(Text, {
            variant: "body-default-s",
            children: label || children,
          }),
        }),
        onRemove && (_jsx(IconButton, {
          style: {
            color: "inherit",
          },
          ...combinedIconButtonProps,
        })),
      ],
    }));
  },
);
Chip.displayName = "Chip";
export { Chip };
//# sourceMappingURL=Chip.js.map
