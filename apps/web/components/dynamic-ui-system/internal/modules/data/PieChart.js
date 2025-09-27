"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import {
  Cell as RechartsCell,
  Legend as RechartsLegend,
  Pie as RechartsPie,
  PieChart as RechartsPieChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  ChartHeader,
  ChartStatus,
  Column,
  DataTooltip,
  Legend,
  RadialGradient,
  Row,
  schemes,
  useDataTheme,
} from "../../";
import { getDistributedColor } from "./utils/colorDistribution";
export const PieChart = ({
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
  origo = { x: 50, y: 50 },
  legend: legendProp = {},
  border = "neutral-alpha-weak",
  variant: variantProp,
  ring = { inner: 0, outer: 80 },
  dataKey = "value",
  nameKey = "name",
  "data-viz-style": dataViz,
  ...flex
}) => {
  const { variant: themeVariant, mode, height } = useDataTheme();
  const variant = variantProp || themeVariant;
  const legend = {
    display: legendProp.display !== undefined ? legendProp.display : true,
    position: legendProp.position || "bottom-center",
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
  const handleDateRangeChange = (newRange) => {
    setSelectedDateRange(newRange);
    if (date?.onChange) {
      date.onChange(newRange);
    }
  };
  const colorPalette = React.useMemo(() => {
    if (!data || data.length === 0) {
      return schemes.map((c) => `var(--data-${c})`);
    }
    return Array.from({ length: data.length }, (_, index) => {
      const colorKey = getDistributedColor(index, data.length);
      return `var(--data-${colorKey})`;
    });
  }, [data]);
  const filteredData = React.useMemo(() => {
    if (!selectedDateRange || !data || data.length === 0) {
      return data;
    }
    return data.filter((item) => {
      try {
        if (
          !item.date || !selectedDateRange.startDate ||
          !selectedDateRange.endDate
        ) {
          return true;
        }
        const itemDate = typeof item.date === "string"
          ? new Date(item.date)
          : item.date;
        return itemDate >= selectedDateRange.startDate &&
          itemDate <= selectedDateRange.endDate;
      } catch (e) {
        return true;
      }
    });
  }, [data, selectedDateRange]);
  const getGradientId = React.useCallback((colorKey) => {
    return `pieGradient-${String(colorKey)}`;
  }, []);
  return (_jsxs(Column, {
    fillWidth: true,
    height: height,
    "data-viz-style": dataViz || mode,
    border: border,
    radius: "l",
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
            children: _jsxs(RechartsPieChart, {
              children: [
                _jsxs("defs", {
                  children: [
                    _jsxs("pattern", {
                      id: "pieChartMasterPattern",
                      patternUnits: "userSpaceOnUse",
                      width: "100%",
                      height: "100%",
                      children: [
                        _jsx(RadialGradient, {
                          id: "pieChartMasterGradient",
                          color: "var(--page-background)",
                          cx: "50%",
                          cy: "50%",
                          r: "50%",
                          fx: "50%",
                          fy: "50%",
                          variant: variant,
                        }),
                        _jsx("rect", {
                          x: "0",
                          y: "0",
                          width: "100%",
                          height: "100%",
                          fill: "url(#pieChartMasterGradient)",
                        }),
                      ],
                    }),
                    Array.from(
                      new Set(filteredData.map((entry, index) => {
                        return entry.color ||
                          getDistributedColor(index, filteredData.length);
                      })),
                    ).map((colorKey) => {
                      const baseColor = `var(--data-${colorKey})`;
                      const patternId = getGradientId(colorKey);
                      return (_jsxs("pattern", {
                        id: patternId,
                        patternUnits: "userSpaceOnUse",
                        width: "100%",
                        height: "100%",
                        children: [
                          variant !== "outline" &&
                          (_jsx("rect", {
                            x: "0",
                            y: "0",
                            width: "100%",
                            height: "100%",
                            fill: baseColor,
                          })),
                          variant === "gradient" &&
                          (_jsx("rect", {
                            x: "0",
                            y: "0",
                            width: "100%",
                            height: "100%",
                            fill: "url(#pieChartMasterPattern)",
                          })),
                        ],
                      }, `pattern-${colorKey}`));
                    }),
                  ],
                }),
                legend.display &&
                (_jsx(RechartsLegend, {
                  content: (
                    props,
                  ) => (_jsx(Legend, {
                    ...props,
                    variant: variant,
                    position: legend.position,
                    direction: legend.direction,
                    labels: "none",
                    colors: colorPalette,
                  })),
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
                    right: 0,
                    left: 0,
                    margin: 0,
                  },
                })),
                _jsx(RechartsPie, {
                  data: filteredData,
                  cx: origo.x + "%",
                  cy: origo.y + "%",
                  labelLine: false,
                  innerRadius: ring.inner + "%",
                  outerRadius: ring.outer + "%",
                  dataKey: dataKey,
                  nameKey: nameKey,
                  stroke: variant === "outline" ? undefined : "none",
                  children: filteredData.map((entry, index) => {
                    const colorKey = entry.color ||
                      getDistributedColor(index, filteredData.length);
                    const baseColor = `var(--data-${colorKey})`;
                    const gradientId = getGradientId(String(colorKey));
                    return (_jsx(RechartsCell, {
                      fill: variant === "outline"
                        ? "transparent"
                        : `url(#${gradientId})`,
                      strokeWidth: variant === "outline" ? 2 : 1,
                      stroke: baseColor,
                      style: { outline: "none" },
                    }, `cell-${index}`));
                  }),
                }),
                tooltip && (_jsx(RechartsTooltip, {
                  content: (props) => {
                    if (props.payload && props.payload.length > 0) {
                      const entry = props.payload[0];
                      const index = filteredData.findIndex((item) =>
                        item[nameKey] === entry.name
                      );
                      const colorKey = filteredData[index]?.color ||
                        getDistributedColor(index, filteredData.length);
                      const color = `var(--data-${colorKey})`;
                      props.payload[0].color = color;
                    }
                    return (_jsx(DataTooltip, {
                      ...props,
                      label: undefined,
                      date: date,
                      variant: variant,
                    }));
                  },
                })),
              ],
            }),
          })),
        ],
      }),
    ],
  }));
};
//# sourceMappingURL=PieChart.js.map
