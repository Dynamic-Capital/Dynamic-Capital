"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  isSameDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import {
  Column,
  DateRangePicker,
  DropdownWrapper,
  IconButton,
  Row,
  Text,
  ToggleButton,
} from "../../components";
export const ChartHeader = (
  {
    title,
    description,
    dateRange,
    date,
    onDateRangeChange,
    presets = { display: true, granularity: "week" },
    ...flex
  },
) => {
  if (!title && !description && !dateRange && !date) {
    return null;
  }
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const dateRangePresets = {
    "This year": {
      getRange: () => ({
        startDate: startOfYear(new Date()),
        endDate: endOfYear(new Date()),
      }),
    },
    "This month": {
      getRange: () => ({
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
      }),
    },
    "This week": {
      getRange: () => ({
        startDate: startOfWeek(new Date()),
        endDate: endOfWeek(new Date()),
      }),
    },
    "Last year": {
      getRange: () => {
        const lastYear = subYears(new Date(), 1);
        return {
          startDate: startOfYear(lastYear),
          endDate: endOfYear(lastYear),
        };
      },
    },
    "Last month": {
      getRange: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
        };
      },
    },
    "Last week": {
      getRange: () => {
        const lastWeek = subWeeks(new Date(), 1);
        return {
          startDate: startOfWeek(lastWeek),
          endDate: endOfWeek(lastWeek),
        };
      },
    },
  };
  useEffect(() => {
    if (dateRange) {
      const matchingPreset = Object.entries(dateRangePresets).find(
        ([name, preset]) => {
          const presetRange = preset.getRange();
          return (dateRange.startDate &&
            presetRange.startDate &&
            isSameDay(dateRange.startDate, presetRange.startDate) &&
            dateRange.endDate &&
            presetRange.endDate &&
            isSameDay(dateRange.endDate, presetRange.endDate));
        },
      );
      setSelectedPreset(matchingPreset ? matchingPreset[0] : null);
    } else {
      setSelectedPreset(null);
    }
  }, [dateRange]);
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && dateRangeOpen) {
        setDateRangeOpen(false);
      }
    };
    if (dateRangeOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [dateRangeOpen]);
  const handleDateRangeChange = (newRange) => {
    if (onDateRangeChange) {
      onDateRangeChange(newRange);
    }
  };
  const handlePresetClick = (presetName) => {
    const newRange = dateRangePresets[presetName].getRange();
    setSelectedPreset(presetName);
    handleDateRangeChange(newRange);
  };
  if (!title && !description && !date?.selector) {
    return null;
  }
  return (_jsx(Column, {
    fillWidth: true,
    paddingX: "20",
    paddingY: "12",
    gap: "4",
    ...flex,
    children: _jsxs(Row, {
      fillWidth: true,
      vertical: "center",
      children: [
        _jsxs(Column, {
          fillWidth: true,
          gap: "4",
          children: [
            title &&
            _jsx(Text, { variant: "heading-strong-xs", children: title }),
            description &&
            (_jsx(Text, {
              variant: "label-default-s",
              onBackground: "neutral-weak",
              children: description,
            })),
          ],
        }),
        dateRange && date?.selector && (_jsx(DropdownWrapper, {
          isOpen: dateRangeOpen,
          onOpenChange: (isOpen) => setDateRangeOpen(isOpen),
          placement: "bottom-end",
          trigger: _jsx(IconButton, {
            icon: "calendar",
            onClick: () => setDateRangeOpen(!dateRangeOpen),
            variant: "secondary",
            size: "m",
          }),
          dropdown: _jsxs(Row, {
            padding: "4",
            s: { direction: "column" },
            children: [
              presets.display &&
              (_jsx(Column, {
                s: { direction: "row" },
                padding: "4",
                gap: "2",
                minWidth: 8,
                border: "neutral-alpha-weak",
                radius: "m",
                overflowX: "scroll",
                children: Object.keys(dateRangePresets)
                  .filter((presetName) => {
                    if (presets.granularity === "year") {
                      return presetName.includes("year");
                    } else if (presets.granularity === "month") {
                      return presetName.includes("year") ||
                        presetName.includes("month");
                    } else {
                      return true;
                    }
                  })
                  .map((presetName) => (_jsx(ToggleButton, {
                    style: { paddingLeft: "0.25rem" },
                    fillWidth: true,
                    horizontal: "start",
                    selected: selectedPreset === presetName,
                    onClick: () => handlePresetClick(presetName),
                    children: presetName,
                  }, presetName))),
              })),
              _jsx(DateRangePicker, {
                size: "s",
                padding: "16",
                gap: "24",
                id: "chart-date-range",
                maxDate: date?.max,
                minDate: date?.min,
                dual: date?.dual,
                value: dateRange,
                onChange: handleDateRangeChange,
              }),
            ],
          }),
        })),
      ],
    }),
  }));
};
//# sourceMappingURL=ChartHeader.js.map
