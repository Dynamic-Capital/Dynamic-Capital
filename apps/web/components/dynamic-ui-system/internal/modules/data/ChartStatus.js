"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { Column, Spinner, Text } from "../../components";
export const ChartStatus = (
  {
    loading = false,
    empty = false,
    error = false,
    emptyState = "No data available for the selected period",
    errorState = "An error occurred while fetching data",
  },
) => {
  if (!loading && !empty && !error) {
    return null;
  }
  return (_jsx(Column, {
    fill: true,
    center: true,
    children: loading ? (_jsx(Spinner, { size: "m" })) : empty
      ? (_jsx(Text, {
        align: "center",
        variant: "label-default-s",
        onBackground: "neutral-weak",
        children: emptyState,
      }))
      : (error &&
        (_jsx(Text, {
          align: "center",
          variant: "label-default-s",
          onBackground: "danger-weak",
          children: errorState,
        }))),
  }));
};
//# sourceMappingURL=ChartStatus.js.map
