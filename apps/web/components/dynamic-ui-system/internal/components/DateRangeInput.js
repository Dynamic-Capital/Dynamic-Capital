"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { DateRangePicker, DropdownWrapper, Flex, Input, Row } from ".";
const formatDateRange = (range) => {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return {
    startDate: range.startDate?.toLocaleDateString("en-US", options) || null,
    endDate: range.endDate?.toLocaleDateString("en-US", options) || null,
  };
};
export const DateRangeInput = (
  {
    id,
    startLabel = "Start",
    endLabel = "End",
    value,
    onChange,
    error,
    minHeight,
    className,
    style,
    ...rest
  },
) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    value ? formatDateRange(value) : { startDate: "", endDate: "" },
  );
  useEffect(() => {
    if (value) {
      setInputValue(formatDateRange(value));
    }
  }, [value]);
  const handleDateChange = useCallback((range) => {
    setInputValue(formatDateRange(range));
    onChange?.(range);
    if (range.endDate != undefined) {
      setIsOpen(false);
    }
  }, [onChange]);
  const handleInputClick = useCallback(() => {
    setIsOpen(true);
  }, []);
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);
  const trigger = _jsxs(Row, {
    fillWidth: true,
    horizontal: "center",
    gap: "-1",
    children: [
      _jsx(Input, {
        className: "cursor-interactive",
        style: {
          textOverflow: "ellipsis",
        },
        radius: "left",
        id: id,
        placeholder: startLabel,
        value: inputValue.startDate ?? "",
        error: error,
        readOnly: true,
        onFocus: handleInputFocus,
        ...rest,
      }),
      _jsx(Input, {
        className: "cursor-interactive",
        style: {
          textOverflow: "ellipsis",
        },
        radius: "right",
        id: id,
        placeholder: endLabel,
        value: inputValue.endDate ?? "",
        error: error,
        readOnly: true,
        onFocus: handleInputFocus,
        ...rest,
      }),
    ],
  });
  const dropdown = _jsx(Flex, {
    padding: "20",
    center: true,
    children: _jsx(DateRangePicker, {
      value: value,
      onChange: handleDateChange,
    }),
  });
  return (_jsx(DropdownWrapper, {
    fillWidth: true,
    trigger: trigger,
    minHeight: minHeight,
    dropdown: dropdown,
    isOpen: isOpen,
    closeAfterClick: false,
    disableTriggerClick: true,
    className: className,
    style: { ...style },
    onOpenChange: setIsOpen,
  }));
};
//# sourceMappingURL=DateRangeInput.js.map
