"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Column, Flex, Input, Text } from ".";
import styles from "./OTPInput.module.scss";
const OTPInput = forwardRef(
  (
    {
      length = 4,
      onComplete,
      error = false,
      errorMessage,
      disabled = false,
      autoFocus = false,
      className,
      ...props
    },
    ref,
  ) => {
    const [values, setValues] = useState(Array(length).fill(""));
    const inputsRef = useRef([]);
    useEffect(() => {
      if (autoFocus && inputsRef.current[0]) {
        inputsRef.current[0].focus();
      }
    }, [autoFocus]);
    const handleChange = (index, value) => {
      if (disabled) {
        return;
      }
      if (value === "" || /^[0-9]$/.test(value)) {
        const newValues = [...values];
        newValues[index] = value;
        setValues(newValues);
        if (value && index < length - 1) {
          inputsRef.current[index + 1]?.focus();
        }
        if (newValues.every((val) => val !== "") && onComplete) {
          onComplete(newValues.join(""));
        }
      }
    };
    const handleKeyDown = (index, event) => {
      if (disabled) {
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        if (values[index]) {
          const newValues = [...values];
          newValues[index] = "";
          setValues(newValues);
        } else if (index > 0) {
          inputsRef.current[index - 1]?.focus();
          const newValues = [...values];
          newValues[index - 1] = "";
          setValues(newValues);
        }
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        inputsRef.current[index - 1]?.focus();
      } else if (event.key === "ArrowRight" && index < length - 1) {
        event.preventDefault();
        inputsRef.current[index + 1]?.focus();
      }
    };
    const handleContainerClick = () => {
      if (disabled) {
        return;
      }
      if (values.every((val) => val !== "")) {
        return;
      }
      const firstEmptyIndex = values.findIndex((val) => val === "");
      if (firstEmptyIndex >= 0) {
        inputsRef.current[firstEmptyIndex]?.focus();
      }
    };
    return (_jsxs(Column, {
      gap: "8",
      ref: ref,
      children: [
        _jsx(Flex, {
          gap: "8",
          center: true,
          onClick: handleContainerClick,
          children: Array.from(
            { length },
            (_, index) => (_jsx(Input, {
              ref: (el) => {
                inputsRef.current[index] = el;
              },
              id: `otp-${index}`,
              type: "text",
              placeholder: " ",
              inputMode: "numeric",
              maxLength: 1,
              error: error,
              value: values[index],
              onChange: (e) => handleChange(index, e.target.value),
              onKeyDown: (e) => handleKeyDown(index, e),
              "aria-label": `OTP digit ${index + 1} of ${length}`,
              className: styles.inputs,
              ...props,
            }, index)),
          ),
        }),
        error && errorMessage &&
        (_jsx(Flex, {
          paddingX: "8",
          children: _jsx(Text, {
            variant: "body-default-s",
            onBackground: "danger-weak",
            children: errorMessage,
          }),
        })),
      ],
    }));
  },
);
OTPInput.displayName = "OTPInput";
export { OTPInput };
//# sourceMappingURL=OTPInput.js.map
