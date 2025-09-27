"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { forwardRef } from "react";
import { IconButton, Row } from ".";
import { useTheme } from "../contexts";
const ThemeSwitcher = forwardRef((flex, ref) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const getVariant = (themeValue) => {
    if (!mounted) {
      return "tertiary";
    }
    return theme === themeValue ? "primary" : "tertiary";
  };
  return (_jsxs(Row, {
    "data-border": "rounded",
    ref: ref,
    gap: "2",
    border: "neutral-alpha-weak",
    radius: "full",
    suppressHydrationWarning: true,
    ...flex,
    children: [
      _jsx(IconButton, {
        icon: "computer",
        variant: getVariant("system"),
        onClick: () => setTheme("system"),
        "aria-label": "System theme",
        suppressHydrationWarning: true,
      }),
      _jsx(IconButton, {
        icon: "dark",
        variant: getVariant("dark"),
        onClick: () => setTheme("dark"),
        "aria-label": "Dark theme",
        suppressHydrationWarning: true,
      }),
      _jsx(IconButton, {
        icon: "light",
        variant: getVariant("light"),
        onClick: () => setTheme("light"),
        "aria-label": "Light theme",
        suppressHydrationWarning: true,
      }),
    ],
  }));
});
ThemeSwitcher.displayName = "ThemeSwitcher";
export { ThemeSwitcher };
//# sourceMappingURL=ThemeSwitcher.js.map
