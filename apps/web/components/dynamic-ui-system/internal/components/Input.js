"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import { Column, Row, Text } from ".";
import styles from "./Input.module.scss";
import { useDebounce } from "../hooks/useDebounce";
const Input = forwardRef(({
  id,
  label,
  placeholder,
  height = "m",
  error = false,
  errorMessage,
  description,
  radius,
  className,
  surfaceClassName,
  inputClassName,
  style,
  hasPrefix,
  hasSuffix,
  children,
  onFocus,
  onBlur,
  validate,
  cursor,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isFilled, setIsFilled] = useState(!!props.value);
  const [validationError, setValidationError] = useState(null);
  const debouncedValue = useDebounce(props.value, 1000);
  const handleFocus = (event) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(event);
    }
  };
  const handleBlur = (event) => {
    setIsFocused(false);
    if (event.target.value) {
      setIsFilled(true);
    } else {
      setIsFilled(false);
    }
    if (onBlur) {
      onBlur(event);
    }
  };
  useEffect(() => {
    setIsFilled(!!props.value);
  }, [props.value]);
  const validateInput = useCallback(() => {
    if (!debouncedValue) {
      setValidationError(null);
      return;
    }
    if (validate) {
      const error = validate(debouncedValue);
      if (error) {
        setValidationError(error);
      } else {
        setValidationError(errorMessage || null);
      }
    } else {
      setValidationError(null);
    }
  }, [debouncedValue, validate, errorMessage]);
  useEffect(() => {
    validateInput();
  }, [debouncedValue, validateInput]);
  const displayError = validationError || errorMessage;
  const inputClassNames = classNames(
    styles.input,
    "font-body",
    "font-default",
    "font-m",
    cursor === "interactive" ? "cursor-interactive" : undefined,
    {
      [styles.filled]: isFilled,
      [styles.focused]: isFocused,
      [styles.withPrefix]: hasPrefix,
      [styles.withSuffix]: hasSuffix,
      [styles.placeholder]: placeholder,
      [styles.hasChildren]: children,
      [styles.error]: displayError && debouncedValue !== "",
    },
    inputClassName,
  );
  return (_jsxs(Column, {
    gap: "8",
    style: style,
    fillWidth: true,
    fitHeight: true,
    className: classNames(className, {
      [styles.error]: (error || (displayError && debouncedValue !== "")) &&
        props.value !== "",
    }),
    children: [
      _jsxs(Row, {
        transition: "micro-medium",
        border: "neutral-medium",
        background: "neutral-alpha-weak",
        overflow: "hidden",
        vertical: "stretch",
        className: classNames(
          styles.base,
          {
            [styles.s]: height === "s",
          },
          {
            [styles.m]: height === "m",
          },
          radius === "none"
            ? "radius-none"
            : radius
            ? `radius-l-${radius}`
            : "radius-l",
          surfaceClassName,
        ),
        children: [
          hasPrefix &&
          (_jsx(Row, {
            paddingLeft: "12",
            className: styles.prefix,
            position: "static",
            children: hasPrefix,
          })),
          _jsxs(Column, {
            fillWidth: true,
            children: [
              _jsx("input", {
                ...props,
                ref: ref,
                id: id,
                placeholder: placeholder,
                onFocus: handleFocus,
                onBlur: handleBlur,
                className: inputClassNames,
                "aria-describedby": displayError ? `${id}-error` : undefined,
                "aria-invalid": !!displayError,
              }),
              label &&
              (_jsx(Text, {
                as: "label",
                variant: "label-default-m",
                htmlFor: id,
                className: classNames(styles.label, styles.inputLabel, {
                  [styles.floating]: isFocused || isFilled || placeholder,
                }),
                children: label,
              })),
              children,
            ],
          }),
          hasSuffix &&
          (_jsx(Row, {
            paddingRight: "12",
            className: styles.suffix,
            position: "static",
            children: hasSuffix,
          })),
        ],
      }),
      displayError && errorMessage !== false &&
      (_jsx(Row, {
        paddingX: "16",
        id: `${id}-error`,
        textVariant: "body-default-s",
        onBackground: "danger-weak",
        children: validationError || errorMessage,
      })),
      description &&
      (_jsx(Row, {
        paddingX: "16",
        id: `${id}-description`,
        textVariant: "body-default-s",
        onBackground: "neutral-weak",
        children: description,
      })),
    ],
  }));
});
Input.displayName = "Input";
export { Input };
//# sourceMappingURL=Input.js.map
