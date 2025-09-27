"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { DatePicker, DropdownWrapper, Input } from ".";
const formatDate = (date, timePicker) => {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(timePicker && {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
  return date.toLocaleString("en-US", options);
};
export const DateInput = (
  {
    id,
    label,
    placeholder,
    value,
    onChange,
    error,
    minHeight,
    className,
    style,
    timePicker = false,
    minDate,
    maxDate,
    ...rest
  },
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    value ? formatDate(value, timePicker) : "",
  );
  useEffect(() => {
    if (value) {
      setInputValue(formatDate(value, timePicker));
    }
  }, [value, timePicker]);
  const handleDateChange = useCallback((date) => {
    setInputValue(formatDate(date, timePicker));
    onChange?.(date);
    if (!timePicker) {
      setIsOpen(false);
    }
  }, [onChange, timePicker]);
  const handleInputClick = useCallback(() => {
    setIsOpen(true);
  }, []);
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);
  return (_jsx(DropdownWrapper, {
    trigger: _jsx(Input, {
      style: {
        textOverflow: "ellipsis",
      },
      id: id,
      label: label,
      placeholder: placeholder,
      value: inputValue,
      error: error,
      readOnly: true,
      onFocus: handleInputFocus,
      ...rest,
    }),
    dropdown: _jsx(DatePicker, {
      padding: "20",
      value: value,
      onChange: handleDateChange,
      timePicker: timePicker,
      minDate: minDate,
      maxDate: maxDate,
      autoFocus: true,
      isOpen: isOpen,
    }, `datepicker-${isOpen ? "open" : "closed"}-${value?.getTime() || 0}`),
    fillWidth: true,
    minHeight: minHeight,
    isOpen: isOpen,
    onOpenChange: setIsOpen,
    className: className,
    closeAfterClick: !timePicker,
    disableTriggerClick: true,
    style: { ...style },
    handleArrowNavigation: false,
  }));
};
//# sourceMappingURL=DateInput.js.map
