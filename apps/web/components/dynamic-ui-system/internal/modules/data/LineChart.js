"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { isWithinInterval, parseISO } from "date-fns";
import { formatDate } from "./utils/formatDate";
import {
  Area as RechartsArea,
  AreaChart as RechartsAreaChart,
  CartesianGrid as RechartsCartesianGrid,
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
import { schemes } from "../../types";
import { getDistributedColor } from "./utils/colorDistribution";
import { useDataTheme } from "../../contexts/DataThemeProvider";
const LineChart = ({
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
  axis = "both",
  grid = "both",
  border = "neutral-alpha-weak",
  variant: variantProp,
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
  const seriesArray = Array.isArray(series) ? series : series ? [series] : [];
  const seriesKeys = seriesArray.map((s) => s.key);
  // Generate a unique ID for this chart instance
  const chartId = React.useMemo(
    () => Math.random().toString(36).substring(2, 9),
    [],
  );
  const coloredSeriesArray = seriesArray.map((s, index) => ({
    ...s,
    color: s.color || getDistributedColor(index, seriesArray.length),
  }));
  const autoKeys = Object.keys(data[0] || {}).filter((key) =>
    !seriesKeys.includes(key)
  );
  const autoSeries = seriesArray.length > 0
    ? coloredSeriesArray
    : autoKeys.map((key, index) => ({
      key,
      color: getDistributedColor(index, autoKeys.length),
    }));
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
            children: _jsxs(RechartsAreaChart, {
              data: filteredData,
              margin: { left: 0, bottom: 0, top: 0, right: 0 },
              children: [
                _jsx("defs", {
                  children: autoSeries.map(({ key, color }, index) => {
                    const colorValue = color || schemes[index % schemes.length];
                    const lineColor = `var(--data-${colorValue})`;
                    return (_jsx(LinearGradient, {
                      id: `barGradient${chartId}${index}`,
                      variant: variant,
                      color: lineColor,
                    }, `gradient-${chartId}-${index}`));
                  }),
                }),
                _jsx(RechartsCartesianGrid, {
                  vertical: grid === "x" || grid === "both",
                  horizontal: grid === "y" || grid === "both",
                  stroke: "var(--neutral-alpha-weak)",
                }),
                legend.display && (_jsx(RechartsLegend, {
                  content: (props) => {
                    const customPayload = autoSeries.map((
                      { key, color },
                      index,
                    ) => ({
                      value: key,
                      color: `var(--data-${
                        color || schemes[index % schemes.length]
                      })`,
                    }));
                    return (_jsx(Legend, {
                      payload: customPayload,
                      labels: axis,
                      position: legend.position,
                      direction: legend.direction,
                      variant: variant,
                    }));
                  },
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
                  })),
                })),
                autoSeries.map(({ key, color }, index) => {
                  const colorValue = color || schemes[index % schemes.length];
                  const lineColor = `var(--data-${colorValue})`;
                  return (_jsx(RechartsArea, {
                    type: curve,
                    dataKey: key,
                    name: key,
                    stroke: lineColor,
                    transform: "translate(0, -1)",
                    fill: variant === "outline"
                      ? "transparent"
                      : `url(#barGradient${chartId}${index})`,
                    activeDot: {
                      r: 4,
                      fill: lineColor,
                      stroke: "var(--background)",
                      strokeWidth: 0,
                    },
                  }, key));
                }),
              ],
            }),
          })),
        ],
      }),
    ],
  }));
};
LineChart.displayName = "LineChart";
export { LineChart };
//# sourceMappingURL=LineChart.js.map
