"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from "react";
import {
  Column,
  Flex,
  IconButton,
  Scroller,
  SegmentedControl,
  Text,
  ThemeSwitcher,
} from ".";
import { useStyle } from "../contexts/ThemeProvider";
import { useDataTheme } from "../contexts/DataThemeProvider";
import styles from "./StylePanel.module.scss";
import classNames from "classnames";
import { schemes } from "../types";
const shapes = ["conservative", "playful", "rounded"];
const colorOptions = {
  brand: [...schemes],
  accent: [...schemes],
  neutral: ["sand", "gray", "slate"],
};
const StylePanel = forwardRef(({ ...rest }, ref) => {
  const styleContext = useStyle();
  const { mode: chartMode, setChartOptions } = useDataTheme();
  const [mounted, setMounted] = useState(false);
  const [borderValue, setBorderValue] = useState("playful");
  const [brandValue, setBrandValue] = useState("blue");
  const [accentValue, setAccentValue] = useState("indigo");
  const [neutralValue, setNeutralValue] = useState("gray");
  const [solidValue, setSolidValue] = useState("contrast");
  const [solidStyleValue, setSolidStyleValue] = useState("flat");
  const [surfaceValue, setSurfaceValue] = useState("filled");
  const [scalingValue, setScalingValue] = useState("100");
  const [chartModeValue, setChartModeValue] = useState("categorical");
  const [transitionValue, setTransitionValue] = useState("all");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSolid = localStorage.getItem("data-solid");
      const storedSolidStyle = localStorage.getItem("data-solid-style");
      if (storedSolid) {
        setSolidValue(storedSolid);
      }
      if (storedSolidStyle) {
        setSolidStyleValue(storedSolidStyle);
      }
    }
  }, []);
  useEffect(() => {
    setMounted(true);
    if (mounted) {
      setBorderValue(styleContext.border);
      setBrandValue(styleContext.brand);
      setAccentValue(styleContext.accent);
      setNeutralValue(styleContext.neutral);
      setSurfaceValue(styleContext.surface);
      setScalingValue(styleContext.scaling);
      setTransitionValue(styleContext.transition);
    }
    // Chart mode is handled separately
    setChartModeValue(chartMode);
  }, [styleContext, chartMode, mounted]);
  return (_jsxs(Column, {
    fillWidth: true,
    gap: "16",
    ref: ref,
    ...rest,
    children: [
      _jsxs(Column, {
        fillWidth: true,
        paddingTop: "12",
        paddingLeft: "16",
        gap: "4",
        children: [
          _jsx(Text, { variant: "heading-strong-s", children: "Page" }),
          _jsx(Text, {
            variant: "body-default-s",
            onBackground: "neutral-weak",
            children: "Customize page theme",
          }),
        ],
      }),
      _jsxs(Column, {
        fillWidth: true,
        border: "neutral-alpha-medium",
        radius: "l-4",
        children: [
          _jsxs(Flex, {
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            borderBottom: "neutral-alpha-medium",
            children: [
              _jsx(Text, { variant: "label-default-s", children: "Theme" }),
              _jsx(ThemeSwitcher, {}),
            ],
          }),
          _jsxs(Flex, {
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            children: [
              _jsx(Text, { variant: "label-default-s", children: "Shape" }),
              _jsx(Flex, {
                gap: "4",
                children: shapes.map((
                  radius,
                  index,
                ) => (_jsx(Flex, {
                  "data-border": shapes[index],
                  center: true,
                  tabIndex: 0,
                  className: classNames(
                    styles.select,
                    mounted && borderValue === radius ? styles.selected : "",
                  ),
                  onClick: () => {
                    styleContext.setStyle({ border: radius });
                    setBorderValue(radius);
                  },
                  children: _jsx(IconButton, {
                    variant: "ghost",
                    size: "m",
                    children: _jsx("div", {
                      className: classNames(styles.neutral, styles.swatch),
                    }),
                  }),
                }, radius))),
              }),
            ],
          }),
        ],
      }),
      _jsxs(Column, {
        fillWidth: true,
        paddingTop: "12",
        paddingLeft: "16",
        gap: "4",
        children: [
          _jsx(Text, { variant: "heading-strong-s", children: "Color" }),
          _jsx(Text, {
            variant: "body-default-s",
            onBackground: "neutral-weak",
            children: "Customize color schemes",
          }),
        ],
      }),
      _jsxs(Column, {
        fillWidth: true,
        border: "neutral-alpha-medium",
        radius: "l-4",
        children: [
          _jsxs(Flex, {
            borderBottom: "neutral-alpha-medium",
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Flex, {
                textVariant: "label-default-s",
                minWidth: 3,
                children: "Brand",
              }),
              _jsx(Scroller, {
                minWidth: 0,
                fitWidth: true,
                children: colorOptions.brand.map((
                  color,
                  index,
                ) => (_jsx(Flex, {
                  marginRight: "2",
                  center: true,
                  tabIndex: 0,
                  className: classNames(
                    styles.select,
                    mounted && brandValue === color ? styles.selected : "",
                  ),
                  onClick: () => {
                    styleContext.setStyle({ brand: color });
                    setBrandValue(color);
                  },
                  children: _jsx(IconButton, {
                    variant: "ghost",
                    size: "m",
                    children: _jsx("div", {
                      className: `${styles[color]} ${styles.swatch}`,
                    }),
                  }),
                }, color))),
              }),
            ],
          }),
          _jsxs(Flex, {
            borderBottom: "neutral-alpha-medium",
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Flex, {
                textVariant: "label-default-s",
                minWidth: 3,
                children: "Accent",
              }),
              _jsx(Scroller, {
                minWidth: 0,
                fitWidth: true,
                children: colorOptions.accent.map((
                  color,
                  index,
                ) => (_jsx(Flex, {
                  marginRight: "2",
                  center: true,
                  tabIndex: 0,
                  className: classNames(
                    styles.select,
                    mounted && accentValue === color ? styles.selected : "",
                  ),
                  onClick: () => {
                    styleContext.setStyle({ accent: color });
                    setAccentValue(color);
                  },
                  children: _jsx(IconButton, {
                    variant: "ghost",
                    size: "m",
                    children: _jsx("div", {
                      className: `${styles[color]} ${styles.swatch}`,
                    }),
                  }),
                }, color))),
              }),
            ],
          }),
          _jsxs(Flex, {
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Flex, {
                textVariant: "label-default-s",
                minWidth: 3,
                children: "Neutral",
              }),
              _jsx(Scroller, {
                minWidth: 0,
                fitWidth: true,
                children: colorOptions.neutral.map((
                  color,
                  index,
                ) => (_jsx(Flex, {
                  marginRight: "2",
                  center: true,
                  tabIndex: 0,
                  className: classNames(
                    styles.select,
                    mounted && neutralValue === color ? styles.selected : "",
                  ),
                  onClick: () => {
                    styleContext.setStyle({ neutral: color });
                    setNeutralValue(color);
                  },
                  children: _jsx(IconButton, {
                    variant: "ghost",
                    size: "m",
                    children: _jsx("div", {
                      className: `${styles[color]} ${styles.swatch}`,
                    }),
                  }),
                }, color))),
              }),
            ],
          }),
        ],
      }),
      _jsxs(Column, {
        fillWidth: true,
        paddingTop: "12",
        paddingLeft: "16",
        gap: "4",
        children: [
          _jsx(Text, { variant: "heading-strong-s", children: "Solid style" }),
          _jsx(Text, {
            variant: "body-default-s",
            onBackground: "neutral-weak",
            children: "Customize the appearance of interactive elements",
          }),
        ],
      }),
      _jsxs(Column, {
        fillWidth: true,
        border: "neutral-alpha-medium",
        radius: "l-4",
        children: [
          _jsxs(Flex, {
            borderBottom: "neutral-alpha-medium",
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Text, { variant: "label-default-s", children: "Style" }),
              _jsx(SegmentedControl, {
                maxWidth: 22,
                minWidth: 0,
                buttons: [
                  {
                    size: "l",
                    label: (_jsxs(Flex, {
                      vertical: "center",
                      gap: "12",
                      children: [
                        _jsx(Flex, {
                          "data-solid": "color",
                          border: "brand-strong",
                          solid: "brand-weak",
                          width: "24",
                          height: "24",
                          radius: "s",
                        }),
                        "Color",
                      ],
                    })),
                    value: "color",
                  },
                  {
                    size: "l",
                    label: (_jsxs(Flex, {
                      vertical: "center",
                      gap: "12",
                      children: [
                        _jsx(Flex, {
                          "data-solid": "inverse",
                          border: "brand-strong",
                          solid: "brand-strong",
                          width: "24",
                          height: "24",
                          radius: "s",
                        }),
                        "Inverse",
                      ],
                    })),
                    value: "inverse",
                  },
                  {
                    size: "l",
                    label: (_jsxs(Flex, {
                      vertical: "center",
                      gap: "12",
                      children: [
                        _jsx(Flex, {
                          "data-solid": "contrast",
                          border: "brand-strong",
                          solid: "brand-strong",
                          width: "24",
                          height: "24",
                          radius: "s",
                        }),
                        "Contrast",
                      ],
                    })),
                    value: "contrast",
                  },
                ],
                onToggle: (value) => {
                  styleContext.setStyle({ solid: value });
                  setSolidValue(value);
                  localStorage.setItem("data-solid", value);
                },
                selected: mounted ? solidValue : undefined,
                defaultSelected: "contrast",
              }),
            ],
          }),
          _jsxs(Flex, {
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Text, { variant: "label-default-s", children: "Effect" }),
              _jsx(SegmentedControl, {
                maxWidth: 22,
                minWidth: 0,
                buttons: [
                  {
                    size: "l",
                    label: (_jsxs(Flex, {
                      vertical: "center",
                      gap: "12",
                      children: [
                        _jsx(Flex, {
                          border: "brand-strong",
                          solid: "brand-weak",
                          width: "24",
                          height: "24",
                          radius: "s",
                        }),
                        "Flat",
                      ],
                    })),
                    value: "flat",
                  },
                  {
                    size: "l",
                    label: (_jsxs(Flex, {
                      vertical: "center",
                      gap: "12",
                      children: [
                        _jsx(Flex, {
                          border: "brand-strong",
                          style: {
                            boxShadow:
                              "inset 0 calc(-1 * var(--static-space-8)) var(--static-space-8) var(--brand-solid-strong)",
                          },
                          solid: "brand-weak",
                          width: "24",
                          height: "24",
                          radius: "s",
                        }),
                        "Plastic",
                      ],
                    })),
                    value: "plastic",
                  },
                ],
                onToggle: (value) => {
                  styleContext.setStyle({ solidStyle: value });
                  setSolidStyleValue(value);
                  localStorage.setItem("data-solid-style", value);
                },
                selected: mounted ? solidStyleValue : undefined,
                defaultSelected: "flat",
              }),
            ],
          }),
        ],
      }),
      _jsxs(Column, {
        fillWidth: true,
        paddingTop: "12",
        paddingLeft: "16",
        gap: "4",
        children: [
          _jsx(Text, { variant: "heading-strong-s", children: "Advanced" }),
          _jsx(Text, {
            variant: "body-default-s",
            onBackground: "neutral-weak",
            children: "Customize advanced styling options",
          }),
        ],
      }),
      _jsxs(Column, {
        fillWidth: true,
        border: "neutral-alpha-medium",
        radius: "l-4",
        children: [
          _jsxs(Flex, {
            borderBottom: "neutral-alpha-medium",
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Text, { variant: "label-default-s", children: "Surface" }),
              _jsx(SegmentedControl, {
                maxWidth: 22,
                minWidth: 0,
                onToggle: (value) => {
                  styleContext.setStyle({ surface: value });
                  setSurfaceValue(value);
                },
                selected: mounted ? surfaceValue : undefined,
                defaultSelected: "filled",
                buttons: [
                  {
                    size: "l",
                    label: "Filled",
                    value: "filled",
                  },
                  {
                    size: "l",
                    label: "Translucent",
                    value: "translucent",
                  },
                ],
              }),
            ],
          }),
          _jsxs(Flex, {
            borderBottom: "neutral-alpha-medium",
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Text, { variant: "label-default-s", children: "Scaling" }),
              _jsx(SegmentedControl, {
                maxWidth: 22,
                minWidth: 0,
                onToggle: (value) => {
                  styleContext.setStyle({ scaling: value });
                  setScalingValue(value);
                },
                selected: mounted ? scalingValue : undefined,
                defaultSelected: "100",
                buttons: [
                  {
                    size: "l",
                    label: "90",
                    value: "90",
                  },
                  {
                    size: "l",
                    label: "95",
                    value: "95",
                  },
                  {
                    size: "l",
                    label: "100",
                    value: "100",
                  },
                  {
                    size: "l",
                    label: "105",
                    value: "105",
                  },
                  {
                    size: "l",
                    label: "110",
                    value: "110",
                  },
                ],
              }),
            ],
          }),
          _jsxs(Flex, {
            borderBottom: "neutral-alpha-medium",
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Text, {
                variant: "label-default-s",
                children: "Data Style",
              }),
              _jsx(SegmentedControl, {
                maxWidth: 22,
                minWidth: 0,
                onToggle: (value) => {
                  setChartOptions({ mode: value });
                  setChartModeValue(value);
                },
                selected: mounted ? chartModeValue : undefined,
                defaultSelected: "categorical",
                buttons: [
                  {
                    size: "l",
                    label: "Categorical",
                    value: "categorical",
                  },
                  {
                    size: "l",
                    label: "Divergent",
                    value: "divergent",
                  },
                  {
                    size: "l",
                    label: "Sequential",
                    value: "sequential",
                  },
                ],
              }),
            ],
          }),
          _jsxs(Flex, {
            horizontal: "between",
            vertical: "center",
            fillWidth: true,
            paddingX: "24",
            paddingY: "16",
            gap: "24",
            children: [
              _jsx(Text, {
                variant: "label-default-s",
                children: "Transition",
              }),
              _jsx(SegmentedControl, {
                maxWidth: 22,
                minWidth: 0,
                onToggle: (value) => {
                  styleContext.setStyle({ transition: value });
                  setTransitionValue(value);
                },
                selected: mounted ? transitionValue : undefined,
                defaultSelected: "all",
                buttons: [
                  {
                    size: "l",
                    label: "All",
                    value: "all",
                  },
                  {
                    size: "l",
                    label: "Micro",
                    value: "micro",
                  },
                  {
                    size: "l",
                    label: "Macro",
                    value: "macro",
                  },
                  {
                    size: "l",
                    label: "None",
                    value: "none",
                  },
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }));
});
StylePanel.displayName = "StylePanel";
export { StylePanel };
//# sourceMappingURL=StylePanel.js.map
