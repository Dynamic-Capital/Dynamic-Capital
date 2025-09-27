"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useState } from "react";
import { Chip, Flex, Input } from ".";
const TagInput = forwardRef(
  ({ value, onChange, label, placeholder, ...inputProps }, ref) => {
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const handleInputChange = (e) => {
      setInputValue(e.target.value);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        if (inputValue.trim()) {
          onChange([...value, inputValue.trim()]);
          setInputValue("");
        }
      }
    };
    const handleRemoveTag = (index) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);
    };
    const handleFocus = () => {
      setIsFocused(true);
    };
    const handleBlur = (e) => {
      setIsFocused(false);
    };
    return (_jsx(Input, {
      ref: ref,
      label: label,
      placeholder: placeholder,
      value: inputValue,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
      "aria-haspopup": "listbox",
      "aria-expanded": isFocused,
      ...inputProps,
      children: value.length > 0 && (_jsx(Flex, {
        style: {
          margin: "calc(-1 * var(--static-space-8)) var(--static-space-8)",
        },
        gap: "4",
        vertical: "center",
        wrap: true,
        paddingY: "16",
        children: value.map((
          tag,
          index,
        ) => (_jsx(Chip, {
          label: tag,
          onRemove: () => handleRemoveTag(index),
          "aria-label": `Remove tag ${tag}`,
        }, index))),
      })),
    }));
  },
);
TagInput.displayName = "TagInput";
export { TagInput };
//# sourceMappingURL=TagInput.js.map
