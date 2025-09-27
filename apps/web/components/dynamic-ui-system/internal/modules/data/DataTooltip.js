"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDate } from "./utils/formatDate";
import { Column, CountFx, Row, Text } from "../../components";
import { Swatch } from "./Swatch";
const DataTooltip = (
  {
    active,
    payload,
    label,
    dataKey = "name",
    DataTooltip,
    date = { format: "MMM d" },
    colors = true,
    variant = "gradient",
  },
) => {
  if (!active || !payload || !payload.length) {
    return null;
  }
  const dataPoint = payload[0].payload;
  const displayLabel = label || dataPoint?.[dataKey];
  const formattedLabel = formatDate(displayLabel, date, dataPoint) ||
    displayLabel || dataPoint?.endDate;
  return (_jsxs(Column, {
    minWidth: 8,
    gap: "8",
    paddingY: "8",
    background: "surface",
    radius: "m",
    border: "neutral-alpha-medium",
    children: [
      label &&
      (_jsx(Row, {
        fillWidth: true,
        paddingX: "12",
        children: _jsx(Text, {
          variant: "label-default-s",
          onBackground: "neutral-strong",
          children: formattedLabel,
        }),
      })),
      _jsx(Column, {
        fillWidth: true,
        horizontal: "between",
        paddingX: "12",
        gap: "4",
        children: payload.map((entry, index) => (_jsxs(Row, {
          horizontal: "between",
          fillWidth: true,
          gap: "16",
          children: [
            _jsxs(Row, {
              vertical: "center",
              gap: "8",
              children: [
                colors &&
                _jsx(Swatch, {
                  color: entry.stroke || entry.color,
                  size: "s",
                  variant: variant,
                }),
                _jsx(Text, {
                  onBackground: "neutral-weak",
                  variant: "label-default-s",
                  children: DataTooltip && index === 0
                    ? DataTooltip
                    : entry.name,
                }),
              ],
            }),
            _jsx(Text, {
              onBackground: "neutral-strong",
              variant: "label-default-s",
              children: typeof entry.value === "number"
                ? (_jsx(CountFx, {
                  value: entry.value,
                  separator: ",",
                  speed: 500,
                  easing: "ease-in-out",
                }))
                : (entry.value),
            }),
          ],
        }, index))),
      }),
    ],
  }));
};
export { DataTooltip };
//# sourceMappingURL=DataTooltip.js.map
