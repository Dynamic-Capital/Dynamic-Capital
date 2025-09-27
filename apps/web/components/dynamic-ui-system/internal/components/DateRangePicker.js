"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { DatePicker, Flex } from ".";
const DateRangePicker = (
  { value, onChange, minDate, maxDate, size = "m", dual, ...rest },
) => {
  const [internalValue, setInternalValue] = useState({
    startDate: value?.startDate || undefined,
    endDate: value?.endDate || undefined,
  });
  const [hoveredDate, setHoveredDate] = useState(null);
  // Initialize with the startDate's month and year if available, otherwise use current date
  const [currentMonth, setCurrentMonth] = useState(
    value?.startDate ? value.startDate.getMonth() : new Date().getMonth(),
  );
  const [currentYear, setCurrentYear] = useState(
    value?.startDate ? value.startDate.getFullYear() : new Date().getFullYear(),
  );
  useEffect(() => {
    if (value) {
      setInternalValue({
        startDate: value.startDate,
        endDate: value.endDate,
      });
      // Update the current month and year when value changes and has a startDate
      if (value.startDate) {
        setCurrentMonth(value.startDate.getMonth());
        setCurrentYear(value.startDate.getFullYear());
      }
    }
  }, [value]);
  const handleDateChange = (date) => {
    if (
      !internalValue.startDate ||
      (internalValue.startDate && internalValue.endDate)
    ) {
      // Start new selection
      const newRange = {
        startDate: date,
        endDate: undefined,
      };
      setInternalValue(newRange);
      onChange?.(newRange);
    } else {
      const newRange = {
        startDate: internalValue.startDate,
        endDate: date,
      };
      if (newRange.startDate > date) {
        newRange.startDate = date;
        newRange.endDate = internalValue.startDate;
      }
      setInternalValue(newRange);
      onChange?.(newRange);
    }
  };
  const handleMonthChange = (increment) => {
    const newDate = new Date(currentYear, currentMonth + increment, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
    setInternalValue({
      startDate: internalValue.startDate,
      endDate: internalValue.endDate,
    });
  };
  const getSecondMonth = () => {
    const firstMonth = new Date(currentYear, currentMonth, 1);
    const secondMonth = new Date(firstMonth);
    secondMonth.setMonth(secondMonth.getMonth() + 1);
    return secondMonth;
  };
  const getPreviewRange = () => {
    if (!internalValue.startDate || internalValue.endDate || !hoveredDate) {
      return null;
    }
    return {
      startDate: internalValue.startDate,
      endDate: hoveredDate > internalValue.startDate
        ? hoveredDate
        : internalValue.startDate,
      isPreview: true,
    };
  };
  return (_jsxs(Flex, {
    gap: "24",
    ...rest,
    children: [
      _jsx(DatePicker, {
        value: internalValue.startDate,
        onChange: handleDateChange,
        range: getPreviewRange() || internalValue,
        minDate: minDate,
        maxDate: maxDate,
        size: size,
        nextMonth: dual ? false : true,
        currentMonth: currentMonth,
        currentYear: currentYear,
        onMonthChange: handleMonthChange,
        onHover: setHoveredDate,
      }),
      dual && (_jsx(DatePicker, {
        value: internalValue.endDate,
        onChange: handleDateChange,
        range: getPreviewRange() || internalValue,
        minDate: minDate,
        maxDate: maxDate,
        previousMonth: false,
        size: size,
        currentMonth: getSecondMonth().getMonth(),
        currentYear: getSecondMonth().getFullYear(),
        onMonthChange: handleMonthChange,
        onHover: setHoveredDate,
      })),
    ],
  }));
};
DateRangePicker.displayName = "DateRangePicker";
export { DateRangePicker };
//# sourceMappingURL=DateRangePicker.js.map
