"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { forwardRef, useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import { Column, Row, Text } from ".";
import styles from "./Input.module.scss";
import { useDebounce } from "../hooks/useDebounce";
const Textarea = forwardRef(({
  id,
  label,
  placeholder,
  lines = 3,
  error = false,
  errorMessage,
  description,
  radius,
  className,
  surfaceClassName,
  textareaClassName,
  hasPrefix,
  hasSuffix,
  resize = "vertical",
  validate,
  children,
  onFocus,
  onBlur,
  onChange,
  style,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isFilled, setIsFilled] = useState(!!props.value);
  const [validationError, setValidationError] = useState(null);
  const [height, setHeight] = useState(undefined);
  const textareaRef = React.useRef(null);
  const debouncedValue = useDebounce(props.value, 1000);
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }
  };
  const handleChange = (event) => {
    if (lines === "auto") {
      adjustHeight();
    }
    if (onChange) {
      onChange(event);
    }
  };
  const handleFocus = (event) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(event);
    }
  };
  const handleBlur = (event) => {
    setIsFocused(false);
    setIsFilled(!!event.target.value);
    if (onBlur) {
      onBlur(event);
    }
  };
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
  useEffect(() => {
    if (lines === "auto") {
      adjustHeight();
    }
  }, [props.value, lines]);
  const displayError = validationError || errorMessage;
  const textareaClassNames = classNames(
    styles.input,
    styles.textarea,
    "font-body",
    "font-default",
    "font-m",
    {
      [styles.filled]: isFilled,
      [styles.focused]: isFocused,
      [styles.withPrefix]: hasPrefix,
      [styles.withSuffix]: hasSuffix,
      [styles.placeholder]: placeholder,
      [styles.hasChildren]: children,
    },
    textareaClassName,
  );
  return (_jsxs(Column, {
    gap: "8",
    fillWidth: true,
    fitHeight: true,
    className: classNames(className, {
      [styles.error]: displayError && debouncedValue !== "",
    }),
    children: [
      _jsxs(Row, {
        minHeight: placeholder ? "48" : "56",
        transition: "micro-medium",
        border: "neutral-medium",
        background: "neutral-alpha-weak",
        overflow: "hidden",
        vertical: "stretch",
        className: classNames(
          styles.base,
          lines !== "auto" && resize !== "none" && styles.textareaBase,
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
            children: hasPrefix,
          })),
          _jsxs(Column, {
            fillWidth: true,
            children: [
              _jsx("textarea", {
                ...props,
                ref: (node) => {
                  if (typeof ref === "function") {
                    ref(node);
                  } else if (ref) {
                    ref.current = node;
                  }
                  // @ts-ignore
                  textareaRef.current = node;
                },
                id: id,
                rows: typeof lines === "number" ? lines : 1,
                placeholder: placeholder,
                onFocus: handleFocus,
                onBlur: handleBlur,
                className: textareaClassNames,
                "aria-describedby": displayError ? `${id}-error` : undefined,
                "aria-invalid": !!displayError,
                style: {
                  ...style,
                  resize: lines === "auto" ? "none" : resize,
                  height: height ? `${height}rem` : "auto",
                },
                onChange: handleChange,
              }),
              !placeholder &&
              (_jsx(Text, {
                as: "label",
                variant: "label-default-m",
                htmlFor: id,
                className: classNames(styles.label, styles.textareaLabel, {
                  [styles.floating]: isFocused || isFilled,
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
        children: displayError,
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
Textarea.displayName = "Textarea";
export { Textarea };
//# sourceMappingURL=Textarea.js.map
