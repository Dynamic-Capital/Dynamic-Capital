"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import classNames from "classnames";
import { Flex, InteractiveDetails, Spinner } from ".";
import styles from "./Switch.module.scss";
import commonStyles from "./SharedInteractiveStyles.module.scss";
const Switch = forwardRef(
  (
    {
      className,
      isChecked,
      reverse = false,
      loading = false,
      onToggle,
      ariaLabel = "Toggle switch",
      disabled,
      name,
      value,
      ...props
    },
    ref,
  ) => {
    const handleKeyDown = (event) => {
      if (!disabled && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onToggle();
      }
    };
    const handleClick = () => {
      if (!disabled) {
        onToggle();
      }
    };
    return (_jsxs(Flex, {
      gap: "16",
      vertical: "center",
      horizontal: reverse ? "between" : undefined,
      fillWidth: reverse,
      className: classNames(styles.container, className, {
        [styles.reverse]: reverse,
        [styles.disabled]: disabled,
      }),
      onClick: handleClick,
      role: "switch",
      "aria-checked": isChecked,
      "aria-label": ariaLabel,
      "aria-disabled": disabled,
      tabIndex: -1,
      children: [
        _jsx("input", {
          ref: ref,
          type: "checkbox",
          name: name,
          value: value,
          checked: isChecked,
          onChange: onToggle,
          className: commonStyles.hidden,
          tabIndex: -1,
        }),
        _jsx(Flex, {
          cursor: disabled ? "not-allowed" : undefined,
          className: classNames(styles.switch, {
            [styles.checked]: isChecked,
            [styles.disabled]: disabled,
          }),
          children: _jsx("div", {
            onKeyDown: handleKeyDown,
            tabIndex: disabled ? -1 : 0,
            className: classNames(styles.element, {
              [styles.checked]: isChecked,
              [styles.disabled]: disabled,
            }),
            children: loading && _jsx(Spinner, { size: "xs" }),
          }),
        }),
        props.label &&
        _jsx(InteractiveDetails, {
          disabled: disabled,
          ...props,
          onClick: () => {},
        }),
      ],
    }));
  },
);
Switch.displayName = "Switch";
export { Switch };
//# sourceMappingURL=Switch.js.map
