"use client";
import {
  Fragment as _Fragment,
  jsx as _jsx,
  jsxs as _jsxs,
} from "react/jsx-runtime";
import { forwardRef, useState } from "react";
import { Column, Flex, IconButton, Input } from ".";
import styles from "./NumberInput.module.scss";
import classNames from "classnames";
const NumberInput = forwardRef(
  ({ value, onChange, min, max, step = 1, padStart, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(
      padStart && value !== undefined
        ? value.toString().padStart(padStart, "0")
        : (value?.toString() ?? ""),
    );
    const handleChange = (e) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && onChange) {
        onChange(numValue);
      }
    };
    const updateValue = (newValue) => {
      const formattedValue = padStart
        ? newValue.toString().padStart(padStart, "0")
        : newValue.toString();
      setLocalValue(formattedValue);
      onChange?.(newValue);
    };
    const increment = () => {
      const currentValue = parseFloat(localValue) || 0;
      const newValue = currentValue + step;
      if (max === undefined || newValue <= max) {
        updateValue(newValue);
      }
    };
    const decrement = () => {
      const currentValue = parseFloat(localValue) || 0;
      const newValue = currentValue - step;
      if (min === undefined || newValue >= min) {
        updateValue(newValue);
      }
    };
    return (_jsx(Input, {
      ...props,
      ref: ref,
      type: "number",
      value: localValue,
      onChange: handleChange,
      min: min,
      max: max,
      step: step,
      hasSuffix: _jsxs(_Fragment, {
        children: [
          _jsx(Flex, { position: "static", minWidth: 1.25 }),
          _jsxs(Column, {
            position: "absolute",
            right: "0",
            top: "0",
            borderLeft: "neutral-medium",
            fillHeight: true,
            background: "neutral-alpha-weak",
            children: [
              _jsx(Flex, {
                fillHeight: true,
                position: "static",
                borderBottom: "neutral-medium",
                paddingX: "4",
                className: classNames(
                  styles.stepper,
                  "transition-micro-medium",
                ),
                children: _jsx(IconButton, {
                  icon: "chevronUp",
                  variant: "ghost",
                  size: "s",
                  onClick: increment,
                  "aria-label": "Increment value",
                }),
              }),
              _jsx(Flex, {
                fillHeight: true,
                position: "static",
                paddingX: "4",
                className: classNames(
                  styles.stepper,
                  "transition-micro-medium",
                ),
                children: _jsx(IconButton, {
                  icon: "chevronDown",
                  variant: "ghost",
                  size: "s",
                  onClick: decrement,
                  "aria-label": "Decrement value",
                }),
              }),
            ],
          }),
        ],
      }),
      className: styles.numberInput,
    }));
  },
);
NumberInput.displayName = "NumberInput";
export { NumberInput };
//# sourceMappingURL=NumberInput.js.map
