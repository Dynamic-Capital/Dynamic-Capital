"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from "react";
import classNames from "classnames";
import { Flex, InteractiveDetails } from ".";
import styles from "./SharedInteractiveStyles.module.scss";
const generateId = () => `radio-${Math.random().toString(36).substring(2, 9)}`;
const RadioButton = forwardRef(
  (
    {
      style,
      className,
      isChecked: controlledIsChecked,
      name,
      value,
      onToggle,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isChecked, setIsChecked] = useState(controlledIsChecked || false);
    const [radioId] = useState(generateId());
    useEffect(() => {
      if (controlledIsChecked !== undefined) {
        setIsChecked(controlledIsChecked);
      }
    }, [controlledIsChecked]);
    const toggleItem = () => {
      if (disabled) {
        return;
      }
      if (onToggle) {
        onToggle();
      } else {
        setIsChecked(!isChecked);
      }
    };
    const handleKeyDown = (event) => {
      if (disabled) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleItem();
      }
    };
    return (_jsxs(Flex, {
      vertical: "center",
      gap: "16",
      zIndex: 1,
      className: classNames(styles.container, className, {
        [styles.disabled]: disabled,
      }),
      style: style,
      children: [
        _jsx("input", {
          type: "radio",
          ref: ref,
          name: name,
          value: value,
          checked: controlledIsChecked !== undefined
            ? controlledIsChecked
            : isChecked,
          onChange: toggleItem,
          disabled: disabled,
          className: styles.hidden,
          tabIndex: -1,
        }),
        _jsx(Flex, {
          role: "radio",
          "aria-checked": controlledIsChecked !== undefined
            ? controlledIsChecked
            : isChecked,
          "aria-labelledby": radioId,
          "aria-disabled": disabled,
          horizontal: "center",
          vertical: "center",
          radius: "full",
          onClick: toggleItem,
          onKeyDown: handleKeyDown,
          tabIndex: disabled ? -1 : 0,
          cursor: disabled ? "not-allowed" : undefined,
          className: classNames(styles.element, {
            [styles.checked]: controlledIsChecked !== undefined
              ? controlledIsChecked
              : isChecked,
            [styles.disabled]: disabled,
          }),
          children: (controlledIsChecked !== undefined
            ? controlledIsChecked
            : isChecked) && (_jsx(Flex, {
              style: {
                backgroundColor: "var(--neutral-on-solid-strong)",
              },
              radius: "full",
              width: "12",
              height: "12",
              className: styles.icon,
            })),
        }),
        props.label &&
        (_jsx(InteractiveDetails, {
          disabled: disabled,
          id: radioId,
          ...props,
          onClick: toggleItem,
        })),
      ],
    }));
  },
);
RadioButton.displayName = "RadioButton";
export { RadioButton };
//# sourceMappingURL=RadioButton.js.map
