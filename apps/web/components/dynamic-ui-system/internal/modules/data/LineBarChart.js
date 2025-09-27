"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { isWithinInterval, parseISO } from "date-fns";
import { formatDate } from "./utils/formatDate";
import {
  Area as RechartsArea,
  Bar as RechartsBar,
  CartesianGrid as RechartsCartesianGrid,
  ComposedChart as RechartsComposedChart,
  Legend as RechartsLegend,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
} from "recharts";
import { Column, Row } from "../../components";
import {
  ChartHeader,
  ChartStatus,
  DataTooltip,
  Legend,
  LinearGradient,
} from ".";
import { useDataTheme } from "../../contexts/DataThemeProvider";
const LineBarChart = ({
  title,
  description,
  data,
  series,
  date,
  emptyState,
  errorState,
  error = false,
  loading = false,
  tooltip = true,
  legend: legendProp = {},
  grid = "y",
  axis = "both",
  border = "neutral-alpha-weak",
  variant: variantProp,
  barWidth = "l",
  curve = "natural",
  "data-viz-style": dataVizStyle,
  ...flex
}) => {
  const {
    variant: themeVariant,
    mode,
    height,
    tick: { fill: tickFill, fontSize: tickFontSize, line: tickLine },
    axis: { stroke: axisLineStroke },
  } = useDataTheme();
  const variant = variantProp || themeVariant;
  const legend = {
    display: legendProp.display !== undefined ? legendProp.display : true,
    position: legendProp.position || "top-left",
    direction: legendProp.direction,
  };
  const [selectedDateRange, setSelectedDateRange] = useState(
    date?.start && date?.end
      ? {
        startDate: date.start,
        endDate: date.end,
      }
      : undefined,
  );
  useEffect(() => {
    if (date?.start && date?.end) {
      setSelectedDateRange({
        startDate: date.start,
        endDate: date.end,
      });
    }
  }, [date?.start, date?.end]);
  const allSeriesArray = Array.isArray(series)
    ? series
    : series
    ? [series]
    : [];
  const seriesKeys = allSeriesArray.map((s) => s.key);
  const xAxisKey =
    Object.keys(data[0] || {}).find((key) => !seriesKeys.includes(key)) ||
    "name";
  const filteredData = React.useMemo(() => {
    if (
      selectedDateRange?.startDate && selectedDateRange?.endDate && xAxisKey
    ) {
      const startDate = selectedDateRange.startDate;
      const endDate = selectedDateRange.endDate;
      if (startDate instanceof Date && endDate instanceof Date) {
        return data.filter((item) => {
          try {
            const itemDateValue = item[xAxisKey];
            if (!itemDateValue) {
              return false;
            }
            const itemDate = typeof itemDateValue === "string"
              ? parseISO(itemDateValue)
              : itemDateValue;
            return isWithinInterval(itemDate, {
              start: startDate,
              end: endDate,
            });
          } catch (error) {
            return false;
          }
        });
      }
    }
    return data;
  }, [data, selectedDateRange, xAxisKey]);
  const handleDateRangeChange = (newRange) => {
    setSelectedDateRange(newRange);
    if (date?.onChange) {
      date.onChange(newRange);
    }
  };
  const chartSeriesArray = Array.isArray(series)
    ? series
    : series
    ? [series]
    : [];
  if (chartSeriesArray.length < 2) {
    console.warn(
      "LineBarChart requires at least 2 series (one for line, one for bar)",
    );
  }
  const lineSeries = chartSeriesArray[0] || { key: "value1", color: "blue" };
  const barSeries = chartSeriesArray[1] || { key: "value2", color: "green" };
  const lineColor = lineSeries.color || "blue";
  const barColor = barSeries.color || "green";
  const finalLineColor = `var(--data-${lineColor})`;
  const finalBarColor = `var(--data-${barColor})`;
  const chartId = React.useMemo(
    () => Math.random().toString(36).substring(2, 9),
    [],
  );
  return (_jsxs(Column, {
    fillWidth: true,
    height: height,
    border: border,
    radius: "l",
    "data-viz-style": dataVizStyle || mode,
    ...flex,
    children: [
      _jsx(ChartHeader, {
        title: title,
        description: description,
        dateRange: selectedDateRange,
        date: date,
        onDateRangeChange: handleDateRangeChange,
        presets: date?.presets,
      }),
      _jsxs(Row, {
        fill: true,
        borderTop: (title || description || date?.selector)
          ? (border || "neutral-alpha-weak")
          : undefined,
        topRadius: flex.radius || "l",
        overflow: "hidden",
        children: [
          _jsx(ChartStatus, {
            loading: loading,
            empty: !filteredData || filteredData.length === 0,
            emptyState: emptyState,
            error: error,
            errorState: errorState,
          }),
          !loading && !error && filteredData && filteredData.length > 0 &&
          (_jsx(RechartsResponsiveContainer, {
            width: "100%",
            height: "100%",
            children: _jsxs(RechartsComposedChart, {
              data: filteredData,
              margin: { left: 0, bottom: 0, top: 0, right: 0 },
              barGap: 4,
              children: [
                _jsxs("defs", {
                  children: [
                    _jsx(LinearGradient, {
                      id: `barGradient${chartId}`,
                      color: finalBarColor,
                      variant: variant,
                    }),
                    _jsx(LinearGradient, {
                      id: `lineGradient${chartId}`,
                      color: finalLineColor,
                      variant: variant,
                    }),
                  ],
                }),
                _jsx(RechartsCartesianGrid, {
                  vertical: grid === "x" || grid === "both",
                  horizontal: grid === "y" || grid === "both",
                  stroke: "var(--neutral-alpha-weak)",
                }),
                legend.display &&
                (_jsx(RechartsLegend, {
                  content: _jsx(Legend, {
                    variant: variant,
                    colors: [finalLineColor, finalBarColor],
                    labels: axis,
                    position: legend.position,
                    direction: legend.direction,
                  }),
                  wrapperStyle: {
                    position: "absolute",
                    top: legend.position === "top-center" ||
                        legend.position === "top-left" ||
                        legend.position === "top-right"
                      ? 0
                      : undefined,
                    bottom: legend.position === "bottom-center" ||
                        legend.position === "bottom-left" ||
                        legend.position === "bottom-right"
                      ? 0
                      : undefined,
                    paddingBottom: legend.position === "bottom-center" ||
                        legend.position === "bottom-left" ||
                        legend.position === "bottom-right"
                      ? "var(--static-space-40)"
                      : undefined,
                    left: (axis === "y" || axis === "both") &&
                        (legend.position === "top-center" ||
                          legend.position === "bottom-center")
                      ? "var(--static-space-64)"
                      : 0,
                    width: (axis === "y" || axis === "both") &&
                        (legend.position === "top-center" ||
                          legend.position === "bottom-center")
                      ? "calc(100% - var(--static-space-64))"
                      : "100%",
                    right: 0,
                    margin: 0,
                  },
                })),
                _jsx(RechartsXAxis, {
                  height: 32,
                  tickMargin: 6,
                  dataKey: xAxisKey,
                  hide: !(axis === "x" || axis === "both"),
                  axisLine: {
                    stroke: axisLineStroke,
                  },
                  tickLine: tickLine,
                  tick: {
                    fill: tickFill,
                    fontSize: tickFontSize,
                  },
                  tickFormatter: (value) => {
                    const dataPoint = data.find((item) =>
                      item[xAxisKey] === value
                    );
                    return formatDate(value, date, dataPoint);
                  },
                }),
                (axis === "y" || axis === "both") &&
                (_jsx(RechartsYAxis, {
                  width: 64,
                  padding: { top: 40 },
                  allowDataOverflow: true,
                  tickLine: tickLine,
                  tick: {
                    fill: tickFill,
                    fontSize: tickFontSize,
                  },
                  axisLine: {
                    stroke: axisLineStroke,
                  },
                })),
                tooltip && (_jsx(RechartsTooltip, {
                  cursor: {
                    stroke: "var(--neutral-border-strong)",
                    strokeWidth: 1,
                  },
                  content: (
                    props,
                  ) => (_jsx(DataTooltip, {
                    ...props,
                    variant: variant,
                    date: date,
                    dataKey: xAxisKey,
                  })),
                })),
                _jsx(RechartsArea, {
                  type: curve,
                  dataKey: lineSeries.key,
                  name: lineSeries.key,
                  stroke: finalLineColor,
                  transform: "translate(0, -1)",
                  fill: `url(#lineGradient${chartId})`,
                  activeDot: {
                    r: 4,
                    fill: finalLineColor,
                    stroke: "var(--background)",
                    strokeWidth: 0,
                  },
                }),
                _jsx(RechartsBar, {
                  dataKey: barSeries.key,
                  name: barSeries.key,
                  fill: `url(#barGradient${chartId})`,
                  stroke: finalBarColor,
                  strokeWidth: 1,
                  transform: "translate(0, -1)",
                  radius: [4, 4, 4, 4],
                  barSize: barWidth === "fill"
                    ? "100%"
                    : barWidth === "xs"
                    ? 6
                    : barWidth === "s"
                    ? 12
                    : barWidth === "m"
                    ? 20
                    : barWidth === "l"
                    ? 40
                    : barWidth === "xl"
                    ? 50
                    : barWidth,
                }),
              ],
            }),
          })),
        ],
      }),
    ],
  }));
};
LineBarChart.displayName = "LineBarChart";
export { LineBarChart };
//# sourceMappingURL=LineBarChart.js.map
